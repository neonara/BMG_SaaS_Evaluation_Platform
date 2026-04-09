#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# BMG Sprint 1 — Fix script
# Run from: ~/Desktop/client2026/BMG_SaaS_Evaluation_Platform/
# ═══════════════════════════════════════════════════════════════
set -e

echo "=== BMG Sprint 1 Fix Script ==="
echo ""

# ── FIX 1: Check current .env.prod for mismatches ──────────────
echo "[ FIX 1 ] Checking .env.prod consistency..."

RABBIT_URL=$(grep '^RABBITMQ_URL=' .env.prod | cut -d= -f2-)
RABBIT_USER=$(grep '^RABBITMQ_USER=' .env.prod | cut -d= -f2-)
RABBIT_PASS=$(grep '^RABBITMQ_PASSWORD=' .env.prod | cut -d= -f2-)
REDIS_URL=$(grep '^REDIS_URL=' .env.prod | cut -d= -f2-)

echo "  RABBITMQ_URL      = $RABBIT_URL"
echo "  RABBITMQ_USER     = $RABBIT_USER"
echo "  RABBITMQ_PASSWORD = $RABBIT_PASS"
echo "  REDIS_URL         = $REDIS_URL"
echo ""

# Extract password from RABBITMQ_URL
URL_PASS=$(echo $RABBIT_URL | sed 's|amqp://[^:]*:\([^@]*\)@.*|\1|')
URL_USER=$(echo $RABBIT_URL | sed 's|amqp://\([^:]*\):.*|\1|')
URL_VHOST=$(echo $RABBIT_URL | sed 's|.*/||')

echo "  URL parsed → user=$URL_USER  password=$URL_PASS  vhost=$URL_VHOST"
echo ""

if [ "$URL_PASS" != "$RABBIT_PASS" ]; then
  echo "  ✗ MISMATCH: RABBITMQ_URL password ('$URL_PASS') != RABBITMQ_PASSWORD ('$RABBIT_PASS')"
  echo "  → Run: sed -i 's|^RABBITMQ_PASSWORD=.*|RABBITMQ_PASSWORD=$URL_PASS|' .env.prod"
else
  echo "  ✓ RabbitMQ credentials consistent"
fi

if [ "$URL_USER" != "$RABBIT_USER" ]; then
  echo "  ✗ MISMATCH: RABBITMQ_URL user ('$URL_USER') != RABBITMQ_USER ('$RABBIT_USER')"
else
  echo "  ✓ RabbitMQ user consistent"
fi

echo ""

# ── FIX 2: Check POSTGRES_DB for space ─────────────────────────
echo "[ FIX 2 ] Checking for space in POSTGRES_DB..."
if grep -q '^POSTGRES_DB ' .env.prod; then
  echo "  ✗ Found: POSTGRES_DB has a space before ="
  echo "  → Run: sed -i 's|^POSTGRES_DB .*|POSTGRES_DB=bmg_public|' .env.prod"
else
  echo "  ✓ POSTGRES_DB OK"
fi

echo ""

# ── FIX 3: Check health URL ─────────────────────────────────────
echo "[ FIX 3 ] Checking Django health URL..."
cat bmg_backend/config/urls.py | grep health || echo "  ✗ health URL not found in config/urls.py"

echo ""

# ── FIX 4: Check Dockerfile exists ─────────────────────────────
echo "[ FIX 4 ] Checking Dockerfile..."
if [ -f bmg_backend/Dockerfile ]; then
  echo "  ✓ Dockerfile exists"
  head -5 bmg_backend/Dockerfile
else
  echo "  ✗ bmg_backend/Dockerfile NOT FOUND — this is why build fails"
fi

echo ""
echo "=== Diagnosis complete ==="

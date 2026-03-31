# ═══════════════════════════════════════════════════════════════
# BMG Backend Dockerfile
# ═══════════════════════════════════════════════════════════════

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements/ requirements/

# ── production stage ──────────────────────────────────────────
FROM base AS production

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements/production.txt

# Copy application code
COPY . .

# Make sure init script is executable
RUN chmod +x init_migrations.sh

# Create non-root user
RUN addgroup --system django \
    && adduser --system --ingroup django django \
    && chown -R django:django /app

# Switch to non-root user
USER django

EXPOSE 8000

# Use the init script as entrypoint
ENTRYPOINT ["./init_migrations.sh"]

# ── development stage ─────────────────────────────────────────
FROM base AS development

# Install development dependencies
RUN pip install --no-cache-dir -r requirements/dev.txt

# Copy application code
COPY . .

# Make sure init script is executable
RUN chmod +x init_migrations.sh

# Keep container running for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
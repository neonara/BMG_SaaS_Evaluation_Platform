/**
 * GET /api/auth/oauth/[provider]/callback
 *
 * Step 2 — OAuth callback from the provider (Google / LinkedIn).
 * Validates the CSRF state, exchanges the code with Django,
 * sets the bmg_session cookie, then redirects to the dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const API_URL    = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret     = new TextEncoder().encode(
  process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
);
const DEFAULT_LOCALE = "en";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  // ── Basic validation ───────────────────────────────────────────────────────
  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}/${DEFAULT_LOCALE}/login?error=oauth_missing_params`
    );
  }

  // ── CSRF state check ───────────────────────────────────────────────────────
  const savedState = request.cookies.get(`oauth_state_${provider}`)?.value;
  if (savedState && savedState !== state) {
    return NextResponse.redirect(
      `${SITE_URL}/${DEFAULT_LOCALE}/login?error=oauth_state_mismatch`
    );
  }

  // ── Exchange code with Django ──────────────────────────────────────────────
  let djangoData: Record<string, unknown>;
  try {
    const djangoRes = await fetch(
      `${API_URL}/api/v1/auth/social/${provider}/callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { cache: "no-store" }
    );

    djangoData = await djangoRes.json();

    if (!djangoRes.ok) {
      const error = (djangoData.error as string) ?? "oauth_failed";
      return NextResponse.redirect(
        `${SITE_URL}/${DEFAULT_LOCALE}/login?error=${encodeURIComponent(error)}`
      );
    }
  } catch {
    return NextResponse.redirect(
      `${SITE_URL}/${DEFAULT_LOCALE}/login?error=oauth_server_error`
    );
  }

  const access  = djangoData.access  as string;
  const refresh = djangoData.refresh as string;

  // ── Decode Django JWT to extract session claims ────────────────────────────
  const parts   = access.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

  // ── Re-sign as bmg_session cookie (same shape as /api/auth/login) ─────────
  const sessionToken = await new SignJWT({
    user_id:       payload.user_id,
    email:         payload.email,
    role:          payload.role,
    tenant_schema: payload.tenant_schema,
    jti:           payload.jti,
    django_access:  access,
    django_refresh: refresh,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const locale   = DEFAULT_LOCALE;
  const response = NextResponse.redirect(`${SITE_URL}/${locale}/dashboard`);

  // Clear the temporary CSRF cookie
  response.cookies.delete(`oauth_state_${provider}`);

  response.cookies.set("bmg_session", sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   60 * 60 * 24 * 7,
    path:     "/",
  });

  return response;
}

/**
 * GET /api/auth/oauth/[provider]
 *
 * Step 1 — initiate OAuth flow.
 * Asks Django for the provider's auth URL, saves the CSRF state in a cookie,
 * then redirects the browser to Google / LinkedIn.
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  let auth_url: string;
  let state: string;

  try {
    const djangoRes = await fetch(
      `${API_URL}/api/v1/auth/social/${provider}/login/`,
      { cache: "no-store" }
    );

    if (!djangoRes.ok) {
      const body = await djangoRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error ?? "OAuth provider not available" },
        { status: djangoRes.status }
      );
    }

    ({ auth_url, state } = await djangoRes.json());
  } catch {
    return NextResponse.json(
      { error: "Cannot reach auth server" },
      { status: 503 }
    );
  }

  const response = NextResponse.redirect(auth_url);

  // Store state for CSRF validation in the callback
  response.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must be lax — browser sends it on the cross-site redirect back
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}

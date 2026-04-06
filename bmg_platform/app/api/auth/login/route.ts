import { NextRequest, NextResponse } from "next/server";
import { djangoLogin } from "@/lib/api/auth";
import { createSession } from "@/lib/auth/session";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const result = await djangoLogin(email, password);

    // OTP required — 202
    if ("requires_otp" in result && result.requires_otp) {
      return NextResponse.json(result, { status: 202 });
    }

    const { access, refresh } = result as { access: string; refresh: string };

    // Decode Django JWT payload (it's already signed by Django, we trust it)
    const parts = access.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Re-sign in our own session cookie format
    const sessionToken = await new SignJWT({
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      tenant_schema: payload.tenant_schema,
      jti: payload.jti,
      django_access: access,
      django_refresh: refresh,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({
      role: payload.role,
      email: payload.email,
    });

    response.cookies.set("bmg_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ detail: message }, { status: 401 });
  }
}

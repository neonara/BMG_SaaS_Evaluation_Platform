import { NextRequest, NextResponse } from "next/server";
import { djangoVerifyOTP } from "@/lib/api/auth";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
);

export async function POST(request: NextRequest) {
  try {
    const { email, otp_code, password, password_confirm } = await request.json();
    const { access, refresh } = await djangoVerifyOTP(
      email, otp_code,
      password ? { password, password_confirm } : undefined,
    );

    const parts = access.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

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

    const response = NextResponse.json({ role: payload.role, email: payload.email });
    response.cookies.set("bmg_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OTP verification failed";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

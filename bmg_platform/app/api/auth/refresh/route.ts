import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { djangoRefreshToken } from "@/lib/api/auth";

const secret = new TextEncoder().encode(
  process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
);

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("bmg_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ detail: "No session" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(sessionToken, secret);
    const refreshToken = String(payload.django_refresh ?? "");
    if (!refreshToken) throw new Error("No refresh token");

    const { access, refresh } = await djangoRefreshToken(refreshToken);

    // Decode new access token
    const parts = access.split(".");
    const newPayload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    const newSessionToken = await new SignJWT({
      ...payload,
      django_access: access,
      django_refresh: refresh,
      user_id: newPayload.user_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("bmg_session", newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch {
    const response = NextResponse.json({ detail: "Refresh failed" }, { status: 401 });
    response.cookies.delete("bmg_session");
    return response;
  }
}

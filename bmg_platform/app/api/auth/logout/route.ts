import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { djangoLogout } from "@/lib/api/auth";

const secret = new TextEncoder().encode(
  process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
);

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("bmg_session")?.value;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, secret);
      const refreshToken = String(payload.django_refresh ?? "");
      if (refreshToken) {
        await djangoLogout(refreshToken).catch(() => {}); // best-effort
      }
    } catch {
      // token already invalid, proceed
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("bmg_session");
  return response;
}

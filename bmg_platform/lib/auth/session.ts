import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload, SessionUser } from "./types";

const SESSION_COOKIE = "bmg_session";
const secret = new TextEncoder().encode(
  process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
);

export async function createSession(payload: JWTPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: String(payload.user_id),
      email: String(payload.email),
      role: payload.role as SessionUser["role"],
      tenantSchema: String(payload.tenant_schema),
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function updateSessionToken(newToken: string): Promise<void> {
  // newToken is the raw Django access token — wrap it in our session cookie
  // In production you'd decode it and re-sign. For now, store as-is.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

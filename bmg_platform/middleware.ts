import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/otp",
  "/password-reset",
  "/oauth",
  "/api/auth",
];

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix for path checks
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|ar)/, "") || "/";

  // 1. Run next-intl locale middleware
  const intlResponse = intlMiddleware(request);

  // 2. Attach tenant subdomain to headers for Server Components
  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0];
  const response = intlResponse ?? NextResponse.next();
  response.headers.set("x-tenant-subdomain", subdomain);
  response.headers.set("x-pathname", pathnameWithoutLocale);

  // 3. Auth guard — skip public paths and API routes
  const isPublic =
    PUBLIC_PATHS.some((p) => pathnameWithoutLocale.startsWith(p)) ||
    pathnameWithoutLocale.startsWith("/api/");

  if (isPublic) return response;

  // 4. Verify JWT from httpOnly cookie
  const sessionCookie = request.cookies.get("bmg_session")?.value;
  if (!sessionCookie) {
    const locale = pathname.split("/")[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXT_SESSION_SECRET ?? "fallback-dev-secret-32chars!!"
    );
    const { payload } = await jwtVerify(sessionCookie, secret);
    // Attach user info to headers for layouts
    response.headers.set("x-user-role", String(payload.role ?? ""));
    response.headers.set("x-user-id", String(payload.user_id ?? ""));
    response.headers.set("x-tenant-schema", String(payload.tenant_schema ?? "public"));
  } catch {
    const locale = pathname.split("/")[1] || "en";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("reason", "session_expired");
    const redirect = NextResponse.redirect(loginUrl);
    redirect.cookies.delete("bmg_session");
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\..*).*)"],
};

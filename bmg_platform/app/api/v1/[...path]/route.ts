/**
 * app/api/v1/[...path]/route.ts
 *
 * Generic BFF (Backend-for-Frontend) proxy.
 *
 * Why this exists:
 *   The Django REST API authenticates via `Authorization: Bearer <token>`.
 *   The access token lives inside the `bmg_session` httpOnly cookie, so
 *   browser JavaScript can never read it. This proxy runs server-side,
 *   extracts the token from the cookie, adds the header, and forwards the
 *   request to Django — then streams the response back to the browser.
 *
 * Usage: browser code calls `/api/v1/...` (Next.js origin) instead of
 * the Django origin directly. `apiClient` in lib/api/client.ts is
 * configured with `prefixUrl: "/"` to hit this proxy automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

// Internal Django URL — server-side only, never exposed to the browser.
const DJANGO_URL =
  process.env.DJANGO_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;

  const accessToken = await getAccessToken();

  // Build the Django URL, preserving the full query string.
  const djangoUrl = new URL(`/api/v1/${path.join("/")}`, DJANGO_URL);
  request.nextUrl.searchParams.forEach((value, key) =>
    djangoUrl.searchParams.set(key, value)
  );
  // Preserve trailing slash Django expects
  if (!djangoUrl.pathname.endsWith("/")) {
    djangoUrl.pathname += "/";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const isBodyMethod = !["GET", "HEAD"].includes(request.method);
  const body = isBodyMethod ? await request.text() : undefined;

  let djangoRes: Response;
  try {
    djangoRes = await fetch(djangoUrl.toString(), {
      method: request.method,
      headers,
      body,
    });
  } catch (err) {
    console.error("[proxy] Django unreachable:", err);
    return NextResponse.json({ detail: "Service temporarily unavailable." }, { status: 503 });
  }

  const text = await djangoRes.text();
  return new NextResponse(text, {
    status: djangoRes.status,
    headers: {
      "Content-Type": djangoRes.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

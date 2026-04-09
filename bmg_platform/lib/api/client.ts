import ky, { type KyInstance } from "ky";

const DJANGO_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Browser-side API client.
 *
 * Routes through the Next.js BFF proxy at /api/v1/[...path] so that the
 * server can attach the Authorization header from the httpOnly bmg_session
 * cookie. The browser never touches the Django origin directly.
 *
 * prefixUrl "/" means:
 *   apiClient.get("api/v1/users/")  →  GET /api/v1/users/  (Next.js proxy)
 */
export const apiClient: KyInstance = ky.create({
  prefixUrl: "/",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  hooks: {
    beforeError: [
      async (error) => {
        if (error.response?.status === 401) {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (!refreshRes.ok) {
            const locale = document.documentElement.lang || "en";
            window.location.href = `/${locale}/login?reason=session_expired`;
          }
          // On success, ky's retry fires with the updated cookie → proxy picks up
          // the new access token from the refreshed bmg_session automatically.
        }
        return error;
      },
    ],
  },
  retry: { limit: 1, statusCodes: [401] },
});

/**
 * Server-side API client (Server Components, Route Handlers).
 * Calls Django directly with an explicit Bearer token — no proxy needed.
 */
export function createServerApiClient(accessToken: string): KyInstance {
  return ky.create({
    prefixUrl: DJANGO_URL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

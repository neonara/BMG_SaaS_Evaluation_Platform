import ky, { type KyInstance } from "ky";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Client-side API instance — uses fetch with credentials
// JWT refresh is handled by the /api/auth/refresh Next.js route
export const apiClient: KyInstance = ky.create({
  prefixUrl: API_URL,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  hooks: {
    beforeError: [
      async (error) => {
        const { response } = error;
        if (response?.status === 401) {
          // Try refreshing the token
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            // Retry the original request — ky handles this via retry
          } else {
            // Refresh failed — redirect to login
            const locale = document.documentElement.lang || "en";
            window.location.href = `/${locale}/login?reason=session_expired`;
          }
        }
        return error;
      },
    ],
  },
  retry: { limit: 1, statusCodes: [401] },
});

// Server-side API instance — attaches Authorization header from session
export function createServerApiClient(accessToken: string): KyInstance {
  return ky.create({
    prefixUrl: API_URL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

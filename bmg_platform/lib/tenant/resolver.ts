import type { Tenant } from "@/lib/api/tenants";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Cache tenant branding server-side (Next.js fetch cache)
export async function getTenantBranding(
  subdomain: string
): Promise<Pick<Tenant, "name" | "logo_url" | "primary_color"> | null> {
  if (!subdomain || subdomain === "localhost" || subdomain === "127") {
    return { name: "BMG Platform", logo_url: "", primary_color: "#1E3A8A" };
  }

  try {
    const res = await fetch(
      `${API_URL}/api/v1/tenants/?domain=${subdomain}.bmg.tn`,
      {
        next: { revalidate: 300 }, // cache 5 min
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const tenant = data.results?.[0];
    if (!tenant) return null;

    return {
      name: tenant.name,
      logo_url: tenant.logo_url,
      primary_color: tenant.primary_color,
    };
  } catch {
    return null;
  }
}

import { requireRole } from "@/lib/auth/guards";
import { getAccessToken } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import type { Tenant } from "@/lib/api/tenants";
import { Badge } from "@/components/ui/Badge";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

async function fetchTenant(id: string, token: string): Promise<Tenant | null> {
  const DJANGO_URL =
    process.env.DJANGO_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";
  const res = await fetch(`${DJANGO_URL}/api/v1/tenants/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Django ${res.status}`);
  return res.json();
}

export default async function TenantDetailPage({ params }: Props) {
  const { locale, id } = await params;
  await requireRole(locale, ["super_admin"]);

  const token = await getAccessToken();
  if (!token) notFound();

  const tenant = await fetchTenant(id, token);
  if (!tenant) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/tenants`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </a>
        <h1 className="text-2xl font-semibold text-gray-900">{tenant.name}</h1>
        <Badge variant="tenant_status" value={tenant.status} />
      </div>

      <div className="card p-6 space-y-5">
        <Row label="Schema name">
          <span className="font-mono text-sm text-gray-700">{tenant.schema_name}</span>
        </Row>
        <Row label="Primary domain">
          <span className="text-gray-700">
            {tenant.domains.find((d) => d.is_primary)?.domain ??
              tenant.domains[0]?.domain ??
              "—"}
          </span>
        </Row>
        <Row label="Email domain">
          <span className="text-gray-700">
            {tenant.domains[0]?.email_domain || "—"}
          </span>
        </Row>
        <Row label="Brand color">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-200"
              style={{ background: tenant.primary_color }}
            />
            <span className="font-mono text-sm text-gray-600">{tenant.primary_color}</span>
          </div>
        </Row>
        <Row label="Created">
          <span className="text-gray-700">
            {new Date(tenant.created_on).toLocaleDateString()}
          </span>
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-36 flex-shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

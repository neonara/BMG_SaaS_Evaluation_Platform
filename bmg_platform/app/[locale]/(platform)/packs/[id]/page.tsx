import { requireRole } from "@/lib/auth/guards";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import type { Pack, Voucher } from "@/lib/api/packs";
import { AddTestToPackForm } from "@/components/packs/AddTestToPackForm";
import { GenerateVouchersForm } from "@/components/packs/GenerateVouchersForm";

interface Props { params: Promise<{ locale: string; id: string }> }

export default async function PackDetailPage({ params }: Props) {
  const { locale, id } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr"]);
  const session = await getSession();
  const isSuperAdmin = session?.role === "super_admin";
  const canSeeVouchers = session?.role === "super_admin" || session?.role === "admin_client";

  const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [packRes, voucherRes] = await Promise.all([
    fetch(`${DJANGO_URL}/api/v1/packs/${id}/`, { headers, cache: "no-store" }),
    canSeeVouchers
      ? fetch(`${DJANGO_URL}/api/v1/packs/${id}/vouchers/`, { headers, cache: "no-store" })
      : null,
  ]);

  if (!packRes.ok) notFound();
  const pack: Pack = await packRes.json();
  const voucherData = voucherRes?.ok ? await voucherRes.json() : null;
  const vouchers: Voucher[] = voucherData?.results ?? [];

  // Fetch all tenants for voucher generation (super_admin only)
  let tenants: Array<{ id: string; name: string }> = [];
  if (isSuperAdmin) {
    try {
      const res = await fetch(`${DJANGO_URL}/api/v1/tenants/`, { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        tenants = (data.results ?? data).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));
      }
    } catch { /* not fatal */ }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/packs`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{pack.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          pack.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>{pack.status}</span>
      </div>

      {/* Metadata */}
      <div className="card p-5 mb-6 grid grid-cols-2 gap-4 text-sm">
        {pack.description && (
          <div className="col-span-2 text-gray-600">{pack.description}</div>
        )}
        <div><span className="text-gray-500">Price:</span> <span className="font-medium ms-1">{Number(pack.price).toFixed(2)} {pack.currency}</span></div>
        <div><span className="text-gray-500">Max candidates:</span> <span className="font-medium ms-1">{pack.max_candidates}</span></div>
        <div><span className="text-gray-500">Validity:</span> <span className="font-medium ms-1">{pack.validity_days} days</span></div>
        <div><span className="text-gray-500">Tests:</span> <span className="font-medium ms-1">{pack.test_count}</span></div>
      </div>

      {/* Included tests */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Included tests</h2>
        {pack.tests.length === 0 ? (
          <p className="text-sm text-gray-400">No tests added yet.</p>
        ) : (
          <div className="card divide-y divide-gray-100">
            {pack.tests.map((pt) => (
              <div key={pt.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pt.test_title}</p>
                  <p className="text-xs text-gray-400 capitalize">{pt.test_category} · {pt.test_status}</p>
                </div>
                <span className="text-xs text-gray-400">#{pt.order}</span>
              </div>
            ))}
          </div>
        )}

        {isSuperAdmin && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Add test to pack</h3>
            <AddTestToPackForm packId={pack.id} />
          </div>
        )}
      </div>

      {/* Vouchers */}
      {canSeeVouchers && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Vouchers ({voucherData?.count ?? 0})
          </h2>

          {vouchers.length > 0 && (
            <div className="card overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Tenant</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vouchers.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-2 font-mono text-xs">{v.code}</td>
                      <td className="px-4 py-2 text-gray-600">{v.tenant_name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.status === "unused" ? "bg-blue-100 text-blue-700"
                          : v.status === "used" ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                        }`}>{v.status}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {new Date(v.expires_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isSuperAdmin && tenants.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Generate vouchers</h3>
              <GenerateVouchersForm packId={pack.id} tenants={tenants} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

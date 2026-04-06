"use client";
import { useEffect, useState } from "react";
import { getTenants } from "@/lib/api/tenants";
import type { Tenant } from "@/lib/api/tenants";
import { Badge } from "@/components/ui/Badge";

export function TenantTable({ locale }: { locale: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    getTenants(page).then((d) => { setTenants(d.results); setTotal(d.count); }).finally(() => setLoading(false));
  }, [page]);
  const totalPages = Math.ceil(total / 20);
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Name","Schema","Domain","Status","Brand","Created"].map(h => (
                <th key={h} className="text-start px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            : tenants.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No tenants.</td></tr>
            : tenants.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium"><a href={`/${locale}/tenants/${t.id}`} className="hover:text-primary">{t.name}</a></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.schema_name}</td>
                <td className="px-4 py-3 text-gray-600">{t.domains[0]?.domain ?? "—"}</td>
                <td className="px-4 py-3"><Badge variant="tenant_status" value={t.status} /></td>
                <td className="px-4 py-3"><div className="w-5 h-5 rounded inline-block border border-gray-200" style={{ background: t.primary_color }} /></td>
                <td className="px-4 py-3 text-gray-500">{new Date(t.created_on).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">{total} tenants</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

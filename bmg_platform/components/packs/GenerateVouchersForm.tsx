"use client";
import { useState } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { generateVouchers } from "@/lib/api/packs";

interface Props {
  packId: string;
  tenants: Array<{ id: string; name: string }>;
}

export function GenerateVouchersForm({ packId, tenants }: Props) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [validityDays, setValidityDays] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const vouchers = await generateVouchers(
        packId,
        quantity,
        tenantId,
        validityDays ? Number(validityDays) : undefined
      );
      setSuccess(`${vouchers.length} voucher(s) generated.`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate vouchers");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      {success && <div className="p-2 bg-green-50 text-green-700 text-sm rounded">{success}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Tenant</label>
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="input text-sm">
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
          <input type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Validity (days)</label>
          <input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value ? Number(e.target.value) : "")} placeholder="Default" className="input text-sm" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary text-sm">
        {loading ? "Generating..." : "Generate vouchers"}
      </button>
    </form>
  );
}

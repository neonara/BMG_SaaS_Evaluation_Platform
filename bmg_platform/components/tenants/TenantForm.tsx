"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createTenant } from "@/lib/api/tenants";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(2),
  schema_name: z.string().min(2),
  domain: z.string().min(3),
  email_domain: z.string().optional(),
  status: z.enum(["active","suspended","trial"]),
  primary_color: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function TenantForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "trial", primary_color: "#1E3A8A" },
  });
  async function onSubmit(data: FormData) {
    setErr(null);
    try { const t = await createTenant(data); router.push(`/${locale}/tenants/${t.id}`); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name</label>
          <input {...register("name")} className="input" placeholder="Acme Corporation" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Schema name</label>
          <input {...register("schema_name")} className="input font-mono text-sm" placeholder="acme_corp" />
          <p className="mt-1 text-xs text-gray-400">Lowercase snake_case. Immutable after creation.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
          <input {...register("domain")} className="input" placeholder="acme.bmg.tn" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email domain</label>
          <input {...register("email_domain")} className="input" placeholder="acme.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register("status")} className="input">
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand color</label>
            <input {...register("primary_color")} type="color" className="h-10 w-full border border-gray-300 rounded-lg p-1 cursor-pointer" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Creating..." : "Create tenant"}</button>
          <a href={`/${locale}/tenants`} className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}

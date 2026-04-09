"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "@/lib/i18n/routing";
import { createPack } from "@/lib/api/packs";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  currency: z.enum(["TND", "EUR", "USD"]),
  max_candidates: z.coerce.number().int().min(0),
  validity_days: z.coerce.number().int().min(1),
  status: z.enum(["active", "inactive"]),
});
type FormData = z.infer<typeof schema>;

export function PackForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: "TND",
      max_candidates: 50,
      validity_days: 365,
      status: "active",
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const pack = await createPack(data);
      router.push(`/packs/${pack.id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create pack");
    }
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{serverError}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pack name</label>
          <input {...register("name")} className="input" placeholder="e.g. HR Starter Pack" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea {...register("description")} rows={2} className="input resize-none" placeholder="Optional description..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input {...register("price")} type="number" min={0} step={0.01} className="input" />
            {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select {...register("currency")} className="input">
              <option value="TND">TND</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max candidates</label>
            <input {...register("max_candidates")} type="number" min={0} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validity (days)</label>
            <input {...register("validity_days")} type="number" min={1} className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select {...register("status")} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Creating..." : "Create pack"}
          </button>
          <a href={`/${locale}/packs`} className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}

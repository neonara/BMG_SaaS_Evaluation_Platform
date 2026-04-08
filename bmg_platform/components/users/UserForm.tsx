"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api/users";
import type { Role, SessionUser } from "@/lib/auth/types";
import { useState } from "react";

const ROLES: Role[] = ["admin_client","hr","manager","internal_candidate","external_candidate"];

interface TenantOption {
  schema_name: string;
  name: string;
}

const schema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(["admin_client","hr","manager","internal_candidate","external_candidate"]),
  tenant_schema: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  locale: string;
  session?: SessionUser | null;
  tenants?: TenantOption[];
}

export function UserForm({ locale, session, tenants = [] }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const isSuperAdmin = session?.role === "super_admin";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "internal_candidate",
      tenant_schema: isSuperAdmin ? (tenants[0]?.schema_name ?? "") : (session?.tenantSchema ?? ""),
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      // Non-super_admin: always use their own tenant schema
      const payload = {
        ...data,
        tenant_schema: isSuperAdmin ? data.tenant_schema : (session?.tenantSchema ?? ""),
      };
      const user = await createUser(payload);
      router.push(`/${locale}/users/${user.id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input {...register("first_name")} className="input" />
            {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input {...register("last_name")} className="input" />
            {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input {...register("email")} type="email" className="input" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select {...register("role")} className="input">
            {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
          </select>
        </div>
        {isSuperAdmin && tenants.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
            <select {...register("tenant_schema")} className="input">
              {tenants.map((t) => (
                <option key={t.schema_name} value={t.schema_name}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
        {!isSuperAdmin && session?.tenantSchema && session.tenantSchema !== "public" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
            <input
              value={session.tenantSchema.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              className="input bg-gray-50 text-gray-500"
              readOnly
            />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Creating..." : "Create user"}
          </button>
          <a href={`/${locale}/users`} className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}

"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api/users";
import type { Role, SessionUser } from "@/lib/auth/types";
import { useState } from "react";

interface TenantOption {
  schema_name: string;
  name: string;
}

interface ManagerOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Which roles each creator is allowed to assign
const ROLES_BY_CREATOR: Record<string, Role[]> = {
  super_admin: ["admin_client", "hr", "manager", "internal_candidate", "external_candidate"],
  admin_client: ["hr", "manager"],
  hr: ["manager", "internal_candidate"],
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin_client: "Admin Client",
  hr: "HR",
  manager: "Manager",
  internal_candidate: "Internal Candidate",
  external_candidate: "External Candidate",
};

const schema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(["admin_client", "hr", "manager", "internal_candidate", "external_candidate"]),
  tenant_schema: z.string().optional(),
  assigned_manager: z.string().uuid().optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

interface Props {
  locale: string;
  session?: SessionUser | null;
  tenants?: TenantOption[];
  managers?: ManagerOption[];
}

export function UserForm({ locale, session, tenants = [], managers = [] }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const creatorRole = session?.role ?? "hr";
  const isSuperAdmin = creatorRole === "super_admin";
  const availableRoles = ROLES_BY_CREATOR[creatorRole] ?? [];

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: (availableRoles[0] ?? "manager") as Role,
      tenant_schema: isSuperAdmin ? (tenants[0]?.schema_name ?? "") : (session?.tenantSchema ?? ""),
      assigned_manager: "",
    },
  });

  const selectedRole = useWatch({ control, name: "role" });
  const showManagerPicker = creatorRole === "hr" && selectedRole === "internal_candidate" && managers.length > 0;

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const payload = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        tenant_schema: isSuperAdmin ? data.tenant_schema : (session?.tenantSchema ?? ""),
        ...(data.assigned_manager ? { assigned_manager: data.assigned_manager } : {}),
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
            {availableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
        </div>

        {/* Manager assignment — only HR creating internal candidates */}
        {showManagerPicker && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to manager</label>
            <select {...register("assigned_manager")} className="input">
              <option value="">— No manager assigned —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} ({m.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tenant picker — super_admin only */}
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

        {/* Read-only org display — admin_client / hr */}
        {!isSuperAdmin && session?.tenantSchema && session.tenantSchema !== "public" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
            <input
              value={session.tenantSchema.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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

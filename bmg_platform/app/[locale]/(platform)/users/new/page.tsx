import { requireRole } from "@/lib/auth/guards";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import { UserForm } from "@/components/users/UserForm";

interface Props { params: Promise<{ locale: string }> }

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

export default async function NewUserPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr"]);
  const t = await getTranslations("users");
  const session = await getSession();

  const DJANGO_URL =
    process.env.DJANGO_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  let tenants: TenantOption[] = [];
  let managers: ManagerOption[] = [];

  // super_admin gets a tenant picker
  if (session?.role === "super_admin") {
    try {
      const res = await fetch(`${DJANGO_URL}/api/v1/tenants/`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        tenants = (data.results ?? data).map((t: { schema_name: string; name: string }) => ({
          schema_name: t.schema_name,
          name: t.name,
        }));
      }
    } catch {
      // not fatal
    }
  }

  // HR gets a manager picker to assign internal candidates
  if (session?.role === "hr") {
    try {
      const res = await fetch(`${DJANGO_URL}/api/v1/users/?role=manager`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        managers = (data.results ?? data).map((u: ManagerOption) => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
        }));
      }
    } catch {
      // not fatal
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/users`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{t("newUser")}</h1>
      </div>
      <UserForm
        locale={locale}
        session={session}
        tenants={tenants}
        managers={managers}
      />
    </div>
  );
}

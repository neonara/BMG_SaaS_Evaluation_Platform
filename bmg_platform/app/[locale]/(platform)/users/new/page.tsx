import { requireRole } from "@/lib/auth/guards";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import { UserForm } from "@/components/users/UserForm";

interface Props { params: Promise<{ locale: string }> }

interface TenantOption {
  schema_name: string;
  name: string;
}

export default async function NewUserPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr"]);
  const t = await getTranslations("users");
  const session = await getSession();

  let tenants: TenantOption[] = [];

  if (session?.role === "super_admin") {
    const DJANGO_URL =
      process.env.DJANGO_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000";
    const token = await getAccessToken();
    try {
      const res = await fetch(`${DJANGO_URL}/api/v1/tenants/`, {
        headers: { Authorization: `Bearer ${token}` },
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
      // not fatal — super_admin can still create without a tenant picker
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
      />
    </div>
  );
}

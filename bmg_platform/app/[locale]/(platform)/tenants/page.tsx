import { requireRole } from "@/lib/auth/guards";
import { getTranslations } from "next-intl/server";
import { TenantTable } from "@/components/tenants/TenantTable";

interface Props { params: Promise<{ locale: string }> }

export default async function TenantsPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin"]);
  const t = await getTranslations("tenants");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <a href={`/${locale}/tenants/new`} className="btn-primary text-sm">
          + {t("newTenant")}
        </a>
      </div>
      <TenantTable locale={locale} />
    </div>
  );
}

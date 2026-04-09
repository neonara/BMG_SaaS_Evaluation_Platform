import { requireRole } from "@/lib/auth/guards";
import { getTranslations } from "next-intl/server";
import { UserTable } from "@/components/users/UserTable";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; search?: string; role?: string; status?: string }>;
}

export default async function UsersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  await requireRole(locale, ["super_admin", "admin_client", "hr", "manager"]);

  const t = await getTranslations("users");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <div className="flex gap-2">
          <a href={`/${locale}/users/new`} className="btn-primary text-sm">
            + {t("newUser")}
          </a>
        </div>
      </div>
      <UserTable
        locale={locale}
        initialPage={Number(sp.page ?? 1)}
        initialSearch={sp.search}
      />
    </div>
  );
}

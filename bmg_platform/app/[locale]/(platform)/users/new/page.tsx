import { requireRole } from "@/lib/auth/guards";
import { getTranslations } from "next-intl/server";
import { UserForm } from "@/components/users/UserForm";

interface Props { params: Promise<{ locale: string }> }

export default async function NewUserPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr"]);
  const t = await getTranslations("users");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/users`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{t("newUser")}</h1>
      </div>
      <UserForm locale={locale} />
    </div>
  );
}

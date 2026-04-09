import { requireRole } from "@/lib/auth/guards";
import { getTranslations } from "next-intl/server";
import { PackForm } from "@/components/packs/PackForm";

interface Props { params: Promise<{ locale: string }> }

export default async function NewPackPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin"]);
  const t = await getTranslations("packs");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/packs`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{t("newPack")}</h1>
      </div>
      <PackForm locale={locale} />
    </div>
  );
}

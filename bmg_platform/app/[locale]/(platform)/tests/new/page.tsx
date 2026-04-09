import { requireRole } from "@/lib/auth/guards";
import { getTranslations } from "next-intl/server";
import { TestForm } from "@/components/tests/TestForm";

interface Props { params: Promise<{ locale: string }> }

export default async function NewTestPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin"]);
  const t = await getTranslations("tests");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/tests`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{t("newTest")}</h1>
      </div>
      <TestForm locale={locale} />
    </div>
  );
}

import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { getTranslations } from "next-intl/server";

interface Props { params: Promise<{ locale: string }> }

export default async function PasswordResetPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("auth");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">{t("resetPassword")}</h1>
        </div>
        <PasswordResetForm locale={locale} />
      </div>
    </div>
  );
}

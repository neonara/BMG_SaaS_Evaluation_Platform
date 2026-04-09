import { OTPForm } from "@/components/auth/OTPForm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; mode?: string }>;
}

export default async function OTPPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { email, mode } = await searchParams;
  const t = await getTranslations("auth");

  if (!email) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4"
            style={{ background: "var(--color-primary)" }}
          >
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("otpTitle")}</h1>
          {email && (
            <p className="text-sm text-gray-500 mt-1">
              {t("otpDescription", { email })}
            </p>
          )}
        </div>
        <OTPForm locale={locale} email={email ?? ""} requirePassword={mode === "activate"} />
      </div>
    </div>
  );
}

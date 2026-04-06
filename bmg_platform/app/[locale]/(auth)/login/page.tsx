import { LoginForm } from "@/components/auth/LoginForm";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { reason } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4"
            style={{ background: "var(--color-primary)" }}
          >
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("loginTitle")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("loginDescription")}</p>
        </div>

        {/* Session expired banner */}
        {reason === "session_expired" && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Your session expired. Please sign in again.
          </div>
        )}
        {reason === "deactivated" && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            Your account has been deactivated. Contact your administrator.
          </div>
        )}

        <LoginForm locale={locale} />
      </div>
    </div>
  );
}

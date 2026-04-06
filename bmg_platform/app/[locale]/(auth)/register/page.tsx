import { RegisterForm } from "@/components/auth/RegisterForm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4"
            style={{ background: "var(--color-primary)" }}
          >
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("registerTitle")}
          </h1>
        </div>
        <RegisterForm locale={locale} />
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            {t("login")}
          </Link>
        </p>
      </div>
      
    </div>
  );
}

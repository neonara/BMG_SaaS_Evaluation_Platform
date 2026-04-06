"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "@/lib/i18n/routing";
import { useTranslations } from "next-intl";
import { useState } from "react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  password_confirm: z.string(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
}).refine((d) => d.password === d.password_confirm, {
  message: "Passwords do not match",
  path: ["password_confirm"],
});
type FormData = z.infer<typeof schema>;

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(JSON.stringify(body.detail));
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  if (success) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-medium text-gray-900">Account created!</p>
        <p className="text-sm text-gray-500 mt-1">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("firstName")}
            </label>
            <input {...register("first_name")} className="input" />
            {errors.first_name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("lastName")}
            </label>
            <input {...register("last_name")} className="input" />
            {errors.last_name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("email")}
          </label>
          <input {...register("email")} type="email" className="input" />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("password")}
          </label>
          <input {...register("password")} type="password" className="input" />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("passwordConfirm")}
          </label>
          <input
            {...register("password_confirm")}
            type="password"
            className="input"
          />
          {errors.password_confirm && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password_confirm.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? "Creating account..." : t("register")}
        </button>
      </form>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white px-2">or</span>
        </div>
      </div>

      {/* ── Social auth — always LTR (logos + English brand names) ──── */}
      <div className="space-y-2">
        <a
          href="/api/auth/oauth/google"
          dir="ltr"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("continueWithGoogle")}
        </a>
        <a
          href="/api/auth/oauth/linkedin"
          dir="ltr"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#0A66C2"
            aria-hidden
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          {t("continueWithLinkedIn")}
        </a>
      </div>
    </div>
  );
}

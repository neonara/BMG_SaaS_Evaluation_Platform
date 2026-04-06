"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

const schema = z.object({
  password: z.string().min(8),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "Passwords do not match",
  path: ["password_confirm"],
});
type FormData = z.infer<typeof schema>;

interface Props { locale: string; token: string }

export function PasswordResetConfirmForm({ locale, token }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/password/reset/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password, password_confirm: data.password_confirm }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.detail ?? "Reset failed");
      return;
    }
    router.push(`/${locale}/login`);
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("password")}</label>
          <input {...register("password")} type="password" className="input" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("passwordConfirm")}</label>
          <input {...register("password_confirm")} type="password" className="input" />
          {errors.password_confirm && <p className="mt-1 text-xs text-red-600">{errors.password_confirm.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Resetting..." : t("resetPassword")}
        </button>
      </form>
    </div>
  );
}

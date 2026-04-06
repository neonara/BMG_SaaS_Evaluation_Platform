"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useState } from "react";

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export function PasswordResetForm({ locale: _locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/password/reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitted(true); // Always show success (no email enumeration)
  }

  if (submitted) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-700">{t("passwordResetEmailSent")}</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
          <input {...register("email")} type="email" className="input" />
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Sending..." : t("sendResetLink")}
        </button>
      </form>
    </div>
  );
}

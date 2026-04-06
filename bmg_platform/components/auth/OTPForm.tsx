"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props { locale: string; email: string }

export function OTPForm({ locale, email }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit() {
    const code = digits.join("");
    if (code.length !== 6) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp_code: code }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail ?? "Invalid code");
        setDigits(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        return;
      }
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-2 justify-center mb-6">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties}
          />
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || digits.join("").length !== 6}
        className="btn-primary w-full"
      >
        {submitting ? "Verifying..." : t("otpVerify")}
      </button>
    </div>
  );
}

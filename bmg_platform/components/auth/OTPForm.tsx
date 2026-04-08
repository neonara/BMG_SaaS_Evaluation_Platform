"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props {
  locale: string;
  email: string;
  /** When true (mode=activate), show a password-setting step after the OTP. */
  requirePassword?: boolean;
}

export function OTPForm({ locale, email, requirePassword = false }: Props) {
  const t = useTranslations("auth");
  const router = useRouter();

  // Step 1 — OTP digits
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 2 — password (only when requirePassword)
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleDigitChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < 5) refs.current[index + 1]?.focus();
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  // ── Step 1: verify OTP ────────────────────────────────────────────────────
  async function handleVerifyOTP() {
    const code = digits.join("");
    if (code.length !== 6) return;
    setError(null);
    setSubmitting(true);

    try {
      if (requirePassword) {
        // Just validate the OTP client-side check length, advance to step 2.
        // Actual submission happens in step 2 together with the password.
        setVerifiedCode(code);
        setStep(2);
        return;
      }

      // Normal flow (internal candidates): submit immediately.
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
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 2: set password + complete activation ────────────────────────────
  async function handleSetPassword() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp_code: verifiedCode,
          password,
          password_confirm: passwordConfirm,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail ?? "Activation failed. Please request a new code.");
        setStep(1);
        setDigits(["", "", "", "", "", ""]);
        setPassword("");
        setPasswordConfirm("");
        return;
      }
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 2 UI ─────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Email verified</p>
          <p className="text-xs text-gray-500 mt-1">Now choose a password for your account.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoFocus
            />
            {password.length > 0 && password.length < 8 && (
              <p className="mt-1 text-xs text-red-600">{t("passwordTooShort")}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("passwordConfirm")}
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="input"
            />
          </div>
          <button
            onClick={handleSetPassword}
            disabled={submitting || password.length < 8 || password !== passwordConfirm}
            className="btn-primary w-full"
          >
            {submitting ? "Activating..." : "Set password & activate"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1 UI ─────────────────────────────────────────────────────────────
  return (
    <div className="card p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-2 justify-center mb-6" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e)}
            onKeyDown={(e) => handleDigitKeyDown(i, e)}
            className="w-11 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties}
          />
        ))}
      </div>
      <button
        onClick={handleVerifyOTP}
        disabled={submitting || digits.join("").length !== 6}
        className="btn-primary w-full"
      >
        {submitting ? "Verifying..." : t("otpVerify")}
      </button>
    </div>
  );
}

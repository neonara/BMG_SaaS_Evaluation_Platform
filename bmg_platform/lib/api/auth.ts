// These functions are called from Next.js API routes (server-side)
// They talk directly to Django

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface OTPRequiredResponse {
  detail: string;
  requires_otp: boolean;
}

export async function djangoLogin(
  email: string,
  password: string
): Promise<LoginResponse | OTPRequiredResponse> {
  const res = await fetch(`${API_URL}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.status === 202) {
    return data as OTPRequiredResponse;
  }
  if (!res.ok) {
    throw new Error(data?.detail ?? "Login failed");
  }
  return data as LoginResponse;
}

export async function djangoRefreshToken(
  refreshToken: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }
  return res.json();
}

export async function djangoLogout(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

export async function djangoVerifyOTP(
  email: string,
  otpCode: string,
  passwordPayload?: { password: string; password_confirm: string },
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/otp/verify/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp_code: otpCode, ...passwordPayload }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.detail ?? "OTP verification failed");
  }
  return res.json();
}

export async function djangoRegisterExternal(data: {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(JSON.stringify(body?.detail ?? "Registration failed"));
  }
}

export async function djangoPasswordResetRequest(email: string): Promise<void> {
  await fetch(`${API_URL}/api/auth/password/reset/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  // Always 200 — no email enumeration
}

export async function djangoPasswordResetConfirm(
  token: string,
  password: string,
  passwordConfirm: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/password/reset/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, password_confirm: passwordConfirm }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.detail ?? "Password reset failed");
  }
}

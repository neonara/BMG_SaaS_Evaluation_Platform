import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Role, SessionUser } from "./types";

export async function requireAuth(locale: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  return session;
}

export async function requireRole(
  locale: string,
  allowedRoles: Role[]
): Promise<SessionUser> {
  const session = await requireAuth(locale);
  if (!allowedRoles.includes(session.role)) {
    redirect(`/${locale}/dashboard`);
  }
  return session;
}

// Role hierarchy helpers
export const ADMIN_ROLES: Role[] = ["super_admin", "admin_client", "hr"];
export const ORG_ROLES: Role[] = ["admin_client", "hr", "manager"];
export const CANDIDATE_ROLES: Role[] = ["internal_candidate", "external_candidate"];

export function canManageUsers(role: Role): boolean {
  return ["super_admin", "admin_client", "hr"].includes(role);
}

export function canManageTenants(role: Role): boolean {
  return role === "super_admin";
}

export function canMonitorAntiCheat(role: Role): boolean {
  return role === "super_admin";
}

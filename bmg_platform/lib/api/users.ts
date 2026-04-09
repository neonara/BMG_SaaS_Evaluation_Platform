import { apiClient } from "./client";
import type { Role } from "@/lib/auth/types";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  status: "active" | "pending_otp" | "deactivated";
  personal_email?: string;
  deactivated_at?: string;
  date_joined: string;
  organisation?: string;
}

export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  tenant_schema?: string;
  assigned_manager?: string;
}

export async function getMe(): Promise<User> {
  return apiClient.get("api/v1/users/me/").json<User>();
}

export async function updateMe(data: Partial<Pick<User, "first_name" | "last_name">>): Promise<User> {
  return apiClient.patch("api/v1/users/me/", { json: data }).json<User>();
}

export async function getUsers(params?: {
  page?: number;
  role?: Role;
  status?: string;
  search?: string;
}): Promise<PaginatedUsers> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.role) searchParams.set("role", params.role);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  return apiClient
    .get(`api/v1/users/?${searchParams.toString()}`)
    .json<PaginatedUsers>();
}

export async function getUser(id: string): Promise<User> {
  return apiClient.get(`api/v1/users/${id}/`).json<User>();
}

export async function createUser(data: CreateUserPayload): Promise<User> {
  return apiClient.post("api/v1/users/", { json: data }).json<User>();
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "first_name" | "last_name" | "role">>
): Promise<User> {
  return apiClient.patch(`api/v1/users/${id}/`, { json: data }).json<User>();
}

export async function deactivateUser(
  id: string,
  reason: string
): Promise<User> {
  return apiClient
    .post(`api/v1/users/${id}/deactivate/`, { json: { reason } })
    .json<User>();
}

export async function reactivateUser(id: string): Promise<User> {
  return apiClient.post(`api/v1/users/${id}/reactivate/`).json<User>();
}

export async function inviteUsers(
  invitations: Array<{ email: string; role: Role }>
): Promise<{ invited: number }> {
  return apiClient
    .post("api/v1/users/provision/invite/", { json: { invitations } })
    .json<{ invited: number }>();
}

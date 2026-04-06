import { apiClient } from "./client";

export interface Tenant {
  id: string;
  name: string;
  schema_name: string;
  status: "active" | "suspended" | "trial";
  logo_url: string;
  primary_color: string;
  created_on: string;
  domains: Array<{ domain: string; email_domain: string; is_primary: boolean }>;
}

export interface PaginatedTenants {
  count: number;
  next: string | null;
  previous: string | null;
  results: Tenant[];
}

export interface CreateTenantPayload {
  name: string;
  schema_name: string;
  domain: string;
  email_domain?: string;
  status?: "active" | "suspended" | "trial";
  logo_url?: string;
  primary_color?: string;
}

export async function getTenants(page = 1): Promise<PaginatedTenants> {
  return apiClient.get(`api/v1/tenants/?page=${page}`).json<PaginatedTenants>();
}

export async function getTenant(id: string): Promise<Tenant> {
  return apiClient.get(`api/v1/tenants/${id}/`).json<Tenant>();
}

export async function createTenant(data: CreateTenantPayload): Promise<Tenant> {
  return apiClient.post("api/v1/tenants/", { json: data }).json<Tenant>();
}

export async function updateTenant(
  id: string,
  data: Partial<Pick<Tenant, "name" | "status" | "logo_url" | "primary_color">>
): Promise<Tenant> {
  return apiClient.patch(`api/v1/tenants/${id}/`, { json: data }).json<Tenant>();
}

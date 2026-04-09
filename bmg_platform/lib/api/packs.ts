import { apiClient } from "./client";
import type { TestModel } from "./tests";

export interface PackTest {
  id: string;
  test_id: string;
  test_title: string;
  test_category: string;
  test_status: string;
  order: number;
  added_at: string;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  max_candidates: number;
  validity_days: number;
  status: "active" | "inactive" | "archived";
  test_count: number;
  tests: PackTest[];
  created_at: string;
  updated_at: string;
}

export interface PublicPack {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  max_candidates: number;
  validity_days: number;
  test_count: number;
}

export interface Voucher {
  id: string;
  code: string;
  status: "unused" | "used" | "expired" | "revoked";
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by_email: string;
  pack_name: string;
  tenant_name: string;
  created_at: string;
}

export interface TenantPackAccess {
  id: string;
  pack: Pack;
  access_expires_at: string;
  granted_at: string;
  is_active: boolean;
}

export interface CreatePackPayload {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  max_candidates?: number;
  validity_days?: number;
  status?: "active" | "inactive";
}

export async function getPacks(): Promise<{ count: number; results: Pack[] }> {
  return apiClient.get("api/v1/packs/").json();
}

export async function getPack(id: string): Promise<Pack> {
  return apiClient.get(`api/v1/packs/${id}/`).json<Pack>();
}

export async function createPack(data: CreatePackPayload): Promise<Pack> {
  return apiClient.post("api/v1/packs/", { json: data }).json<Pack>();
}

export async function updatePack(id: string, data: Partial<CreatePackPayload>): Promise<Pack> {
  return apiClient.patch(`api/v1/packs/${id}/`, { json: data }).json<Pack>();
}

export async function addTestToPack(packId: string, testId: string, order = 1): Promise<PackTest> {
  return apiClient
    .post(`api/v1/packs/${packId}/tests/`, { json: { test_id: testId, order } })
    .json<PackTest>();
}

export async function getVouchers(
  packId: string
): Promise<{ count: number; results: Voucher[] }> {
  return apiClient.get(`api/v1/packs/${packId}/vouchers/`).json();
}

export async function generateVouchers(
  packId: string,
  quantity: number,
  tenantId: string,
  validityDays?: number
): Promise<Voucher[]> {
  return apiClient
    .post(`api/v1/packs/${packId}/vouchers/`, {
      json: { quantity, tenant_id: tenantId, ...(validityDays ? { validity_days: validityDays } : {}) },
    })
    .json<Voucher[]>();
}

export async function redeemVoucher(code: string): Promise<{
  status: string;
  pack: Pack;
  access_expires_at: string;
}> {
  return apiClient.post("api/v1/packs/redeem/", { json: { code } }).json();
}

export async function getMyPackAccess(): Promise<TenantPackAccess[]> {
  return apiClient.get("api/v1/packs/my-access/").json<TenantPackAccess[]>();
}

export async function getPublicPacks(): Promise<PublicPack[]> {
  return apiClient.get("api/v1/public/packs/").json<PublicPack[]>();
}

// JWT payload injected by Django CustomTokenObtainPairSerializer
export type Role =
  | "super_admin"
  | "admin_client"
  | "hr"
  | "manager"
  | "internal_candidate"
  | "external_candidate";

export interface JWTPayload {
  user_id: string;
  email: string;
  role: Role;
  tenant_schema: string;
  jti: string;
  exp: number;
  iat: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  tenantSchema: string;
}

type Variant = "role" | "status" | "tenant_status";

const STATUS_STYLES: Record<string, string> = {
  active:       "bg-green-100 text-green-800",
  pending_otp:  "bg-yellow-100 text-yellow-800",
  deactivated:  "bg-red-100 text-red-800",
};

const ROLE_STYLES: Record<string, string> = {
  super_admin:        "bg-purple-100 text-purple-800",
  admin_client:       "bg-blue-100 text-blue-800",
  hr:                 "bg-cyan-100 text-cyan-800",
  manager:            "bg-indigo-100 text-indigo-800",
  internal_candidate: "bg-gray-100 text-gray-700",
  external_candidate: "bg-orange-100 text-orange-800",
};

const TENANT_STATUS_STYLES: Record<string, string> = {
  active:    "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  trial:     "bg-amber-100 text-amber-800",
};

interface Props { variant: Variant; value: string }

export function Badge({ variant, value }: Props) {
  const styles =
    variant === "status" ? STATUS_STYLES[value] ?? "bg-gray-100 text-gray-700"
    : variant === "role"  ? ROLE_STYLES[value]   ?? "bg-gray-100 text-gray-700"
    :                       TENANT_STATUS_STYLES[value] ?? "bg-gray-100 text-gray-700";
  return <span className={"badge " + styles}>{value.replace(/_/g, " ")}</span>;
}

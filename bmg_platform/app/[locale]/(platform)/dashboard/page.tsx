import { getSession } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import type { Role } from "@/lib/auth/types";

interface Props { params: Promise<{ locale: string }> }

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin:         "You have full platform access. Manage tenants, users, and monitor all activity.",
  admin_client:        "Manage your organisation's users, tests, packs, and sessions.",
  hr:                  "Create and manage sessions, assign tests, and review candidate results.",
  manager:             "View your team's sessions and results.",
  internal_candidate:  "View your assigned tests and check your results.",
  external_candidate:  "Browse available packs and take your tests.",
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const session = await getSession();
  if (!session) return null;

  const firstName = session.email.split("@")[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {ROLE_DESCRIPTIONS[session.role]}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Role" value={session.role.replace(/_/g, " ")} />
        <StatCard label="Schema" value={session.tenantSchema} />
        <StatCard label="Sprint" value="1 — Auth & Users" />
      </div>

      {/* Role-specific links */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick actions</h2>
        <QuickActions role={session.role} locale={locale} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900 capitalize">{value}</p>
    </div>
  );
}

function QuickActions({ role, locale }: { role: Role; locale: string }) {
  const links: Record<Role, Array<{ label: string; href: string }>> = {
    super_admin:        [{ label: "Manage tenants", href: "/tenants" }, { label: "All users", href: "/users" }, { label: "Audit log", href: "/audit" }],
    admin_client:       [{ label: "Users", href: "/users" }, { label: "Create user", href: "/users/new" }],
    hr:                 [{ label: "Users", href: "/users" }, { label: "Invite users", href: "/users/new" }],
    manager:            [{ label: "My sessions", href: "/sessions" }, { label: "Settings", href: "/settings/profile" }],
    internal_candidate: [{ label: "My tests", href: "/tests" }, { label: "My results", href: "/results" }],
    external_candidate: [{ label: "Browse packs", href: "/packs" }, { label: "My tests", href: "/tests" }],
  };

  return (
    <div className="flex flex-wrap gap-2">
      {links[role].map((link) => (
        <a
          key={link.href}
          href={`/${locale}${link.href}`}
          className="btn-secondary text-sm"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

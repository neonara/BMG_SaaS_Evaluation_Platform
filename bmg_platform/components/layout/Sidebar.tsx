import type { Role } from "@/lib/auth/types";

interface NavItem {
  key: string;
  href: string;
  icon: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",  href: "/dashboard",         icon: "⊞", roles: ["super_admin","admin_client","hr","manager","internal_candidate","external_candidate"] },
  { key: "tenants",    href: "/tenants",            icon: "⬡", roles: ["super_admin"] },
  { key: "users",      href: "/users",              icon: "👥", roles: ["super_admin","admin_client","hr","manager"] },
  { key: "tests",      href: "/tests",              icon: "📝", roles: ["super_admin","admin_client","hr","manager","internal_candidate","external_candidate"] },
  { key: "packs",      href: "/packs",              icon: "📦", roles: ["super_admin","admin_client","hr","external_candidate"] },
  { key: "sessions",   href: "/sessions",           icon: "🗓", roles: ["super_admin","admin_client","hr","manager","internal_candidate","external_candidate"] },
  { key: "results",    href: "/results",            icon: "📊", roles: ["super_admin","admin_client","hr","manager","internal_candidate","external_candidate"] },
  { key: "audit",      href: "/audit",              icon: "🔍", roles: ["super_admin"] },
  { key: "anticheat",  href: "/anticheat",          icon: "🛡", roles: ["super_admin"] },
  { key: "settings",   href: "/settings/profile",  icon: "⚙", roles: ["super_admin","admin_client","hr","manager","internal_candidate","external_candidate"] },
];

interface Props {
  role: Role;
  locale: string;
}

export function Sidebar({ role, locale }: Props) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-e border-gray-200 py-4 flex-shrink-0">
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">BMG Platform</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {visibleItems.map((item) => (
          <a
            key={item.key}
            href={`/${locale}${item.href}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600
                       hover:bg-gray-100 hover:text-gray-900 transition-colors group"
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="capitalize">{item.key}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

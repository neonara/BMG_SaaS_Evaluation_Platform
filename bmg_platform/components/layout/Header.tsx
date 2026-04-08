"use client";

import { useRouter, usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/types";

interface Props {
  user: SessionUser;
  locale: string;
  subdomain: string;
}

export function Header({ user, locale, subdomain: _subdomain }: Props) {
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/en/tenants/abc-123"

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/login`);
    router.refresh();
  }

  const locales = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
    { code: "ar", label: "AR" },
  ];

  // Replace the leading locale segment while keeping the rest of the path.
  // "/en/tenants/abc" → "/fr/tenants/abc"
  function localePath(targetLocale: string): string {
    const segments = pathname.split("/"); // ["", "en", "tenants", "abc"]
    segments[1] = targetLocale;
    return segments.join("/");
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger placeholder */}
        <button className="md:hidden p-1 rounded text-gray-500 hover:text-gray-700">
          ☰
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <div className="flex items-center gap-1">
          {locales.map((l) => (
            <a
              key={l.code}
              href={localePath(l.code)}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                locale === l.code
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={locale === l.code ? { background: "var(--color-primary)" } : {}}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2 ps-3 border-s border-gray-200">
          <div className="text-right">
            <p className="text-xs font-medium text-gray-900">{user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role.replace(/_/g, " ")}</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            {user.email[0].toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-700 ms-1"
            title="Sign out"
          >
            ↪
          </button>
        </div>
      </div>
    </header>
  );
}

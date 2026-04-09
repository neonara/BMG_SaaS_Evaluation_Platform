import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

// Typed navigation helpers — use these instead of next/navigation
// Link, redirect, usePathname, useRouter are all locale-aware
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
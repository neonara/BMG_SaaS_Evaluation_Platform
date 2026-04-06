import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { getTenantBranding } from "@/lib/tenant/resolver";
import { headers } from "next/headers";
import "@/app/globals.css";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "fr" | "ar")) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  // Read tenant subdomain from middleware header
  const headersList = await headers();
  const subdomain = headersList.get("x-tenant-subdomain") ?? "localhost";
  const branding = await getTenantBranding(subdomain);
  const primaryColor = branding?.primary_color ?? "#1E3A8A";

  return (
    <html lang={locale} dir={dir}>
      <head>
        <style>{`
          :root {
            --color-primary: ${primaryColor};
            --color-primary-dark: color-mix(in srgb, ${primaryColor} 80%, black);
            --color-primary-light: color-mix(in srgb, ${primaryColor} 80%, white);
          }
        `}</style>
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

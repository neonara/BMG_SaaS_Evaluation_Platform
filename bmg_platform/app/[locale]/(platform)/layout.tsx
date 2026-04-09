import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function PlatformLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const headersList = await headers();
  const subdomain = headersList.get("x-tenant-subdomain") ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={session.role} locale={locale} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          user={session}
          locale={locale}
          subdomain={subdomain}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

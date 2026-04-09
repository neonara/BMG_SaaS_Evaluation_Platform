import { requireRole } from "@/lib/auth/guards";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import type { Pack } from "@/lib/api/packs";

interface Props { params: Promise<{ locale: string }> }

export default async function PacksPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr", "external_candidate"]);
  const t = await getTranslations("packs");
  const session = await getSession();
  const isSuperAdmin = session?.role === "super_admin";

  const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = await getAccessToken();

  let packs: Pack[] = [];
  try {
    const res = await fetch(`${DJANGO_URL}/api/v1/packs/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      packs = data.results ?? data;
    }
  } catch { /* not fatal */ }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
        {isSuperAdmin && (
          <a href={`/${locale}/packs/new`} className="btn-primary">+ {t("newPack")}</a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.length === 0 && (
          <p className="text-gray-400 col-span-3">{t("noPacks")}</p>
        )}
        {packs.map((pack) => (
          <a
            key={pack.id}
            href={`/${locale}/packs/${pack.id}`}
            className="card p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-semibold text-gray-900">{pack.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                pack.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {pack.status}
              </span>
            </div>
            {pack.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{pack.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-semibold text-gray-900 text-base">
                {Number(pack.price).toFixed(2)} {pack.currency}
              </span>
              <span>· {pack.test_count} tests</span>
              <span>· {pack.max_candidates} candidates</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

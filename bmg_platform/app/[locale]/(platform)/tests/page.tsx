import { requireRole } from "@/lib/auth/guards";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";
import type { TestModel } from "@/lib/api/tests";
import { TestStatusBadge } from "@/components/tests/TestStatusBadge";

interface Props { params: Promise<{ locale: string }> }

export default async function TestsPage({ params }: Props) {
  const { locale } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr", "manager", "internal_candidate", "external_candidate"]);
  const t = await getTranslations("tests");
  const session = await getSession();

  const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = await getAccessToken();

  let tests: TestModel[] = [];
  let count = 0;
  try {
    const res = await fetch(`${DJANGO_URL}/api/v1/tests/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      tests = data.results ?? data;
      count = data.count ?? tests.length;
    }
  } catch { /* not fatal */ }

  const isSuperAdmin = session?.role === "super_admin";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{count} {t("total")}</p>
        </div>
        {isSuperAdmin && (
          <a href={`/${locale}/tests/new`} className="btn-primary">
            + {t("newTest")}
          </a>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("colTitle")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("colCategory")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("colSubType")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("colVisibility")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("colStatus")}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t("colQuestions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t("noTests")}</td>
              </tr>
            )}
            {tests.map((test) => (
              <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <a href={`/${locale}/tests/${test.id}`} className="font-medium text-gray-900 hover:text-primary">
                    {test.title}
                    {test.version > 1 && <span className="ms-1 text-xs text-gray-400">v{test.version}</span>}
                  </a>
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{test.category}</td>
                <td className="px-4 py-3 text-gray-600">{test.sub_type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{test.visibility}</td>
                <td className="px-4 py-3"><TestStatusBadge status={test.status} /></td>
                <td className="px-4 py-3 text-gray-600">{test.question_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { requireRole } from "@/lib/auth/guards";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import type { TestModel, Question } from "@/lib/api/tests";
import { TestStatusBadge } from "@/components/tests/TestStatusBadge";
import { PublishButton } from "@/components/tests/PublishButton";
import { AddQuestionForm } from "@/components/tests/AddQuestionForm";

interface Props { params: Promise<{ locale: string; id: string }> }

export default async function TestDetailPage({ params }: Props) {
  const { locale, id } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr", "manager"]);
  const session = await getSession();
  const isSuperAdmin = session?.role === "super_admin";

  const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [testRes, qRes] = await Promise.all([
    fetch(`${DJANGO_URL}/api/v1/tests/${id}/`, { headers, cache: "no-store" }),
    isSuperAdmin
      ? fetch(`${DJANGO_URL}/api/v1/tests/${id}/questions/`, { headers, cache: "no-store" })
      : null,
  ]);

  if (!testRes.ok) notFound();
  const test: TestModel = await testRes.json();
  const questions: Question[] = qRes?.ok ? await qRes.json() : [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/tests`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{test.title}</h1>
        <TestStatusBadge status={test.status} />
        {test.version > 1 && <span className="text-sm text-gray-400">v{test.version}</span>}
      </div>

      {/* Metadata */}
      <div className="card p-5 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">Category:</span> <span className="font-medium capitalize ms-1">{test.category}</span></div>
        <div><span className="text-gray-500">Sub-type:</span> <span className="font-medium ms-1">{test.sub_type.replace(/_/g, " ")}</span></div>
        <div><span className="text-gray-500">Visibility:</span> <span className="font-medium capitalize ms-1">{test.visibility}</span></div>
        <div><span className="text-gray-500">Questions / session:</span> <span className="font-medium ms-1">{test.questions_per_session}</span></div>
        {test.timer_seconds && (
          <div><span className="text-gray-500">Timer:</span> <span className="font-medium ms-1">{Math.floor(test.timer_seconds / 60)} min</span></div>
        )}
        {test.pass_threshold_pct && (
          <div><span className="text-gray-500">Pass threshold:</span> <span className="font-medium ms-1">{test.pass_threshold_pct}%</span></div>
        )}
      </div>

      {/* Actions */}
      {isSuperAdmin && test.status === "draft" && (
        <div className="mb-6">
          <PublishButton testId={test.id} locale={locale} />
        </div>
      )}

      {/* Questions */}
      {isSuperAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Questions ({questions.length})
          </h2>

          {questions.length > 0 && (
            <div className="card divide-y divide-gray-100 mb-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{q.text}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {q.answer_options.map((opt) => (
                          <span
                            key={opt.id}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              opt.is_correct
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {opt.text}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{q.points}pt</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {test.status === "draft" && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add question</h3>
              <AddQuestionForm testId={test.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

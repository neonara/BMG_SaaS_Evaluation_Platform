"use client";
import { useState } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { createQuestion } from "@/lib/api/tests";
import type { QuestionType } from "@/lib/api/tests";

interface Option {
  text: string;
  is_correct: boolean;
}

const DEFAULT_OPTIONS: Record<string, Option[]> = {
  mcq:        [{ text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }],
  true_false: [{ text: "True", is_correct: true }, { text: "False", is_correct: false }],
  open:       [],
  ordering:   [{ text: "", is_correct: false }, { text: "", is_correct: false }],
};

export function AddQuestionForm({ testId }: { testId: string }) {
  const router = useRouter();
  const [qType, setQType] = useState<QuestionType>("mcq");
  const [text, setText] = useState("");
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState<Option[]>(DEFAULT_OPTIONS.mcq);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(t: QuestionType) {
    setQType(t);
    setOptions([...DEFAULT_OPTIONS[t]]);
  }

  function updateOption(idx: number, field: keyof Option, value: string | boolean) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, { text: "", is_correct: false }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) { setError("Question text is required."); return; }
    setLoading(true);
    setError(null);
    try {
      await createQuestion(testId, {
        question_type: qType,
        text,
        order: 0,
        points,
        answer_options: options.map((o, i) => ({ ...o, order: i + 1 })),
      });
      setText("");
      setPoints(1);
      setOptions([...DEFAULT_OPTIONS[qType]]);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select value={qType} onChange={(e) => handleTypeChange(e.target.value as QuestionType)} className="input">
            <option value="mcq">Multiple Choice</option>
            <option value="true_false">True / False</option>
            <option value="open">Open-ended</option>
            <option value="ordering">Ordering</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Points</label>
          <input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="input" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Question text</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="input resize-none" placeholder="Enter your question..." />
      </div>

      {qType !== "open" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Answer options</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type={qType === "mcq" ? "radio" : "checkbox"}
                  checked={opt.is_correct}
                  onChange={(e) => {
                    if (qType === "mcq") {
                      setOptions((prev) => prev.map((o, i) => ({ ...o, is_correct: i === idx })));
                    } else {
                      updateOption(idx, "is_correct", e.target.checked);
                    }
                  }}
                  className="flex-shrink-0"
                />
                <input
                  value={opt.text}
                  onChange={(e) => updateOption(idx, "text", e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="input flex-1"
                  readOnly={qType === "true_false"}
                />
              </div>
            ))}
          </div>
          {qType === "mcq" && (
            <button type="button" onClick={addOption} className="mt-2 text-xs text-primary hover:underline">
              + Add option
            </button>
          )}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving..." : "Add question"}
      </button>
    </form>
  );
}

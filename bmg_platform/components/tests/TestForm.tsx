"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "@/lib/i18n/routing";
import { createTest } from "@/lib/api/tests";
import { useState } from "react";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["competence", "technical"]),
  sub_type: z.enum(["profiling", "psychotechnique", "technique"]),
  visibility: z.enum(["public", "pack", "personalized"]),
  questions_per_session: z.coerce.number().int().min(1),
  timer_seconds: z.coerce.number().int().min(0).optional().nullable(),
  pass_threshold_pct: z.coerce.number().min(0).max(100).optional().nullable(),
});
type FormData = z.infer<typeof schema>;

export function TestForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "technical",
      sub_type: "technique",
      visibility: "public",
      questions_per_session: 10,
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const test = await createTest({
        ...data,
        timer_seconds: data.timer_seconds || null,
        pass_threshold_pct: data.pass_threshold_pct || null,
      });
      router.push(`/tests/${test.id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create test");
    }
  }

  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{serverError}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input {...register("title")} className="input" placeholder="e.g. Logical Reasoning" />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...register("category")} className="input">
              <option value="competence">Competence</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub-type</label>
            <select {...register("sub_type")} className="input">
              <option value="profiling">Profiling</option>
              <option value="psychotechnique">Psychotechnique</option>
              <option value="technique">Technique</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select {...register("visibility")} className="input">
            <option value="public">Public</option>
            <option value="pack">Pack only</option>
            <option value="personalized">Personalized</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Questions per session</label>
            <input {...register("questions_per_session")} type="number" min={1} className="input" />
            {errors.questions_per_session && <p className="mt-1 text-xs text-red-600">{errors.questions_per_session.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timer (seconds)</label>
            <input {...register("timer_seconds")} type="number" min={0} placeholder="None" className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pass threshold (%)</label>
          <input {...register("pass_threshold_pct")} type="number" min={0} max={100} step={0.1} placeholder="None" className="input" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Creating..." : "Create test"}
          </button>
          <a href={`/${locale}/tests`} className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}

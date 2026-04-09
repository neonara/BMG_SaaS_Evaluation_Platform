"use client";
import { useState } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { publishTest } from "@/lib/api/tests";

export function PublishButton({ testId, locale }: { testId: string; locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setLoading(true);
    setError(null);
    try {
      await publishTest(testId);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={handlePublish} disabled={loading} className="btn-primary">
        {loading ? "Publishing..." : "Publish test"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

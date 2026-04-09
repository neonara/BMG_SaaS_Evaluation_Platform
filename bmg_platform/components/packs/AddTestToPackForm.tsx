"use client";
import { useState } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { addTestToPack } from "@/lib/api/packs";

export function AddTestToPackForm({ packId }: { packId: string }) {
  const router = useRouter();
  const [testId, setTestId] = useState("");
  const [order, setOrder] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!testId.trim()) { setError("Test ID is required."); return; }
    setLoading(true);
    setError(null);
    try {
      await addTestToPack(packId, testId.trim(), order);
      setTestId("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add test");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        value={testId}
        onChange={(e) => setTestId(e.target.value)}
        placeholder="Test UUID"
        className="input flex-1 text-sm"
      />
      <input
        type="number"
        min={1}
        value={order}
        onChange={(e) => setOrder(Number(e.target.value))}
        className="input w-20 text-sm"
        placeholder="Order"
      />
      <button type="submit" disabled={loading} className="btn-primary text-sm">
        {loading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}

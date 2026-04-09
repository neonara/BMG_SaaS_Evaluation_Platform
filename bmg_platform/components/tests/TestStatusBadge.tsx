import type { TestStatus } from "@/lib/api/tests";

const BADGE: Record<TestStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700" },
  published: { label: "Published", className: "bg-green-100 text-green-700" },
  archived:  { label: "Archived",  className: "bg-yellow-100 text-yellow-700" },
};

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const b = BADGE[status] ?? BADGE.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.className}`}>
      {b.label}
    </span>
  );
}

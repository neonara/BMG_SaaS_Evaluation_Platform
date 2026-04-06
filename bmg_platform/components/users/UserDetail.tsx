"use client";
import { useEffect, useState } from "react";
import { getUser, deactivateUser, reactivateUser } from "@/lib/api/users";
import type { User } from "@/lib/api/users";
import { Badge } from "@/components/ui/Badge";

interface Props { locale: string; userId: string }

export function UserDetail({ locale, userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    getUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  async function handleDeactivate() {
    if (!user) return;
    const reason = prompt("Reason (min 10 chars):");
    if (!reason || reason.length < 10) return;
    setActing(true);
    try { const u = await deactivateUser(user.id, reason); setUser(u); }
    finally { setActing(false); }
  }

  async function handleReactivate() {
    if (!user) return;
    if (!confirm("Reactivate this account?")) return;
    setActing(true);
    try { const u = await reactivateUser(user.id); setUser(u); }
    finally { setActing(false); }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!user)   return <div className="text-red-600 text-sm">User not found.</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${locale}/users`} className="text-gray-400 hover:text-gray-600 text-sm">Back</a>
        <h1 className="text-2xl font-semibold text-gray-900">{user.first_name} {user.last_name}</h1>
        <Badge variant="status" value={user.status} />
      </div>
      <div className="card p-6 space-y-3">
        {[["Email", user.email], ["Joined", new Date(user.date_joined).toLocaleDateString()]].map(([k,v]) => (
          <div key={k} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{k}</span>
            <span className="text-sm font-medium text-gray-900">{v}</span>
          </div>
        ))}
        <div className="flex justify-between py-1 border-b border-gray-50">
          <span className="text-sm text-gray-500">Role</span>
          <Badge variant="role" value={user.role} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        {user.status === "active" && (
          <button onClick={handleDeactivate} disabled={acting} className="btn-danger text-sm">
            {acting ? "..." : "Deactivate account"}
          </button>
        )}
        {user.status === "deactivated" && (
          <button onClick={handleReactivate} disabled={acting} className="btn-primary text-sm">
            {acting ? "..." : "Reactivate account"}
          </button>
        )}
      </div>
    </div>
  );
}

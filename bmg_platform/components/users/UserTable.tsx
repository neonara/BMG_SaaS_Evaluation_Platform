"use client";
import { useEffect, useState } from "react";
import { getUsers, deactivateUser, reactivateUser } from "@/lib/api/users";
import type { User } from "@/lib/api/users";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

interface Props { locale: string; initialPage?: number; initialSearch?: string }

export function UserTable({ locale, initialPage = 1, initialSearch = "" }: Props) {
  const t = useTranslations("users");
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getUsers({ page, search: search || undefined });
      setUsers(data.results);
      setTotal(data.count);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, search]);

  async function handleDeactivate(user: User) {
    const reason = prompt("Reason for deactivation (min 10 chars):");
    if (!reason || reason.length < 10) return;
    setDeactivating(user.id);
    try { await deactivateUser(user.id, reason); await load(); }
    finally { setDeactivating(null); }
  }

  async function handleReactivate(user: User) {
    if (!confirm("Reactivate this account?")) return;
    setDeactivating(user.id);
    try { await reactivateUser(user.id); await load(); }
    finally { setDeactivating(null); }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-4">
        <input type="search" placeholder="Search by email or name..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input max-w-xs" />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-start px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a href={`/${locale}/users/${user.id}`} className="font-medium text-gray-900 hover:text-primary transition-colors">
                      {user.first_name} {user.last_name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3"><Badge variant="role" value={user.role} /></td>
                  <td className="px-4 py-3"><Badge variant="status" value={user.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(user.date_joined).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <a href={`/${locale}/users/${user.id}`} className="text-xs text-gray-500 hover:text-gray-700">View</a>
                      {user.status === "active" ? (
                        <button onClick={() => handleDeactivate(user)} disabled={deactivating === user.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
                          {deactivating === user.id ? "..." : t("deactivate")}
                        </button>
                      ) : user.status === "deactivated" ? (
                        <button onClick={() => handleReactivate(user)} disabled={deactivating === user.id}
                          className="text-xs text-green-600 hover:text-green-700 disabled:opacity-50">
                          {deactivating === user.id ? "..." : t("reactivate")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{total} users · page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

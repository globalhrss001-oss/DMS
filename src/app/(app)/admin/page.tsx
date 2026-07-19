"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { listUsers } from "@/lib/db";
import type { AppUser, AuditLog } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function AdminPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && role !== "admin") router.replace("/dashboard");
  }, [role, authLoading, router]);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      try {
        const [u, logSnap] = await Promise.all([
          listUsers(),
          getDocs(
            query(
              collection(db, "auditLogs"),
              orderBy("timestamp", "desc"),
              limit(50),
            ),
          ),
        ]);
        setUsers(u);
        setLogs(
          logSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, "id">) })),
        );
      } catch {
        setError("Could not load admin data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  if (role !== "admin") return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin</h1>
        <p className="text-sm text-slate-500">User management and audit trail.</p>
      </div>

      {error && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-700">Staff users</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2">Name</th>
                <th className="px-5 py-2">Email</th>
                <th className="px-5 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {u.displayName || "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="badge bg-slate-100 capitalize text-slate-600">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          New staff accounts are provisioned via the Firebase Console or Admin SDK,
          then assigned a role document in the <code>users</code> collection.
        </p>
      </div>

      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-700">Recent activity</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2">When</th>
                <th className="px-5 py-2">Action</th>
                <th className="px-5 py-2">Target</th>
                <th className="px-5 py-2">Actor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-slate-500">
                    {formatDate(l.timestamp)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge bg-blue-100 capitalize text-blue-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {l.targetType}/{l.targetId}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{l.actorUid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

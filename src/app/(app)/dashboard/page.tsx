"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  listCandidates,
  listRecentDocuments,
  countActiveDocuments,
} from "@/lib/db";
import type { Candidate, DocumentRecord } from "@/lib/types";
import { StatusBadge } from "@/components/Badges";
import { formatDate } from "@/lib/format";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentRecord[]>([]);
  const [docCount, setDocCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cands, docs, count] = await Promise.all([
          listCandidates(),
          listRecentDocuments(5),
          countActiveDocuments(),
        ]);
        setCandidates(cands);
        setRecentDocs(docs);
        setDocCount(count);
      } catch {
        setError(
          "Could not load dashboard data. Ensure Firestore is configured and indexes are deployed.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = candidates.filter((c) => c.status === "active").length;
  const placed = candidates.filter((c) => c.status === "placed").length;
  const archived = candidates.filter((c) => c.status === "archived").length;
  const total = candidates.length;

  const stats = [
    { label: "Total candidates", value: total, accent: "text-brand-indigo" },
    { label: "Active", value: active, accent: "text-emerald-600" },
    { label: "Placed", value: placed, accent: "text-blue-600" },
    { label: "Documents", value: docCount, accent: "text-slate-700" },
  ];

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = profile?.displayName?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const candidateName = (id: string) =>
    candidates.find((c) => c.id === id)?.fullName ?? "Candidate";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-slate-500">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/candidates" className="btn-primary">
            + New candidate
          </Link>
          <Link href="/candidates" className="btn-secondary">
            View all candidates
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.accent}`}>
              {loading ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Candidate status breakdown */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="font-semibold text-slate-700">Candidate status</h2>
          {total === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No candidates yet.</p>
          ) : (
            <>
              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="bg-emerald-500" style={{ width: `${pct(active)}%` }} />
                <div className="bg-blue-500" style={{ width: `${pct(placed)}%` }} />
                <div className="bg-slate-400" style={{ width: `${pct(archived)}%` }} />
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active
                  </span>
                  <span className="font-medium text-slate-700">
                    {active} ({pct(active)}%)
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Placed
                  </span>
                  <span className="font-medium text-slate-700">
                    {placed} ({pct(placed)}%)
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Archived
                  </span>
                  <span className="font-medium text-slate-700">
                    {archived} ({pct(archived)}%)
                  </span>
                </li>
              </ul>
            </>
          )}
        </div>

        {/* Recent candidates */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-700">Recent candidates</h2>
            <Link href="/candidates" className="text-sm text-brand-blue hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No candidates yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {candidates.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/candidates/${c.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{c.fullName}</p>
                      <p className="text-xs text-slate-400">
                        Added {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent uploads */}
      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-700">Recent document uploads</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading…</p>
        ) : recentDocs.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2">Document</th>
                <th className="px-5 py-2">Type</th>
                <th className="px-5 py-2">Candidate</th>
                <th className="px-5 py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {d.fileName}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{d.docType}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/candidates/${d.candidateId}`}
                      className="text-brand-blue hover:underline"
                    >
                      {candidateName(d.candidateId)}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatDate(d.uploadedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

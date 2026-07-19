"use client";

import { useEffect, useState } from "react";
import { listCandidates } from "@/lib/db";
import type { Candidate } from "@/lib/types";

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cands = await listCandidates();
        setCandidates(cands);
      } catch {
        setError(
          "Could not load dashboard data. Ensure Firestore is configured and indexes are deployed.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    { label: "Total candidates", value: candidates.length },
    {
      label: "Active candidates",
      value: candidates.filter((c) => c.status === "active").length,
    },
    {
      label: "Placed candidates",
      value: candidates.filter((c) => c.status === "placed").length,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your candidates.</p>
      </div>

      {error && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand-indigo">
              {loading ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

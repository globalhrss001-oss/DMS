"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createCandidate, listCandidates } from "@/lib/db";
import type { Candidate, CandidateStatus } from "@/lib/types";
import { StatusBadge } from "@/components/Badges";
import { formatDate } from "@/lib/format";
import Modal from "@/components/Modal";
import CandidateForm, { type CandidateFormValues } from "@/components/CandidateForm";

const STATUS_FILTERS: (CandidateStatus | "all")[] = [
  "all",
  "active",
  "placed",
  "archived",
];

export default function CandidatesPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCandidates(await listCandidates());
      setError(null);
    } catch {
      setError("Could not load candidates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!term) return true;
      return (
        c.fullName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [candidates, search, statusFilter]);

  const onCreate = async (values: CandidateFormValues) => {
    if (!user) return;
    await createCandidate(values, user.uid);
    setShowCreate(false);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Candidates</h1>
          <p className="text-sm text-slate-500">
            Search, filter and manage candidate records.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New candidate
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input sm:max-w-xs"
          placeholder="Search name, email or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                statusFilter === s
                  ? "bg-brand-blue text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No candidates found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2">Name</th>
                <th className="px-5 py-2">Email</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Added</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {c.fullName}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c.email || "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="New candidate" onClose={() => setShowCreate(false)}>
          <CandidateForm
            onSubmit={onCreate}
            onCancel={() => setShowCreate(false)}
            submitLabel="Create"
          />
        </Modal>
      )}
    </div>
  );
}

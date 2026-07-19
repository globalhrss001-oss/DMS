import type { CandidateStatus } from "@/lib/types";
import { daysUntil } from "@/lib/format";
import type { Timestamp } from "firebase/firestore";

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const styles: Record<CandidateStatus, string> = {
    active: "bg-green-100 text-green-700",
    placed: "bg-blue-100 text-blue-700",
    archived: "bg-slate-100 text-slate-500",
  };
  return <span className={`badge ${styles[status]}`}>{status}</span>;
}

export function ExpiryBadge({ expiresAt }: { expiresAt?: Timestamp | null }) {
  if (!expiresAt) return <span className="text-xs text-slate-400">No expiry</span>;
  const days = daysUntil(expiresAt);
  if (days === null) return <span className="text-xs text-slate-400">—</span>;
  if (days < 0) return <span className="badge bg-red-100 text-red-700">Expired</span>;
  if (days <= 30)
    return (
      <span className="badge bg-amber-100 text-amber-700">
        {days}d left
      </span>
    );
  return <span className="badge bg-slate-100 text-slate-600">{days}d left</span>;
}

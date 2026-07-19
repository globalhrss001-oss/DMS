import type { Timestamp } from "firebase/firestore";

export function formatDate(ts?: Timestamp | null): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function daysUntil(ts?: Timestamp | null): number | null {
  if (!ts) return null;
  const ms = ts.toDate().getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

import type { Timestamp } from "firebase/firestore";

export type Role = "admin" | "recruiter";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt?: Timestamp;
}

export type CandidateStatus = "active" | "placed" | "archived";

/** Preset race options; free text is allowed when the user picks "Other". */
export const RACE_PRESETS = ["Myanmar", "Bangala", "India"] as const;
export type RacePreset = (typeof RACE_PRESETS)[number];
export type RaceChoice = RacePreset | "Other";

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** Preset value, or a custom string when the user chose "Other". */
  race: string;
  status: CandidateStatus;
  tags: string[];
  driveFolderId?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

export type DocType = "CV" | "Contract" | "RightToWork" | "ID" | "Other";

export const DOC_TYPES: DocType[] = ["CV", "Contract", "RightToWork", "ID", "Other"];

export type DocStatus = "active" | "deleted";

export interface DocumentRecord {
  id: string;
  candidateId: string;
  jobId?: string;
  docType: DocType;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt?: Timestamp;
  expiresAt?: Timestamp | null;
  status: DocStatus;
}

export type AuditAction = "upload" | "view" | "download" | "delete" | "login";

export interface AuditLog {
  id: string;
  actorUid: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  timestamp?: Timestamp;
  meta?: Record<string, unknown>;
}

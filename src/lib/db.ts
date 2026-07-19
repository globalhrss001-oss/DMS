import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Candidate, DocumentRecord, AppUser } from "@/lib/types";

function mapCandidate(id: string, data: Record<string, unknown>): Candidate {
  return {
    id,
    fullName: (data.fullName as string) ?? "",
    email: (data.email as string) ?? "",
    phone: (data.phone as string) ?? "",
    status: (data.status as Candidate["status"]) ?? "active",
    tags: (data.tags as string[]) ?? [],
    driveFolderId: data.driveFolderId as string | undefined,
    createdBy: (data.createdBy as string) ?? "",
    createdAt: data.createdAt as Candidate["createdAt"],
  };
}

export async function listCandidates(): Promise<Candidate[]> {
  const q = query(
    collection(db, "candidates"),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCandidate(d.id, d.data()));
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const snap = await getDoc(doc(db, "candidates", id));
  if (!snap.exists()) return null;
  return mapCandidate(snap.id, snap.data());
}

export async function createCandidate(
  input: Pick<Candidate, "fullName" | "email" | "phone" | "status" | "tags">,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "candidates"), {
    ...input,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCandidate(
  id: string,
  input: Partial<Pick<Candidate, "fullName" | "email" | "phone" | "status" | "tags">>,
): Promise<void> {
  await updateDoc(doc(db, "candidates", id), input);
}

export async function listCandidateDocuments(
  candidateId: string,
): Promise<DocumentRecord[]> {
  const q = query(
    collection(db, "documents"),
    where("candidateId", "==", candidateId),
    where("status", "==", "active"),
    orderBy("uploadedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      candidateId: data.candidateId,
      jobId: data.jobId,
      docType: data.docType,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      storagePath: data.storagePath,
      uploadedBy: data.uploadedBy,
      uploadedAt: data.uploadedAt,
      expiresAt: data.expiresAt ?? null,
      status: data.status,
    } as DocumentRecord;
  });
}

export async function listExpiringDocuments(
  withinDays = 30,
): Promise<DocumentRecord[]> {
  const cutoff = Timestamp.fromMillis(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const q = query(
    collection(db, "documents"),
    where("status", "==", "active"),
    where("expiresAt", "<=", cutoff),
    orderBy("expiresAt", "asc"),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      candidateId: data.candidateId,
      docType: data.docType,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      storagePath: data.storagePath,
      uploadedBy: data.uploadedBy,
      uploadedAt: data.uploadedAt,
      expiresAt: data.expiresAt ?? null,
      status: data.status,
    } as DocumentRecord;
  });
}

/**
 * Most-recently uploaded active documents. Ordered by uploadedAt only (a
 * single-field index Firestore provides automatically) and filtered to
 * active client-side, so no composite index is required.
 */
export async function listRecentDocuments(max = 5): Promise<DocumentRecord[]> {
  const q = query(
    collection(db, "documents"),
    orderBy("uploadedAt", "desc"),
    limit(max * 3),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        candidateId: data.candidateId,
        jobId: data.jobId,
        docType: data.docType,
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size,
        storagePath: data.storagePath,
        uploadedBy: data.uploadedBy,
        uploadedAt: data.uploadedAt,
        expiresAt: data.expiresAt ?? null,
        status: data.status,
      } as DocumentRecord;
    })
    .filter((d) => d.status === "active")
    .slice(0, max);
}

/** Count of active document records across all candidates. */
export async function countActiveDocuments(): Promise<number> {
  const q = query(collection(db, "documents"), where("status", "==", "active"));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function listUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), limit(200)));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<AppUser, "uid">) }));
}

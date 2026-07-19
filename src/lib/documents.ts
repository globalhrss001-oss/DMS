import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import type { DocType, DocumentRecord, AuditAction } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB (matches Storage rules)

export interface UploadOptions {
  candidateId: string;
  docType: DocType;
  expiresAt?: string | null; // ISO date string
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

async function writeAudit(
  action: AuditAction,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await addDoc(collection(db, "auditLogs"), {
      actorUid: uid,
      action,
      targetType,
      targetId,
      meta,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Audit failures should not block the primary action.
  }
}

/**
 * Uploads a file to Firebase Storage and records its metadata in Firestore.
 * onProgress receives 0-100.
 */
export function uploadDocument(
  file: File,
  opts: UploadOptions,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      reject(new Error("Not signed in."));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error("File exceeds the 20MB limit."));
      return;
    }

    const storagePath = `documents/${opts.candidateId}/${Date.now()}_${sanitize(file.name)}`;
    const task = uploadBytesResumable(ref(storage, storagePath), file, {
      contentType: file.type || "application/octet-stream",
    });

    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (err) => reject(err),
      async () => {
        try {
          let expiresTs: Timestamp | null = null;
          if (opts.expiresAt) {
            const d = new Date(opts.expiresAt);
            if (!isNaN(d.getTime())) expiresTs = Timestamp.fromDate(d);
          }
          const docRef = await addDoc(collection(db, "documents"), {
            candidateId: opts.candidateId,
            docType: opts.docType,
            fileName: file.name.slice(0, 300),
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            storagePath,
            uploadedBy: uid,
            uploadedAt: serverTimestamp(),
            expiresAt: expiresTs,
            status: "active",
          });
          await writeAudit("upload", "document", docRef.id, {
            candidateId: opts.candidateId,
            fileName: file.name,
            docType: opts.docType,
          });
          resolve(docRef.id);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/** Returns a temporary download URL for viewing, and logs the view. */
export async function getFileUrl(record: DocumentRecord): Promise<string> {
  const url = await getDownloadURL(ref(storage, record.storagePath));
  await writeAudit("view", "document", record.id, {});
  return url;
}

/** Admin-only: removes the file from Storage and soft-deletes the metadata. */
export async function deleteDocument(record: DocumentRecord): Promise<void> {
  try {
    await deleteObject(ref(storage, record.storagePath));
  } catch {
    // If the object is already gone, continue to soft-delete the record.
  }
  await updateDoc(doc(db, "documents", record.id), { status: "deleted" });
  await writeAudit("delete", "document", record.id, {});
}

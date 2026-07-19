/**
 * Global HR DMS - Cloud Functions (secure Google Drive bridge).
 *
 * The browser never talks to Google Drive directly. These callable functions
 * hold the service-account credentials and are the only code that reads/writes
 * the Workspace Shared Drive. Document metadata is written to Firestore with the
 * Admin SDK (which bypasses security rules), so client writes to `documents`
 * and `auditLogs` are denied by the rules.
 *
 * Authentication: the function authenticates to Google Drive using its own
 * runtime service account via Application Default Credentials (no key file).
 * That runtime service account's email must be added as a member of the Shared
 * Drive. This avoids long-lived JSON keys (blocked by org policy) entirely.
 *
 * Required configuration:
 *   - Param   SHARED_DRIVE_ID       : the Shared Drive id
 *   - Param   DRIVE_ROOT_FOLDER_ID  : parent folder id for candidate folders
 *                                     (may be the Shared Drive id itself)
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

setGlobalOptions({ region: "asia-southeast1", maxInstances: 10 });

admin.initializeApp();
const db = admin.firestore();

const SHARED_DRIVE_ID = defineString("SHARED_DRIVE_ID");
const DRIVE_ROOT_FOLDER_ID = defineString("DRIVE_ROOT_FOLDER_ID");

const DOC_TYPES = ["CV", "Contract", "RightToWork", "ID", "Other"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

function getDrive(): drive_v3.Drive {
  // Uses the function's runtime service account (Application Default
  // Credentials) - no downloaded key file required.
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

interface StaffUser {
  role: "admin" | "recruiter";
  email?: string;
  displayName?: string;
}

async function requireStaff(req: CallableRequest): Promise<StaffUser> {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  const snap = await db.doc(`users/${req.auth.uid}`).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "No staff profile found.");
  }
  return snap.data() as StaffUser;
}

async function writeAudit(
  actorUid: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await db.collection("auditLogs").add({
    actorUid,
    action,
    targetType,
    targetId,
    meta,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Find or create a Drive folder for a candidate inside the Shared Drive root.
 */
async function ensureCandidateFolder(
  drive: drive_v3.Drive,
  candidateId: string,
  existingFolderId?: string,
): Promise<string> {
  if (existingFolderId) return existingFolderId;

  const rootId = DRIVE_ROOT_FOLDER_ID.value();
  const query = [
    `name = '${candidateId}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `'${rootId}' in parents`,
    "trashed = false",
  ].join(" and ");

  const found = await drive.files.list({
    q: query,
    corpora: "drive",
    driveId: SHARED_DRIVE_ID.value(),
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    fields: "files(id, name)",
  });

  if (found.data.files && found.data.files.length > 0) {
    return found.data.files[0].id as string;
  }

  const created = await drive.files.create({
    requestBody: {
      name: candidateId,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    },
    supportsAllDrives: true,
    fields: "id",
  });
  return created.data.id as string;
}

interface UploadInput {
  candidateId?: string;
  fileName?: string;
  mimeType?: string;
  contentBase64?: string;
  docType?: string;
  expiresAt?: string | null;
}

export const uploadDocument = onCall(
  { memory: "512MiB", timeoutSeconds: 120 },
  async (req: CallableRequest<UploadInput>) => {
    const user = await requireStaff(req);
    const { candidateId, fileName, mimeType, contentBase64, docType, expiresAt } =
      req.data || {};

    if (!candidateId || !fileName || !contentBase64 || !docType) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (!DOC_TYPES.includes(docType)) {
      throw new HttpsError("invalid-argument", "Invalid document type.");
    }

    const candRef = db.doc(`candidates/${candidateId}`);
    const candSnap = await candRef.get();
    if (!candSnap.exists) {
      throw new HttpsError("not-found", "Candidate not found.");
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      throw new HttpsError("invalid-argument", "File is empty or exceeds 8MB.");
    }

    const drive = getDrive();
    const folderId = await ensureCandidateFolder(
      drive,
      candidateId,
      candSnap.get("driveFolderId"),
    );
    if (!candSnap.get("driveFolderId")) {
      await candRef.update({ driveFolderId: folderId });
    }

    const uploaded = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: Readable.from(buffer),
      },
      supportsAllDrives: true,
      fields: "id",
    });
    const driveFileId = uploaded.data.id as string;

    let expiresTs: admin.firestore.Timestamp | null = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (!isNaN(d.getTime())) expiresTs = admin.firestore.Timestamp.fromDate(d);
    }

    const docRef = await db.collection("documents").add({
      candidateId,
      docType,
      fileName,
      mimeType: mimeType || "application/octet-stream",
      size: buffer.length,
      driveFileId,
      driveId: SHARED_DRIVE_ID.value(),
      uploadedBy: req.auth!.uid,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresTs,
      status: "active",
    });

    await writeAudit(req.auth!.uid, "upload", "document", docRef.id, {
      candidateId,
      fileName,
      docType,
    });

    logger.info("Document uploaded", {
      documentId: docRef.id,
      candidateId,
      uploader: req.auth!.uid,
    });

    return { documentId: docRef.id, driveFileId };
  },
);

export const getFileLink = onCall(
  async (req: CallableRequest<{ documentId?: string }>) => {
    await requireStaff(req);
    const documentId = req.data?.documentId;
    if (!documentId) {
      throw new HttpsError("invalid-argument", "documentId is required.");
    }

    const snap = await db.doc(`documents/${documentId}`).get();
    if (!snap.exists || snap.get("status") !== "active") {
      throw new HttpsError("not-found", "Document not found.");
    }

    const drive = getDrive();
    const file = await drive.files.get({
      fileId: snap.get("driveFileId"),
      supportsAllDrives: true,
      fields: "webViewLink",
    });

    await writeAudit(req.auth!.uid, "view", "document", documentId, {});
    return { webViewLink: file.data.webViewLink };
  },
);

export const deleteDocument = onCall(
  async (req: CallableRequest<{ documentId?: string }>) => {
    const user = await requireStaff(req);
    if (user.role !== "admin") {
      throw new HttpsError("permission-denied", "Admins only.");
    }
    const documentId = req.data?.documentId;
    if (!documentId) {
      throw new HttpsError("invalid-argument", "documentId is required.");
    }

    const ref = db.doc(`documents/${documentId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Document not found.");
    }

    const drive = getDrive();
    try {
      await drive.files.update({
        fileId: snap.get("driveFileId"),
        requestBody: { trashed: true },
        supportsAllDrives: true,
      });
    } catch (err) {
      logger.warn("Drive trash failed (continuing with soft-delete)", { err });
    }

    await ref.update({ status: "deleted" });
    await writeAudit(req.auth!.uid, "delete", "document", documentId, {});
    return { ok: true };
  },
);

/**
 * Daily scan for documents expiring within 30 days. For the MVP this logs a
 * summary; a later phase can email or create in-app alert records.
 */
export const checkExpiries = onSchedule("every day 08:00", async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  );
  const snap = await db
    .collection("documents")
    .where("status", "==", "active")
    .where("expiresAt", "<=", cutoff)
    .orderBy("expiresAt", "asc")
    .get();

  logger.info("Expiry scan complete", { expiringCount: snap.size });
});

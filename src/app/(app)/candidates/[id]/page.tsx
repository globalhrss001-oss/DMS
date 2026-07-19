"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getCandidate,
  listCandidateDocuments,
  updateCandidate,
} from "@/lib/db";
import type { Candidate, DocumentRecord } from "@/lib/types";
import { StatusBadge, ExpiryBadge } from "@/components/Badges";
import { formatBytes, formatDate } from "@/lib/format";
import Modal from "@/components/Modal";
import CandidateForm, { type CandidateFormValues } from "@/components/CandidateForm";
import DocumentUpload from "@/components/DocumentUpload";
import { deleteDocument, getFileUrl } from "@/lib/documents";

export default function CandidateProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuth();
  const id = params.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await listCandidateDocuments(id));
    } catch {
      setError("Could not load documents (check Firestore indexes).");
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCandidate(id);
      setCandidate(c);
      await loadDocs();
    } catch {
      setError("Could not load candidate.");
    } finally {
      setLoading(false);
    }
  }, [id, loadDocs]);

  useEffect(() => {
    load();
  }, [load]);

  const onEdit = async (values: CandidateFormValues) => {
    await updateCandidate(id, values);
    setShowEdit(false);
    await load();
  };

  const onView = async (docRec: DocumentRecord) => {
    setBusyDocId(docRec.id);
    try {
      const url = await getFileUrl(docRec);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Could not open file.");
    } finally {
      setBusyDocId(null);
    }
  };

  const onDelete = async (docRec: DocumentRecord) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setBusyDocId(docRec.id);
    try {
      await deleteDocument(docRec);
      await loadDocs();
    } catch {
      setError("Could not delete document.");
    } finally {
      setBusyDocId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!candidate) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Candidate not found.</p>
        <Link href="/candidates" className="text-brand-blue hover:underline">
          Back to candidates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/candidates" className="text-sm text-brand-blue hover:underline">
        ← Back to candidates
      </Link>

      {error && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">
                {candidate.fullName}
              </h1>
              <StatusBadge status={candidate.status} />
            </div>
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              <p>Email: {candidate.email || "—"}</p>
              <p>Phone: {candidate.phone || "—"}</p>
              {candidate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {candidate.tags.map((t) => (
                    <span key={t} className="badge bg-slate-100 text-slate-600">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button className="btn-secondary" onClick={() => setShowEdit(true)}>
            Edit
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-700">Documents</h2>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            + Upload
          </button>
        </div>
        {docs.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No documents yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2">File</th>
                <th className="px-5 py-2">Type</th>
                <th className="px-5 py-2">Size</th>
                <th className="px-5 py-2">Uploaded</th>
                <th className="px-5 py-2">Expiry</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {d.fileName}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{d.docType}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatBytes(d.size)}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {formatDate(d.uploadedAt)}
                  </td>
                  <td className="px-5 py-3">
                    <ExpiryBadge expiresAt={d.expiresAt} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        className="text-brand-blue hover:underline disabled:opacity-50"
                        onClick={() => onView(d)}
                        disabled={busyDocId === d.id}
                      >
                        View
                      </button>
                      {role === "admin" && (
                        <button
                          className="text-red-600 hover:underline disabled:opacity-50"
                          onClick={() => onDelete(d)}
                          disabled={busyDocId === d.id}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <Modal title="Edit candidate" onClose={() => setShowEdit(false)}>
          <CandidateForm
            initial={candidate}
            onSubmit={onEdit}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      )}

      {showUpload && (
        <Modal title="Upload document" onClose={() => setShowUpload(false)}>
          <DocumentUpload
            candidateId={id}
            onUploaded={() => {
              setShowUpload(false);
              loadDocs();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

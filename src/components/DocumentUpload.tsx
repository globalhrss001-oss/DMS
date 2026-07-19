"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { DOC_TYPES, type DocType } from "@/lib/types";
import { MAX_UPLOAD_BYTES, uploadDocument } from "@/lib/documents";

export default function DocumentUpload({
  candidateId,
  onUploaded,
}: {
  candidateId: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("CV");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = (f: File | null) => {
    setError(null);
    if (f && f.size > MAX_UPLOAD_BYTES) {
      setError("File exceeds the 20MB limit.");
      return;
    }
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await uploadDocument(
        file,
        {
          candidateId,
          docType,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        },
        setProgress,
      );
      setFile(null);
      setExpiresAt("");
      setProgress(0);
      onUploaded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center ${
          dragOver ? "border-brand-blue bg-brand-blue/5" : "border-slate-300"
        }`}
      >
        <p className="text-sm text-slate-500">
          Drag &amp; drop a file here, or
        </p>
        <label className="mt-2 cursor-pointer text-sm font-medium text-brand-blue hover:underline">
          browse
          <input
            type="file"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              pickFile(e.target.files?.[0] ?? null)
            }
          />
        </label>
        {file && (
          <p className="mt-2 text-sm font-medium text-slate-700">{file.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Document type</label>
          <select
            className="input"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Expiry date (optional)</label>
          <input
            type="date"
            className="input"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {busy && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={submit}
          disabled={!file || busy}
        >
          {busy ? `Uploading… ${progress}%` : "Upload"}
        </button>
      </div>
    </div>
  );
}

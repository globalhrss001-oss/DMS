"use client";

import { useState, type FormEvent } from "react";
import type { Candidate, CandidateStatus, RaceChoice } from "@/lib/types";
import { RACE_PRESETS } from "@/lib/types";

export interface CandidateFormValues {
  fullName: string;
  email: string;
  phone: string;
  race: string;
  workingExperience: string;
  status: CandidateStatus;
  tags: string[];
}

const STATUSES: CandidateStatus[] = ["active", "placed", "archived"];

function initialRaceChoice(race?: string): RaceChoice {
  if (race && (RACE_PRESETS as readonly string[]).includes(race)) {
    return race as RaceChoice;
  }
  if (race) return "Other";
  return "Myanmar";
}

export default function CandidateForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  initial?: Partial<Candidate>;
  onSubmit: (values: CandidateFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [raceChoice, setRaceChoice] = useState<RaceChoice>(
    initialRaceChoice(initial?.race),
  );
  const [raceOther, setRaceOther] = useState(() => {
    const r = initial?.race;
    if (r && !(RACE_PRESETS as readonly string[]).includes(r)) return r;
    return "";
  });
  const [status, setStatus] = useState<CandidateStatus>(
    (initial?.status as CandidateStatus) ?? "active",
  );
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [workingExperience, setWorkingExperience] = useState(
    initial?.workingExperience ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const race =
      raceChoice === "Other" ? raceOther.trim() : raceChoice;
    if (!race) {
      setError("Please enter a race.");
      return;
    }
    if (race.length > 50) {
      setError("Race must be 50 characters or less.");
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        race,
        workingExperience: workingExperience.trim(),
        status,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch {
      setError("Could not save candidate. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Full name</label>
        <input
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={100}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Race</label>
          <select
            className="input"
            value={raceChoice}
            onChange={(e) => setRaceChoice(e.target.value as RaceChoice)}
            required
          >
            {RACE_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          {raceChoice === "Other" && (
            <input
              className="input mt-2"
              value={raceOther}
              onChange={(e) => setRaceOther(e.target.value)}
              placeholder="Type race…"
              required
              maxLength={50}
              autoFocus
            />
          )}
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as CandidateStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Working experience</label>
        <textarea
          className="input min-h-[100px] resize-y"
          value={workingExperience}
          onChange={(e) => setWorkingExperience(e.target.value)}
          placeholder="e.g. 3 years as warehouse assistant at ABC Logistics…"
          maxLength={2000}
          rows={4}
        />
      </div>
      <div>
        <label className="label">Tags (comma separated)</label>
        <input
          className="input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. IT, Contract, Singapore"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

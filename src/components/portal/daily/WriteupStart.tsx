"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWriteup, type JobPick } from "@/app/portal/jobs/write-up/actions";

/**
 * The write-up's way in, one form (Jake, 28 Nov: "an easy way to put the job
 * number / location in and then a note then a button to write it"). The job
 * by its number or its address, the notes, and Write it. An address with more
 * than one job on it asks which, then carries on.
 */
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" }) : "");

export function WriteupStart({ job = "" }: { job?: string }) {
  const router = useRouter();
  const [where, setWhere] = useState(job);
  const [notes, setNotes] = useState("");
  const [pick, setPick] = useState<JobPick[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const go = (chosen?: string) => start(async () => {
    setErr(null);
    const r = await startWriteup(where, notes, chosen);
    if (!r.ok) { setErr(r.error); return; }
    if ("pick" in r) { setPick(r.pick); return; }
    router.push(`/portal/jobs/write-up?job=${encodeURIComponent(r.job)}&go=1`);
  });

  return (
    <form className="wu-form" onSubmit={(e) => { e.preventDefault(); setPick(null); go(); }}>
      <div className="wu-field">
        <label htmlFor="wu-where">Job number or address</label>
        <input id="wu-where" value={where} onChange={(e) => { setWhere(e.target.value); setPick(null); }} placeholder="e.g. 20912, or 17 Gwendoline Drive" autoComplete="off" required />
      </div>
      <div className="wu-field">
        <label htmlFor="wu-notes">Notes</label>
        <textarea id="wu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={9} required
          placeholder={"How it’s going in: a roof bracket, a pump, a new circuit…\nWhat’s coming out.\nAnything that comes off the price if it isn’t needed."} />
      </div>

      {pick && (
        <div className="wu-pick" role="group" aria-label="Which job">
          <p>More than one job at that address. Which one?</p>
          {pick.map((p) => (
            <button key={p.number} type="button" className="wu-pickrow" disabled={pending} onClick={() => go(p.number)}>
              <span className="t"><b>Job {p.number}{p.type ? ` · ${p.type}` : ""}</b><span>{[p.customer, [p.street, p.suburb].filter(Boolean).join(", "), day(p.on)].filter(Boolean).join(" · ")}</span></span>
              <span className="wu-st">{p.status ?? ""}</span>
            </button>
          ))}
        </div>
      )}

      {err && <p className="wu-err" role="alert">{err}</p>}
      <div className="wu-acts">
        <button type="submit" className="wu-go" disabled={pending || !where.trim() || !notes.trim()}>{pending ? "Finding the job…" : "Write it"}</button>
        <span className="wu-hint">Writes the job summary and the labour line. Nothing goes on ServiceTitan until you’ve read it and pressed the button.</span>
      </div>
    </form>
  );
}

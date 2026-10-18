"use client";

import { useEffect, useState } from "react";
import { jobFiles } from "@/app/portal/supply/work-orders/actions";
import type { JobFile } from "@/lib/ordering/jobFiles";

export type PickedFile = { id: number; name: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });

/**
 * The job's files in ServiceTitan, ticked to go with the work order. None are
 * ticked to start: a job's files can include the customer's invoice.
 */
export function JobFilesPicker({ jobId, jobNumber, picked, onChange }: { jobId: number; jobNumber: string; picked: PickedFile[]; onChange: (p: PickedFile[]) => void }) {
  const [state, setState] = useState<{ files: JobFile[] } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    setState(null);
    jobFiles(jobId).then((r) => { if (live) setState(r); }).catch(() => { if (live) setState({ error: "The job's files couldn't be read just now." }); });
    return () => { live = false; };
  }, [jobId]);
  const on = new Set(picked.map((p) => p.id));
  const toggle = (f: JobFile) => onChange(on.has(f.id) ? picked.filter((p) => p.id !== f.id) : [...picked, { id: f.id, name: f.name }]);
  return (
    <fieldset className="wo-files">
      <legend>Send files from job {jobNumber}</legend>
      {state === null ? (
        <p className="qp-note">Looking at the job in ServiceTitan…</p>
      ) : "error" in state ? (
        <p className="pk-said bad">{state.error}</p>
      ) : state.files.length === 0 ? (
        <p className="qp-note">There are no files on this job in ServiceTitan.</p>
      ) : (
        <ul>
          {state.files.map((f) => (
            <li key={f.id}>
              <label>
                <input type="checkbox" id={`wo-file-${f.id}`} checked={on.has(f.id)} onChange={() => toggle(f)} />
                <span className="wo-fname">{f.name}</span>
                {f.at && <span className="wo-fat">added {day(f.at)}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      {/* Ticked before and since taken off the job: still sent, so still shown. */}
      {state && "files" in state && picked.filter((p) => !state.files.some((f) => f.id === p.id)).map((p) => (
        <p key={p.id} className="qp-note">Still ticked: {p.name} (no longer on the job) <button type="button" className="wo-x" aria-label={`Don't send ${p.name}`} onClick={() => onChange(picked.filter((x) => x.id !== p.id))}>×</button></p>
      ))}
    </fieldset>
  );
}

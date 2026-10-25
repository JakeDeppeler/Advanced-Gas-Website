"use client";

import { useState, useTransition } from "react";
import { addJobNote, markJobDone } from "@/app/trade/jobs/actions";

/**
 * A note or "work's done" on one job. Each opens its own small form under the
 * row rather than a pop-up, because on a phone in a ceiling space a pop-up is
 * one more thing to close.
 */
export function TradeJobActions({ jobId, canDone, doneBy }: { jobId: number; canDone: boolean; doneBy: string | null }) {
  const [open, setOpen] = useState<"note" | "done" | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [marked, setMarked] = useState(doneBy);
  const [busy, start] = useTransition();

  function go(kind: "note" | "done") {
    setMsg(null);
    start(async () => {
      const r = kind === "note" ? await addJobNote(jobId, text) : await markJobDone(jobId, text);
      setMsg({ ok: r.ok, text: r.ok ? r.said ?? "Saved." : r.error ?? "That didn't work." });
      if (r.ok) { setText(""); setOpen(null); if (kind === "done") setMarked("you"); }
    });
  }

  return (
    <div className="tr-jobact">
      <div className="tr-jobact__btns">
        <button type="button" className="tr-btn tr-btn--sm" aria-expanded={open === "note"} onClick={() => { setOpen(open === "note" ? null : "note"); setMsg(null); }}>Add a note</button>
        {canDone && !marked && (
          <button type="button" className="tr-btn tr-btn--sm tr-btn--go" aria-expanded={open === "done"} onClick={() => { setOpen(open === "done" ? null : "done"); setMsg(null); }}>Work&rsquo;s done</button>
        )}
        {marked && <span className="tr-chip tr-chip--good">Marked done{marked !== "you" ? ` by ${marked.split(" ")[0]}` : ""} · with the office</span>}
      </div>
      {open && (
        <div className="tr-jobact__form">
          <textarea
            id={`job-${jobId}-${open}`}
            className="tr-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={open === "note" ? "What the office or the next tech needs to know" : "Anything to add for the invoice? (optional) e.g. extra 3 m of pipe, customer paid deposit"}
            aria-label={open === "note" ? "The note" : "Anything to add for the invoice"}
            rows={3}
          />
          <div className="tr-jobact__btns">
            <button type="button" className={`tr-btn tr-btn--sm${open === "done" ? " tr-btn--go" : ""}`} disabled={busy || (open === "note" && !text.trim())} onClick={() => go(open)}>
              {busy ? "Sending…" : open === "note" ? "Put it on the job" : "Tell the office it's done"}
            </button>
            <button type="button" className="tr-btn tr-btn--sm" disabled={busy} onClick={() => { setOpen(null); setText(""); }}>Cancel</button>
          </div>
          {open === "done" && <p className="tr-small">The office completes it in ServiceTitan and invoices it. A note goes on the job saying you marked it done.</p>}
        </div>
      )}
      {msg && <p className={`tr-note ${msg.ok ? "tr-note--good" : "tr-note--warn"}`} role="status">{msg.text}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sortGuessed } from "@/app/portal/automatic/actions";

type Row = { jobId: number; jobNumber: string | null; customer: string | null; jobType: string | null; quotes: string[]; written: string | null };

const TZ = "Australia/Melbourne";
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: TZ, day: "numeric", month: "short" }) : "");
/** Matches the API's cap per call. */
const SLICE = 15;

/**
 * The jobs the old guess put at Awaiting Quote Approval with the quote still
 * open. Only ServiceTitan's quote screen shows the Draft tick, so each row
 * links there; tick the ones still in draft and they become Quote In Draft,
 * or tick ones that were sent to take them off the list as they are.
 */
export function GuessedQuotes({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<{ done: number; of: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; lines?: string[] } | null>(null);

  if (!rows.length) return null;
  const all = rows.length > 0 && rows.every((r) => picked.has(r.jobId));
  const toggle = (id: number) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function sort(as: "draft" | "sent") {
    const ids = [...picked];
    if (!ids.length) return;
    setMsg(null);
    setBusy({ done: 0, of: ids.length });
    const failed: { jobId: number; detail: string }[] = [];
    let done = 0;
    try {
      for (let i = 0; i < ids.length; i += SLICE) {
        const r = await sortGuessed(ids.slice(i, i + SLICE), as);
        if (!r.ok) throw new Error(r.error || "Couldn't do that.");
        done += r.done ?? 0;
        failed.push(...(r.failed ?? []));
        setBusy({ done: Math.min(ids.length, i + SLICE), of: ids.length });
      }
    } catch (e) {
      failed.push({ jobId: 0, detail: (e as Error).message });
    }
    const gone = new Set(ids.filter((id) => !failed.some((f) => f.jobId === id)));
    setRows((rs) => rs.filter((r) => !gone.has(r.jobId)));
    setPicked(new Set());
    setBusy(null);
    const num = (id: number) => rows.find((r) => r.jobId === id)?.jobNumber ?? String(id);
    setMsg({
      ok: failed.length === 0,
      text: `${done} ${as === "draft" ? "moved to Quote In Draft" : "left at Awaiting Quote Approval and taken off the list"}${failed.length ? `, ${failed.length} couldn't be` : ""}.`,
      lines: failed.slice(0, 4).map((f) => (f.jobId ? `Job ${num(f.jobId)}: ${f.detail}` : f.detail)),
    });
    router.refresh();
  }

  return (
    <div className="au-guess">
      <p className="au-sub">
        {rows.length} job{rows.length === 1 ? "" : "s"} the old guess put at Awaiting Quote Approval with the quote still open. ServiceTitan only shows
        the Draft tick on the quote itself, so open each from here, then tick the ones still in draft and move them.
      </p>
      <div className="au-guess__bar">
        <label className="au-guess__all"><input type="checkbox" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.jobId)))} /> All</label>
        <span className="au-sub">{picked.size} ticked</span>
        <button type="button" className="pk-btn" disabled={!picked.size || busy != null} onClick={() => void sort("draft")}>
          {busy ? `Working… ${busy.done} of ${busy.of}` : "Still in draft: make Quote In Draft"}
        </button>
        <button type="button" className="pk-btn g" disabled={!picked.size || busy != null} onClick={() => void sort("sent")}>Sent: leave at Awaiting</button>
      </div>
      {msg && (
        <div className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">
          {msg.text}
          {msg.lines?.map((l) => <div key={l} className="au-sub">{l}</div>)}
        </div>
      )}
      <ul className="au-guess__list">
        {rows.map((r) => (
          <li key={r.jobId} className={picked.has(r.jobId) ? "is-on" : undefined}>
            <label className="au-guess__row">
              <input type="checkbox" checked={picked.has(r.jobId)} onChange={() => toggle(r.jobId)} aria-label={`Tick job ${r.jobNumber ?? r.jobId}`} />
              <span>
                <b>Job {r.jobNumber ?? r.jobId}</b> · {r.customer ?? "No name"}
                <span className="au-meta">{[r.quotes.join(", "), r.written ? `written ${day(r.written)}` : null, r.jobType].filter(Boolean).join(" · ")}</span>
              </span>
            </label>
            <a className="au-guess__open" href={`https://go.servicetitan.com/#/Job/Index/${r.jobId}`} target="_blank" rel="noreferrer">Open in ServiceTitan ↗</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

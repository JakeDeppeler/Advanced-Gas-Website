"use client";

import { useState, useTransition } from "react";
import { logMyQuoteCall } from "@/app/trade/quotes/actions";

const HOWS: [string, string][] = [["call", "Spoke to them"], ["no_answer", "No answer"], ["text", "Texted"], ["note", "Note"]];

/** Log a follow-up on one quote: what happened, a note, and when to try next. */
export function TradeQuoteCall({ qkey, nextDefault }: { qkey: string; nextDefault: string }) {
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState("call");
  const [note, setNote] = useState("");
  const [next, setNext] = useState(nextDefault);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await logMyQuoteCall({ key: qkey, how, note, nextOn: next || null });
      setMsg({ ok: r.ok, text: r.ok ? r.said ?? "Logged." : r.error ?? "That didn't save." });
      if (r.ok) { setOpen(false); setNote(""); }
    });
  }

  return (
    <div className="tr-jobact">
      {!open && <div className="tr-jobact__btns"><button type="button" className="tr-btn tr-btn--sm tr-btn--go" onClick={() => { setOpen(true); setMsg(null); }}>Log a call</button></div>}
      {open && (
        <div className="tr-jobact__form">
          <div className="tr-jobact__btns" role="group" aria-label="What happened">
            {HOWS.map(([k, label]) => (
              <button key={k} type="button" className={`tr-btn tr-btn--sm${how === k ? " tr-btn--go" : ""}`} aria-pressed={how === k} onClick={() => setHow(k)}>{label}</button>
            ))}
          </div>
          <textarea id={`q-${qkey}-note`} className="tr-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={how === "note" ? "The note" : "What they said (optional)"} aria-label="Note" />
          <label className="tr-small" htmlFor={`q-${qkey}-next`}>Next call</label>
          <input id={`q-${qkey}-next`} className="tr-input" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          <div className="tr-jobact__btns">
            <button type="button" className="tr-btn tr-btn--sm tr-btn--go" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="tr-btn tr-btn--sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <p className={`tr-note ${msg.ok ? "tr-note--good" : "tr-note--warn"}`} role="status">{msg.text}</p>}
    </div>
  );
}

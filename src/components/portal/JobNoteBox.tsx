"use client";

import { useState, useTransition } from "react";
import { addOfficeJobNote } from "@/app/portal/jobs/noteActions";

/**
 * Put a note on a job in ServiceTitan from the portal: type the job number
 * (or pick one of a customer's), write the note, send. Says which job it
 * landed on, by customer and suburb, so a mistyped number shows straight away.
 */
export function JobNoteBox({ jobs, idBase = "jn" }: { jobs?: { number: string; label: string }[]; idBase?: string }) {
  const [num, setNum] = useState(jobs?.[0]?.number ?? "");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  function send() {
    setMsg(null);
    start(async () => {
      const r = await addOfficeJobNote(num, text);
      setMsg({ ok: r.ok, text: r.ok ? `Noted. ${r.said ?? ""}` : r.error ?? "That didn't go on." });
      if (r.ok) setText("");
    });
  }

  return (
    <div className="jn-box">
      <div className="jn-row">
        <label htmlFor={`${idBase}-job`} className="jn-lab">Job</label>
        {jobs && jobs.length ? (
          <select id={`${idBase}-job`} className="pk-in jn-job" value={num} onChange={(e) => setNum(e.target.value)}>
            {jobs.map((j) => <option key={j.number} value={j.number}>{j.label}</option>)}
          </select>
        ) : (
          <input id={`${idBase}-job`} className="pk-in jn-job" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} placeholder="Job number, e.g. 20294" />
        )}
      </div>
      <label htmlFor={`${idBase}-text`} className="jn-lab">Note</label>
      <textarea id={`${idBase}-text`} className="pk-in jn-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened, what was agreed, what the next person needs to know" />
      <div className="jn-row">
        <button type="button" className="pk-btn" disabled={busy || !num.trim() || !text.trim()} onClick={send}>{busy ? "Putting it on…" : "Put it on the job"}</button>
        <span className="jn-hint">Goes on the job in ServiceTitan, signed with your name.</span>
      </div>
      {msg && <p className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}

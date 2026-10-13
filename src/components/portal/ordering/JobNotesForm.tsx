"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveJobNotes } from "@/app/portal/supply/emails/actions";

/**
 * Supplier emails › Notes on the job: whose sent orders are written onto their
 * jobs in ServiceTitan, as a note with the order attached.
 */
export function JobNotesForm({ initial, suppliers }: { initial: string[]; suppliers: { id: string; name: string; work: boolean }[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [on, setOn] = useState(() => new Set(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <section className="pk-card pk-pad" id="job-notes" style={{ marginTop: 14 }}>
      <div className="pk-card-h"><b>Notes on the job</b><span>each sent order written onto its jobs in ServiceTitan</span></div>
      <p className="pk-note" style={{ marginBottom: 8 }}>
        When an order from a supplier ticked here is sent, each job it&rsquo;s for gets a note in ServiceTitan saying what was ordered and when,
        with the order attached as a PDF. If ServiceTitan refuses, the email still goes and the order under Orders › Sent says why, with a button to try again.
      </p>
      {suppliers.map((s) => (
        <div className="pk-kv" key={s.id}>
          <span className="t"><b>{s.name}</b><span>{s.work ? "the work order" : "the order"}</span></span>
          <label className="pk-check">
            <input id={`jn-${s.id}`} type="checkbox" checked={on.has(s.id)} onChange={(e) => {
              const n = new Set(on);
              if (e.target.checked) n.add(s.id); else n.delete(s.id);
              setOn(n);
            }} /> {on.has(s.id) ? "Noted" : "Not noted"}
          </label>
        </div>
      ))}
      <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
        <button type="button" className="pk-btn" disabled={busy} onClick={() => start(async () => {
          const r = await saveJobNotes([...on]);
          setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Couldn’t save." });
          if (r.ok) router.refresh();
        })}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}

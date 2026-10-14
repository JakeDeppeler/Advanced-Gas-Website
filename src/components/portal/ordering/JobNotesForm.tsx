"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { noteAllPast, saveJobNotes } from "@/app/portal/supply/emails/actions";

/**
 * Supplier emails › On the job in ServiceTitan: what a sent order does to its
 * jobs. Every order swaps the office's "not ordered" tags for "ordered"; the
 * ticked suppliers also leave a note with the order attached.
 */
export function JobNotesForm({ initial, suppliers, toNote, swaps, brands }: {
  initial: string[]; suppliers: { id: string; name: string; work: boolean }[];
  /** Sent orders not yet up to date on their jobs; null when that couldn't be read. */
  toNote: number | null;
  /** The tag pairs, and whether the "done" tag was found in ServiceTitan by name (null: couldn't check). */
  swaps: { from: string; to: string; when: string; found: boolean | null }[];
  /** The brand tags found ("Reclaim System Ordered"…); null when ServiceTitan couldn't be read. */
  brands: string[] | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [on, setOn] = useState(() => new Set(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pastBusy, startPast] = useTransition();
  const [past, setPast] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <section className="pk-card pk-pad" id="job-notes" style={{ marginTop: 14 }}>
      <div className="pk-card-h"><b>On the job in ServiceTitan</b><span>what a sent order changes on its jobs</span></div>
      <p className="pk-note" style={{ marginBottom: 8 }}>
        When an order is sent, each job it&rsquo;s for has its tags changed to say so. For the suppliers ticked below, the job also gets a note saying
        what was ordered and when, with the order attached as a PDF. If ServiceTitan refuses, the email still goes and the order under Orders › Sent says why, with a button to try again.
      </p>
      <div className="pk-glh">Tags, for every supplier</div>
      {swaps.map((t) => (
        <div className="pk-kv" key={t.to}>
          <span className="t"><b>{t.from} → {t.to}</b><span>when {t.when}</span></span>
          <span className={`pk-said${t.found === false ? " bad" : ""}`}>
            {t.found == null ? "Couldn’t check" : t.found ? "Found in ServiceTitan" : `No “${t.to}” tag in ServiceTitan — skipped`}
          </span>
        </div>
      ))}
      <div className="pk-kv">
        <span className="t">
          <b>Each brand&rsquo;s own System Ordered</b>
          <span>
            used instead of System Ordered when the brand has one — by the item&rsquo;s name first, so a Brivis heater ordered through Rinnai gets Brivis.
            Make one in ServiceTitan named &ldquo;&lt;Brand&gt; System Ordered&rdquo; and it&rsquo;s used from the next order.
          </span>
        </span>
        <span className="pk-said">{brands == null ? "Couldn’t check" : brands.length ? brands.join(", ") : "None yet"}</span>
      </div>
      <div className="pk-glh">A note and the order, for these suppliers</div>
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
      <div className="pk-glh">Orders already sent</div>
      <div className="pk-kv">
        <span className="t">
          <b>{toNote == null ? "Couldn’t check" : toNote === 0 ? "All up to date on their jobs" : `${toNote} sent order${toNote === 1 ? " isn’t" : "s aren’t"} up to date on ${toNote === 1 ? "its jobs" : "their jobs"} yet`}</b>
          <span>tags, notes and purchase orders — sent before these were on, or refused by ServiceTitan, in any week</span>
        </span>
        {!!toNote && (
          <button type="button" className="pk-btn" disabled={pastBusy} onClick={() => startPast(async () => {
            const r = await noteAllPast();
            setPast(r.ok ? { ok: true, text: r.note ?? "Done." } : { ok: false, text: r.error ?? "Couldn’t bring them up to date." });
            router.refresh();
          })}>{pastBusy ? "Working…" : "Bring them up to date"}</button>
        )}
      </div>
      {past && <p className={`pk-said${past.ok ? "" : " bad"}`} role="status" style={{ marginTop: 6 }}>{past.text}</p>}
    </section>
  );
}

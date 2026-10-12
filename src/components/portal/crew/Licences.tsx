"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLicenceAction, removeLicenceAction } from "@/app/portal/team/actions";

export type LicenceRow = { id: string; name: string; number: string | null; expires: string | null; st: { k: "good" | "mid" | "bad" | "none"; w: string } };
const SIGN = { good: "✓", mid: "!", bad: "▼", none: "" } as const;

/** A person's licences and tickets, soonest to run out first, with a form to add one. */
export function Licences({ userId, first, rows, canEdit }: { userId: string; first: string; rows: LicenceRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState({ name: "", number: "", expiresOn: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const add = () => start(async () => {
    const r = await addLicenceAction({ userId, ...f });
    setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Couldn’t save." });
    if (r.ok) { setF({ name: "", number: "", expiresOn: "" }); router.refresh(); }
  });
  const remove = (id: string) => start(async () => {
    const r = await removeLicenceAction({ userId, id });
    if (!r.ok) setMsg({ ok: false, text: r.error ?? "Couldn’t remove it." });
    router.refresh();
  });
  return (
    <section className="pk-card pk-pad">
      <div className="pk-card-h"><b>Licences & tickets</b><span>soonest to run out first</span></div>
      {rows.length === 0 ? <div className="pk-empty">None recorded for {first} yet.</div> : rows.map((l) => (
        <div className="pk-kv" key={l.id}>
          <span className="t">{l.name}<span>{[l.number, l.expires ? `runs out ${l.expires}` : "doesn’t run out"].filter(Boolean).join(" · ")}</span></span>
          <span className={`pk-st ${l.st.k}`}>{SIGN[l.st.k] ? <span aria-hidden="true">{SIGN[l.st.k]}</span> : <i aria-hidden="true" />}{l.st.w}</span>
          {canEdit && <button type="button" className="pk-btn g" disabled={busy} onClick={() => remove(l.id)} aria-label={`Remove ${l.name}`}>Remove</button>}
        </div>
      ))}
      {canEdit && (
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <b style={{ fontSize: 13 }}>Add a licence or ticket</b>
          <div className="pk-btns">
            <input id="lic-name" className="pk-in" style={{ width: 240, textAlign: "left" }} placeholder="e.g. Gasfitting licence" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Licence or ticket" />
            <input id="lic-number" className="pk-in" style={{ width: 150, textAlign: "left" }} placeholder="Number (optional)" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} aria-label="Number" />
            <input id="lic-expires" className="pk-in" type="date" style={{ width: 160 }} value={f.expiresOn} onChange={(e) => setF({ ...f, expiresOn: e.target.value })} aria-label="Runs out on (leave empty if it doesn’t)" />
            <button type="button" className="pk-btn" disabled={busy || !f.name.trim()} onClick={add}>{busy ? "Saving…" : "Add"}</button>
            {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
          </div>
          <p className="pk-note">Leave the date empty for one that doesn’t run out.</p>
        </div>
      )}
    </section>
  );
}

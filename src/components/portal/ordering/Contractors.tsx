"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeWoContact, saveContractor, setContractorAuto } from "@/app/portal/supply/work-orders/actions";
import type { WoContact } from "@/lib/ordering/workOrders";

export type ContractorRow = { c: WoContact; sent: number; last: string | null };
type Sparky = { name: string; email: string; auto: boolean; sent: number; last: string | null };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });

/** Their work orders by themselves or by hand, said in words beside the switch. */
function Auto({ id, on, name }: { id: string; on: boolean; name: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [v, setV] = useState(on);
  return (
    <label className={`au-sw${v ? " on" : ""} ct-auto`}>
      <input type="checkbox" aria-label={`Send ${name}'s work orders by themselves`} checked={v} disabled={busy} onChange={(e) => {
        const next = e.target.checked;
        setV(next);
        start(async () => { const r = await setContractorAuto(id, next); if (!r.ok) setV(!next); router.refresh(); });
      }} />
      <span className="au-track" aria-hidden="true"><i /></span>
      <span>{v ? "Automatic" : "By hand"}</span>
    </label>
  );
}

function Form({ c, onDone }: { c?: WoContact; onDone: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState({ name: c?.name ?? "", trade: c?.trade ?? "", email: c?.email ?? "", phone: c?.phone ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const k = c?.id ?? "new";
  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: e.target.value });
  return (
    <form className="ct-form" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await saveContractor({ id: c?.id, ...f });
      if (!r.ok) { setErr(r.error ?? "Couldn't save."); return; }
      router.refresh();
      onDone();
    }); }}>
      <label htmlFor={`ct-n-${k}`}>Name<input id={`ct-n-${k}`} value={f.name} onChange={set("name")} placeholder="Ross Brennan" required /></label>
      <label htmlFor={`ct-t-${k}`}>What they do<input id={`ct-t-${k}`} value={f.trade} onChange={set("trade")} placeholder="Water balancing" required /></label>
      <label htmlFor={`ct-e-${k}`}>Work orders go to<input id={`ct-e-${k}`} type="email" value={f.email} onChange={set("email")} placeholder="name@example.com" required /></label>
      <label htmlFor={`ct-p-${k}`}>Phone<input id={`ct-p-${k}`} value={f.phone} onChange={set("phone")} placeholder="0400 000 000" /></label>
      {err && <p className="pk-said bad">{err}</p>}
      <span className="ct-acts">
        <button type="submit" className="qp-btn dark" disabled={busy}>{busy ? "Saving…" : c ? "Save" : "Add contractor"}</button>
        <button type="button" className="qp-btn" onClick={onDone} disabled={busy}>Cancel</button>
      </span>
    </form>
  );
}

/**
 * Work orders › Contractors: everyone work orders go to (the electrician on
 * file and the rest), what they do, where it goes, how many have gone, and
 * whether theirs go by themselves: sent once the job's booked, and told the
 * new day when it moves.
 */
export function Contractors({ sparky, rows }: { sparky: Sparky | null; rows: ContractorRow[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const count = (n: number, last: string | null) => (n ? `${n} sent in the last two months${last ? `, last ${day(last)}` : ""}` : "None sent in the last two months");
  return (
    <div className="ct">
      <p className="qp-note">
        <b>Automatic</b> means their work orders go by themselves once the job&rsquo;s booked in ServiceTitan, and when the booking moves they&rsquo;re
        emailed the new day (theirs moves by as much as the booking did). <b>By hand</b> means they wait for you to press Send, and you tell them about moves yourself.
      </p>
      <ul className="ct-list">
        {sparky && (
          <li>
            <div className="ct-who">
              <b>{sparky.name}</b>
              <span>Electrical · {sparky.email || "no email set"}</span>
              <em>{count(sparky.sent, sparky.last)}. Their email is changed on <a href="/portal/supply/emails">Supplier emails</a>.</em>
            </div>
            <Auto id="sparky" on={sparky.auto} name={sparky.name} />
          </li>
        )}
        {rows.map(({ c, sent, last }) => (
          <li key={c.id}>
            {editing === c.id ? <Form c={c} onDone={() => setEditing(null)} /> : (
              <>
                <div className="ct-who">
                  <b>{c.name}</b>
                  <span>{c.trade} · {c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                  <em>{count(sent, last)}.</em>
                </div>
                <span className="ct-row-acts">
                  <Auto id={c.id} on={c.auto !== false} name={c.name} />
                  <button type="button" className="qp-btn sm line" onClick={() => setEditing(c.id)}>Edit</button>
                  <button type="button" className="ct-x" disabled={busy} aria-label={`Take ${c.name} off`}
                    onClick={() => { if (confirm(`Take ${c.name} off the contractors? Work orders already sent to them stay as they are.`)) start(async () => { await removeWoContact(c.id); router.refresh(); }); }}>×</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? <Form onDone={() => setEditing(null)} /> : (
        <button type="button" className="qp-btn dark" onClick={() => setEditing("new")}>+ Add a contractor</button>
      )}
    </div>
  );
}

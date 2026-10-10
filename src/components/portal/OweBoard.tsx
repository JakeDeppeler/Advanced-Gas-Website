"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addOwed, closeOwed, savePriority, type OweResult } from "@/app/portal/finance/owe/actions";
import { PRIORITIES, PRIORITY_RANK, supplierKey, type Owed, type Priority, type SupplierPriority } from "@/lib/owe/types";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const noon = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const daysBetween = (a: string, b: string) => Math.round((noon(b) - noon(a)) / 86_400_000);
const day = (iso: string) => new Date(noon(iso)).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "12 days overdue", "Due today", "Due in 3 days", "Due Fri 30 Oct". */
function dueWords(due: string, today: string): { text: string; late: boolean } {
  const d = daysBetween(today, due);
  if (d < 0) return { text: `${-d} ${d === -1 ? "day" : "days"} overdue`, late: true };
  if (d === 0) return { text: "Due today", late: false };
  if (d <= 6) return { text: `Due in ${d} ${d === 1 ? "day" : "days"}`, late: false };
  return { text: `Due ${day(due)}`, late: false };
}

type Supplier = { key: string; name: string; items: Owed[]; total: number; overdue: number; first: string; pr: Priority; reason: string | null };

/**
 * What we owe, in the order to pay it.
 *
 * Suppliers first by how badly they need paying — the ones that stop the
 * business if they aren't — then by the earliest bill falling due. Each
 * supplier's priority, and the reason for it, is set here once and kept.
 */
export function OweBoard({ owed, priorities, today, xero }: {
  owed: Owed[]; priorities: SupplierPriority[]; today: string; xero: "ok" | "off";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [view, setView] = useState<"supplier" | "date">("supplier");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const run = (fn: () => Promise<OweResult>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Couldn't do that." });
      if (r.ok) after?.();
      router.refresh();
    });

  const pmap = useMemo(() => new Map(priorities.map((p) => [supplierKey(p.supplier), p])), [priorities]);
  const prOf = (name: string) => pmap.get(supplierKey(name));

  const suppliers: Supplier[] = useMemo(() => {
    const by = new Map<string, Supplier>();
    for (const o of owed) {
      const key = supplierKey(o.supplier);
      const s = by.get(key) ?? { key, name: o.supplier, items: [], total: 0, overdue: 0, first: o.due, pr: prOf(o.supplier)?.priority ?? "normal", reason: prOf(o.supplier)?.reason ?? null };
      s.items.push(o);
      s.total += o.amount;
      if (o.due < today) s.overdue += o.amount;
      if (o.due < s.first) s.first = o.due;
      by.set(key, s);
    }
    for (const s of by.values()) s.items.sort((a, b) => a.due.localeCompare(b.due));
    return [...by.values()].sort((a, b) => PRIORITY_RANK[a.pr] - PRIORITY_RANK[b.pr] || a.first.localeCompare(b.first) || b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owed, pmap, today]);

  const total = owed.reduce((a, o) => a + o.amount, 0);
  const overdue = owed.filter((o) => o.due < today).reduce((a, o) => a + o.amount, 0);
  const week = owed.filter((o) => o.due >= today && daysBetween(today, o.due) <= 7).reduce((a, o) => a + o.amount, 0);
  const must = suppliers.filter((s) => s.pr === "must").reduce((a, s) => a + s.total, 0);
  const known = [...new Set([...owed.map((o) => o.supplier), ...priorities.map((p) => p.supplier)])].sort();

  // Adding something Xero doesn't have.
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ supplier: "", what: "", amount: "", dueOn: today });

  return (
    <div className="pt-wi">
      <div className="pt-rev__tiles">
        <div className="pt-rev__tile is-feature"><span className="pt-rev__k">We owe</span><strong>{m0(total)}</strong><span className="pt-rev__sub">{owed.length} {owed.length === 1 ? "bill" : "bills"} to {suppliers.length} {suppliers.length === 1 ? "supplier" : "suppliers"}</span></div>
        <div className="pt-rev__tile"><span className="pt-rev__k">Overdue</span><strong className={overdue > 0 ? "is-bad" : undefined}>{m0(overdue)}</strong><span className="pt-rev__sub">past its due date</span></div>
        <div className="pt-rev__tile"><span className="pt-rev__k">Due in the next 7 days</span><strong>{m0(week)}</strong><span className="pt-rev__sub">on top of what&rsquo;s overdue</span></div>
        <div className="pt-rev__tile"><span className="pt-rev__k">Must pay</span><strong>{m0(must)}</strong><span className="pt-rev__sub">owed to the suppliers we can&rsquo;t trade without</span></div>
      </div>

      {xero === "off" && <p className="pt-note pt-note--warn">Xero isn&rsquo;t answering, so only what&rsquo;s been added here is showing.</p>}

      <section className="pt-panel" aria-labelledby="owe-h">
        <div className="pt-wi__outhead">
          <h2 id="owe-h" className="pt-panel__h">Pay in this order</h2>
          <div className="pt-seg" role="group" aria-label="Show">
            <button type="button" className={`pt-seg__b${view === "supplier" ? " is-on" : ""}`} aria-pressed={view === "supplier"} onClick={() => setView("supplier")}>By supplier</button>
            <button type="button" className={`pt-seg__b${view === "date" ? " is-on" : ""}`} aria-pressed={view === "date"} onClick={() => setView("date")}>By due date</button>
          </div>
        </div>
        <p className="pt-panel__sub">The suppliers you can&rsquo;t trade without come first, then whoever&rsquo;s been waiting longest. Set each supplier&rsquo;s priority once and it stays.</p>
        {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

        {view === "supplier" ? (
          <ul className="pt-owe__list">
            {suppliers.map((s) => {
              const w = dueWords(s.first, today);
              return (
                <li key={s.key} className={`pt-owe__sup is-${s.pr}`}>
                  <div className="pt-owe__row">
                    <button type="button" className="pt-owe__name" aria-expanded={!!open[s.key]} onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}>
                      <span className="pt-owe__caret" aria-hidden="true">{open[s.key] ? "▾" : "▸"}</span>
                      <strong>{s.name}</strong>
                      <em>{s.items.length} {s.items.length === 1 ? "bill" : "bills"}{s.reason ? ` · ${s.reason}` : ""}</em>
                    </button>
                    <PriorityPick s={s} pending={pending} onSave={(pr, reason) => run(() => savePriority(s.name, pr, reason), `${s.name}: ${PRIORITIES.find((p) => p.k === pr)?.label}.`)} />
                    <span className={`pt-owe__due${w.late ? " is-late" : ""}`}>{w.late ? "⚑ " : ""}{w.text}</span>
                    <strong className="pt-owe__amt">{m2(s.total)}{s.overdue > 0 && s.overdue < s.total && <em>{m0(s.overdue)} overdue</em>}</strong>
                  </div>
                  {open[s.key] && (
                    <ul className="pt-owe__bills">
                      {s.items.map((o) => {
                        const bw = dueWords(o.due, today);
                        return (
                          <li key={o.id}>
                            <span>{o.what ?? "Bill"}{o.source === "portal" && <em> added here</em>}</span>
                            <span className={bw.late ? "is-late" : undefined}>{bw.text}</span>
                            <strong>{m2(o.amount)}</strong>
                            {o.source === "portal" ? (
                              <span className="pt-owe__acts">
                                <button type="button" className="pt-todo__editbtn" disabled={pending} onClick={() => run(() => closeOwed(o.id, "paid"), "Marked paid.")}>Paid</button>
                                <button type="button" className="pt-todo__remove" disabled={pending} onClick={() => { if (confirm("Take this off the list?")) run(() => closeOwed(o.id, "removed"), "Removed."); }}>Remove</button>
                              </span>
                            ) : <span className="pt-owe__acts"><em>pay in Xero</em></span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-rev__pl">
              <thead><tr><th scope="col">Supplier</th><th scope="col">Bill</th><th scope="col">Due</th><th scope="col">Priority</th><th scope="col">Amount</th></tr></thead>
              <tbody>
                {[...owed].sort((a, b) => a.due.localeCompare(b.due)).map((o) => {
                  const w = dueWords(o.due, today);
                  const pr = prOf(o.supplier)?.priority ?? "normal";
                  return (
                    <tr key={o.id}>
                      <th scope="row">{o.supplier}</th>
                      <td>{o.what ?? "—"}</td>
                      <td className={w.late ? "is-bad" : undefined}>{w.late ? "⚑ " : ""}{w.text}</td>
                      <td><span className={`pt-owe__chip is-${pr}`}>{PRIORITIES.find((p) => p.k === pr)?.label}</span></td>
                      <td>{m2(o.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!owed.length && <p className="pt-todo__empty">Nothing owed. </p>}
      </section>

      <section className="pt-panel" aria-labelledby="owe-add-h">
        <h2 id="owe-add-h" className="pt-panel__h">Something Xero doesn&rsquo;t have</h2>
        <p className="pt-panel__sub">A Reece account statement, a loan repayment, anything owed without a bill in Xero. It goes in the list above until you mark it paid.</p>
        {adding ? (
          <form className="pt-owe__add" onSubmit={(e) => { e.preventDefault(); run(() => addOwed(f), "Added.", () => { setF({ supplier: "", what: "", amount: "", dueOn: today }); setAdding(false); }); }}>
            <label className="pt-field"><span>Who to</span><input id="owe-sup" list="owe-sups" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} required maxLength={200} placeholder="Reece" /></label>
            <datalist id="owe-sups">{known.map((k) => <option key={k} value={k} />)}</datalist>
            <label className="pt-field"><span>What for</span><input id="owe-what" value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} maxLength={200} placeholder="October account" /></label>
            <label className="pt-field"><span>How much</span><input id="owe-amt" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required placeholder="$" /></label>
            <label className="pt-field"><span>Due</span><input id="owe-due" type="date" value={f.dueOn} onChange={(e) => setF({ ...f, dueOn: e.target.value })} required /></label>
            <span className="pt-owe__addacts">
              <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Add</button>
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setAdding(false)}>Cancel</button>
            </span>
          </form>
        ) : (
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setAdding(true)}>+ Add something we owe</button>
        )}
      </section>
    </div>
  );
}

function PriorityPick({ s, pending, onSave }: { s: Supplier; pending: boolean; onSave: (pr: Priority, reason: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [pr, setPr] = useState<Priority>(s.pr);
  const [reason, setReason] = useState(s.reason ?? "");
  if (!editing) {
    return (
      <button type="button" className={`pt-owe__chip is-${s.pr}`} onClick={() => setEditing(true)} title="Change priority">
        {PRIORITIES.find((p) => p.k === s.pr)?.label}
      </button>
    );
  }
  return (
    <form className="pt-owe__pick" onSubmit={(e) => { e.preventDefault(); onSave(pr, reason); setEditing(false); }}>
      <select value={pr} onChange={(e) => setPr(e.target.value as Priority)} aria-label={`Priority for ${s.name}`}>
        {PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.label} — {p.blurb}</option>)}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? e.g. no pay, no stock" maxLength={300} aria-label="Why" />
      <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending}>Save</button>
      <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}

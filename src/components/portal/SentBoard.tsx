"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fixAndResend } from "@/app/portal/supply/sent/actions";

type Line = { id: number; qty: number; item: string; desc: string | null; job: string | null; customer: string | null; cost: number | null };
type Order = { id: number; po: string; supplier: string; kind: "order" | "work_order"; week: string; sentAt: string | null; sentTo: string | null; by: string | null; pickup: boolean; total: number; lines: Line[];
  delivery: { address: string; toSite: boolean; instructions: string; deliverBy: string; note: string } };

const emailed = (sentTo: string | null) => /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/.test(sentTo ?? "");

/**
 * Something wrong on an order that's gone (the wrong address, the wrong
 * day): fix it here and it's emailed again to the same supplier, marked as
 * replacing the first, with the office copied as before.
 */
function FixAndResend({ o, onDone }: { o: Order; onDone: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState(o.delivery);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const k = `sb-${o.id}`;
  return (
    <form className="sb-fix" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await fixAndResend({ id: o.id, pickup: o.pickup, ...f });
      setMsg(r.ok ? { ok: true, text: r.note ?? "Sent again." } : { ok: false, text: r.error ?? "Couldn't send it." });
      if (r.ok) { router.refresh(); setTimeout(onDone, 2500); }
    }); }}>
      <b>Fix it and send it again</b>
      <p>Goes to {o.sentTo} again, headed &ldquo;Updated — this replaces order {o.po} we sent earlier&rdquo;.</p>
      {!o.pickup && (
        <>
          <label className="sb-fix__check"><input type="checkbox" checked={f.toSite} onChange={(e) => setF({ ...f, toSite: e.target.checked })} /> Deliver straight to site</label>
          <label htmlFor={`${k}-a`}>Deliver to</label>
          <input id={`${k}-a`} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} required />
          <label htmlFor={`${k}-i`}>Delivery instructions</label>
          <input id={`${k}-i`} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="e.g. leave at side gate" />
        </>
      )}
      <label htmlFor={`${k}-d`}>{o.pickup ? "Ready by" : "Deliver by"} <span>(blank for the date from the first install)</span></label>
      <input id={`${k}-d`} type="date" value={f.deliverBy} onChange={(e) => setF({ ...f, deliverBy: e.target.value })} />
      <label htmlFor={`${k}-n`}>Note to {o.supplier}</label>
      <textarea id={`${k}-n`} rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Sorry, wrong address on the first one" />
      <span className="sb-fix__acts">
        <button type="submit" className="qp-btn dark" disabled={busy}>{busy ? "Sending…" : `Send the corrected order`}</button>
        <button type="button" className="qp-btn" onClick={onDone} disabled={busy}>Cancel</button>
      </span>
      {msg && <p className={`sb-fix__msg${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
    </form>
  );
}

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" }) : "");
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/**
 * Every order that's gone: a chip per supplier to narrow it, a search that
 * finds a job number, a customer, an item or a PO, and each order opening to
 * its lines.
 */
export function SentBoard({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState("");
  const [who, setWho] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [fixing, setFixing] = useState<number | null>(null);
  const suppliers = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.supplier, (m.get(o.supplier) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders]);
  const needle = q.trim().toLowerCase();
  const shown = orders.filter((o) => (who === "all" || o.supplier === who) && (!needle || [o.po, o.supplier, o.sentTo, ...o.lines.flatMap((l) => [l.job, l.customer, l.item, l.desc])].some((x) => x?.toLowerCase().includes(needle))));
  const groups = new Map<string, Order[]>();
  for (const o of shown) groups.set(o.supplier, [...(groups.get(o.supplier) ?? []), o]);

  return (
    <div className="sb">
      <div className="jp-filters">
        <label className="qp-find jp-find">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input id="sb-find" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a job #, customer, item or PO" aria-label="Find a job number, customer, item or PO" />
        </label>
      </div>
      <div className="qp-people" role="group" aria-label="Supplier">
        <button type="button" className={`qp-chip${who === "all" ? " on" : ""}`} aria-pressed={who === "all"} onClick={() => setWho("all")}>Every supplier · {orders.length}</button>
        {suppliers.map(([s, n]) => (
          <button key={s} type="button" className={`qp-chip${who === s ? " on" : ""}`} aria-pressed={who === s} onClick={() => setWho(s)}>{s} · {n}</button>
        ))}
      </div>
      {!shown.length && <p className="qp-empty">{orders.length ? "Nothing sent matches that." : "Nothing has been sent yet."}</p>}
      {[...groups.entries()].map(([supplier, list]) => (
        <section key={supplier} className="pk-card sb-group">
          <header className="sb-gh"><b>{supplier}</b><span>{list.length} {list.length === 1 ? "order" : "orders"} · {money(list.reduce((t, o) => t + o.total, 0))} ex GST</span></header>
          <ul className="sb-rows">
            {list.map((o) => {
              const jobs = [...new Set(o.lines.map((l) => l.job).filter(Boolean))];
              const isOpen = open === o.id;
              return (
                <li key={o.id} className={isOpen ? "open" : undefined}>
                  <button type="button" className="sb-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)}>
                    <span className="sb-when">{day(o.sentAt)}</span>
                    <span className="sb-what">
                      <b>{o.po}{o.kind === "work_order" ? " · electrician" : ""}</b>
                      <span>{jobs.length ? `Job${jobs.length > 1 ? "s" : ""} ${jobs.join(", ")}` : "Stock"}{o.lines[0]?.customer ? ` · ${o.lines[0].customer}` : ""}{o.pickup ? " · we pick up" : ""}</span>
                    </span>
                    <span className="sb-to">{o.sentTo ?? ""}</span>
                    <span className="sb-sum">{o.total ? money(o.total) : ""}</span>
                  </button>
                  {isOpen && o.kind === "order" && emailed(o.sentTo) && (
                    fixing === o.id
                      ? <FixAndResend o={o} onDone={() => setFixing(null)} />
                      : <div className="sb-fixbar"><button type="button" className="qp-btn" onClick={() => setFixing(o.id)}>Wrong address or date? Fix it and resend</button></div>
                  )}
                  {isOpen && o.kind === "work_order" && <div className="sb-fixbar"><a className="qp-btn" href="/portal/supply/work-orders">Change it and email the update on Work orders</a></div>}
                  {isOpen && (
                    <table className="sb-lines">
                      <tbody>
                        {o.lines.map((l) => (
                          <tr key={l.id}>
                            <td className="n">{qty(l.qty)}</td>
                            <td><b>{l.item}</b>{l.desc && l.desc !== l.item ? <span>{l.desc}</span> : null}</td>
                            <td>{l.job ? <><b>{l.job}</b><span>{l.customer ?? ""}</span></> : <span>Stock</span>}</td>
                            <td className="n">{l.cost == null ? "" : money(l.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fixAndResend, undoSend } from "@/app/portal/supply/sent/actions";

/**
 * Sent to the wrong place: put it back as a draft, to fix and send again.
 * Nothing is emailed; whoever got it is told by the office.
 */
function PutBack({ o }: { o: { id: number; po: string; sentTo: string | null; kind: string } }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="sb-putback">
      <button type="button" className="qp-btn line" disabled={busy}
        onClick={() => { if (confirm(`Put ${o.po} back as a draft?${o.sentTo ? ` It went to ${o.sentTo}; nothing is emailed to them, so let them know if they shouldn't have had it.` : ""} You can fix it and send it again${o.kind === "work_order" ? " from Work orders" : " from To order"}.`)) start(async () => { const r = await undoSend(o.id); setMsg(r.ok ? { ok: true, text: r.note ?? "A draft again." } : { ok: false, text: r.error ?? "Couldn't." }); if (r.ok) router.refresh(); }); }}>
        {busy ? "Putting it back…" : "Undo: put it back as a draft"}
      </button>
      {msg && <span className={`sb-fix__msg${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
    </span>
  );
}

type Line = { id: number; qty: number; item: string; desc: string | null; job: string | null; customer: string | null; cost: number | null; ahead: boolean };
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

/** The Monday a moment falls in, in Melbourne, as YYYY-MM-DD. */
function mondayOf(iso: string): string {
  const d = new Date(`${new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" })}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const weekName = (monday: string, thisMonday: string) => {
  if (monday === thisMonday) return "This week";
  const last = new Date(`${thisMonday}T12:00:00Z`); last.setUTCDate(last.getUTCDate() - 7);
  if (monday === last.toISOString().slice(0, 10)) return "Last week";
  return `Week of ${new Date(`${monday}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "")}`;
};

/** What an order was for, in a few words: its jobs, who it was ordered ahead for, or the factory's shelf. */
function forWhat(o: Order): string {
  const jobs = [...new Set(o.lines.map((l) => l.job).filter(Boolean))];
  const who = o.lines.find((l) => l.customer)?.customer;
  if (jobs.length) return `${jobs.length === 1 ? `Job ${jobs[0]}` : `Jobs ${jobs.join(", ")}`}${who ? ` · ${who}` : ""}`;
  if (o.lines.some((l) => l.ahead)) return `Ordered ahead${who ? ` for ${who}` : ""}`;
  return "Factory stock";
}

/**
 * Every supplier order that's gone, newest first, a week at a time: chips for
 * when and for which supplier, a search that finds a job number, a customer,
 * an item or a PO, and each order opening to its lines, with a way to fix and
 * resend it or put it back. Work orders are on Work orders, beside the rest
 * of each contractor's.
 */
export function SentBoard({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState("");
  const [who, setWho] = useState<string>("all");
  const [span, setSpan] = useState<"all" | "this" | "last" | "month">("all");
  const [open, setOpen] = useState<number | null>(null);
  const [fixing, setFixing] = useState<number | null>(null);
  const suppliers = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.supplier, (m.get(o.supplier) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders]);
  const thisMonday = mondayOf(new Date().toISOString());
  const lastMonday = (() => { const d = new Date(`${thisMonday}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString().slice(0, 10); })();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const inSpan = (o: Order) => {
    if (span === "all" || !o.sentAt) return span === "all";
    const m = mondayOf(o.sentAt);
    return span === "this" ? m === thisMonday : span === "last" ? m === lastMonday : o.sentAt >= monthAgo;
  };
  const needle = q.trim().toLowerCase();
  const shown = orders.filter((o) => (who === "all" || o.supplier === who) && inSpan(o) && (!needle || [o.po, o.supplier, o.sentTo, ...o.lines.flatMap((l) => [l.job, l.customer, l.item, l.desc])].some((x) => x?.toLowerCase().includes(needle))));
  const weeks = new Map<string, Order[]>();
  for (const o of [...shown].sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))) {
    const k = o.sentAt ? mondayOf(o.sentAt) : "";
    weeks.set(k, [...(weeks.get(k) ?? []), o]);
  }
  const spans: { key: typeof span; label: string }[] = [
    { key: "all", label: "Everything" }, { key: "this", label: "This week" }, { key: "last", label: "Last week" }, { key: "month", label: "Last 30 days" },
  ];

  return (
    <div className="sb">
      <section className="pt-panel nw-check sb-panel" aria-label="Sent orders">
        <div className="wo-filt">
          <label className="qp-find">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input id="sb-find" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a job #, customer, item or PO" aria-label="Find a job number, customer, item or PO" />
          </label>
          <div className="qp-people" role="group" aria-label="When">
            {spans.map((x) => (
              <button key={x.key} type="button" className={`qp-chip${span === x.key ? " on" : ""}`} aria-pressed={span === x.key} onClick={() => setSpan(x.key)}>{x.label}</button>
            ))}
          </div>
          {suppliers.length > 1 && (
            <div className="qp-people" role="group" aria-label="Supplier">
              <button type="button" className={`qp-chip${who === "all" ? " on" : ""}`} aria-pressed={who === "all"} onClick={() => setWho("all")}>Every supplier · {orders.length}</button>
              {suppliers.map(([x, n]) => (
                <button key={x} type="button" className={`qp-chip${who === x ? " on" : ""}`} aria-pressed={who === x} onClick={() => setWho(x)}>{x} · {n}</button>
              ))}
            </div>
          )}
        </div>
        {!shown.length && <p className="nw-none">{orders.length ? "Nothing sent matches that." : "Nothing has been sent yet."}</p>}
        {[...weeks.entries()].map(([monday, list]) => (
          <div key={monday} className="nw-grp">
            <div className="nw-gh">
              <h2>{monday ? weekName(monday, thisMonday) : "No date"}</h2>
              <span>{list.length} {list.length === 1 ? "order" : "orders"} · {money(list.reduce((t, o) => t + o.total, 0))} ex GST</span>
            </div>
            <ul className="sb-rows">
              {list.map((o) => {
                const isOpen = open === o.id;
                return (
                  <li key={o.id} className={isOpen ? "open" : undefined}>
                    <button type="button" className="wo-row sb-row2" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)}>
                      <span className="nw-task__dot is-done" aria-hidden="true">✓</span>
                      <span className="wo-row-t">
                        <b>{o.supplier} · {forWhat(o)}</b>
                        <span>{[o.po, day(o.sentAt), emailed(o.sentTo) ? `emailed to ${o.sentTo}` : o.sentTo, o.pickup ? "we pick it up" : null].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="sb-sum">{o.total ? money(o.total) : ""}</span>
                    </button>
                    {isOpen && (
                      <div className="sb-open">
                        {emailed(o.sentTo) ? (
                          fixing === o.id
                            ? <FixAndResend o={o} onDone={() => setFixing(null)} />
                            : <div className="sb-fixbar"><button type="button" className="qp-btn" onClick={() => setFixing(o.id)}>Wrong address or date? Fix it and resend</button><PutBack o={o} /></div>
                        ) : <div className="sb-fixbar"><PutBack o={o} /></div>}
                        <table className="sb-lines">
                          <tbody>
                            {o.lines.map((l) => (
                              <tr key={l.id}>
                                <td className="n">{qty(l.qty)}</td>
                                <td><b>{l.item}</b>{l.desc && l.desc !== l.item ? <span>{l.desc}</span> : null}</td>
                                <td>{l.job ? <><b>{l.job}</b><span>{l.customer ?? ""}</span></> : l.ahead ? <><b>Ahead</b><span>{l.customer ?? ""}</span></> : <span>Stock</span>}</td>
                                <td className="n">{l.cost == null ? "" : money(l.cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

export type InvRow = {
  number: string; customer: string; due: string; amount: number; daysOver: number;
  stage: "work" | "billed"; from: "xero" | "servicetitan"; total?: number; paid?: number;
};

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
type Show = "all" | "over" | "notdue" | "work";
const kind = (r: InvRow): Exclude<Show, "all"> => (r.stage === "work" ? "work" : r.daysOver > 0 ? "over" : "notdue");
const TONE = { over: "bad", notdue: "good", work: "none" } as const;
const PAGE = 20;

/**
 * Every unpaid invoice in one table, as Rapport lists its invoices: filter by
 * where it stands, find one by number or customer, and see each one's due date
 * and state in words — "12 days late", "due in 5 days", "owed once done".
 */
export function InvoiceTable({ rows }: { rows: InvRow[] }) {
  const [show, setShow] = useState<Show>("all");
  const [find, setFind] = useState("");
  const [more, setMore] = useState(false);
  const counts = useMemo(() => ({
    all: rows.length, over: rows.filter((r) => kind(r) === "over").length, notdue: rows.filter((r) => kind(r) === "notdue").length, work: rows.filter((r) => kind(r) === "work").length,
  }), [rows]);
  const list = useMemo(() => {
    const n = find.trim().toLowerCase();
    return rows
      .filter((r) => show === "all" || kind(r) === show)
      .filter((r) => !n || r.number.toLowerCase().includes(n) || r.customer.toLowerCase().includes(n))
      // Most overdue first, then soonest due, then the jobs not done by size.
      .sort((a, b) => (kind(a) === "work" ? 1 : 0) - (kind(b) === "work" ? 1 : 0) || b.daysOver - a.daysOver || b.amount - a.amount);
  }, [rows, show, find]);
  const shown = more ? list : list.slice(0, PAGE);
  const TABS: Array<[Show, string]> = [["all", "All"], ["over", "Overdue"], ["notdue", "Not due yet"], ["work", "Work not done"]];

  return (
    <div className="mf-inv-t">
      <div className="mf-inv-bar">
        <div className="rp-seg" role="group" aria-label="Which invoices">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" className={show === k ? "on" : undefined} aria-pressed={show === k} onClick={() => setShow(k)}>{label} <span>{counts[k]}</span></button>
          ))}
        </div>
        <label className="qp-find mf-find">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input id="inv-find" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Number or customer" aria-label="Find an invoice by number or customer" />
        </label>
      </div>
      <p className="mf-count">{plural(list.length, "invoice")} · {m0(list.reduce((a, r) => a + r.amount, 0))}</p>
      <div className="qp-table mf-table">
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="r">Owing</th><th>Where it stands</th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const k = kind(r);
              const word = k === "work" ? "Owed once done" : k === "over" ? `${plural(r.daysOver, "day")} late` : r.daysOver === 0 ? "Due today" : r.daysOver === -1 ? "Due tomorrow" : `Due in ${-r.daysOver} days`;
              return (
                <tr key={`${r.number}-${r.due}-${r.stage}`} style={{ cursor: "default" }}>
                  <td><b>{r.number || "—"}</b>{r.from === "xero" && <span>in Xero</span>}</td>
                  <td><span className="mf-who"><span className="qp-av" aria-hidden="true">{(r.customer || "?").slice(0, 1).toUpperCase()}</span><span><b>{r.customer || "—"}</b>{k === "work" && r.total ? <span>{m0(r.total)} job{r.paid ? `, ${m0(r.paid)} paid` : ""}</span> : null}</span></span></td>
                  <td>{k === "work" ? "—" : day(r.due)}</td>
                  <td className="r"><b>{m0(r.amount)}</b></td>
                  <td><span className={`pk-st ${TONE[k]}`}><i aria-hidden="true" style={{ background: "currentColor" }} />{word}</span></td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={5} className="qp-empty">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
      {list.length > PAGE && !more && <button type="button" className="qp-btn mf-more" onClick={() => setMore(true)}>Show all {list.length}</button>}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { JobProfit } from "@/lib/dashboard/jobProfit";

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const pc = (n: number | null) => (n == null ? "" : `${Math.round(n * 100)}%`);
// Not imported from toBill: that module reads the database, and this one runs in the browser.
const stJobUrl = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

type Result = "all" | "losing" | "under" | "ok" | "uncosted";
type Sort = "worst" | "best" | "profit" | "price" | "newest";

const SORTS: Array<{ k: Sort; label: string }> = [
  { k: "worst", label: "Worst margin first" },
  { k: "best", label: "Best margin first" },
  { k: "profit", label: "Most profit" },
  { k: "price", label: "Biggest job" },
  { k: "newest", label: "Newest" },
];

/**
 * The job list, cut any way: a search, a type of job, who worked it, how it
 * came out, and the order. Filtering happens here, on the rows the page
 * already loaded for the period, so it's instant; the totals under the
 * filters are for whatever is showing.
 */
export function JobProfitTable({ rows, target }: { rows: JobProfit[]; target: number | null }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tech, setTech] = useState("");
  const [result, setResult] = useState<Result>("all");
  const [sort, setSort] = useState<Sort>("worst");

  const types = useMemo(() => [...new Set(rows.map((r) => r.jobType ?? "Job"))].sort(), [rows]);
  const techs = useMemo(() => [...new Set(rows.flatMap((r) => r.techs))].sort(), [rows]);
  const goal = target != null ? target / 100 : null;
  const under = (j: JobProfit) => j.margin != null && goal != null && j.margin < goal;
  const resultOf = (j: JobProfit): Result => (j.profit == null ? "uncosted" : j.profit < 0 ? "losing" : under(j) ? "under" : "ok");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((j) => {
      if (type && (j.jobType ?? "Job") !== type) return false;
      if (tech && !j.techs.includes(tech)) return false;
      if (result !== "all") {
        const r = resultOf(j);
        if (result === "under" ? !(r === "under" || r === "losing") : r !== result) return false;
      }
      if (needle && ![j.customer, j.jobNumber, j.jobType, ...j.techs].some((x) => x?.toLowerCase().includes(needle))) return false;
      return true;
    });
    const m = (j: JobProfit) => j.margin ?? (sort === "best" ? -9 : 9);
    return list.sort((a, b) =>
      sort === "worst" ? m(a) - m(b) || b.price - a.price
        : sort === "best" ? m(b) - m(a) || b.price - a.price
          : sort === "profit" ? (b.profit ?? -1e9) - (a.profit ?? -1e9)
            : sort === "price" ? b.price - a.price
              : b.date.localeCompare(a.date),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, type, tech, result, sort, target]);

  const costed = shown.filter((j) => j.profit != null);
  const work = costed.reduce((a, j) => a + j.price, 0);
  const profit = costed.reduce((a, j) => a + (j.profit ?? 0), 0);
  const filtered = q || type || tech || result !== "all";
  const counts: Record<Result, number> = { all: rows.length, losing: 0, under: 0, ok: 0, uncosted: 0 };
  for (const j of rows) { const r = resultOf(j); counts[r] += 1; if (r === "losing") counts.under += 1; }
  const RESULTS: Array<{ k: Result; label: string; n: number; tone: string }> = [
    { k: "all", label: "All jobs", n: counts.all, tone: "all" },
    { k: "losing", label: "Losing money", n: counts.losing, tone: "bad" },
    ...(goal != null ? [{ k: "under" as Result, label: `Under ${target}%`, n: counts.under, tone: "warn" }] : []),
    { k: "ok", label: goal != null ? `On ${target}% or better` : "Making money", n: counts.ok, tone: "good" },
    { k: "uncosted", label: "Couldn't cost", n: counts.uncosted, tone: "none" },
  ];
  const clear = () => { setQ(""); setType(""); setTech(""); setResult("all"); };
  const below = (j: JobProfit) => j.margin != null && (goal != null ? j.margin < goal : j.margin < 0);

  return (
    <div className="jp">
      {/* How it came out: the first cut anyone makes, so big and out on the page, not tucked in the filters. */}
      <nav className="jp-results" aria-label="How the job came out">
        {RESULTS.map((o) => (
          <button key={o.k} type="button" className={`jp-res t-${o.tone}${result === o.k ? " on" : ""}`} aria-pressed={result === o.k} onClick={() => setResult(o.k)}>
            <span className="jp-resn">{o.n}</span>
            <span className="jp-resl">{o.label}</span>
          </button>
        ))}
      </nav>

      <div className="jp-filters">
        <label className="qp-find jp-find">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input id="jp-find" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a customer, job # or tech" aria-label="Find a customer, job number or tech" />
        </label>
        <label className="jp-sel"><span>Type</span>
          <select id="jp-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="jp-sel"><span>Who</span>
          <select id="jp-tech" value={tech} onChange={(e) => setTech(e.target.value)} disabled={!techs.length}>
            <option value="">{techs.length ? "Anyone" : "No timesheets yet"}</option>
            {techs.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="jp-sel"><span>Order</span>
          <select id="jp-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
        </label>
      </div>

      <section className="pk-card jp-card">
        <p className="jp-sum" role="status">
          <b>{shown.length} {shown.length === 1 ? "job" : "jobs"}{filtered ? " showing" : ""}</b>
          {costed.length ? <span>{money(profit)} profit on {money(work)} of costed work · {pc(work > 0 ? profit / work : null)} margin</span> : null}
          {filtered && <button type="button" className="jp-clear" onClick={clear}>Clear filters</button>}
        </p>

        {shown.length ? (
          <div className="jp-wrap">
            <table className="jp-table">
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col">Price</th>
                  <th scope="col">Gear</th>
                  <th scope="col">Hours</th>
                  <th scope="col">Labour</th>
                  <th scope="col">Profit</th>
                  <th scope="col">Margin</th>
                  <th scope="col"><span className="pn-vh">ServiceTitan</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((j) => {
                  const tone = j.margin == null ? "none" : j.profit != null && j.profit < 0 ? "bad" : below(j) ? "warn" : "good";
                  return (
                    <tr key={`${j.jobId ?? "x"}-${j.date}-${j.price}`} className={j.profit == null ? "is-uncosted" : undefined}>
                      <th scope="row">
                        <b>{j.jobType ?? "Job"}</b>
                        <span>
                          {[j.jobNumber ? `#${j.jobNumber}` : null, j.customer, day(j.date), j.techs.length ? j.techs.join(" & ") : null].filter(Boolean).join(" · ")}
                          {j.missing ? `, ${j.missing}` : ""}
                        </span>
                      </th>
                      <td>{money(j.price)}{j.rebate > 0 ? <i className="jp-nil jp-reb">+ {money(j.rebate)} rebate</i> : null}</td>
                      <td>{j.materials ? money(j.materials) : <i className="jp-nil">none</i>}</td>
                      <td>{j.hours == null ? <i className="jp-nil">none</i> : `${j.hours.toLocaleString("en-AU", { maximumFractionDigits: 1 })}${j.hoursFrom === "sold" ? " sold" : " on site"}${j.hoursFrom === "timesheets" && j.allowedHours ? ` of ${j.allowedHours.toLocaleString("en-AU", { maximumFractionDigits: 1 })}` : ""}`}</td>
                      <td>{j.labour == null ? <i className="jp-nil">none</i> : money(j.labour)}</td>
                      <td className={`jp-profit t-${tone}`}>{j.profit == null ? <i className="jp-nil">can&rsquo;t cost</i> : money(j.profit)}</td>
                      {/* The pill carries an arrow and its colour: down under the goal, up at or over it. */}
                      <td>{j.margin == null ? null : <span className={`jp-pill t-${tone}`}>{below(j) ? "▼" : "▲"} {pc(j.margin)}</span>}</td>
                      <td className="jp-st">
                        {j.jobId != null && (
                          <a href={stJobUrl(j.jobId)} target="_blank" rel="noreferrer" className="jp-open" title="Open this job in ServiceTitan">
                            ServiceTitan
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="qp-empty">No jobs match. <button type="button" className="jp-clear" onClick={clear}>Clear filters</button></p>
        )}
      </section>
    </div>
  );
}

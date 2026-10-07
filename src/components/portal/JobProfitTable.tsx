"use client";

import { useMemo, useState } from "react";
import type { JobProfit } from "@/lib/dashboard/jobProfit";

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const pc = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
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
  const RESULTS: Array<{ k: Result; label: string }> = [
    { k: "all", label: `All ${counts.all}` },
    { k: "losing", label: `Losing money ${counts.losing}` },
    ...(goal != null ? [{ k: "under" as Result, label: `Under ${target}% ${counts.under + 0}` }] : []),
    { k: "ok", label: `${goal != null ? `On ${target}%+` : "Making money"} ${counts.ok}` },
    { k: "uncosted", label: `Couldn't cost ${counts.uncosted}` },
  ];

  return (
    <section className="pt-panel pt-jp">
      <div className="pt-jp__filters">
        <input className="pt-kit__find" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a customer, job # or tech" aria-label="Find a customer, job number or tech" />
        <label className="pt-jp__sel"><span>Type of job</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="pt-jp__sel"><span>Who worked it</span>
          <select value={tech} onChange={(e) => setTech(e.target.value)} disabled={!techs.length}>
            <option value="">{techs.length ? "Anyone" : "No timesheets yet"}</option>
            {techs.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="pt-jp__sel"><span>Order</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <nav className="pt-seg pt-jp__results" aria-label="How the job came out">
        {RESULTS.map((o) => (
          <button key={o.k} type="button" className={`pt-seg__b${result === o.k ? " is-on" : ""}`} aria-pressed={result === o.k} onClick={() => setResult(o.k)}>{o.label}</button>
        ))}
      </nav>
      <p className="pt-jp__sum" role="status">
        {shown.length} {shown.length === 1 ? "job" : "jobs"}{filtered ? " showing" : ""}
        {costed.length ? ` · ${money(profit)} profit on ${money(work)} of costed work · ${pc(work > 0 ? profit / work : null)} margin` : ""}
        {filtered && <button type="button" className="pt-todo__editbtn" onClick={() => { setQ(""); setType(""); setTech(""); setResult("all"); }}>Clear filters</button>}
      </p>

      {shown.length ? (
        <div className="pt-pace__tablewrap">
          <table className="pt-pace__table pt-pace__table--jobs pt-profit__table">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Price</th>
                <th scope="col">Equipment &amp; materials</th>
                <th scope="col">Hours</th>
                <th scope="col">Labour</th>
                <th scope="col">Profit</th>
                <th scope="col">Margin</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((j) => (
                <tr key={`${j.jobId ?? "x"}-${j.date}-${j.price}`} className={j.profit == null ? "is-uncosted" : undefined}>
                  <th scope="row">
                    <span className="pt-pace__rk">{j.jobType ?? "Job"}</span>
                    <span className="pt-pace__rn">
                      {[j.jobNumber ? `#${j.jobNumber}` : null, j.customer, day(j.date), j.techs.length ? j.techs.join(" & ") : null].filter(Boolean).join(" · ")}
                      {j.missing ? ` — ${j.missing}` : ""}
                    </span>
                  </th>
                  <td>{money(j.price)}</td>
                  <td>{j.materials ? money(j.materials) : "—"}</td>
                  <td>{j.hours == null ? "—" : `${j.hours.toLocaleString("en-AU", { maximumFractionDigits: 1 })}${j.hoursFrom === "sold" ? " sold" : " clocked"}`}</td>
                  <td>{j.labour == null ? "—" : money(j.labour)}</td>
                  <td className={j.profit != null && j.profit < 0 ? "is-low" : ""}>{j.profit == null ? "—" : money(j.profit)}</td>
                  <td className={under(j) ? "is-low" : ""}>{pc(j.margin)}{under(j) ? " ▼" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="pt-todo__empty">No jobs match. <button type="button" className="pt-todo__editbtn" onClick={() => { setQ(""); setType(""); setTech(""); setResult("all"); }}>Clear filters</button></p>
      )}
    </section>
  );
}

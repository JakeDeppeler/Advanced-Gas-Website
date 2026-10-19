import Link from "next/link";
import { cache, type ReactNode } from "react";
import { jobProfits, type JobProfit } from "@/lib/dashboard/jobProfit";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { CountUp } from "./CountUp";

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

/** Against the year goal's margin: on it, within ten points of it, or under that. Words as well as colour. */
function verdict(j: JobProfit, target: number | null): { k: "good" | "mid" | "bad" | "none"; w: string } {
  if (j.margin == null) return { k: "none", w: j.missing ? "Not costed" : "No figure" };
  if (j.margin < 0) return { k: "bad", w: "Lost money" };
  if (target == null) return { k: "none", w: "No goal set" };
  const t = target / 100;
  return j.margin >= t ? { k: "good", w: "On target" } : j.margin >= t - 0.1 ? { k: "mid", w: "Under target" } : { k: "bad", w: "Well under" };
}

/**
 * The last 30 days of invoiced jobs, costed once per request: the header's
 * margin figure and the table under it both read it, and costing is the
 * slowest read on the page.
 */
const recent = cache(async (target: number | null) => {
  const now = new Date();
  const crew = await hourJobCosts().catch(() => null);
  return jobProfits(isoDateMelbourne(new Date(now.getTime() - 30 * 86_400_000)), isoDateMelbourne(now), crew?.costPerHr ?? null, target, crew?.crew ?? []).catch(() => null);
});

/** Profit over price across the jobs that could be costed: weighted by price, so a $90 call-out doesn't count as much as a $9,000 install. */
function across(rows: JobProfit[]): { pct: number; n: number } | null {
  const costed = rows.filter((j) => j.margin != null);
  const price = costed.reduce((a, j) => a + j.price, 0);
  return costed.length && price > 0 ? { pct: costed.reduce((a, j) => a + (j.profit ?? 0), 0) / price, n: costed.length } : null;
}

const KPI_ICON = "M5 19 19 5M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z";

function KpiShell({ fig, badge, sub, title }: { fig?: ReactNode; badge?: ReactNode; sub: string; title?: string }) {
  return (
    <Link href="/portal/jobs?tab=profit" className="rp-kpi" title={title}>
      <span className="rp-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={KPI_ICON} /></svg>
      </span>
      <span><span className="rp-kpiline"><b>{fig}</b>{badge}</span><small>{sub}</small></span>
    </Link>
  );
}

/** Overview's header: the job margin beside the close rate, over the same 30 days, against the year goal's margin. */
export async function MarginKpi({ target }: { target: number | null }) {
  const res = await recent(target);
  const m = res ? across(res.rows) : null;
  if (!m) return <KpiShell sub={res ? "Job margin, nothing costed in 30 days" : "Job margin, couldn't be read"} />;
  const pct = Math.round(m.pct * 100);
  return (
    <KpiShell
      fig={<CountUp value={m.pct * 100} kind="pct" />}
      badge={target != null ? <em className={`rp-badge ${pct >= target ? "up" : "down"}`}>{pct >= target ? "▲ on" : "▼ under"} {target}% goal</em> : undefined}
      sub="Job margin, last 30 days"
      title={`Profit over price across the ${m.n} jobs invoiced and costed in the last 30 days, before GST`}
    />
  );
}

/** While the jobs are costed: the tile's shape and name, so the header doesn't shift. */
export const MarginKpiPending = () => <KpiShell sub="Job margin, last 30 days" />;

/**
 * Overview › the margin on each job just invoiced: price, what it cost (parts
 * and the crew's hours at the team's cost an hour, as Job profit costs them)
 * and what was left. Streamed in after the rest of the page, since costing
 * jobs reads their invoices and timesheets.
 */
export async function JobMargins({ target }: { target: number | null }) {
  const res = await recent(target);
  const since = isoDateMelbourne(new Date(Date.now() - 14 * 86_400_000));
  const last14 = (res?.rows ?? []).filter((j) => j.date.slice(0, 10) >= since);
  const rows = last14.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const all = across(last14);
  return (
    <section className="rp-panel rp-margins rp-card" style={{ ["--i" as string]: 5 }} aria-labelledby="rp-margins-h">
      <div className="rp-panel-h">
        <b id="rp-margins-h">Job margins</b>
        <span className="rp-sub">invoiced in the last 14 days, before GST{all ? ` · ${Math.round(all.pct * 100)}% across ${all.n} costed` : ""}{target != null ? ` · goal ${target}%` : ""}</span>
        <Link href="/portal/jobs?tab=profit" className="rp-round" aria-label="Every job's profit">↗</Link>
      </div>
      {!res ? <p className="rp-empty">The invoices couldn&rsquo;t be read just now.</p> : !rows.length ? <p className="rp-empty">No jobs invoiced in the last 14 days.</p> : (
        <div className="rp-mtbl">
          <table>
            <thead><tr><th>Job</th><th>Invoiced</th><th className="n">Price</th><th className="n">Cost</th><th className="n">Margin</th><th>How it went</th></tr></thead>
            <tbody>
              {rows.map((j, i) => {
                const v = verdict(j, target);
                const cost = j.margin == null ? null : j.price - (j.profit ?? 0);
                return (
                  <tr key={`${j.jobId ?? "x"}-${i}`}>
                    <td>
                      {j.jobId ? <a href={stJobUrl(j.jobId)} target="_blank" rel="noreferrer"><b>#{j.jobNumber ?? j.jobId}</b></a> : <b>{j.jobNumber ? `#${j.jobNumber}` : "Job"}</b>}
                      <span>{[j.customer, j.jobType].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td>{day(j.date)}</td>
                    <td className="n">{money(j.price)}</td>
                    <td className="n">{cost == null ? "" : money(cost)}</td>
                    <td className="n"><b>{j.margin == null ? "" : `${Math.round(j.margin * 100)}%`}</b></td>
                    <td><span className={`rp-mv ${v.k}`}>{v.k === "bad" ? "▼ " : v.k === "good" ? "▲ " : ""}{v.w}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

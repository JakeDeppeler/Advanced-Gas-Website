import Link from "next/link";
import { jobProfits, type JobProfit } from "@/lib/dashboard/jobProfit";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

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
 * Overview › the margin on each job just invoiced: price, what it cost (parts
 * and the crew's hours at the team's cost an hour, as Job profit costs them)
 * and what was left. Streamed in after the rest of the page, since costing
 * jobs reads their invoices and timesheets.
 */
export async function JobMargins({ target }: { target: number | null }) {
  const now = new Date();
  const crew = await hourJobCosts().catch(() => null);
  const res = await jobProfits(isoDateMelbourne(new Date(now.getTime() - 14 * 86_400_000)), isoDateMelbourne(now), crew?.costPerHr ?? null, target, crew?.crew ?? []).catch(() => null);
  const rows = (res?.rows ?? []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const costed = (res?.rows ?? []).filter((j) => j.margin != null);
  const avg = costed.length ? costed.reduce((a, j) => a + (j.profit ?? 0), 0) / Math.max(1, costed.reduce((a, j) => a + j.price, 0)) : null;
  return (
    <section className="rp-panel rp-margins rp-card" style={{ ["--i" as string]: 5 }} aria-labelledby="rp-margins-h">
      <div className="rp-panel-h">
        <b id="rp-margins-h">Job margins</b>
        <span className="rp-sub">invoiced in the last 14 days, before GST{avg != null ? ` · ${Math.round(avg * 100)}% across ${costed.length} costed` : ""}{target != null ? ` · goal ${target}%` : ""}</span>
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

import Link from "next/link";
import type { ReactNode } from "react";
import { KpiHead, Say, Bad } from "@/components/portal/kit/Kit";
import { StageCard } from "./StageCard";
import type { JobFlow, StageRows } from "@/lib/jobflow/load";
import { PHASES, STAGE, STAGES, type FlowStage } from "@/lib/jobflow/types";

/** Where each stage's whole list lives, when it has a page of its own. */
const MORE: Partial<Record<FlowStage, { href: string; label: string }>> = {
  quoted: { href: "/portal/pipeline", label: "Log calls on the quote pipeline" },
  sold: { href: "/portal/pipeline", label: "Quote pipeline" },
  tobill: { href: "/portal/jobs?tab=notbilled", label: "Jobs › Not billed" },
  overdue: { href: "/portal/money", label: "Owed to us" },
  enquiry: { href: "/portal/finance/leads", label: "Every enquiry" },
};

const late = (s: StageRows) => (s.rows ?? []).filter((r) => r.st.k === "bad").length;

/**
 * The stage to open on: the one with most late jobs, so the page opens on the
 * worst of it; failing that the biggest list; failing that the old jobs.
 */
export function defaultStage(flow: JobFlow): FlowStage {
  const work = STAGES.filter((d) => !d.quiet && d.k !== "imported");
  const by = (f: (s: StageRows) => number) => [...work].sort((a, b) => f(flow.stages[b.k]) - f(flow.stages[a.k]))[0];
  const worst = by(late);
  if (late(flow.stages[worst.k]) > 0) return worst.k;
  const biggest = by((s) => s.count ?? 0);
  return (flow.stages[biggest.k].count ?? 0) > 0 ? biggest.k : "imported";
}

/** What a stage's line on the board says after its name, in words. */
function said(k: FlowStage, s: StageRows): { w: string; tone: "bad" | "ok" | "quiet" } | null {
  if (s.count == null) return { w: "couldn’t read", tone: "quiet" };
  if (k === "imported") return s.count ? { w: "to tidy", tone: "quiet" } : { w: "✓", tone: "ok" };
  const n = late(s);
  if (n) return { w: `${n} late`, tone: "bad" };
  return s.count === 0 ? { w: "✓", tone: "ok" } : null;
}

/**
 * The tracker itself, apart from the page's sign-in and loading.
 *
 * The board is the whole run on one screen and the menu for the rest of the
 * page: each stage is one line, its count and how many are late, and picking
 * one opens its list underneath. One list at a time, because thirteen lists
 * one after another was a page nobody read to the bottom of. Above it, one
 * sentence: how many are late and where to start. The figures that used to
 * head the page (money owed, the totals) are on pages of their own.
 */
export function TrackerView({ flow, on, imported }: { flow: JobFlow; on: FlowStage; imported: ReactNode }) {
  const s = flow.stages;
  const work = STAGES.filter((d) => !d.quiet && d.k !== "imported");
  const rows = work.flatMap((d) => s[d.k].rows ?? []);
  const lateAll = rows.filter((r) => r.st.k === "bad").length;
  const unread = work.filter((d) => s[d.k].count == null);
  const start = defaultStage(flow);
  const booked = s.booked.count;

  return (
    <div className="pk jf">
      <KpiHead title={<>Job<br />tracker</>} kpis={[]} />
      <Say>
        {rows.length === 0 ? <>Nothing is stuck.</> : <>
          {lateAll ? <><Bad>{lateAll} late</Bad> of {rows.length} that need someone.</> : <>{rows.length} {rows.length === 1 ? "needs" : "need"} someone, none late.</>}{" "}
          Start with <Link href={`/portal/tracker?s=${start}#list`}>{STAGE[start].label.toLowerCase()}</Link>.
        </>}
        {booked ? <span className="jf-say__quiet"> {booked} more booked and on track.</span> : null}
        {unread.length > 0 && <> {unread.map((d) => d.label).join(", ")} couldn&rsquo;t be read just now.</>}
      </Say>

      <nav className="jf-board" aria-label="Every stage, start to finish">
        {PHASES.map((p) => (
          <div key={p.k} className="jf-col">
            <h2 className="jf-col__h">{p.label}</h2>
            <ul>
              {STAGES.filter((d) => d.phase === p.k && !d.quiet).map((d) => {
                const st = s[d.k];
                const tag = said(d.k, st);
                const href = `/portal/tracker?s=${d.k}#list`;
                return (
                  <li key={d.k}>
                    <Link href={href} className={`jf-stg${on === d.k ? " is-on" : ""}${st.count === 0 ? " is-quiet" : ""}`} aria-current={on === d.k ? "true" : undefined}>
                      <span className="jf-stg__n">{st.count == null ? "—" : st.count}</span>
                      <span className="jf-stg__l">{d.label}</span>
                      {tag ? <span className={`jf-stg__t is-${tag.tone}`}>{tag.w}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div id="list" className="jf-panel">
        {on === "imported" ? imported : (() => {
          const d = STAGE[on];
          const st = s[on];
          return <StageCard def={d} rows={st.rows} note={st.note} more={MORE[on]} />;
        })()}
      </div>

      <details className="jf-about">
        <summary>Where these come from</summary>
        <p>
          ServiceTitan, synced every few minutes: each job&rsquo;s status, its appointments, the quotes on it, the invoice and whether it was
          sent, and the payments. Tags aren&rsquo;t used, so a job nobody tagged still shows up where it&rsquo;s stuck. ServiceTitan doesn&rsquo;t
          record whether a quote was emailed, so every quote&rsquo;s first two days list as <i>Just quoted: did it go?</i> for somebody to check.
          Overdue reads Xero for invoices before 17 September and ServiceTitan after, the same as <Link href="/portal/money">Owed to us</Link>.
          Values include GST.
        </p>
      </details>
    </div>
  );
}

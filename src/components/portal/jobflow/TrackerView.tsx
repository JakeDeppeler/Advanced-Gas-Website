import Link from "next/link";
import type { ReactNode } from "react";
import { KpiHead, Pill, Say, Bad, type Status } from "@/components/portal/kit/Kit";
import { StageCard } from "./StageCard";
import { stageValue, type JobFlow, type StageRows } from "@/lib/jobflow/load";
import { PHASES, STAGES, type FlowStage } from "@/lib/jobflow/types";

const money = (v: number) => (v >= 10_000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v).toLocaleString("en-AU")}`);

/** Where each stage's whole list lives, when it has a page of its own. */
const MORE: Partial<Record<FlowStage, { href: string; label: string }>> = {
  quoted: { href: "/portal/pipeline", label: "Log calls on the quote pipeline" },
  sold: { href: "/portal/pipeline", label: "Quote pipeline" },
  tobill: { href: "/portal/jobs?tab=notbilled", label: "Jobs › Not billed" },
  overdue: { href: "/portal/money", label: "Owed to us" },
  enquiry: { href: "/portal/finance/leads", label: "Every enquiry" },
};

function tileStatus(k: FlowStage, s: StageRows, quiet: boolean): Status {
  if (s.count == null) return { k: "none", w: "Couldn’t read" };
  if (quiet) return { k: "none", w: "On track" };
  if (s.count === 0) return { k: "good", w: "Clear" };
  const late = (s.rows ?? []).filter((r) => r.st.k === "bad").length;
  if (k === "imported") return { k: "mid", w: "To tidy" };
  return late ? { k: "bad", w: `${late} late` } : { k: "mid", w: "To do" };
}

/**
 * The tracker itself, apart from the page's sign-in and loading: the flow
 * across the top, a card a stage, and the old-jobs check in the slot it's
 * given (the page streams it in behind a Suspense, since it waits on Xero).
 */
export function TrackerView({ flow, imported }: { flow: JobFlow; imported: ReactNode }) {
  const s = flow.stages;
  const work = STAGES.filter((d) => !d.quiet && d.k !== "imported");
  const rows = work.flatMap((d) => s[d.k].rows ?? []);
  const late = rows.filter((r) => r.st.k === "bad").length;
  const unread = work.filter((d) => s[d.k].count == null);
  const money3 = (["tobill", "tosend", "overdue"] as const).reduce((a, k) => a + (stageValue(s[k]) ?? 0), 0);
  const biggest = [...work].filter((d) => (s[d.k].count ?? 0) > 0).sort((a, b) => (s[b.k].count ?? 0) - (s[a.k].count ?? 0))[0];

  return (
    <div className="pk jf">
      <KpiHead title={<>Job<br />tracker</>} kpis={[
        { icon: "bell", fig: String(rows.length), label: "Need someone" },
        { icon: "alert", fig: String(late), label: "Late", tone: late ? "down" : undefined },
        { icon: "card", fig: money(money3), label: "Done, money not in yet" },
      ]} />
      <Say>
        {rows.length === 0 ? <>Nothing is stuck. Every job is booked, being done, or paid.</> : <>
          {rows.length} {rows.length === 1 ? "thing needs" : "things need"} someone{late ? <>, <Bad>{late} of them late</Bad></> : null}.{" "}
          {biggest ? <>The biggest pile is <b>{biggest.label.toLowerCase()}</b>, {s[biggest.k].count}.</> : null}
        </>}
        {unread.length > 0 && <> {unread.map((d) => d.label).join(", ")} couldn&rsquo;t be read just now and {unread.length === 1 ? "isn’t" : "aren’t"} counted.</>}
      </Say>

      <nav className="jf-flow" aria-label="Every stage, start to finish">
        {PHASES.map((p) => (
          <div key={p.k} className="jf-phase">
            <h2 className="jf-phase__h">{p.label}</h2>
            {STAGES.filter((d) => d.phase === p.k).map((d) => {
              const st = s[d.k];
              const v = stageValue(st);
              const oldest = st.rows?.[0];
              return (
                <a key={d.k} href={d.quiet ? "/portal/jobs" : `#${d.k}`} className={`jf-tile${d.quiet ? " is-quiet" : ""}`}>
                  <span className="jf-tile__l">{d.label}</span>
                  <span className="jf-tile__n">{st.count == null ? "—" : st.count}</span>
                  <span className="jf-tile__s">
                    {d.quiet ? st.note ?? "" : [v ? money(v) : null, oldest && d.k !== "imported" ? `oldest ${oldest.days}d` : null].filter(Boolean).join(" · ")}
                  </span>
                  <Pill st={tileStatus(d.k, st, !!d.quiet)} />
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      {work.map((d) => <StageCard key={d.k} def={d} rows={s[d.k].rows} note={s[d.k].note} more={MORE[d.k]} />)}

      {imported}

      <p className="pk-note jf-about">
        <b>Where this comes from:</b> ServiceTitan, synced every few minutes: each job&rsquo;s status, its appointments, the quotes on it, the invoice and
        whether it was sent, and the payments. Tags aren&rsquo;t used, so a job nobody tagged still shows up where it&rsquo;s stuck.{" "}
        ServiceTitan doesn&rsquo;t record whether a quote was emailed to the customer, so &ldquo;quoted but not sent&rdquo; can&rsquo;t be counted
        from it: every quote&rsquo;s first two days list as <i>Just quoted: did it go?</i> so somebody checks. Overdue reads Xero for invoices
        before 17 September and ServiceTitan after, the same as <Link href="/portal/money">Owed to us</Link>. Values include GST.
      </p>
    </div>
  );
}

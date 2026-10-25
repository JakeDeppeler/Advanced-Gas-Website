import Link from "next/link";
import type { ReactNode } from "react";
import { KpiHead, Say, Bad } from "@/components/portal/kit/Kit";
import { StageCard } from "./StageCard";
import { JobBoard } from "./JobBoard";
import type { JobFlow } from "@/lib/jobflow/load";
import { COLUMNS, STAGE, type ColumnKey, type FlowStage } from "@/lib/jobflow/types";

/** Where each stage's whole list lives, when it has a page of its own. */
const MORE: Partial<Record<FlowStage, { href: string; label: string }>> = {
  quoted: { href: "/portal/pipeline", label: "Log calls on the quote pipeline" },
  sold: { href: "/portal/pipeline", label: "Quote pipeline" },
  tobill: { href: "/portal/jobs?tab=notbilled", label: "Jobs › Not billed" },
  overdue: { href: "/portal/money", label: "Owed to us" },
  enquiry: { href: "/portal/finance/leads", label: "Every enquiry" },
};

/** What's open under the board: a column's lists, the old system's jobs, or nothing. */
export type Open = ColumnKey | "old" | null;

/**
 * The tracker itself, apart from the page's sign-in and loading: one line of
 * where things stand, the board, and under it whatever's been opened from it.
 * Nothing opens by default. The board is the page; the lists are for working
 * one column through.
 */
export function TrackerView({ flow, open, imported }: { flow: JobFlow; open: Open; imported: ReactNode }) {
  const s = flow.stages;
  const late = (k: ColumnKey) => COLUMNS.find((c) => c.k === k)!.stages.flatMap((st) => s[st].rows ?? []).filter((r) => r.st.k === "bad").length;
  const lateAll = COLUMNS.reduce((a, c) => a + late(c.k), 0);
  const worst = [...COLUMNS].sort((a, b) => late(b.k) - late(a.k))[0];
  const unread = COLUMNS.filter((c) => c.stages.some((k) => s[k].count == null));
  const old = s.imported.count;
  const col = open && open !== "old" ? COLUMNS.find((c) => c.k === open)! : null;

  return (
    <div className="pk jf">
      <KpiHead title={<>Job<br />tracker</>} kpis={[]} />
      <Say>
        {lateAll ? <><Bad>{lateAll} late</Bad>, the most in <Link href={`/portal/tracker?c=${worst.k}#list`}>{worst.label.toLowerCase()}</Link>.</> : <>Nothing late.</>}{" "}
        {unread.length > 0 && <> {unread.map((c) => c.label).join(", ")} couldn&rsquo;t be read just now.</>}
      </Say>

      <JobBoard flow={flow} on={col?.k ?? null} />

      {old ? (
        <p className="jb-old">
          <Link href="/portal/tracker?c=old#list" aria-current={open === "old" ? "true" : undefined}>{old} old {old === 1 ? "job" : "jobs"} from before the switch still open in ServiceTitan ›</Link>
        </p>
      ) : null}

      {open && (
        <div id="list" className="jf-panel">
          {open === "old" ? imported : col!.stages.map((k) => <StageCard key={k} def={STAGE[k]} rows={s[k].rows} note={s[k].note} more={MORE[k]} />)}
          <p className="jb-close"><Link href="/portal/tracker">Close the list</Link></p>
        </div>
      )}

      <details className="jf-about">
        <summary>Where these come from</summary>
        <p>
          ServiceTitan, synced every few minutes: each job&rsquo;s status, its appointments, the quotes on it, the invoice and whether it was
          sent, and the payments. Tags aren&rsquo;t used, so a job nobody tagged still shows up where it&rsquo;s stuck. ServiceTitan doesn&rsquo;t
          record whether a quote was emailed, so every quote&rsquo;s first two days show as <i>Just quoted</i> for somebody to check it went.
          Owed reads Xero for invoices before 17 September and ServiceTitan after, the same as <Link href="/portal/money">Owed to us</Link>.
          Values include GST.
        </p>
      </details>
    </div>
  );
}

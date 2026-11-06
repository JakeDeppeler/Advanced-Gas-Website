import Link from "next/link";
import type { ReactNode } from "react";
import { Head, Say, Bad, Grid, Tile, type Status } from "@/components/portal/kit/Kit";
import { StageCard } from "./StageCard";
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

/** The one thing to do with a step's jobs, under its count. */
const DO: Record<ColumnKey, string> = {
  book: "Ring them and book a visit",
  toquote: "Write the quote and send it",
  quoted: "Ring the ones that are due",
  sold: "Book the install, order the gear",
  doing: "Close the finished ones",
  toinvoice: "Price the invoice and send it",
  tosend: "Check the invoice and send it",
  owed: "Chase the money",
};

/** What's open under the steps: a step's lists, or the old system's jobs. */
export type Open = ColumnKey | "old" | null;

/**
 * How each step is filled, for "What does this mean?". It used to sit under
 * every list as well; once is enough, and the lists are for working.
 */
const INFO: [string, ReactNode][] = [
  ...COLUMNS.map((c): [string, ReactNode] => [
    c.label,
    c.stages.length === 1 ? STAGE[c.stages[0]].rule : c.stages.map((k) => `${STAGE[k].label}: ${STAGE[k].rule}`).join(" "),
  ]),
  ["Late", "Past the time that step should take. Every list is oldest first, so the top of it is the morning's work."],
  ["Where it comes from", <>ServiceTitan, synced every few minutes: each job&rsquo;s status, its visits, the quotes on it, the invoice and whether it was sent, and the payments. Tags aren&rsquo;t used, so a job nobody tagged still shows up where it&rsquo;s stuck. Owed reads Xero for invoices before 17 September and ServiceTitan after. Values include GST.</>],
];

/**
 * The tracker, apart from the page's sign-in and loading: one line of where
 * things stand, a tile for each step in the order a job runs, and the picked
 * step's list under them.
 *
 * It was a board: eight columns of cards side by side, which squeezed every
 * name to a few letters and needed a click before anything could be read.
 * The counts are what's scanned, so they get the space; the jobs are read one
 * step at a time, so they get a full-width list. With nothing picked, the step
 * with the most late opens, so the page always lands on something to do.
 */
export function TrackerView({ flow, open, imported }: { flow: JobFlow; open: Open; imported: ReactNode }) {
  const s = flow.stages;
  const rows = (k: ColumnKey) => COLUMNS.find((c) => c.k === k)!.stages.flatMap((st) => s[st].rows ?? []);
  const read = (k: ColumnKey) => COLUMNS.find((c) => c.k === k)!.stages.every((st) => s[st].rows != null);
  const late = (k: ColumnKey) => rows(k).filter((r) => r.st.k === "bad").length;
  const lateAll = COLUMNS.reduce((a, c) => a + late(c.k), 0);
  const worst = [...COLUMNS].sort((a, b) => late(b.k) - late(a.k))[0];
  const unread = COLUMNS.filter((c) => !read(c.k));
  const old = s.imported.count;
  const shown: Open = open ?? (lateAll ? worst.k : COLUMNS.find((c) => rows(c.k).length)?.k ?? COLUMNS[0].k);
  const col = shown !== "old" ? COLUMNS.find((c) => c.k === shown)! : null;
  // A step that holds two or three kinds (Doing: left open, on hold, booked)
  // lists only the kinds with jobs in them; an empty card saying "none" was
  // most of what the list showed.
  const parts = col ? col.stages.filter((k) => s[k].rows == null || s[k].rows.length > 0) : [];

  const tile = (k: ColumnKey): { st: Status; fig: string; frac: number | null } => {
    if (!read(k)) return { st: { k: "none", w: "Couldn’t read" }, fig: "—", frac: null };
    const n = rows(k).length, l = late(k);
    // The bar is the share that's late, so a step that's all late reads full red from across the room.
    return l ? { st: { k: "bad", w: `${l} late` }, fig: String(n), frac: l / n } : { st: { k: "good", w: n ? "None late" : "Clear" }, fig: String(n), frac: null };
  };

  return (
    <div className="pk jf">
      <Head title="Job tracker" eyebrow="Where every job is up to · ServiceTitan" info={INFO} />
      <Say>
        {lateAll ? <><Bad>{lateAll} {lateAll === 1 ? "job is" : "jobs are"} late</Bad>, the most in <Link href={`/portal/tracker?c=${worst.k}#list`}>{worst.label}</Link>.</> : <>Nothing is late.</>}
        {unread.length > 0 && <> {unread.map((c) => c.label).join(", ")} couldn&rsquo;t be read just now.</>}
      </Say>

      <Grid>
        {COLUMNS.map((c) => <Tile key={c.k} label={c.label} {...tile(c.k)} sub={DO[c.k]} href={`/portal/tracker?c=${c.k}#list`} on={shown === c.k} />)}
      </Grid>

      {old ? (
        <p className="jf-old">
          <Link href="/portal/tracker?c=old#list" aria-current={shown === "old" ? "true" : undefined}>{old} old {old === 1 ? "job" : "jobs"} from before the switch still open in ServiceTitan ›</Link>
        </p>
      ) : null}

      <div id="list" className="jf-panel">
        {shown === "old" ? imported : (parts.length ? parts : col!.stages.slice(0, 1)).map((k) => <StageCard key={k} def={STAGE[k]} rows={s[k].rows} note={s[k].note} more={MORE[k]} />)}
      </div>
    </div>
  );
}

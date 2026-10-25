import Link from "next/link";
import { Pill } from "@/components/portal/kit/Kit";
import type { FlowRow, JobFlow } from "@/lib/jobflow/load";
import { COLUMNS, TAG, type ColumnKey, type FlowStage } from "@/lib/jobflow/types";

const money = (v: number) => (v >= 10_000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v).toLocaleString("en-AU")}`);
/** Cards a column shows before the rest fold under "more": enough to see what's worst without a column running off the page. */
const SHOW = 6;
const RANK = { bad: 0, mid: 1, good: 2, none: 3 } as const;

type Card = { row: FlowRow; stage: FlowStage };

/** A job type short enough for a card: the kind of work, without ServiceTitan's "Installation - " in front. */
const shortType = (t: string) =>
  t.replace(/^installation\s*-\s*/i, "Install · ").replace(/^diagnostics\s*-\s*/i, "Diagnose · ").replace(/^service\s*-\s*/i, "Service · ").replace(/^repair\s*-\s*/i, "Repair · ");

function JobCard({ c, shared }: { c: Card; shared: boolean }) {
  const r = c.row;
  // Titles are "What · Where" for jobs, the customer alone for an overdue invoice.
  const [what, where] = r.title.includes(" · ") ? [r.title.slice(0, r.title.lastIndexOf(" · ")), r.title.slice(r.title.lastIndexOf(" · ") + 3)] : [r.sub[0] ?? "", r.title];
  const href = r.stUrl ?? r.customerUrl;
  const late = r.st.k === "bad";
  const body = (
    <>
      {shared && TAG[c.stage] ? <span className="jb-card__k">{TAG[c.stage]}</span> : null}
      <b className="jb-card__w">{where}</b>
      <span className="jb-card__t">{shortType(what)}</span>
      <span className="jb-card__f">
        <Pill st={r.st} />
        {r.value != null ? <span className="jb-card__v">{money(r.value)}</span> : null}
      </span>
    </>
  );
  const props = { className: `jb-card${late ? " is-late" : ""}${r.st.k === "none" ? " is-quiet" : ""}`, title: [r.title, ...r.sub].join(" · ") };
  if (!href) return <div {...props}>{body}</div>;
  return r.stUrl
    ? <a {...props} href={href} target="_blank" rel="noreferrer">{body}</a>
    : <Link {...props} href={href}>{body}</Link>;
}

/**
 * The pipeline as a whiteboard: a column for each step from booking to being
 * paid, every open job a card in the column it's stuck in. The worst sits at
 * the top of each column (late first, then the longest waiting) and the quiet
 * ones (booked, waiting on the customer) sink to the bottom, so the top row of
 * the board is the morning's work. A column's heading opens its full list
 * under the board.
 */
export function JobBoard({ flow, on }: { flow: JobFlow; on: ColumnKey | null }) {
  return (
    <div className="jb" role="region" aria-label="Every open job, by step" tabIndex={0}>
      {COLUMNS.map((col) => {
        const read = col.stages.every((k) => flow.stages[k].rows != null);
        const cards: Card[] = col.stages.flatMap((k) => (flow.stages[k].rows ?? []).map((row) => ({ row, stage: k })))
          .sort((a, b) => RANK[a.row.st.k] - RANK[b.row.st.k] || b.row.days - a.row.days);
        const late = cards.filter((c) => c.row.st.k === "bad").length;
        const shared = col.stages.length > 1;
        return (
          <section key={col.k} className={`jb-col${on === col.k ? " is-on" : ""}`} aria-label={col.label}>
            <Link href={`/portal/tracker?c=${col.k}#list`} className="jb-col__h" aria-current={on === col.k ? "true" : undefined}>
              <span className="jb-col__l">{col.label}</span>
              <span className="jb-col__n">{read ? cards.length : "—"}</span>
              <span className={`jb-col__late${late ? "" : " is-none"}`}>{!read ? "couldn’t read" : late ? `${late} late` : cards.length ? "none late" : "clear ✓"}</span>
            </Link>
            <div className="jb-col__cards">
              {cards.slice(0, SHOW).map((c) => <JobCard key={c.row.key} c={c} shared={shared} />)}
              {cards.length > SHOW && (
                <details className="jb-more">
                  <summary>{cards.length - SHOW} more</summary>
                  {cards.slice(SHOW).map((c) => <JobCard key={c.row.key} c={c} shared={shared} />)}
                </details>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

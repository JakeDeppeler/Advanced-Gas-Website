import Link from "next/link";
import type { FlowRow, JobFlow } from "@/lib/jobflow/load";
import { COLUMNS, TAG, type ColumnKey, type FlowStage } from "@/lib/jobflow/types";

const money = (v: number) => (v >= 10_000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v).toLocaleString("en-AU")}`);
/** Cards a column shows before the rest fold under "more": enough to see what's worst without a column running off the page. */
const SHOW = 6;
const RANK = { bad: 0, mid: 1, good: 2, none: 3 } as const;

type Card = { row: FlowRow; stage: FlowStage };

/** A job type short enough for a card: the kind of work, without ServiceTitan's "Installation - " in front. */
const shortType = (t: string) =>
  t.replace(/^installation\s*-\s*/i, "Install ").replace(/^diagnostics\s*-\s*/i, "Diagnose ").replace(/^service\s*-\s*/i, "Service ").replace(/^repair\s*-\s*/i, "Repair ");

/** "47 days" → "47d", "25 days late" → "25d late"; words like "Call late" or "Tue 28" stay as they are. */
const compact = (w: string) => w.replace(/^(\d+) days?\b/, "$1d");
/** The age says lateness in a mark and words as well as colour. */
const SIGN = { bad: "▼ ", mid: "! ", good: "", none: "" } as const;

/**
 * One job in two lines: who and how long, then where and what it is, with
 * the money on the right. No pills, no third line: a column of these reads
 * as names down the page, which is how the office talks about jobs.
 */
function JobCard({ c, shared }: { c: Card; shared: boolean }) {
  const r = c.row;
  const href = r.stUrl ?? r.customerUrl;
  const late = r.st.k === "bad";
  const who = r.customer || r.place || r.title;
  const what = r.kind ? shortType(r.kind) : null;
  // In a shared column the stage leads the second line, where the type would be ("Close visit · Officer").
  const line2 = (shared && TAG[c.stage] ? [TAG[c.stage], r.place] : [r.customer ? r.place : null, what]).filter(Boolean).join(" · ");
  const body = (
    <>
      <span className="jb-card__r">
        <b className="jb-card__who">{who}</b>
        <span className={`jb-age ${r.st.k}`}>{SIGN[r.st.k]}{compact(r.st.w)}</span>
      </span>
      <span className="jb-card__r">
        <span className="jb-card__what">{line2}</span>
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

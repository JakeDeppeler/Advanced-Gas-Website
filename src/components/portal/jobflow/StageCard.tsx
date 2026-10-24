import Link from "next/link";
import { Card, Empty, Pill } from "@/components/portal/kit/Kit";
import type { FlowRow } from "@/lib/jobflow/load";
import type { StageDef } from "@/lib/jobflow/types";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
/** Shown before the rest fold away: enough to work the oldest without scrolling past a hundred. */
const SHOW = 12;

/**
 * One job, one line: what and where (opening the customer's whole history),
 * who and how long under it, then how late, what it's worth, and the way into
 * ServiceTitan to fix it.
 */
export function FlowLine({ r }: { r: FlowRow }) {
  return (
    <div className="jf-line">
      <span className="t">
        <b>{r.customerUrl ? <Link href={r.customerUrl}>{r.title}</Link> : r.title}</b>
        <span>{r.sub.join(" · ")}</span>
      </span>
      <Pill st={r.st} />
      <span className="v">{r.value != null ? money(r.value) : ""}</span>
      {r.stUrl
        ? <a className="pk-btn g jf-line__go" href={r.stUrl} target="_blank" rel="noreferrer" aria-label={`Open ${r.title} in ServiceTitan`}>Open ↗</a>
        : <span className="jf-line__go" aria-hidden="true" />}
    </div>
  );
}

/**
 * The stage that's picked on the board: what to do first, then the jobs
 * oldest first. How a job lands here is folded away for whoever asks; the
 * list is what gets worked.
 */
export function StageCard({ def, rows, note, more }: { def: StageDef; rows: FlowRow[] | null; note?: string; more?: { href: string; label: string } }) {
  const total = rows ? rows.reduce((a, r) => a + (r.value ?? 0), 0) : 0;
  const aside = rows == null ? "couldn’t be read" : rows.length ? [`${rows.length} ${rows.length === 1 ? "job" : "jobs"}`, total ? money(total) : null].filter(Boolean).join(" · ") : "none";
  return (
    <Card title={def.label} aside={aside}>
      <p className="jf-do"><b>To do:</b> {def.act}</p>
      {rows == null ? <Empty>This couldn&rsquo;t be read just now, so it isn&rsquo;t counted. Try again in a minute.</Empty>
        : rows.length === 0 ? <Empty>Nothing here. ✓</Empty>
        : (
          <div className="jf-lines">
            {rows.slice(0, SHOW).map((r) => <FlowLine key={r.key} r={r} />)}
            {rows.length > SHOW && (
              <details className="jf-more">
                <summary>Show the other {rows.length - SHOW}</summary>
                {rows.slice(SHOW).map((r) => <FlowLine key={r.key} r={r} />)}
              </details>
            )}
          </div>
        )}
      <div className="jf-foot">
        {note ? <span>{note}.</span> : null}
        {more ? <Link href={more.href}>{more.label} ›</Link> : null}
        <details className="jf-why"><summary>How a job ends up here</summary><p>{def.rule}</p></details>
      </div>
    </Card>
  );
}

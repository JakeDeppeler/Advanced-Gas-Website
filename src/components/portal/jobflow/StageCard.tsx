import Link from "next/link";
import { Card, Empty, Pill } from "@/components/portal/kit/Kit";
import type { FlowRow } from "@/lib/jobflow/load";
import type { StageDef } from "@/lib/jobflow/types";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
/** Shown before the rest fold away: enough to work the oldest without scrolling past a hundred. */
const SHOW = 12;

/** A job type short enough for a line: the kind of work, without ServiceTitan's "Installation - " in front. */
const shortType = (t: string) =>
  t.replace(/^installation\s*-\s*/i, "Install ").replace(/^diagnostics\s*-\s*/i, "Diagnose ").replace(/^service\s*-\s*/i, "Service ").replace(/^repair\s*-\s*/i, "Repair ");

/**
 * One job, one line: who and where first, because that's how the office
 * talks about a job ("the Whitfields in Berwick"), then what it is, how late,
 * what it's worth, and the way into ServiceTitan to fix it. The name opens
 * the customer's whole history.
 */
export function FlowLine({ r }: { r: FlowRow }) {
  const head = r.customer ? [r.customer, r.place].filter(Boolean).join(" · ") : r.title;
  // Without a name the title already says what it is; with one, the kind of work leads the second line.
  const seen = new Set<string>();
  const rest = [r.customer && r.kind ? shortType(r.kind) : null, ...r.sub.filter((x) => x !== r.customer)]
    .filter((x): x is string => !!x && !seen.has(x.toLowerCase()) && !!seen.add(x.toLowerCase()));
  return (
    <div className="jf-line">
      <span className="t">
        <b>{r.customerUrl ? <Link href={r.customerUrl}>{head}</Link> : head}</b>
        <span>{rest.join(" · ")}</span>
      </span>
      <Pill st={r.st} />
      <span className="v">{r.value != null ? money(r.value) : ""}</span>
      {r.stUrl
        ? <a className="pk-btn g jf-line__go" href={r.stUrl} target="_blank" rel="noreferrer" aria-label={`Open ${head} in ServiceTitan`}>Open ↗</a>
        : <span className="jf-line__go" aria-hidden="true" />}
    </div>
  );
}

/**
 * A step's list: what to do first, then the jobs oldest first. How a job lands
 * here is on the page's "What does this mean?", not under every list.
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
      {note || more ? (
        <div className="jf-foot">
          {note ? <span>{note}.</span> : null}
          {more ? <Link href={more.href}>{more.label} ›</Link> : null}
        </div>
      ) : null}
    </Card>
  );
}

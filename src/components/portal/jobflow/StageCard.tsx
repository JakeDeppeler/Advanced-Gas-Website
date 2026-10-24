import Link from "next/link";
import { Card, Empty, Pill } from "@/components/portal/kit/Kit";
import { Track } from "./Track";
import type { FlowRow } from "@/lib/jobflow/load";
import type { StageDef } from "@/lib/jobflow/types";

const money = (v: number) => `$${Math.round(v).toLocaleString("en-AU")}`;
/** Shown before the rest fold away: enough to work the oldest without scrolling past a hundred. */
const SHOW = 10;

function FlowLine({ r }: { r: FlowRow }) {
  return (
    <div className="pk-kv pk-kv--act jf-row">
      <span className="t">
        <b>{r.title}</b>
        <span>{r.sub.join(" · ")}</span>
        <Track track={r.track} />
      </span>
      <Pill st={r.st} />
      <span className="v">{r.value != null ? money(r.value) : ""}</span>
      <span className="jf-row__go">
        {r.stUrl ? <a className="pk-btn g" href={r.stUrl} target="_blank" rel="noreferrer" aria-label={`Open ${r.title} in ServiceTitan`}>ServiceTitan ↗</a> : null}
        {r.customerUrl ? <Link className="pk-btn g" href={r.customerUrl} aria-label={`Everything for this customer: ${r.title}`}>Customer</Link> : null}
      </span>
    </div>
  );
}

/**
 * One stage: what puts a job here and what to do, then the jobs, oldest
 * first. The first ten show; the rest are a click away rather than a page of
 * scrolling between this stage and the next.
 */
export function StageCard({ def, rows, note, more }: { def: StageDef; rows: FlowRow[] | null; note?: string; more?: { href: string; label: string } }) {
  const total = rows ? rows.reduce((a, r) => a + (r.value ?? 0), 0) : 0;
  const aside = rows == null ? "couldn’t be read" : rows.length ? `${rows.length}${total ? ` · ${money(total)}` : ""} · oldest first` : "none";
  return (
    <section id={def.k} className="jf-stage">
      <Card title={def.label} aside={aside}>
        <p className="pk-note jf-rule"><b>Why it’s here:</b> {def.rule} <b>What to do:</b> {def.act}</p>
        {rows == null ? <Empty>This couldn&rsquo;t be read just now, so it isn&rsquo;t counted. Try again in a minute.</Empty>
          : rows.length === 0 ? <Empty>Nothing here. ✓</Empty>
          : (
            <>
              {rows.slice(0, SHOW).map((r) => <FlowLine key={r.key} r={r} />)}
              {rows.length > SHOW && (
                <details className="jf-more">
                  <summary>Show the other {rows.length - SHOW}</summary>
                  {rows.slice(SHOW).map((r) => <FlowLine key={r.key} r={r} />)}
                </details>
              )}
            </>
          )}
        {(note || more) && (
          <p className="pk-note jf-foot">
            {note}{note && more ? ". " : ""}{more ? <Link href={more.href}>{more.label} ›</Link> : null}
          </p>
        )}
      </Card>
    </section>
  );
}

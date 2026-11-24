import Link from "next/link";
import { Pill, type Status } from "@/components/portal/kit/Kit";
import type { Fix, FixLevel } from "@/lib/portal/fixes";

const LOOK: Record<FixLevel, Status> = {
  serious: { k: "bad", w: "Serious" },
  warning: { k: "mid", w: "Needs work" },
  blind: { k: "none", w: "Can't see it" },
};

/** How many open with their steps showing: the rest are a click away, so the list stays scannable. */
const OPEN = 3;

/**
 * Today › What needs fixing: each problem as a row that opens to why it
 * matters and the steps that fix it. The level is written on the pill, not
 * only coloured, and the steps are numbered because they're an order.
 */
export function FixList({ fixes }: { fixes: Fix[] }) {
  const serious = fixes.filter((f) => f.level === "serious").length;
  return (
    <section className="pk-card pk-pad pk-fix" aria-labelledby="fix-h">
      <div className="pk-card-h">
        <b id="fix-h">What needs fixing, and how</b>
        <span>{fixes.length ? `${fixes.length} to fix${serious ? ` · ${serious} serious` : ""} · biggest first` : "nothing flagged"}</span>
      </div>
      {fixes.length ? (
        <ul className="pk-fix-list">
          {fixes.map((f, i) => (
            <li key={f.key}>
              <details open={i < OPEN}>
                <summary>
                  <Pill st={LOOK[f.level]} />
                  <span className="pk-fix-t"><b>{f.title}</b><span>{f.who}</span></span>
                  <span className="pk-fix-chev" aria-hidden="true">›</span>
                </summary>
                <div className="pk-fix-body">
                  <p>{f.why}</p>
                  <ol aria-label="How to fix it">{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                  <Link href={f.href} className="pk-fix-go">Open {f.go} ›</Link>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pk-note">Nothing in how the business is running needs fixing on today&rsquo;s numbers.</p>
      )}
    </section>
  );
}

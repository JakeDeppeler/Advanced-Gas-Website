import { COMM_DIMC } from "@/lib/commercialSite";

/**
 * Design → Install → Maintain → Certify, as a line that fills.
 *
 * Four words is a claim. The line drawing itself left to right over six
 * seconds, with each node going orange a beat and a half after the one
 * before it, is the claim behaving like a sequence — which is the actual
 * point: these happen in order, by the same contractor, and the last one is
 * the part most trades leave to somebody else.
 *
 * Pure CSS, so `prefers-reduced-motion` stops it and leaves four labelled
 * nodes on a rule.
 */

export function DimcBand() {
  return (
    <div className="cx-dimc">
      <div className="wrap cx-dimc__wrap">
        {/* Outside the list: an <ol> may only contain <li>, and the rule is
            decoration rather than a step. */}
        <div className="cx-dimc__line" aria-hidden="true"><i /></div>
        <ol className="cx-dimc__row">
          {COMM_DIMC.map((s, i) => (
            <li className="cx-dimc__s" key={s.n} style={{ ["--i" as string]: String(i) }}>
              <span aria-hidden="true">{s.n}</span>
              <b>{s.h}</b>
              <p>{s.p}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

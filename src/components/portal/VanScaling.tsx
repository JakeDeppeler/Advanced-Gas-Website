"use client";

import { money, money2, hrs } from "@/lib/portal/format";
import type { ScaleRow } from "@/lib/portal/crew";

/**
 * What another van does to the numbers.
 *
 * Lifted out of the costing tool, where it sat as a fifth tab beside four tabs
 * about the business as it is today. This is a question about next year, so it
 * belongs on Future planning — and the costing page is shorter for losing it.
 *
 * Presentational: everything is worked out by the page that renders it, so the
 * same rows can be shown anywhere without re-deriving them.
 */
export function VanScaling({ scale, split, officeOh, ohTotal }: {
  scale: ScaleRow[];
  split: { fixed: number; perVan: number };
  officeOh: number;
  ohTotal: number;
}) {
  const now = scale.find((r) => r.isNow) ?? null;
  const next = now ? scale.find((r) => r.vans === now.vans + 1) ?? null : null;
  const cap = { officeOh };
  return (
      <>
        <section className="pt-panel">
          <h2 className="pt-panel__h">The overhead splits two ways</h2>
          <p className="pt-panel__sub">
            The factory, the office, the accountant and the marketing don&rsquo;t care how many vans are on the road — put a
            fourth one on and none of it moves. Everything else arrives with the van: its fuel, its servicing, its insurance,
            its tools, its phone. That split is the whole reason another van makes the overhead on every hour go <em>down</em>.
            Any line on the Overheads tab can be switched between the two.
          </p>
          <div className="pt-pl__heads">
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Fixed — doesn&rsquo;t move</span><strong className="pt-pl__headval">{money(split.fixed + cap.officeOh)}</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Comes with each van</span><strong className="pt-pl__headval">{money(split.perVan)}</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">Per van, each</span><strong className="pt-pl__headval">{now ? money(split.perVan / now.vans) : "—"}</strong></div>
            <div className="pt-pl__head"><span className="pt-pl__headlabel">All of it</span><strong className="pt-pl__headval">{money(ohTotal)}</strong></div>
          </div>
        </section>

        {scale.length > 0 ? (
          <>
            <section className="pt-panel">
              <div className="pt-ov__charthead">
                <h2 className="pt-panel__h">What another van does</h2>
                <span className="pt-cap__grouptotal">{now?.vans ?? 0} charging now</span>
              </div>
              <p className="pt-panel__sub">
                Each row assumes another crew like the ones you have — same hours, same downtime, same van costs.
              </p>
              <div className="pt-oh__ledger">
                <div className="pt-oh__group">
                  <div className="pt-cap__scalehead">
                    <span>Charging</span><span>Billable hrs</span><span>Overhead</span><span>Overhead / hr</span><span>Cost / hr</span><span>Charge-out</span>
                  </div>
                  {scale.map((r) => (
                    <div key={r.vans} className={`pt-cap__scalerow${r.isNow ? " is-now" : ""}`}>
                      <span className="pt-cap__scaleid"><strong>{r.vans}</strong>{r.isNow && <em>now</em>}</span>
                      <span>{hrs(r.billHrs)}</span>
                      <span>{money(r.overhead)}</span>
                      <strong className="pt-cap__real">{money2(r.overheadPerHr)}</strong>
                      <span>{money2(r.costPerHr)}</span>
                      <strong>{money2(r.chargeOut)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {now && next && (
              <section className="pt-panel">
                <h2 className="pt-panel__h">Putting on one more</h2>
                <p className="pt-util__read" style={{ marginTop: 0 }}>
                  One more charging crew adds <strong>{money(next.overhead - now.overhead)}</strong> of overhead and{" "}
                  <strong>{hrs(next.billHrs - now.billHrs)}</strong> you can bill. Spread over the lot, the overhead on every
                  hour drops from <strong>{money2(now.overheadPerHr)}</strong> to <strong>{money2(next.overheadPerHr)}</strong>{" "}
                  — <strong>{money2(now.overheadPerHr - next.overheadPerHr)}</strong> off every hour the whole crew bills.
                </p>
                <div className="pt-pl__heads">
                  <div className="pt-pl__head"><span className="pt-pl__headlabel">They bring in</span><strong className="pt-pl__headval">{money(next.revenue - now.revenue)}</strong></div>
                  <div className="pt-pl__head"><span className="pt-pl__headlabel">Overhead they add</span><strong className="pt-pl__headval">{money(next.overhead - now.overhead)}</strong></div>
                  <div className="pt-pl__head"><span className="pt-pl__headlabel">Off every hour</span><strong className="pt-pl__headval">{money2(now.overheadPerHr - next.overheadPerHr)}</strong></div>
                  <div className="pt-pl__head"><span className="pt-pl__headlabel">Rate could fall to</span><strong className="pt-pl__headval">{money(next.chargeOut)}</strong></div>
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="pf-empty">Give at least one person a billable level to model this.</div>
        )}
      </>
  );
}

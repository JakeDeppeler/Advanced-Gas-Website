"use client";

import Link from "next/link";
import { useState } from "react";
import { SAVINGS_DEFAULTS, hotWaterRunningCost, type CurrentSystem } from "@/lib/tools/hotWaterSavings";

const CURRENT: { id: CurrentSystem; label: string }[] = [
  { id: "gas-storage", label: "Gas tank" }, { id: "gas-continuous", label: "Gas instant" },
  { id: "electric-storage", label: "Electric tank" }, { id: "electric-off-peak", label: "Electric, off-peak" },
];

export type SavingsOption = { label: string; cop: number; price?: number | null; href?: string };

/**
 * "How much could you save?": two taps (what they have now, how many people)
 * and the yearly running cost of each heat pump against it, using the same
 * model as /tools/hot-water-savings so the two never disagree. Payback is
 * against each option's installed price, which already has the VEU rebate off.
 *
 * One option on a product page; all of them side by side on the heat pump
 * system page.
 */
export function HwSavings({ options }: { options: SavingsOption[] }) {
  const [cur, setCur] = useState<CurrentSystem>("gas-storage");
  const [people, setPeople] = useState(4);
  const run = (o: SavingsOption) => hotWaterRunningCost({ ...SAVINGS_DEFAULTS, currentSystem: cur, household: people, heatPumpCop: o.cop, installCost: o.price ?? 0, veuRebate: 0 });
  const rs = options.map((o) => ({ o, r: run(o) }));
  const now = rs[0]?.r.currentCostYr ?? 0;
  const best = rs.reduce((a, b) => (b.r.savingYr > a.r.savingYr ? b : a), rs[0]);
  const $ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
  const one = rs.length === 1;
  return (
    <div className="svx">
      <div className="svx__form">
        <span className="svx__q">What hot water do you have now?</span>
        <div className="svx__opts">
          {CURRENT.map((c) => <button key={c.id} type="button" className={cur === c.id ? "on" : ""} aria-pressed={cur === c.id} onClick={() => setCur(c.id)}>{c.label}</button>)}
        </div>
        <span className="svx__q">How many people live there?</span>
        <div className="svx__opts svx__opts--n">
          {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} type="button" className={people === n ? "on" : ""} aria-pressed={people === n} onClick={() => setPeople(n)}>{n === 6 ? "6+" : n}</button>)}
        </div>
      </div>
      <div className="svx__out" aria-live="polite">
        <div className="svx__row"><span>Now, about</span><strong>{$(now)}<small>/yr</small></strong></div>
        {rs.map(({ o, r }) => (
          <div key={o.label} className="svx__row">
            <span>{o.href ? <Link href={o.href}>With the {o.label}</Link> : <>With the {o.label}</>}{!one && r.savingYr > 0 && <small className="svx__sub">Saves {$(r.savingYr)} a year{o.price ? `, pays back in about ${Math.max(1, Math.round(r.paybackYears))} yrs` : ""}</small>}</span>
            <strong>{$(r.heatPumpCostYr)}<small>/yr</small></strong>
          </div>
        ))}
        {best && (
          <div className="svx__save"><span>You could save {one ? "around" : "up to"}</span><strong>{$(best.r.savingYr)} a year</strong>
            {one && best.r.savingYr > 0 && best.o.price ? <small>That pays back the {$(best.o.price)} installed price in about {Math.max(1, Math.round(best.r.paybackYears))} years.</small> : null}
          </div>
        )}
        <p className="svx__note">An estimate on average Melbourne energy prices and 50 L of hot water per person a day. Your bills, tariff and solar will move it. <Link href="/tools/hot-water-savings">Use your own prices →</Link></p>
      </div>
    </div>
  );
}

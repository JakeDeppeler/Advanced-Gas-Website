"use client";

import { useMemo, useState } from "react";
import { FIXED, SIZING_DEFAULTS, sizeHousehold } from "@/lib/tools/hotWaterSizing";
import { PanelHead, Stepper } from "./Fields";

/**
 * Heat pump sizing, down to the two things asked on the call (Jake, 28 Nov:
 * "the shower time, the length per shower, and then the one we should
 * recommend"): how many showers in the busiest two hours, how long each, and
 * the unit that covers it.
 *
 * Same model as the public calculator (lib/tools/hotWaterSizing), on the
 * 2.5 kW compressor the Reclaim ECO and CO₂ run, so the answer is the tank
 * we'd fit. The busiest run is the one sized for, so morning and evening are
 * the same number here. The compare-two-systems panel and the compressor
 * choice are gone: neither was asked for on the call, and the recommendation
 * already accounts for both.
 */
export function PortalSizing() {
  const [showers, setShowers] = useState(3);
  const [minutes, setMinutes] = useState(SIZING_DEFAULTS.showerMinutes);
  const r = useMemo(() => sizeHousehold({ ...SIZING_DEFAULTS, morningPeople: showers, eveningPeople: showers, showerMinutes: minutes, heatKw: 2.5 }), [showers, minutes]);
  const [first, ...others] = r.picks;
  const run = showers * minutes * FIXED.showerFlowLpm;

  return (
    <div className="tt-grid">
      <section className="rp-panel rp-card tt-form" aria-labelledby="tt-sz-h">
        <PanelHead id="tt-sz-h" title="The showers" note="The busiest two hours of the day, morning or evening" />
        <Stepper label="Showers" hint="In the busiest two hours" value={showers} shown={String(showers)} min={1} max={8} onChange={setShowers} />
        <Stepper label="Length of each shower" hint="10 minutes is the working number" value={minutes} shown={`${minutes} min`} min={3} max={25} onChange={setMinutes} />
        <p className="tt-why">
          {showers} {showers === 1 ? "shower" : "showers"} of {minutes} minutes is {Math.round(run)} L through the heads at about {FIXED.showerFlowLpm} L a minute, about {Math.round(r.peakSessionHot)} L of it hot off the tank with the basins and kitchen. The tank has to hold what the compressor can’t make while they’re showering, with a fifth spare for a guest or a cold July.
        </p>
      </section>

      <aside className="tt-answer tt-sticky" aria-label="What we’d recommend">
        <span className="tt-k">What we’d recommend</span>
        {r.exceedsRange ? (
          <>
            <strong className="tt-big">Two tanks</strong>
            <span className="tt-k tt-k--soft">It needs about {Math.round(r.requiredLitres)} L, more than the {r.recommended.litres} L we fit as one. Talk it through before quoting: two units, or the showers spread out.</span>
          </>
        ) : (
          <>
            <strong className="tt-big">{r.recommended.litres} L</strong>
            {first && <span className="tt-pick">{first.label}</span>}
            {(others.length > 0 || r.alsoFine) && (
              <span className="tt-k tt-k--soft">or {[...others.map((p) => p.label), ...(r.alsoFine ? [r.alsoFine.label] : [])].join(", or ")}</span>
            )}
            <div className="tt-rows">
              <div><span>Needs to hold</span><b>{Math.round(r.requiredLitres)} L</b></div>
              <div><span>Showers from a full tank</span><b>{Math.floor(r.showersFromTank)}</b></div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

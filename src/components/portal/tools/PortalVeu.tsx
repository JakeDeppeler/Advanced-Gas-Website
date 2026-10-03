"use client";

import { useMemo, useState } from "react";
import { VALID_VIC_POSTCODE, VEU_DEFAULTS, estimateVeu } from "@/lib/tools/veuEstimate";
import { SYSTEMS } from "@/lib/tools/hotWaterSizing";

const NOW = [
  { k: "electric-storage", label: "Electric storage" },
  { k: "gas-storage", label: "Gas storage" },
  { k: "gas-continuous", label: "Gas instantaneous" },
];

/**
 * VEU rebate, the portal's version — Tools.dc.html's VEU tab.
 *
 * Same ballpark as the public estimator (lib/tools/veuEstimate). The unit
 * going in doesn't move it — the scheme's range covers every heat pump we fit
 * — and neither does who owns the place; both are on the form because they
 * are what gets asked on the call, and the note says so.
 */
export function PortalVeu() {
  const [now, setNow] = useState("electric-storage");
  const [unit, setUnit] = useState(SYSTEMS[0].id);
  const [postcode, setPostcode] = useState("3810");
  const [owner, setOwner] = useState("owner");
  const r = useMemo(() => estimateVeu({ ...VEU_DEFAULTS, postcode, upgradeKey: `${now}::heat-pump` }), [now, postcode]);
  const $ = (n: number) => `$${n.toLocaleString("en-AU")}`;
  const ok = VALID_VIC_POSTCODE.test(postcode);

  return (
    <div className="ptl-grid">
      <section className="ptl-card ptl-card--form">
        <h2>Before the site visit</h2>
        <label className="ptl-field">What&rsquo;s there now
          <select value={now} onChange={(e) => setNow(e.target.value)}>{NOW.map((n) => <option key={n.k} value={n.k}>{n.label}</option>)}</select>
        </label>
        <label className="ptl-field">Going in
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>{SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <div className="ptl-two">
          <label className="ptl-field">Postcode
            <input type="text" inputMode="numeric" maxLength={4} value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="ptl-field">Who owns it
            <select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="owner">Owner occupier</option><option value="landlord">Landlord</option></select>
          </label>
        </div>
      </section>

      <aside className="ptl-navy">
        <span className="ptl-navy__k">Ballpark VEU rebate</span>
        <strong className="ptl-navy__big ptl-navy__big--md">{ok ? $(r.midRebate) : "—"}</strong>
        <span className="ptl-navy__k">
          {ok
            ? <>Somewhere between {$(r.minRebate)} and {$(r.maxRebate)}. Confirmed at the site visit. Applied straight off the installed price.</>
            : "Victorian postcodes only — VEU is a Victorian scheme."}
        </span>
        {ok && owner === "landlord" && (
          <span className="ptl-navy__k">Landlords get VEU too. The $1,000 Solar Homes rebate is the one that needs an owner occupier.</span>
        )}
      </aside>
    </div>
  );
}

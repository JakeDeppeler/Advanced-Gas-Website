"use client";

import { useMemo, useState } from "react";
import { site } from "@/lib/site";

type Upgrade = "hp" | "ac";
type Current = "gas" | "elec" | "aircon";
type Prop = "own" | "rent";
type Conc = "no" | "yes";

export function RebateCalculator() {
  const [upgrade, setUpgrade] = useState<Upgrade>("hp");
  const [current, setCurrent] = useState<Current>("gas");
  const [prop, setProp] = useState<Prop>("own");
  const [conc, setConc] = useState<Conc>("no");

  const { amount, blurb } = useMemo(() => {
    let base: number;
    let msg: string;
    if (upgrade === "hp") {
      base = current === "gas" ? 2400 : current === "elec" ? 2600 : 1200;
      msg =
        current === "gas"
          ? "Replacing a gas storage tank — typical Pakenham heat pump rebate."
          : current === "elec"
            ? "Electric to heat pump = highest rebate band under VEU."
            : "Heat pump install — rebate may be limited if existing system isn't eligible.";
    } else {
      base = current === "aircon" ? 4500 : current === "gas" ? 5000 : 2800;
      msg =
        current === "gas"
          ? "Replacing inefficient gas heating with split/ducted — full $5k bracket applies."
          : current === "aircon"
            ? "Upgrading an older aircon — strong VEU rebate available."
            : "Aircon-related VEU rebate — exact amount depends on house specs.";
    }
    if (prop === "rent") base = Math.round(base * 0.92);
    if (conc === "yes") base += upgrade === "hp" ? 200 : 400;
    return { amount: base, blurb: msg };
  }, [upgrade, current, prop, conc]);

  return (
    <div className="rb-calc">
      <h3>Quick rebate estimator</h3>
      <p className="rb-calc__sub">Indicative only — real eligibility checked at the site visit.</p>

      <div className="rb-calc__q">
        <span className="rb-calc__qlabel">1. What are you upgrading?</span>
        <div className="rb-calc__opts two">
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="upgrade"
              checked={upgrade === "hp"}
              onChange={() => setUpgrade("hp")}
            />
            Heat pump hot water
          </label>
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="upgrade"
              checked={upgrade === "ac"}
              onChange={() => setUpgrade("ac")}
            />
            Split / ducted aircon
          </label>
        </div>
      </div>

      <div className="rb-calc__q">
        <span className="rb-calc__qlabel">2. Current system?</span>
        <div className="rb-calc__opts">
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="current"
              checked={current === "gas"}
              onChange={() => setCurrent("gas")}
            />
            Gas storage hot water (or old gas heater)
          </label>
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="current"
              checked={current === "elec"}
              onChange={() => setCurrent("elec")}
            />
            Electric storage hot water
          </label>
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="current"
              checked={current === "aircon"}
              onChange={() => setCurrent("aircon")}
            />
            Old / no aircon
          </label>
        </div>
      </div>

      <div className="rb-calc__q">
        <span className="rb-calc__qlabel">3. Property type?</span>
        <div className="rb-calc__opts two">
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="prop"
              checked={prop === "own"}
              onChange={() => setProp("own")}
            />
            Owner-occupied
          </label>
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="prop"
              checked={prop === "rent"}
              onChange={() => setProp("rent")}
            />
            Rental / investment
          </label>
        </div>
      </div>

      <div className="rb-calc__q">
        <span className="rb-calc__qlabel">4. Concession card holder?</span>
        <div className="rb-calc__opts two">
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="conc"
              checked={conc === "no"}
              onChange={() => setConc("no")}
            />
            No
          </label>
          <label className="rb-calc__opt">
            <input
              type="radio"
              name="conc"
              checked={conc === "yes"}
              onChange={() => setConc("yes")}
            />
            Yes (higher rebate)
          </label>
        </div>
      </div>

      <div className="rb-calc__result">
        <span className="rb-calc__result-l">Your estimated VEU rebate</span>
        <div className="rb-calc__result-big">${amount.toLocaleString()}</div>
        <p>{blurb}</p>
        <div className="rb-calc__cta">
          <a href="/quote" className="btn btn--orange">Lock this rebate in →</a>
          <a href={`tel:${site.phoneE164}`} className="btn btn--ghost-on-dark">Or call us</a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { site } from "@/lib/site";

type Upgrade = "hp" | "ac";
type HpCurrent = "gas-storage" | "elec-storage" | "continuous" | "none";
type AcCurrent = "ducted-gas" | "wall-furnace" | "old-aircon" | "no-aircon";
type Prop = "own" | "rent";
type Conc = "no" | "yes";

const HP_OPTIONS: { value: HpCurrent; label: string }[] = [
  { value: "gas-storage", label: "Gas storage hot water tank" },
  { value: "elec-storage", label: "Electric storage hot water tank" },
  { value: "continuous", label: "Continuous-flow gas (instantaneous)" },
  { value: "none", label: "No working hot water / new build" },
];

const AC_OPTIONS: { value: AcCurrent; label: string }[] = [
  { value: "ducted-gas", label: "Ducted gas heating" },
  { value: "wall-furnace", label: "Wall furnace / space heater" },
  { value: "old-aircon", label: "Old split / ducted aircon" },
  { value: "no-aircon", label: "No heating or cooling" },
];

export function RebateCalculator() {
  const [upgrade, setUpgrade] = useState<Upgrade>("hp");
  const [hpCurrent, setHpCurrent] = useState<HpCurrent>("gas-storage");
  const [acCurrent, setAcCurrent] = useState<AcCurrent>("ducted-gas");
  const [prop, setProp] = useState<Prop>("own");
  const [conc, setConc] = useState<Conc>("no");

  const { amount, blurb } = useMemo(() => {
    let base: number;
    let msg: string;
    if (upgrade === "hp") {
      const map: Record<HpCurrent, [number, string]> = {
        "gas-storage": [2400, "Replacing a gas storage tank with a heat pump — typical Pakenham VEU rebate."],
        "elec-storage": [2600, "Electric storage to heat pump = highest rebate band under VEU."],
        "continuous": [1800, "Replacing continuous-flow gas with a heat pump — moderate rebate band."],
        "none": [1200, "No existing eligible unit — rebate limited but STCs may still apply."],
      };
      [base, msg] = map[hpCurrent];
    } else {
      const map: Record<AcCurrent, [number, string]> = {
        "ducted-gas": [5000, "Replacing ducted gas heating with reverse-cycle — full VEU bracket applies."],
        "wall-furnace": [3800, "Wall furnace to reverse-cycle split — strong rebate available."],
        "old-aircon": [4500, "Upgrading an older aircon to high-efficiency reverse-cycle — strong rebate."],
        "no-aircon": [2800, "New reverse-cycle install — rebate depends on certificate count for your home."],
      };
      [base, msg] = map[acCurrent];
    }
    if (prop === "rent") base = Math.round(base * 0.92);
    if (conc === "yes") base += upgrade === "hp" ? 200 : 400;
    return { amount: base, blurb: msg };
  }, [upgrade, hpCurrent, acCurrent, prop, conc]);

  const q2Title = upgrade === "hp" ? "Current hot water system?" : "Current heating / cooling?";
  const q2Options = upgrade === "hp" ? HP_OPTIONS : AC_OPTIONS;

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
        <span className="rb-calc__qlabel">2. {q2Title}</span>
        <div className="rb-calc__opts">
          {q2Options.map((opt) => {
            const checked =
              upgrade === "hp" ? hpCurrent === opt.value : acCurrent === opt.value;
            return (
              <label key={opt.value} className="rb-calc__opt">
                <input
                  type="radio"
                  name="current"
                  checked={checked}
                  onChange={() => {
                    if (upgrade === "hp") setHpCurrent(opt.value as HpCurrent);
                    else setAcCurrent(opt.value as AcCurrent);
                  }}
                />
                {opt.label}
              </label>
            );
          })}
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

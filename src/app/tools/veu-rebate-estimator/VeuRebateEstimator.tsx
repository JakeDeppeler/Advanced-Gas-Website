"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * VEU rebate estimator. Client-only, live-updating.
 *
 * The VEU scheme generates VEECs (Victorian Energy Efficiency Certificates)
 * — one for every tonne of avoided CO2 over the upgrade's assumed 10-year
 * life. Each VEEC has a traded market price (2025-26 ~$85-$110).
 *
 * We approximate the rebate as (typical certificate count) × (VEEC price)
 * per upgrade path. Numbers below are ballparks derived from the current
 * ESC Product Class schedule + observed 2025-26 rebate outcomes on our
 * install base. A firm rebate is always confirmed at quote time.
 */

type UpgradePath = {
  key: string;
  label: string;
  minRebate: number;
  maxRebate: number;
  typicalInstall: number;
  notes: string;
};

// Upgrade paths keyed by "currentSystem::plannedUpgrade".
// Rebate ranges reflect current VEEC market prices ($60-$75 per certificate,
// mid-2026) and the max heat-pump hot-water rebate of ~$2,700.
const UPGRADES: UpgradePath[] = [
  // ---- Hot water upgrades ----
  // typicalInstall is the ballpark pre-rebate install for a standard
  // mid-range heat pump. Top-of-line Reclaim CO₂ with WiFi can reach
  // ~$9,700 pre-rebate → ~$7,000 net; entry iStore lands closer to
  // $4,800 → $2,200 net. Net install range shown to the user is
  // always $2,000-$7,000 across the whole hot-water heat-pump range.
  { key: "gas-storage::heat-pump", label: "Gas storage → Heat pump hot water",
    minRebate: 2400, maxRebate: 2700, typicalInstall: 4800,
    notes: "Biggest hot-water rebate. Typical mid-range install $4,800 pre-rebate → ~$2,200 net. Reclaim CO₂ top-tier goes up to $9,700 pre-rebate ($7,000 net)." },
  { key: "gas-continuous::heat-pump", label: "Gas continuous → Heat pump hot water",
    minRebate: 2000, maxRebate: 2400, typicalInstall: 4800,
    notes: "Continuous flow gas is more efficient than storage, so the rebate is slightly smaller." },
  { key: "electric-storage::heat-pump", label: "Electric storage → Heat pump hot water",
    minRebate: 2200, maxRebate: 2600, typicalInstall: 4800,
    notes: "Strong rebate, displacing peak-rate electric with a heat pump saves 60-70% of the running cost." },
  { key: "off-peak-electric::heat-pump", label: "Off-peak electric → Heat pump hot water",
    minRebate: 1400, maxRebate: 1800, typicalInstall: 4800,
    notes: "Smaller rebate because off-peak electric is already comparatively cheap." },

  // ---- Space heating / cooling upgrades ----
  { key: "gas-ducted::rc-ducted", label: "Gas ducted heater → Reverse-cycle ducted",
    minRebate: 2800, maxRebate: 4200, typicalInstall: 12000,
    notes: "The single biggest VEU rebate available, retrofitting a whole home off gas ducted." },
  { key: "gas-ducted::rc-split", label: "Gas ducted heater → Multi-head reverse-cycle split",
    minRebate: 2000, maxRebate: 3200, typicalInstall: 8000,
    notes: "Popular retrofit path, cheaper install than full ducted, still eligible for a healthy rebate." },
  { key: "old-aircon::rc-split", label: "Old (pre-2010) split / window unit → New reverse-cycle split",
    minRebate: 300, maxRebate: 800, typicalInstall: 2200,
    notes: "Smaller rebate but pairs well with the sizing calculator for a right-sized upgrade." },
  { key: "old-aircon::rc-ducted", label: "Old ducted → New high-efficiency ducted",
    minRebate: 800, maxRebate: 1500, typicalInstall: 11000,
    notes: "Applies when replacing a 15+ yr old ducted system with a modern inverter." },
];

const VEEC_PRICE_TREND = "$60-$75 / VEEC (2026 market)";

type FormState = {
  postcode: string;
  upgradeKey: string;
  household: number; // used only for hot water upgrades to nudge the range
  hasSolar: boolean;
};

const DEFAULTS: FormState = {
  postcode: "3810",
  upgradeKey: "gas-storage::heat-pump",
  household: 4,
  hasSolar: false,
};

const VALID_VIC_POSTCODE = /^3\d{3}$/;

export function VeuRebateEstimator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => {
    const upgrade = UPGRADES.find((u) => u.key === form.upgradeKey) ?? UPGRADES[0];
    const validPostcode = VALID_VIC_POSTCODE.test(form.postcode);

    // Household size scales hot-water rebates modestly (bigger tank ↔ more
    // displaced fuel = more VEECs). Not applied to space heating/cooling.
    const isHotWater = upgrade.key.endsWith("::heat-pump");
    const householdFactor = isHotWater
      ? 0.85 + Math.min(1, form.household / 4) * 0.30 // 0.85× at 1 person, 1.15× at 4+
      : 1;

    // Solar means slightly less rebate on hot water paths that are usually
    // scheduled to run midday off solar surplus — the scheme values the
    // absolute avoided-emission tonnes, which are marginally lower.
    const solarFactor = isHotWater && form.hasSolar ? 0.95 : 1;

    const minRebate = Math.round(upgrade.minRebate * householdFactor * solarFactor);
    const maxRebate = Math.round(upgrade.maxRebate * householdFactor * solarFactor);
    const midRebate = Math.round((minRebate + maxRebate) / 2);

    const netMin = Math.max(0, upgrade.typicalInstall - maxRebate);
    const netMax = Math.max(0, upgrade.typicalInstall - minRebate);
    const netMid = Math.max(0, upgrade.typicalInstall - midRebate);

    return {
      upgrade,
      validPostcode,
      minRebate,
      maxRebate,
      midRebate,
      netMin,
      netMax,
      netMid,
      isHotWater,
    };
  }, [form]);

  const $ = (n: number) => `$${n.toLocaleString("en-AU")}`;

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Your upgrade</h2>

        <div className="tool-field">
          <label htmlFor="pc">Victorian postcode</label>
          <input
            id="pc"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={form.postcode}
            onChange={(e) => update("postcode", e.target.value.replace(/[^0-9]/g, ""))}
          />
          <small>
            {result.validPostcode
              ? "Valid VIC postcode, rebate applies."
              : "Must be a 4-digit VIC postcode (starts with 3)."}
          </small>
        </div>

        <div className="tool-field">
          <label htmlFor="up">Current → planned upgrade</label>
          <select
            id="up"
            value={form.upgradeKey}
            onChange={(e) => update("upgradeKey", e.target.value)}
          >
            <optgroup label="Hot water">
              {UPGRADES.filter((u) => u.key.endsWith("::heat-pump")).map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </optgroup>
            <optgroup label="Space heating / cooling">
              {UPGRADES.filter((u) => !u.key.endsWith("::heat-pump")).map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {result.isHotWater && (
          <>
            <div className="tool-field">
              <label htmlFor="ppl">Household size</label>
              <input
                id="ppl"
                type="number"
                min="1"
                max="10"
                step="1"
                value={form.household}
                onChange={(e) => update("household", parseInt(e.target.value) || 1)}
              />
              <small>Larger households = bigger tank = slightly higher rebate.</small>
            </div>

            <div className="tool-field">
              <label>Rooftop solar PV</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => update("hasSolar", false)}
                  className="ds-btn"
                  style={{
                    flex: 1,
                    background: !form.hasSolar ? "var(--navy)" : "transparent",
                    color: !form.hasSolar ? "#fff" : "var(--navy)",
                    border: `1px solid ${!form.hasSolar ? "var(--navy)" : "var(--line)"}`,
                    fontSize: 13.5, padding: "10px 12px",
                  }}
                >
                  No solar
                </button>
                <button
                  type="button"
                  onClick={() => update("hasSolar", true)}
                  className="ds-btn"
                  style={{
                    flex: 1,
                    background: form.hasSolar ? "var(--navy)" : "transparent",
                    color: form.hasSolar ? "#fff" : "var(--navy)",
                    border: `1px solid ${form.hasSolar ? "var(--navy)" : "var(--line)"}`,
                    fontSize: 13.5, padding: "10px 12px",
                  }}
                >
                  Have solar
                </button>
              </div>
              <small>Solar households often schedule the heat pump midday to run off surplus PV.</small>
            </div>
          </>
        )}

        <div style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "var(--bg-2)",
          borderRadius: 8,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "var(--ink-3)",
        }}>
          <strong style={{ color: "var(--navy)" }}>{result.upgrade.label}</strong>
          <br />
          {result.upgrade.notes}
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Estimated VEU rebate</h2>
        <div className="tool-result__lead">Rebate range</div>
        <div className="tool-result__big">
          {$(result.minRebate)}–{$(result.maxRebate)}
        </div>
        <p className="tool-result__sub">
          At the current VEEC price of <strong>{VEEC_PRICE_TREND}</strong>, this upgrade typically
          generates a rebate around <strong>{$(result.midRebate)}</strong>.
        </p>

        <div className="tool-result__breakdown">
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Typical install cost</span>
            <span className="tool-result__row-val">{$(result.upgrade.typicalInstall)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Rebate (min)</span>
            <span className="tool-result__row-val">– {$(result.minRebate)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Rebate (max)</span>
            <span className="tool-result__row-val">– {$(result.maxRebate)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Net install (mid)</span>
            <span className="tool-result__row-val" style={{ color: "var(--orange)" }}>
              {$(result.netMid)}
            </span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Net install range</span>
            <span className="tool-result__row-val">
              {$(result.netMin)} – {$(result.netMax)}
            </span>
          </div>
        </div>

        {result.isHotWater && (
          <div style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "rgba(243,103,34,0.08)",
            border: "1px solid rgba(243,103,34,0.18)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--navy)",
          }}>
            <strong>Heat pump net install range:</strong> $2,000 (entry iStore /
            Thermann R290) → $7,000 (Reclaim CO₂ top-of-line with Wi-Fi and
            stainless 316 tank). The number above is the mid-point of your
            upgrade path.
          </div>
        )}

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Lock in a rebate-inclusive quote →</Link>
          <Link href="/tools/hot-water-savings" className="ds-btn ds-btn--ghost">See annual saving after install →</Link>
        </div>

        <p className="tool-result__note">
          Estimates only. The exact rebate depends on the certified deemed abatement of the specific
          product being installed, the current VEEC market price, and site-specific factors. We
          confirm the firm number at quote time and apply it to your bill up-front, you never pay
          the rebate and then chase it back.
        </p>
      </div>
    </div>
  );
}

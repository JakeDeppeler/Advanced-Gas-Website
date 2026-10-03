"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { UPGRADES, VEEC_PRICE_TREND, VEU_DEFAULTS as DEFAULTS, estimateVeu, type VeuForm as FormState } from "@/lib/tools/veuEstimate";

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

export function VeuRebateEstimator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => estimateVeu(form), [form]);

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
            <span className="tool-result__row-val" style={{ color: "var(--orange-ink)" }}>
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
            <strong>Heat pump net install range:</strong> $2,000 for an iStore or
            Thermann R290 all-in-one, up to $7,000 for a Reclaim CO₂ split with Wi-Fi
            and a 316 stainless tank. What moves you along that range is tank size,
            tank material and whether the compressor sits separately. The number
            above is the mid-point of your upgrade path.
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

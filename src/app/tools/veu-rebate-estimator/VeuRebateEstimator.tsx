"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "@/components/homepage/tools/calc-a.css";
import { SHOW_PRICES } from "@/lib/homepage/data";
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
 *
 * The install and net-install rows are our ballpark prices, so they only
 * show while SHOW_PRICES is on (Jake asked for every price off, Nov 2026).
 */

/** − value +, for a number the user may also type. */
function Stepper({ id, value, min, max, onChange, unit }: {
  id: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="ca__step">
      <button type="button" aria-label={`Less${unit ? `, ${unit}` : ""}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>−</button>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)} />
      <button type="button" aria-label={`More${unit ? `, ${unit}` : ""}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>+</button>
    </div>
  );
}

/** "Gas storage → Heat pump hot water" as its two halves, for a choice row. */
const halves = (label: string) => {
  const [from, to] = label.split(" → ");
  return { from, to: to ?? "" };
};

export function VeuRebateEstimator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => estimateVeu(form), [form]);

  const $ = (n: number) => `$${n.toLocaleString("en-AU")}`;

  const groups = [
    { label: "Hot water", items: UPGRADES.filter((u) => u.key.endsWith("::heat-pump")) },
    { label: "Space heating / cooling", items: UPGRADES.filter((u) => !u.key.endsWith("::heat-pump")) },
  ];

  return (
    <div className="ca">
      <div className="ca__card ca__in">
        <h2 className="ca__h">Your upgrade</h2>

        <div className="ca__row">
          <label className="ca__q" htmlFor="pc">Victorian postcode</label>
          <div className="ca__field" style={{ maxWidth: 200 }}>
            <input
              id="pc"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={form.postcode}
              onChange={(e) => update("postcode", e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
          <p className="ca__hint">
            {result.validPostcode
              ? "✓ Valid VIC postcode, rebate applies."
              : "! Must be a 4-digit VIC postcode (starts with 3)."}
          </p>
        </div>

        <div className="ca__row">
          <span className="ca__q" id="up">Current → planned upgrade</span>
          <div className="ca__choices" role="group" aria-labelledby="up">
            {groups.map((g) => (
              <div key={g.label} className="ca__choices">
                <p className="ca__group">{g.label}</p>
                {g.items.map((u) => {
                  const h = halves(u.label);
                  return (
                    <button key={u.key} type="button" className="ca__choice" aria-pressed={form.upgradeKey === u.key} aria-label={u.label} onClick={() => update("upgradeKey", u.key)}>
                      <i aria-hidden="true" /><span><strong>{h.to}</strong><small>From: {h.from}</small></span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {result.isHotWater && (
          <>
            <div className="ca__row">
              <label className="ca__q" htmlFor="ppl">Household size</label>
              <Stepper id="ppl" value={form.household} min={1} max={10} unit="people" onChange={(v) => update("household", v)} />
              <p className="ca__hint">Larger households = bigger tank = slightly higher rebate.</p>
            </div>

            <div className="ca__row">
              <span className="ca__q" id="pv">Rooftop solar PV</span>
              <div className="ca__opts" role="group" aria-labelledby="pv">
                <button type="button" aria-pressed={!form.hasSolar} onClick={() => update("hasSolar", false)}>No solar</button>
                <button type="button" aria-pressed={form.hasSolar} onClick={() => update("hasSolar", true)}>Have solar</button>
              </div>
              <p className="ca__hint">Solar households often schedule the heat pump midday to run off surplus PV.</p>
            </div>
          </>
        )}

        <p className="ca__box">
          <strong>{result.upgrade.label}</strong>
          <br />
          {result.upgrade.notes}
        </p>
      </div>

      <div className="ca__card ca__sum" aria-live="polite">
        <span className="ca__lbl">Estimated VEU rebate</span>
        <div className="ca__big">{$(result.minRebate)}–{$(result.maxRebate)}</div>
        <p className="ca__tag">Typically around <b>{$(result.midRebate)}</b></p>
      </div>

      <div className="ca__card ca__det">
        <p className="ca__sub">
          At the current VEEC price of <strong>{VEEC_PRICE_TREND}</strong>, this upgrade typically
          generates a rebate around <strong>{$(result.midRebate)}</strong>.
        </p>

        <dl className="ca__maths" aria-label="The rebate">
          {SHOW_PRICES && (
            <div><dt>Typical install cost</dt><dd>{$(result.upgrade.typicalInstall)}</dd></div>
          )}
          <div><dt>Rebate (min)</dt><dd>– {$(result.minRebate)}</dd></div>
          <div><dt>Rebate (max)</dt><dd>– {$(result.maxRebate)}</dd></div>
          {SHOW_PRICES ? (
            <>
              <div className="ca__total"><dt>Net install (mid)</dt><dd>{$(result.netMid)}</dd></div>
              <div><dt>Net install range</dt><dd>{$(result.netMin)} – {$(result.netMax)}</dd></div>
            </>
          ) : (
            <div><dt>Installed price</dt><dd>On your written quote, rebate off</dd></div>
          )}
        </dl>

        {result.isHotWater && (
          <p className="ca__box">
            {SHOW_PRICES ? (
              <>
                <strong>Heat pump net install range:</strong> $2,000 for an iStore or
                Thermann R290 all-in-one, up to $7,000 for a Reclaim CO₂ split with Wi-Fi
                and a 316 stainless tank. What moves you along that range is tank size,
                tank material and whether the compressor sits separately. The number
                above is the mid-point of your upgrade path.
              </>
            ) : (
              <>
                <strong>What moves a heat pump&rsquo;s price:</strong> an iStore or Thermann
                R290 all-in-one costs the least, a Reclaim CO₂ split with Wi-Fi and a 316
                stainless tank the most. In between it&rsquo;s tank size, tank material and
                whether the compressor sits separately. Your written quote is fixed, with
                the rebate already taken off.
              </>
            )}
          </p>
        )}

        <div className="ca__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat">Lock in a rebate-inclusive quote →</Link>
          <Link href="/tools/hot-water-savings" className="abtn abtn--ghost">See annual saving after install →</Link>
        </div>

        <p className="ca__note">
          Estimates only. The exact rebate depends on the certified deemed abatement of the specific
          product being installed, the current VEEC market price, and site-specific factors. We
          confirm the firm number at quote time and apply it to your bill up-front, you never pay
          the rebate and then chase it back.
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SHOW_PRICES } from "@/lib/homepage/data";
import { Num } from "@/app/tools/hot-water-savings/HotWaterSavings";
import "@/components/homepage/tools/calc-b.css";

/**
 * Gas heater vs reverse-cycle space-heating cost comparator.
 *
 * For a given heat load and usage pattern, compute the annual $ cost
 * of each option. Assumes:
 *   - Gas heater: efficiency from star rating (3★=65%, 4★=75%, 5★=82%, 6★=87%)
 *   - Reverse-cycle: seasonal average COP (Melbourne inverter ≈ 3.5-4.5)
 * Both fed the same delivered heat.
 *
 * Then computes the annual saving of swapping gas → reverse-cycle,
 * plus the payback period if you take the install cost and VEU rebate
 * into account.
 */

const STAR_EFFICIENCY: Record<string, number> = {
  "3": 0.65,
  "4": 0.75,
  "5": 0.82,
  "6": 0.87,
};

const KWH_TO_MJ = 3.6;

type FormState = {
  heatLoadKw: number;
  hoursPerDay: number;
  daysPerYear: number;
  gasStar: "3" | "4" | "5" | "6";
  gasCentsPerMj: number;
  rcCop: number;
  elecCentsPerKwh: number;
  installCost: number;
  veuRebate: number;
};

const DEFAULTS: FormState = {
  heatLoadKw: 8,        // 3-bed Pakenham home
  hoursPerDay: 6,
  daysPerYear: 135,     // Melbourne winter + shoulder
  gasStar: "5",
  gasCentsPerMj: 4.5,
  rcCop: 4.0,
  elecCentsPerKwh: 32,
  // Our ballpark only while prices show. Otherwise blank, for the visitor's
  // own quoted figure (Jake asked for every price off, Nov 2026), and the
  // payback lines wait until there is one.
  installCost: SHOW_PRICES ? 12000 : 0,
  veuRebate: 3400,      // typical gas ducted → RC ducted at current $60-$75 VEEC prices
};

/** The star ratings, with the notes the old drop-down carried. */
const STARS: { v: FormState["gasStar"]; s?: string }[] = [
  { v: "3", s: "Typical pre-2010" },
  { v: "4" },
  { v: "5", s: "Typical current" },
  { v: "6", s: "Top efficiency" },
];
/** One-tap heat loads from the hint's own bands (small unit 2-3, 3-bed 6-10, big double-storey 12-18). */
const LOADS: { v: number; t: string }[] = [
  { v: 2.5, t: "Small unit" },
  { v: 8, t: "3-bed home" },
  { v: 15, t: "Big double-storey" },
];

export function HeatingComparator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => {
    // Delivered heat energy per year in kWh (what the room actually needs).
    const deliveredKwhYr =
      Math.max(0, form.heatLoadKw) * form.hoursPerDay * form.daysPerYear;

    // Gas path — input MJ = delivered / efficiency; cost = input × c/MJ.
    const gasEfficiency = STAR_EFFICIENCY[form.gasStar] ?? 0.75;
    const gasInputKwh = deliveredKwhYr / gasEfficiency;
    const gasInputMj = gasInputKwh * KWH_TO_MJ;
    const gasCostYr = (gasInputMj * form.gasCentsPerMj) / 100;

    // Reverse-cycle path — input kWh = delivered / COP; cost = input × c/kWh.
    const rcInputKwh = deliveredKwhYr / Math.max(1, form.rcCop);
    const rcCostYr = (rcInputKwh * form.elecCentsPerKwh) / 100;

    const savingYr = gasCostYr - rcCostYr;
    const netInstall = Math.max(0, form.installCost - form.veuRebate);
    const paybackYears = savingYr > 0 ? netInstall / savingYr : Infinity;
    const tenYearSaving = savingYr * 10 - netInstall;

    return {
      deliveredKwhYr,
      gasInputMj,
      gasCostYr,
      rcInputKwh,
      rcCostYr,
      savingYr,
      netInstall,
      paybackYears,
      tenYearSaving,
    };
  }, [form]);

  const $ = (n: number) => n === Infinity ? "n/a" : `$${Math.round(n).toLocaleString("en-AU")}`;
  const hasInstall = form.installCost > 0;
  const top = Math.max(result.gasCostYr, result.rcCostYr, 1);
  const rcCheaper = result.savingYr > 0;

  return (
    <div className="cb">
      <div className="cb__card">
        <a href="#hc-result" className="cb__peek" aria-hidden="true" tabIndex={-1}>
          <span>Save per winter</span><b>{$(result.savingYr)}</b><em>See the sum ↓</em>
        </a>
        <h2 className="cb__h">Home &amp; usage</h2>

        <div className="cb__f">
          <Num id="hl" label="Heat load" unit="kW" value={form.heatLoadKw} min={1} max={40} step={0.5}
            onChange={(v) => update("heatLoadKw", v || 0)} hint="Small unit 2-3, 3-bed 6-10, big double-storey 12-18 kW." />
          <div className="cb__opts" role="group" aria-label="Heat load presets">
            {LOADS.map((l) => (
              <button key={l.v} type="button" aria-pressed={form.heatLoadKw === l.v} onClick={() => update("heatLoadKw", l.v)}>
                {l.t}<small>{l.v} kW</small>
              </button>
            ))}
          </div>
        </div>

        <div className="cb__pair">
          <Num id="hpd" label="Hours per day" unit="hrs" value={form.hoursPerDay} min={0} max={24} step={0.5}
            onChange={(v) => update("hoursPerDay", v || 0)} />
          <Num id="dpy" label="Winter days in use" unit="days" value={form.daysPerYear} min={1} max={200} step={1} int
            onChange={(v) => update("daysPerYear", v || 0)} hint="Melbourne average ≈ 120-150 (real winter + shoulder days)." />
        </div>

        <div className="cb__group">
          <h3 className="cb__h">Gas heater</h3>
          <div className="cb__f">
            <span className="cb__lbl" id="hc-star">Star rating</span>
            <div className="cb__opts" role="group" aria-labelledby="hc-star">
              {STARS.map((o) => (
                <button key={o.v} type="button" aria-pressed={form.gasStar === o.v} onClick={() => update("gasStar", o.v)}>
                  {o.v}-star{o.s && <small>{o.s}</small>}
                </button>
              ))}
            </div>
          </div>
          <Num id="gp" label="Gas price" unit="c/MJ" value={form.gasCentsPerMj} min={1} max={20} step={0.1}
            onChange={(v) => update("gasCentsPerMj", v || 0)} />
        </div>

        <div className="cb__group">
          <h3 className="cb__h">Reverse-cycle system</h3>
          <div className="cb__pair">
            <Num id="cop" label="COP (heating)" value={form.rcCop} min={1.5} max={6} step={0.1}
              onChange={(v) => update("rcCop", v || 1)} />
            <Num id="ep" label="Electric" unit="c/kWh" value={form.elecCentsPerKwh} min={1} max={200} step={0.1}
              onChange={(v) => update("elecCentsPerKwh", v || 0)} />
          </div>
          <p className="cb__hint">Modern inverter ≈ 4.0. Mitsubishi Hyper Heating (hills) ≈ 3.8 at -5 °C.</p>
        </div>

        <div className="cb__group">
          <h3 className="cb__h">Install &amp; rebate (for payback)</h3>
          <div className="cb__pair">
            <Num id="ic" label="Install cost" unit="$" value={form.installCost} min={0} max={30000} step={500} int blank="From your quote"
              onChange={(v) => update("installCost", v || 0)}
              hint={SHOW_PRICES ? "Ducted RC retrofit ~$11-14k, multi-head split ~$6-9k." : "The price before rebate, from your written quote."} />
            <Num id="veu" label="VEU rebate" unit="$" value={form.veuRebate} min={0} max={6000} step={100} int
              onChange={(v) => update("veuRebate", v || 0)} hint="Gas ducted → RC ducted typically $2,800-$4,200 at current VEEC prices." />
          </div>
        </div>
      </div>

      <div className="cb__card cb__res" id="hc-result" aria-live="polite">
        <h2 className="cb__h">Which is cheaper to run?</h2>
        <div className="cb__top">
          <span className="cb__lead">Save per winter</span>
          <b className="cb__big">{$(result.savingYr)}</b>
          <p className="cb__sub">
            By switching from a <strong>{form.gasStar}-star gas heater</strong> to a
            <strong> reverse-cycle COP {form.rcCop.toFixed(1)}</strong> system.
            {hasInstall && result.paybackYears !== Infinity && (
              <> Payback in <strong>{result.paybackYears.toFixed(1)} years</strong> at
              {" "}<strong>{$(result.netInstall)}</strong> net install cost.</>
            )}
          </p>
        </div>

        <ul className="cb__bars" aria-label="Running cost a year">
          <li>
            <span>Gas cost / yr <b>{$(result.gasCostYr)}</b></span>
            <i><em style={{ width: `${(result.gasCostYr / top) * 100}%` }} /></i>
          </li>
          <li className="cb__bar--new">
            <span>Reverse-cycle cost / yr <b>{$(result.rcCostYr)}</b></span>
            <i><em style={{ width: `${(result.rcCostYr / top) * 100}%` }} /></i>
          </li>
        </ul>

        <div className={`cb__fit${rcCheaper ? "" : " cb__fit--short"}`}>
          <i aria-hidden="true">{rcCheaper ? "✓" : "!"}</i>
          <p>{rcCheaper
            ? <><b>Reverse cycle is cheaper to run</b> on these numbers, by {$(result.savingYr)} a winter.</>
            : <><b>Gas is cheaper to run</b> on these numbers.</>}</p>
        </div>

        <dl className="cb__rows">
          <div><dt>Delivered heat / yr</dt><dd>{Math.round(result.deliveredKwhYr).toLocaleString()} kWh</dd></div>
          <div><dt>Gas input / yr</dt><dd>{Math.round(result.gasInputMj).toLocaleString()} MJ</dd></div>
          <div><dt>Gas cost / yr</dt><dd>{$(result.gasCostYr)}</dd></div>
          <div><dt>RC input / yr</dt><dd>{Math.round(result.rcInputKwh).toLocaleString()} kWh</dd></div>
          <div><dt>Reverse-cycle cost / yr</dt><dd>{$(result.rcCostYr)}</dd></div>
          <div className={result.savingYr > 0 ? "cb__good" : undefined}><dt>Annual saving</dt><dd>{$(result.savingYr)}</dd></div>
          {hasInstall ? (
            <>
              <div><dt>Payback (net of VEU)</dt><dd>{result.paybackYears === Infinity ? "n/a" : `${result.paybackYears.toFixed(1)} yrs`}</dd></div>
              <div className={result.tenYearSaving > 0 ? "cb__good" : undefined}><dt>10-year net saving</dt><dd>{$(result.tenYearSaving)}</dd></div>
            </>
          ) : (
            <div><dt>Payback</dt><dd>Add your install quote</dd></div>
          )}
        </dl>

        <div className="cb__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat cb__btn cb__btn--or">Quote my heating swap →</Link>
          <Link href="/tools/veu-rebate-estimator" className="abtn abtn--line cb__btn cb__btn--line">Check my rebate first →</Link>
        </div>

        <p className="cb__note">
          Estimate only, real running cost varies with outdoor temperature, thermostat setpoint, house
          insulation and how many zones are running. RC systems in Melbourne hills (Emerald, Gembrook)
          should use the Mitsubishi FH Hyper Heating COP (~3.8 at -5 °C), not a standard 4.0 rating.
        </p>
      </div>
    </div>
  );
}

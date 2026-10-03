"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SIZING_DEFAULTS as DEFAULTS, SYSTEMS, sizeHousehold, type SizingForm as Form } from "@/lib/tools/hotWaterSizing";

/**
 * Heat pump hot water sizing calculator.
 *
 * Sizes the tank off real draw-off rather than a rule of thumb, then
 * shows the reheat time — which is the number that actually decides
 * whether a household runs out of hot water.
 *
 * THE MODEL
 *
 * 1. A shower head runs at a total flow rate (default 9 L/min). That's a
 *    MIX of stored hot and cold. At a comfortable ~41 °C mixed from
 *    60 °C stored and 15 °C mains, the hot fraction is ~5 L of every
 *    9 L — the rest is cold. So the tank only gives up ~5 L/min, which
 *    is why a 270 L tank serves far more than 270 L ÷ 9 of showering.
 *
 *    We derive the hot fraction properly from the three temperatures
 *    rather than hardcoding 5/9, so changing any of them stays honest:
 *
 *      hotFraction = (mixed − cold) / (hot − cold)
 *
 *    At the defaults that lands on (41−15)/(60−15) = 0.578 → 5.2 L/min
 *    hot out of 9 L/min total, matching the 5 L hot / 4 L cold rule.
 *
 * 2. Usable capacity is less than nameplate. Stratification means you
 *    can't draw the tank to the last drop before the outlet goes cold —
 *    ~80% is the accepted usable figure.
 *
 * 3. Reheat time comes from the energy needed to lift a full tank from
 *    mains to setpoint, divided by the heat pump's heat output:
 *
 *      energy (kWh) = litres × 4.186 kJ/kg·K × ΔT ÷ 3600
 *      hours        = energy ÷ heatOutputKw
 *
 *    Heat output = electrical input × COP. A 1 kW-input CO₂ unit at
 *    COP 4.5 delivers 4.5 kW of heat.
 *
 * Deliberately conservative: no solar-gain assumptions, no diversity
 * factor across household members. If the numbers say it's tight, it's
 * tight.
 */

export function HeatPumpSizing() {
  const [form, setForm] = useState<Form>(DEFAULTS);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const r = useMemo(() => sizeHousehold(form), [form]);

  const n = (v: number, d = 0) =>
    v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const hrs = (v: number) => (v < 1 ? `${n(v * 60)} min` : `${n(v, 1)} hrs`);

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Your household</h2>

        <div className="tool-field">
          <label htmlFor="am">
            Showering in the morning: <strong>{form.morningPeople}</strong>
          </label>
          <input id="am" type="range" min="0" max="8" step="1"
            value={form.morningPeople}
            onChange={(e) => set("morningPeople", parseInt(e.target.value))} />
          <small>People showering inside a {r.runHours} hour window before work.</small>
        </div>

        <div className="tool-field">
          <label htmlFor="pm">
            Showering in the evening: <strong>{form.eveningPeople}</strong>
          </label>
          <input id="pm" type="range" min="0" max="8" step="1"
            value={form.eveningPeople}
            onChange={(e) => set("eveningPeople", parseInt(e.target.value))} />
          <small>People showering inside a {r.runHours} hour window after work.</small>
        </div>

        <div className="tool-field">
          <label htmlFor="mins">Shower length (min)</label>
          <input id="mins" type="number" min="5" max="30" step="1"
            value={form.showerMinutes}
            onChange={(e) => set("showerMinutes", parseFloat(e.target.value) || 15)} />
          <small>
            10 minutes is the working number. Set it higher if your household
            runs long ones, it changes the tank size fast.
          </small>
        </div>

        <div className="tool-field">
          <label htmlFor="kw">Heating capacity (kW)</label>
          <select id="kw" value={form.heatKw} onChange={(e) => set("heatKw", parseFloat(e.target.value))}>
            <option value={2.5}>2.5 kW · standard Reclaim, Thermann, iStore 180</option>
            <option value={4}>4 kW · iStore 270, Panasonic 4 kW</option>
            <option value={5}>5 kW · Reclaim 215 / 315</option>
            <option value={6}>6 kW · Panasonic, fastest recovery</option>
          </select>
          <small>
            This changes the tank size as much as your household does. The
            compressor is running while people shower, so a stronger one
            needs less stored water behind it.
          </small>
        </div>

        <h2 style={{ marginTop: 24 }}>Compare two systems</h2>
        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="sysA">System A</label>
            <select id="sysA" value={form.systemA} onChange={(e) => set("systemA", e.target.value)}>
              {SYSTEMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="tool-field">
            <label htmlFor="sysB">System B</label>
            <select id="sysB" value={form.systemB} onChange={(e) => set("systemB", e.target.value)}>
              {SYSTEMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>

        <details className="tool-adv">
          <summary>Advanced settings</summary>
          <p className="tool-adv__note">
            Defaults are what we&rsquo;d quote on. Change them if you know your
            own numbers, mains runs colder in the hills, and COP moves with
            the unit.
          </p>

          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="mains">Cold mains inlet (°C)</label>
              <input id="mains" type="number" min="5" max="25" step="1"
                value={form.mainsTempC}
                onChange={(e) => set("mainsTempC", parseFloat(e.target.value) || 15)} />
              <small>Melbourne winter sits 12-15. Summer 18-22.</small>
            </div>
            <div className="tool-field">
              <label htmlFor="tank">Tank setpoint (°C)</label>
              <input id="tank" type="number" min="50" max="70" step="1"
                value={form.tankTempC}
                onChange={(e) => set("tankTempC", parseFloat(e.target.value) || 60)} />
              <small>60 minimum by law, Legionella control.</small>
            </div>
          </div>

          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="mixed">Shower temp (°C)</label>
              <input id="mixed" type="number" min="35" max="50" step="0.5"
                value={form.mixedTempC}
                onChange={(e) => set("mixedTempC", parseFloat(e.target.value) || 41)} />
              <small>Comfortable is 40-42.</small>
            </div>
            <div className="tool-field">
              <label htmlFor="flow">Shower flow (L/min)</label>
              <input id="flow" type="number" min="4" max="20" step="0.5"
                value={form.showerFlowLpm}
                onChange={(e) => set("showerFlowLpm", parseFloat(e.target.value) || 9)} />
              <small>3-star head ≈ 9. Old unrestricted heads hit 15-20.</small>
            </div>
          </div>

          <div className="tool-field__row">
            <div className="tool-field">
              <label htmlFor="other">Other hot water / day (L)</label>
              <input id="other" type="number" min="0" max="200" step="5"
                value={form.otherLitresPerDay}
                onChange={(e) => set("otherLitresPerDay", parseFloat(e.target.value) || 0)} />
              <small>Basins, kitchen, laundry.</small>
            </div>
            <div className="tool-field">
              <label htmlFor="gap">Hours between runs</label>
              <input id="gap" type="number" min="2" max="16" step="1"
                value={form.gapHours}
                onChange={(e) => set("gapHours", parseFloat(e.target.value) || 9)} />
              <small>Morning to evening, the tank&rsquo;s reheat window.</small>
            </div>
          </div>

          <p className="tool-adv__note">
            COP is set per system in the comparison below rather than here, so
            each unit is judged on its own figure instead of one shared guess.
          </p>
        </details>
      </div>

      <div className="page-tool__result">
        <h2>Tank size you need</h2>
        <div className="tool-rec">
          <div className="tool-rec__lead">Recommended heat pump</div>
          <div className="tool-rec__big">
            {r.recommended.litres} L <span className="tool-rec__kw">+ {form.heatKw} kW</span>
          </div>
          <div className="tool-rec__models">{r.recommended.models}</div>
        </div>
        <p className="tool-result__sub">
          Your busiest run pulls <strong>{n(r.peakSessionHot)} L</strong> over about{" "}
          {n(r.drawHours * 60)} minutes. The {form.heatKw} kW compressor makes{" "}
          <strong>{n(r.madeDuringRun)} L</strong> of that while people are still
          showering, so the tank only has to hold <strong>{n(r.mustBeStored)} L</strong>.
          Allowing for the 80% a tank gives up before the outlet runs cool, plus
          a fifth again for a guest, a bath or a cold July, that&rsquo;s{" "}
          {r.recommended.litres} L on the wall.
        </p>

        <div className="tool-pair">
          <div className="tool-pair__lbl">Tank and compressor trade off</div>
          <div className="tool-pair__row">
            {r.pairings.map((p) => (
              <div key={p.kw} className={`tool-pair__cell${p.kw === form.heatKw ? " is-active" : ""}`}>
                <strong>{p.kw} kW</strong>
                <span>{p.tank ? `${p.tank} L` : "over 400 L"}</span>
              </div>
            ))}
          </div>
          <p className="tool-pair__note">
            Same household either way. A bigger compressor puts water back
            faster, so it needs less stored behind it; a bigger tank lets a
            smaller compressor keep up. Which one is better value depends on
            the price difference on the day.
          </p>
        </div>

        {r.exceedsRange && (
          <div className="hps-verdict is-tight" style={{ marginTop: 14 }}>
            <strong>Bigger than one tank</strong>
            <span>
              That run needs about {n(r.requiredLitres)} L of storage, more than the
              largest single tank we install. The usual answer is two tanks plumbed
              in series, or staggering the showers so the run splits in two. Worth a
              call rather than a calculator.
            </span>
          </div>
        )}

        <div className="hps-picks">
          <div className="hps-picks__lbl">Systems we install at this size</div>
          <div className="hps-picks__row">
            {r.picks.map((pk) => (
              <Link key={pk.href} href={pk.href} className="hps-pick">{pk.label} →</Link>
            ))}
          </div>
          {r.alsoFine && (
            <p className="hps-picks__also">
              A <Link href={r.alsoFine.href}>{r.alsoFine.label}</Link> also covers this
              comfortably. 285 and 270 are one rung apart, and 15 litres isn&rsquo;t worth
              buying up a size for.
            </p>
          )}
        </div>

        <div className="hps-delivery">
          <div className="hps-delivery__lbl">What that actually delivers</div>
          <div className="hps-delivery__big">
            {n(r.showersFromTank, 1)} showers <span>back to back, before any reheat</span>
          </div>
          <p className="hps-delivery__note">
            {n(r.usableCapacity)} L of usable 60 °C water blends with about{" "}
            <strong>{n(r.coldBlendedIn)} L</strong> of cold to make{" "}
            <strong>{n(r.deliveredMixed)} L</strong> at shower temperature. Each{" "}
            {form.showerMinutes} minute shower takes {n(r.hotPerShower)} L out of the tank
, {n(r.hotLpm, 1)} L a minute hot, {n(r.coldLpm, 1)} L cold.
          </p>
        </div>

        <div className="hps-sessions">
          <div className="hps-sessions__grid">
            <div className="hps-session">
              <span className="hps-session__when">Morning</span>
              <strong>{n(r.morningHot)} L</strong>
              <span className="hps-session__sub">{form.morningPeople} showers</span>
            </div>
            <div className="hps-session hps-session--gap">
              <span className="hps-session__when">{r.gapHours} hr gap</span>
              <strong>reheat</strong>
              <span className="hps-session__sub">tank refills</span>
            </div>
            <div className="hps-session">
              <span className="hps-session__when">Evening</span>
              <strong>{n(r.eveningHot)} L</strong>
              <span className="hps-session__sub">{form.eveningPeople} showers</span>
            </div>
          </div>
          <p className="hps-sessions__note">
            Sizing runs off the bigger run, not the {n(r.totalHotPerDay)} L daily total.
            The gap between them is long enough for the tank to come all the way
            back, which is why a house of four doesn&rsquo;t need a tank that holds
            the whole day at once.
          </p>
        </div>

        <div className="hps-vs">
          <div className="hps-vs__lbl">Head to head, on your numbers</div>
          <div className="hps-vs__grid">
            {r.compare.map((c, i) => (
              <div key={`${c.id}-${i}`} className={`hps-vs__card${c.keepsUp ? " is-ok" : " is-tight"}`}>
                <h3>{c.name}</h3>
                <div className={`hps-vs__badge${c.keepsUp ? " is-ok" : " is-tight"}`}>
                  {c.keepsUp ? "Keeps up" : "Struggles"}
                </div>
                <dl className="hps-vs__rows">
                  <div><dt>Showers on tap</dt><dd>{n(c.showers, 1)}</dd></div>
                  <div><dt>Recovery</dt><dd>{n(c.litresPerHour)} L/hr</dd></div>
                  <div><dt>Full reheat</dt><dd>{hrs(c.fullReheatHrs)}</dd></div>
                  <div><dt>Back after the morning</dt><dd>{hrs(c.recoverHrs)}</dd></div>
                  <div><dt>Busiest run</dt><dd>{c.handlesPeak ? "covered" : "short"}</dd></div>
                  <div><dt>Ready by evening</dt><dd>{c.readyPm ? "yes" : "no"}</dd></div>
                </dl>
                <p className="hps-vs__note">{c.note}</p>
                {!c.verified && (
                  <p className="hps-vs__unverified">
                    Heat output is a working estimate, confirm against the datasheet
                    before quoting off it.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="hps-vs__foot">
            Compressor size is a recovery-speed decision, not a capacity one. A 6 kW
            Panasonic reheats in roughly half the time of the 4 kW, which only matters
            when the gap between runs is short, with a long morning-to-evening gap the
            4 kW gets there just as comfortably and costs less. All-in-one units add a
            boost mode that forces a full reheat on demand, covering the houseful-of-guests
            weekend without paying for a bigger compressor all year.
          </p>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Quote me this size →</Link>
          <Link href="/tools/hot-water-savings" className="ds-btn ds-btn--ghost">
            Now work out the savings →
          </Link>
        </div>

        <p className="tool-result__note">
          Estimate only. Real sizing also depends on whether you have a bath, two
          showers running at once, pipe runs, and how cold the mains actually runs
          at your address in July. We check all of it on the site visit.
        </p>
      </div>
    </div>
  );
}

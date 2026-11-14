"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "@/components/homepage/tools/calc-a.css";
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

const HEAT_KW: { v: number; l: string; s: string }[] = [
  { v: 2.5, l: "2.5 kW", s: "Standard Reclaim, Thermann, iStore 180" },
  { v: 4, l: "4 kW", s: "iStore 275, Panasonic 4 kW" },
  { v: 5, l: "5 kW", s: "Reclaim 215 / 315" },
  { v: 6, l: "6 kW", s: "Panasonic, fastest recovery" },
];

/** − value +, for a number the user may also type. */
function Stepper({ id, value, step, min, max, onChange, unit }: {
  id: string; value: number; step: number; min: number; max: number; unit?: string; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="ca__step">
      <button type="button" aria-label={`Less${unit ? `, ${unit}` : ""}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>−</button>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <button type="button" aria-label={`More${unit ? `, ${unit}` : ""}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>+</button>
    </div>
  );
}

/** A rounded number field for the advanced settings. */
function Field({ id, label, hint, value, min, max, step, fallback, unit, onChange }: {
  id: string; label: string; hint: string; value: number; min: number; max: number; step: number; fallback: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="ca__row">
      <label className="ca__q" htmlFor={id}>{label}</label>
      <div className="ca__field">
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || fallback)} />
        <em>{unit}</em>
      </div>
      <p className="ca__hint">{hint}</p>
    </div>
  );
}

export function HeatPumpSizing() {
  const [form, setForm] = useState<Form>(DEFAULTS);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const r = useMemo(() => sizeHousehold(form), [form]);

  const n = (v: number, d = 0) =>
    v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const hrs = (v: number) => (v < 1 ? `${n(v * 60)} min` : `${n(v, 1)} hrs`);

  return (
    <div className="ca">
      <div className="ca__card ca__in">
        <h2 className="ca__h">Your household</h2>

        <div className="ca__pair">
          <div className="ca__row">
            <label className="ca__q" htmlFor="am">Showering in the morning</label>
            <Stepper id="am" value={form.morningPeople} step={1} min={0} max={8} unit="people" onChange={(v) => set("morningPeople", Number.isFinite(v) ? Math.round(v) : 0)} />
          </div>
          <div className="ca__row">
            <label className="ca__q" htmlFor="pm">Showering in the evening</label>
            <Stepper id="pm" value={form.eveningPeople} step={1} min={0} max={8} unit="people" onChange={(v) => set("eveningPeople", Number.isFinite(v) ? Math.round(v) : 0)} />
          </div>
        </div>
        <p className="ca__hint" style={{ marginTop: -10 }}>People showering inside a {r.runHours} hour window before work, and after it.</p>

        <div className="ca__row">
          <label className="ca__q" htmlFor="mins">Shower length (min)</label>
          <Stepper id="mins" value={form.showerMinutes} step={1} min={5} max={30} unit="minutes" onChange={(v) => set("showerMinutes", v || 15)} />
          <p className="ca__hint">
            10 minutes is the working number. Set it higher if your household
            runs long ones, it changes the tank size fast.
          </p>
        </div>

        <div className="ca__row">
          <span className="ca__q" id="kw">Heating capacity (kW)</span>
          <div className="ca__choices" role="group" aria-labelledby="kw">
            {HEAT_KW.map((o) => (
              <button key={o.v} type="button" className="ca__choice" aria-pressed={form.heatKw === o.v} onClick={() => set("heatKw", o.v)}>
                <i aria-hidden="true" /><span><strong>{o.l}</strong><small>{o.s}</small></span>
              </button>
            ))}
          </div>
          <p className="ca__hint">
            This changes the tank size as much as your household does. The
            compressor is running while people shower, so a stronger one
            needs less stored water behind it.
          </p>
        </div>

        <div className="ca__sec">
          <h3>Compare two systems</h3>
          <div className="ca__pair">
            <div className="ca__row">
              <label className="ca__q" htmlFor="sysA">System A</label>
              <div className="ca__field">
                <select id="sysA" value={form.systemA} onChange={(e) => set("systemA", e.target.value)}>
                  {SYSTEMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>
            <div className="ca__row">
              <label className="ca__q" htmlFor="sysB">System B</label>
              <div className="ca__field">
                <select id="sysB" value={form.systemB} onChange={(e) => set("systemB", e.target.value)}>
                  {SYSTEMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <details className="ca__adv">
          <summary>Advanced settings</summary>
          <div className="ca__advin">
            <p className="ca__hint">
              Defaults are what we&rsquo;d quote on. Change them if you know your
              own numbers, mains runs colder in the hills, and COP moves with
              the unit.
            </p>
            <div className="ca__pair">
              <Field id="mains" label="Cold mains inlet" unit="°C" value={form.mainsTempC} min={5} max={25} step={1} fallback={15}
                hint="Melbourne winter sits 12-15. Summer 18-22." onChange={(v) => set("mainsTempC", v)} />
              <Field id="tank" label="Tank setpoint" unit="°C" value={form.tankTempC} min={50} max={70} step={1} fallback={60}
                hint="60 minimum by law, Legionella control." onChange={(v) => set("tankTempC", v)} />
            </div>
            <div className="ca__pair">
              <Field id="mixed" label="Shower temp" unit="°C" value={form.mixedTempC} min={35} max={50} step={0.5} fallback={41}
                hint="Comfortable is 40-42." onChange={(v) => set("mixedTempC", v)} />
              <Field id="flow" label="Shower flow" unit="L/min" value={form.showerFlowLpm} min={4} max={20} step={0.5} fallback={9}
                hint="3-star head ≈ 9. Old unrestricted heads hit 15-20." onChange={(v) => set("showerFlowLpm", v)} />
            </div>
            <div className="ca__pair">
              <Field id="other" label="Other hot water / day" unit="L" value={form.otherLitresPerDay} min={0} max={200} step={5} fallback={0}
                hint="Basins, kitchen, laundry." onChange={(v) => set("otherLitresPerDay", v)} />
              <Field id="gap" label="Hours between runs" unit="hrs" value={form.gapHours} min={2} max={16} step={1} fallback={9}
                hint="Morning to evening, the tank’s reheat window." onChange={(v) => set("gapHours", v)} />
            </div>
            <p className="ca__hint">
              COP is set per system in the comparison below rather than here, so
              each unit is judged on its own figure instead of one shared guess.
            </p>
          </div>
        </details>
      </div>

      <div className="ca__card ca__sum" aria-live="polite">
        <span className="ca__lbl">Tank size you need · recommended heat pump</span>
        <div className="ca__big">{r.recommended.litres}<small> L + {form.heatKw} kW</small></div>
        <p className="ca__tag">{r.recommended.models}</p>
      </div>

      <div className="ca__card ca__det">
        <p className="ca__sub">
          Your busiest run pulls <strong>{n(r.peakSessionHot)} L</strong> over about{" "}
          {n(r.drawHours * 60)} minutes. The {form.heatKw} kW compressor makes{" "}
          <strong>{n(r.madeDuringRun)} L</strong> of that while people are still
          showering, so the tank only has to hold <strong>{n(r.mustBeStored)} L</strong>.
          Allowing for the 80% a tank gives up before the outlet runs cool, plus
          a fifth again for a guest, a bath or a cold July, that&rsquo;s{" "}
          {r.recommended.litres} L on the wall.
        </p>

        {r.exceedsRange && (
          <div className="ca__fit ca__fit--tight">
            <i aria-hidden="true">!</i>
            <p>
              <strong>Bigger than one tank</strong>
              That run needs about {n(r.requiredLitres)} L of storage, more than the
              largest single tank we install. The usual answer is two tanks plumbed
              in series, or staggering the showers so the run splits in two. Worth a
              call rather than a calculator.
            </p>
          </div>
        )}

        <div className="ca__sec">
          <span className="ca__q">Tank and compressor trade off</span>
          <div className="ca__cells">
            {r.pairings.map((p) => (
              <div key={p.kw} className={`ca__cell${p.kw === form.heatKw ? " is-on" : ""}`}>
                {p.kw === form.heatKw && <em>Your pick</em>}
                <strong>{p.kw} kW</strong>
                <span>{p.tank ? `${p.tank} L` : "over 400 L"}</span>
              </div>
            ))}
          </div>
          <p className="ca__hint">
            Same household either way. A bigger compressor puts water back
            faster, so it needs less stored behind it; a bigger tank lets a
            smaller compressor keep up. Which one is better value depends on
            the price difference on the day.
          </p>
        </div>

        <div className="ca__sec">
          <span className="ca__q">Systems we install at this size</span>
          <div className="ca__links">
            {r.picks.map((pk) => (
              <Link key={pk.href} href={pk.href}>{pk.label} →</Link>
            ))}
          </div>
          {r.alsoFine && (
            <p className="ca__hint">
              A <Link href={r.alsoFine.href}>{r.alsoFine.label}</Link> also covers this
              comfortably. 285 and 270 are one rung apart, and 15 litres isn&rsquo;t worth
              buying up a size for.
            </p>
          )}
        </div>

        <div className="ca__sec">
          <span className="ca__q">What that actually delivers</span>
          <div className="ca__big" style={{ fontSize: "clamp(34px,4vw,48px)" }}>
            {n(r.showersFromTank, 1)}<small> showers back to back, before any reheat</small>
          </div>
          <p className="ca__hint">
            {n(r.usableCapacity)} L of usable 60 °C water blends with about{" "}
            <strong>{n(r.coldBlendedIn)} L</strong> of cold to make{" "}
            <strong>{n(r.deliveredMixed)} L</strong> at shower temperature. Each{" "}
            {form.showerMinutes} minute shower takes {n(r.hotPerShower)} L out of the tank, {n(r.hotLpm, 1)} L a minute hot, {n(r.coldLpm, 1)} L cold.
          </p>
        </div>

        <div className="ca__sec">
          <div className="ca__cells ca__cells--3">
            <div className="ca__cell">
              <em>Morning</em>
              <strong>{n(r.morningHot)} L</strong>
              <span>{form.morningPeople} showers</span>
            </div>
            <div className="ca__cell ca__cell--gap">
              <em>{r.gapHours} hr gap</em>
              <strong>reheat</strong>
              <span>tank refills</span>
            </div>
            <div className="ca__cell">
              <em>Evening</em>
              <strong>{n(r.eveningHot)} L</strong>
              <span>{form.eveningPeople} showers</span>
            </div>
          </div>
          <p className="ca__hint">
            Sizing runs off the bigger run, not the {n(r.totalHotPerDay)} L daily total.
            The gap between them is long enough for the tank to come all the way
            back, which is why a house of four doesn&rsquo;t need a tank that holds
            the whole day at once.
          </p>
        </div>

        <div className="ca__sec">
          <span className="ca__q">Head to head, on your numbers</span>
          <div className="ca__vs">
            {r.compare.map((c, i) => (
              <div key={`${c.id}-${i}`} className="ca__vsc">
                <h3>{c.name}</h3>
                <span className={`ca__badge${c.keepsUp ? "" : " ca__badge--tight"}`}>
                  <i aria-hidden="true">{c.keepsUp ? "✓" : "!"}</i>{c.keepsUp ? "Keeps up" : "Struggles"}
                </span>
                <dl className="ca__maths">
                  <div><dt>Showers on tap</dt><dd>{n(c.showers, 1)}</dd></div>
                  <div><dt>Recovery</dt><dd>{n(c.litresPerHour)} L/hr</dd></div>
                  <div><dt>Full reheat</dt><dd>{hrs(c.fullReheatHrs)}</dd></div>
                  <div><dt>Back after the morning</dt><dd>{hrs(c.recoverHrs)}</dd></div>
                  <div><dt>Busiest run</dt><dd>{c.handlesPeak ? "covered" : "short"}</dd></div>
                  <div><dt>Ready by evening</dt><dd>{c.readyPm ? "yes" : "no"}</dd></div>
                </dl>
                <p className="ca__hint">{c.note}</p>
                {!c.verified && (
                  <p className="ca__note">
                    Heat output is a working estimate, confirm against the datasheet
                    before quoting off it.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="ca__hint">
            Compressor size is a recovery-speed decision, not a capacity one. A 6 kW
            Panasonic reheats in roughly half the time of the 4 kW, which only matters
            when the gap between runs is short, with a long morning-to-evening gap the
            4 kW gets there just as comfortably and costs less. All-in-one units add a
            boost mode that forces a full reheat on demand, covering the houseful-of-guests
            weekend without paying for a bigger compressor all year.
          </p>
        </div>

        <div className="ca__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat">Quote me this size →</Link>
          <Link href="/tools/hot-water-savings" className="abtn abtn--ghost">Now work out the savings →</Link>
        </div>

        <p className="ca__note">
          Estimate only. Real sizing also depends on whether you have a bath, two
          showers running at once, pipe runs, and how cold the mains actually runs
          at your address in July. We check all of it on the site visit.
        </p>
      </div>
    </div>
  );
}

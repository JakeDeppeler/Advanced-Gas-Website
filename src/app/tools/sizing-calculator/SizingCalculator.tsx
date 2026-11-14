"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "@/components/homepage/tools/calc-a.css";

/**
 * Residential aircon-sizing calculator. Client-only — the inputs
 * change the result live without a page reload.
 *
 * Formula: base 150 W/m² (Melbourne climate, standard 2.4m ceiling)
 * adjusted for ceiling height, orientation, insulation, glazing and
 * occupants. Output is a cooling-capacity band in kW and the closest
 * standard model size we install (2.5 / 3.5 / 5.0 / 7.0 / 8.0 kW).
 */

const BASE_LOAD_W_PER_M2 = 150;

const STANDARD_MODEL_SIZES_KW = [2.5, 3.5, 5.0, 7.1, 8.0, 9.4, 10.5, 12.5, 14, 16] as const;

const ORIENTATION_FACTOR: Record<string, number> = {
  N: 1.00,   // North-facing, moderate sun
  NE: 1.05,
  E: 1.05,   // Morning sun
  SE: 1.00,
  S: 0.95,   // South-facing, coolest
  SW: 1.10,
  W: 1.15,   // Afternoon sun, hottest
  NW: 1.10,
};

const INSULATION_FACTOR: Record<string, number> = {
  well: 1.00,       // Post-2005 build with proper insulation and double-glazing
  standard: 1.10,   // Typical 90s brick veneer, insulated ceiling, single glaze
  poor: 1.25,       // Older weatherboard, no ceiling insulation, big single-glaze windows
};

const GLAZING_FACTOR: Record<string, number> = {
  small: 1.00,      // Windows <10% of wall area
  medium: 1.10,     // 10-20%
  large: 1.20,      // >20%, feature windows, sliding doors
};

type FormState = {
  length: number;
  width: number;
  ceiling: number;
  orientation: keyof typeof ORIENTATION_FACTOR;
  insulation: keyof typeof INSULATION_FACTOR;
  glazing: keyof typeof GLAZING_FACTOR;
  occupants: number;
};

const DEFAULTS: FormState = {
  length: 5,
  width: 4,
  ceiling: 2.4,
  orientation: "N",
  insulation: "standard",
  glazing: "medium",
  occupants: 2,
};

const ORIENTATIONS: { v: FormState["orientation"]; l: string; hint: string }[] = [
  { v: "N", l: "North", hint: "North (moderate sun)" },
  { v: "NE", l: "NE", hint: "North-east" },
  { v: "E", l: "East", hint: "East (morning sun)" },
  { v: "SE", l: "SE", hint: "South-east" },
  { v: "S", l: "South", hint: "South (coolest)" },
  { v: "SW", l: "SW", hint: "South-west" },
  { v: "W", l: "West", hint: "West (harsh afternoon sun)" },
  { v: "NW", l: "NW", hint: "North-west" },
];
const INSULATIONS: { v: FormState["insulation"]; l: string; s: string }[] = [
  { v: "well", l: "Well insulated", s: "New build, double-glazed" },
  { v: "standard", l: "Standard", s: "90s brick veneer, single glaze" },
  { v: "poor", l: "Poorly insulated", s: "Older weatherboard, no ceiling batts" },
];
const GLAZINGS: { v: FormState["glazing"]; l: string; s: string }[] = [
  { v: "small", l: "Small windows", s: "Less than 10% of walls" },
  { v: "medium", l: "Standard windows", s: "10-20%" },
  { v: "large", l: "Large windows / sliding doors", s: "More than 20%" },
];

/** − value +, for a number the user may also type. */
function Stepper({ id, value, step, min, max, dp = 0, onChange, unit }: {
  id: string; value: number; step: number; min: number; max: number; dp?: number; unit?: string; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <div className="ca__step">
      <button type="button" aria-label={`Less${unit ? `, ${unit}` : ""}`} disabled={value <= min} onClick={() => onChange(+clamp(value - step).toFixed(dp))}>−</button>
      <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      <button type="button" aria-label={`More${unit ? `, ${unit}` : ""}`} disabled={value >= max} onClick={() => onChange(+clamp(value + step).toFixed(dp))}>+</button>
    </div>
  );
}

export function SizingCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const result = useMemo(() => {
    const area = Math.max(0, form.length * form.width);
    const ceilingBoost = form.ceiling > 2.4
      ? 1 + Math.min(0.25, ((form.ceiling - 2.4) / 0.3) * 0.05)
      : 1;
    const orientation = ORIENTATION_FACTOR[form.orientation] ?? 1;
    const insulation = INSULATION_FACTOR[form.insulation] ?? 1;
    const glazing = GLAZING_FACTOR[form.glazing] ?? 1;
    const occupantsExtraW = Math.max(0, form.occupants - 2) * 120;

    const baseW = area * BASE_LOAD_W_PER_M2 * ceilingBoost * orientation * insulation * glazing;
    const totalW = baseW + occupantsExtraW;
    const totalKw = totalW / 1000;

    // Band: -10% for average day / +15% for heat-wave headroom.
    const minKw = Math.max(0, totalKw * 0.90);
    const maxKw = totalKw * 1.15;

    const recommended = STANDARD_MODEL_SIZES_KW.find((s) => s >= totalKw) ?? STANDARD_MODEL_SIZES_KW[STANDARD_MODEL_SIZES_KW.length - 1];

    return {
      area,
      totalKw,
      minKw,
      maxKw,
      recommended,
      ceilingBoost,
      orientation,
      insulation,
      glazing,
      occupantsExtraW,
    };
  }, [form]);

  const ori = ORIENTATIONS.find((o) => o.v === form.orientation);
  const kw = result.recommended.toString().replace(".0", "");

  return (
    <div className="ca">
      <div className="ca__card ca__in">
        <h2 className="ca__h">Room details</h2>

        <div className="ca__pair">
          <div className="ca__row">
            <label className="ca__q" htmlFor="len">Length (m)</label>
            <Stepper id="len" value={form.length} step={0.5} min={1} max={30} dp={1} unit="metres" onChange={(v) => update("length", v)} />
          </div>
          <div className="ca__row">
            <label className="ca__q" htmlFor="wid">Width (m)</label>
            <Stepper id="wid" value={form.width} step={0.5} min={1} max={30} dp={1} unit="metres" onChange={(v) => update("width", v)} />
          </div>
        </div>

        <div className="ca__row">
          <label className="ca__q" htmlFor="ceil">Ceiling height (m)</label>
          <Stepper id="ceil" value={form.ceiling} step={0.1} min={2} max={6} dp={1} unit="metres" onChange={(v) => update("ceiling", v || 2.4)} />
          <p className="ca__hint">Standard 2.4 m. Rake ceilings and double-height rooms need more.</p>
        </div>

        <div className="ca__row">
          <span className="ca__q" id="ori">Orientation (main window)</span>
          <div className="ca__opts" role="group" aria-labelledby="ori">
            {ORIENTATIONS.map((o) => (
              <button key={o.v} type="button" aria-pressed={form.orientation === o.v} aria-label={o.hint} onClick={() => update("orientation", o.v)}>{o.l}</button>
            ))}
          </div>
          <p className="ca__hint">{ori?.hint}</p>
        </div>

        <div className="ca__row">
          <span className="ca__q" id="ins">Insulation</span>
          <div className="ca__choices" role="group" aria-labelledby="ins">
            {INSULATIONS.map((o) => (
              <button key={o.v} type="button" className="ca__choice" aria-pressed={form.insulation === o.v} onClick={() => update("insulation", o.v)}>
                <i aria-hidden="true" /><span><strong>{o.l}</strong><small>{o.s}</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="ca__row">
          <span className="ca__q" id="glz">Window area vs wall area</span>
          <div className="ca__choices" role="group" aria-labelledby="glz">
            {GLAZINGS.map((o) => (
              <button key={o.v} type="button" className="ca__choice" aria-pressed={form.glazing === o.v} onClick={() => update("glazing", o.v)}>
                <i aria-hidden="true" /><span><strong>{o.l}</strong><small>{o.s}</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="ca__row">
          <label className="ca__q" htmlFor="occ">Typical occupants</label>
          <Stepper id="occ" value={form.occupants} step={1} min={1} max={20} unit="people" onChange={(v) => update("occupants", Math.round(v) || 1)} />
          <p className="ca__hint">Each person above 2 adds ~120 W of body heat.</p>
        </div>
      </div>

      <div className="ca__card ca__sum" aria-live="polite">
        <span className="ca__lbl">Recommended size · cooling capacity</span>
        <div className="ca__big">{result.minKw.toFixed(1)}–{result.maxKw.toFixed(1)}<small> kW</small></div>
        <p className="ca__tag">Closest standard model: <b>{kw}&nbsp;kW</b> split system</p>
      </div>

      <div className="ca__card ca__det">
        <p className="ca__sub">
          For a <strong>{result.area.toFixed(1)}&nbsp;m²</strong> room, the closest standard model size is a
          <strong> {kw}&nbsp;kW</strong> split system.
        </p>

        <dl className="ca__maths" aria-label="How it's worked out">
          <div><dt>Base heat load</dt><dd>{Math.round(result.area * BASE_LOAD_W_PER_M2)} W</dd></div>
          <div><dt>Ceiling adj.</dt><dd>×{result.ceilingBoost.toFixed(2)}</dd></div>
          <div><dt>Orientation adj.</dt><dd>×{result.orientation.toFixed(2)}</dd></div>
          <div><dt>Insulation adj.</dt><dd>×{result.insulation.toFixed(2)}</dd></div>
          <div><dt>Glazing adj.</dt><dd>×{result.glazing.toFixed(2)}</dd></div>
          <div><dt>Occupant boost</dt><dd>+{result.occupantsExtraW} W</dd></div>
          <div className="ca__total"><dt>Design load</dt><dd>{result.totalKw.toFixed(2)} kW</dd></div>
        </dl>

        <div className="ca__ctas">
          <Link href="/quote" className="abtn abtn--or abtn--flat">Get a quote for this room →</Link>
          <Link href="/brands" className="abtn abtn--ghost">See models at {result.recommended}&nbsp;kW →</Link>
        </div>

        <p className="ca__note">
          Heads-up: this is a residential heat-load estimator for a single room. Multi-head, ducted
          and commercial spaces need a room-by-room load calc, we do those on quote day.
        </p>
      </div>
    </div>
  );
}

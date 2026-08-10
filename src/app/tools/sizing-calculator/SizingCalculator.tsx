"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  N: 1.00,   // North-facing — moderate sun
  NE: 1.05,
  E: 1.05,   // Morning sun
  SE: 1.00,
  S: 0.95,   // South-facing — coolest
  SW: 1.10,
  W: 1.15,   // Afternoon sun — hottest
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
  large: 1.20,      // >20% — feature windows, sliding doors
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

  return (
    <div className="page-tool__grid">
      <div className="page-tool__form">
        <h2>Room details</h2>

        <div className="tool-field__row">
          <div className="tool-field">
            <label htmlFor="len">Length (m)</label>
            <input
              id="len"
              type="number"
              min="1"
              max="30"
              step="0.1"
              value={form.length}
              onChange={(e) => update("length", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="wid">Width (m)</label>
            <input
              id="wid"
              type="number"
              min="1"
              max="30"
              step="0.1"
              value={form.width}
              onChange={(e) => update("width", parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label htmlFor="ceil">Ceiling height (m)</label>
          <input
            id="ceil"
            type="number"
            min="2"
            max="6"
            step="0.1"
            value={form.ceiling}
            onChange={(e) => update("ceiling", parseFloat(e.target.value) || 2.4)}
          />
          <small>Standard 2.4 m. Rake ceilings and double-height rooms need more.</small>
        </div>

        <div className="tool-field">
          <label htmlFor="ori">Orientation (main window)</label>
          <select
            id="ori"
            value={form.orientation}
            onChange={(e) => update("orientation", e.target.value as FormState["orientation"])}
          >
            <option value="N">North (moderate sun)</option>
            <option value="NE">North-east</option>
            <option value="E">East (morning sun)</option>
            <option value="SE">South-east</option>
            <option value="S">South (coolest)</option>
            <option value="SW">South-west</option>
            <option value="W">West (harsh afternoon sun)</option>
            <option value="NW">North-west</option>
          </select>
        </div>

        <div className="tool-field">
          <label htmlFor="ins">Insulation</label>
          <select
            id="ins"
            value={form.insulation}
            onChange={(e) => update("insulation", e.target.value as FormState["insulation"])}
          >
            <option value="well">Well insulated (new build, double-glazed)</option>
            <option value="standard">Standard (90s brick veneer, single glaze)</option>
            <option value="poor">Poorly insulated (older weatherboard, no ceiling batts)</option>
          </select>
        </div>

        <div className="tool-field">
          <label htmlFor="glz">Window area vs wall area</label>
          <select
            id="glz"
            value={form.glazing}
            onChange={(e) => update("glazing", e.target.value as FormState["glazing"])}
          >
            <option value="small">Small windows (&lt;10% of walls)</option>
            <option value="medium">Standard windows (10-20%)</option>
            <option value="large">Large windows / sliding doors (&gt;20%)</option>
          </select>
        </div>

        <div className="tool-field">
          <label htmlFor="occ">Typical occupants</label>
          <input
            id="occ"
            type="number"
            min="1"
            max="20"
            step="1"
            value={form.occupants}
            onChange={(e) => update("occupants", parseInt(e.target.value) || 1)}
          />
          <small>Each person above 2 adds ~120 W of body heat.</small>
        </div>
      </div>

      <div className="page-tool__result">
        <h2>Recommended size</h2>
        <div className="tool-result__lead">Cooling capacity</div>
        <div className="tool-result__big">
          {result.minKw.toFixed(1)}–{result.maxKw.toFixed(1)} kW
        </div>
        <p className="tool-result__sub">
          For a <strong>{result.area.toFixed(1)}&nbsp;m²</strong> room, the closest standard model size is a
          <strong> {result.recommended.toString().replace(".0", "")}&nbsp;kW</strong> split system.
        </p>

        <div className="tool-result__breakdown">
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Base heat load</span>
            <span className="tool-result__row-val">{Math.round(result.area * BASE_LOAD_W_PER_M2)} W</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Ceiling adj.</span>
            <span className="tool-result__row-val">×{result.ceilingBoost.toFixed(2)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Orientation adj.</span>
            <span className="tool-result__row-val">×{result.orientation.toFixed(2)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Insulation adj.</span>
            <span className="tool-result__row-val">×{result.insulation.toFixed(2)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Glazing adj.</span>
            <span className="tool-result__row-val">×{result.glazing.toFixed(2)}</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Occupant boost</span>
            <span className="tool-result__row-val">+{result.occupantsExtraW} W</span>
          </div>
          <div className="tool-result__row">
            <span className="tool-result__row-lbl">Design load</span>
            <span className="tool-result__row-val">{result.totalKw.toFixed(2)} kW</span>
          </div>
        </div>

        <div className="tool-result__cta">
          <Link href="/quote" className="ds-btn ds-btn--orange">Get a fixed quote for this room →</Link>
          <Link href="/brands" className="ds-btn ds-btn--ghost">See models at {result.recommended}&nbsp;kW →</Link>
        </div>

        <p className="tool-result__note">
          Heads-up: this is a residential heat-load estimator for a single room. Multi-head, ducted
          and commercial spaces need a room-by-room load calc, we do those on quote day.
        </p>
      </div>
    </div>
  );
}

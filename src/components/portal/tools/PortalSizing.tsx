"use client";

import { useMemo, useState } from "react";
import { FIXED, SIZING_DEFAULTS, SYSTEMS, sizeHousehold, type SizingForm } from "@/lib/tools/hotWaterSizing";

/** The four compressor sizes we fit, as the design lists them. */
const CAPS = [
  { kw: 2.5, models: "Reclaim, Thermann, iStore 180" },
  { kw: 4, models: "iStore 270, Panasonic 4 kW" },
  { kw: 5, models: "Reclaim 215 / 315" },
  { kw: 6, models: "Panasonic, fastest recovery" },
];

function Stepper({ label, hint, value, shown, min, max, onChange }: {
  label: string; hint: string; value: number; shown: string; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="ptl-step">
      <span><strong>{label}</strong><em>{hint}</em></span>
      <span className="ptl-step__ctl">
        <button type="button" aria-label={`Fewer — ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-live="polite">{shown}</output>
        <button type="button" aria-label={`More — ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </span>
    </div>
  );
}

/**
 * Heat pump sizing, the portal's version — Tools.dc.html's sizing tab.
 *
 * The same model as the public calculator (lib/tools/hotWaterSizing), with
 * the design's controls: steppers for the household, a card per compressor,
 * and the busiest window on navy beside it. The answer to "will it cover
 * them" is the two systems being compared, worked out, not a placeholder.
 */
export function PortalSizing() {
  // The design compares the two Reclaims by default; the public page starts on an iStore.
  const [form, setForm] = useState<SizingForm>({ ...SIZING_DEFAULTS, systemB: "reclaim-co2-315" });
  const set = <K extends keyof SizingForm>(k: K, v: SizingForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const r = useMemo(() => sizeHousehold(form), [form]);

  // What the busiest run actually draws through the shower heads, mixed.
  const drawoff = Math.max(form.morningPeople, form.eveningPeople) * form.showerMinutes * FIXED.showerFlowLpm;
  const [a, b] = r.compare;
  const covers = a.keepsUp && b.keepsUp ? "Yes — both do"
    : a.keepsUp ? `Only the ${a.name}`
      : b.keepsUp ? `Only the ${b.name}`
        : "Neither — go a size up";

  return (
    <div className="ptl-grid">
      <section className="ptl-card">
        <h2>The household</h2>
        <Stepper label="Showering in the morning" hint="Inside a 2-hour window before work" value={form.morningPeople} shown={String(form.morningPeople)} min={0} max={8} onChange={(n) => set("morningPeople", n)} />
        <Stepper label="Showering in the evening" hint="Inside a 2-hour window after work" value={form.eveningPeople} shown={String(form.eveningPeople)} min={0} max={8} onChange={(n) => set("eveningPeople", n)} />
        <Stepper label="Shower length" hint="10 minutes is the working number" value={form.showerMinutes} shown={`${form.showerMinutes} min`} min={3} max={25} onChange={(n) => set("showerMinutes", n)} />
        <div className="ptl-caps">
          <span>Heating capacity</span>
          <div role="group" aria-label="Heating capacity">
            {CAPS.map((c) => (
              <button key={c.kw} type="button" aria-pressed={form.heatKw === c.kw} className={form.heatKw === c.kw ? "is-on" : undefined} onClick={() => set("heatKw", c.kw)}>
                <strong>{c.kw} kW</strong><span>{c.models}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="ptl-navy ptl-sticky">
        <span className="ptl-navy__k">Busiest 2-hour window</span>
        <strong className="ptl-navy__big">{Math.round(drawoff)} L</strong>
        <span className="ptl-navy__k">of showering, at about {FIXED.showerFlowLpm} L a minute</span>
        <div className="ptl-navy__cmp">
          <span>Compare two systems</span>
          <select aria-label="System A" value={form.systemA} onChange={(e) => set("systemA", e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select aria-label="System B" value={form.systemB} onChange={(e) => set("systemB", e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="ptl-navy__ans">Covers the window? <strong>{covers}</strong></span>
          <span className="ptl-navy__k">
            Smallest that does it at {form.heatKw} kW: {r.exceedsRange ? "more than one tank" : `${r.recommended.litres} L · ${r.recommended.models}`}
          </span>
        </div>
      </aside>
    </div>
  );
}

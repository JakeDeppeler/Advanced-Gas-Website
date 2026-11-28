"use client";

import { useMemo, useState } from "react";
import { FIXED, SIZING_DEFAULTS, SYSTEMS, sizeHousehold, type SizingForm } from "@/lib/tools/hotWaterSizing";
import { PanelHead, Select, Stepper } from "./Fields";

/** The four compressor sizes we fit, as the design lists them. */
const CAPS = [
  { kw: 2.5, models: "Reclaim, Thermann, iStore 180" },
  { kw: 4, models: "iStore 275, Panasonic 4 kW" },
  { kw: 5, models: "Reclaim 215 / 315" },
  { kw: 6, models: "Panasonic, fastest recovery" },
];

/**
 * Heat pump sizing, the portal's version — Tools.dc.html's sizing tab.
 *
 * The same model as the public calculator (lib/tools/hotWaterSizing), with
 * steppers for the household, a card per compressor, and the busiest window
 * on the forest card beside it, as the Daily tools page has its first tile.
 * The answer to "will it cover them" is the two systems being compared,
 * worked out, not a placeholder.
 */
export function PortalSizing() {
  // The design compares the two Reclaims by default; the public page starts on an iStore.
  const [form, setForm] = useState<SizingForm>({ ...SIZING_DEFAULTS, systemB: "reclaim-co2-315" });
  const set = <K extends keyof SizingForm>(k: K, v: SizingForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const r = useMemo(() => sizeHousehold(form), [form]);

  // What the busiest run actually draws through the shower heads, mixed.
  const drawoff = Math.max(form.morningPeople, form.eveningPeople) * form.showerMinutes * FIXED.showerFlowLpm;
  const [a, b] = r.compare;
  const covers = a.keepsUp && b.keepsUp ? "Yes, both do"
    : a.keepsUp ? `Only the ${a.name}`
      : b.keepsUp ? `Only the ${b.name}`
        : "Neither, go a size up";

  return (
    <div className="tt-grid">
      <section className="rp-panel rp-card tt-form" aria-labelledby="tt-sz-h">
        <PanelHead id="tt-sz-h" title="The household" note="Who showers when, and for how long" />
        <Stepper label="Showering in the morning" hint="Inside a 2-hour window before work" value={form.morningPeople} shown={String(form.morningPeople)} min={0} max={8} onChange={(n) => set("morningPeople", n)} />
        <Stepper label="Showering in the evening" hint="Inside a 2-hour window after work" value={form.eveningPeople} shown={String(form.eveningPeople)} min={0} max={8} onChange={(n) => set("eveningPeople", n)} />
        <Stepper label="Shower length" hint="10 minutes is the working number" value={form.showerMinutes} shown={`${form.showerMinutes} min`} min={3} max={25} onChange={(n) => set("showerMinutes", n)} />
        <div className="tt-caps">
          <span className="tt-lab">Heating capacity</span>
          <div role="group" aria-label="Heating capacity">
            {CAPS.map((c) => {
              const on = form.heatKw === c.kw;
              return (
                <button key={c.kw} type="button" aria-pressed={on} className={on ? "tt-opt is-on" : "tt-opt"} onClick={() => set("heatKw", c.kw)}>
                  <b>{c.kw} kW</b><span>{c.models}</span>
                  {on && <i className="tt-tick" aria-hidden="true">✓</i>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="tt-answer tt-sticky" aria-label="The answer">
        <span className="tt-k">Busiest 2-hour window</span>
        <strong className="tt-big">{Math.round(drawoff)} L</strong>
        <span className="tt-k tt-k--soft">of showering, at about {FIXED.showerFlowLpm} L a minute</span>
        <div className="tt-cmp">
          <span className="tt-k">Compare two systems</span>
          <Select aria-label="System A" value={form.systemA} onChange={(e) => set("systemA", e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select aria-label="System B" value={form.systemB} onChange={(e) => set("systemB", e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <span className="tt-ans">Covers the window? <b>{covers}</b></span>
          <span className="tt-k tt-k--soft">
            Smallest that does it at {form.heatKw} kW: {r.exceedsRange ? "more than one tank" : `${r.recommended.litres} L · ${r.recommended.models}`}
          </span>
        </div>
      </aside>
    </div>
  );
}

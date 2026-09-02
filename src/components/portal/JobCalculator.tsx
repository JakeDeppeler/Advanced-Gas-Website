"use client";

import { useState } from "react";
import { LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";

export type CrewRate = { id: string; name: string; level: CrewLevel; rate: number };

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

export function JobCalculator({ crew }: { crew: CrewRate[] }) {
  const [sel, setSel] = useState<Record<string, number>>({});
  const [manualRate, setManualRate] = useState(0);
  const [manualHrs, setManualHrs] = useState(0);
  const [materials, setMaterials] = useState(0);
  const [markup, setMarkup] = useState(20);

  const toggle = (id: string, on: boolean) => setSel((s) => {
    const next = { ...s };
    if (on) next[id] = next[id] ?? 4; else delete next[id];
    return next;
  });
  const setHrs = (id: string, h: number) => setSel((s) => ({ ...s, [id]: h }));

  const lines = crew.filter((c) => sel[c.id] !== undefined).map((c) => ({ ...c, hrs: sel[c.id] || 0, total: c.rate * (sel[c.id] || 0) }));
  const crewLabour = lines.reduce((a, l) => a + l.total, 0);
  const manualLabour = manualRate * manualHrs;
  const labour = crewLabour + manualLabour;
  const mat = materials * (1 + markup / 100);
  const subtotal = labour + mat;
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  return (
    <div className="pt-calc">
      <div className="pt-calc__inputs">
        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Who&rsquo;s on the job</h3>
          {crew.length === 0 ? (
            <p className="pt-calc__hint">No crew rates yet — set each person&rsquo;s level and numbers in <strong>Finance → Billable capacity</strong> and they&rsquo;ll show here. In the meantime, use the manual line below.</p>
          ) : (
            <div className="pt-job__crew">
              {crew.map((c) => {
                const on = sel[c.id] !== undefined;
                return (
                  <div key={c.id} className={`pt-job__row${on ? " is-on" : ""}`}>
                    <label className="pt-job__pick">
                      <input type="checkbox" checked={on} onChange={(e) => toggle(c.id, e.target.checked)} />
                      <span className="pt-job__who"><strong>{c.name}</strong><span>{LEVEL_LABEL[c.level]} · {money(c.rate)}/hr</span></span>
                    </label>
                    {on && (
                      <span className="pt-job__hrs">
                        <input type="number" min="0" step="0.5" value={sel[c.id]} onChange={(e) => setHrs(c.id, parse(e.target.value))} />
                        <span>hrs</span>
                        <strong>{money(c.rate * (sel[c.id] || 0))}</strong>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Extra labour <em style={{ fontWeight: 400, color: "var(--pt-ink-3)" }}>(subbie or manual)</em></h3>
          <div className="pt-calc__row"><span>Rate</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={manualRate} onChange={(e) => setManualRate(parse(e.target.value))} /><span className="pt-calc__post">/hr</span></span></div>
          <div className="pt-calc__row"><span>Hours</span><span className="pt-calc__field"><input type="number" min="0" step="0.5" value={manualHrs} onChange={(e) => setManualHrs(parse(e.target.value))} /><span className="pt-calc__post">hrs</span></span></div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Materials</h3>
          <div className="pt-calc__row"><span>Materials (your cost)</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={materials} onChange={(e) => setMaterials(parse(e.target.value))} /></span></div>
          <div className="pt-calc__row"><span>Materials markup</span><span className="pt-calc__field"><input type="number" min="0" value={markup} onChange={(e) => setMarkup(parse(e.target.value))} /><span className="pt-calc__post">%</span></span></div>
        </div>
      </div>

      <div className="pt-calc__result">
        <div className="pt-calc__result-lead">Price for this job (inc GST)</div>
        <div className="pt-calc__big">{money(total)}</div>
        <div className="pt-calc__breakdown">
          {lines.map((l) => (
            <div key={l.id}><span>{l.name} ({l.hrs} hrs)</span><strong>{money(l.total)}</strong></div>
          ))}
          {manualLabour > 0 && <div><span>Extra labour ({manualHrs} hrs)</span><strong>{money(manualLabour)}</strong></div>}
          <div className="pt-calc__break-total"><span>Labour</span><strong>{money(labour)}</strong></div>
          <div><span>Materials + {markup}%</span><strong>{money(mat)}</strong></div>
          <div><span>GST 10%</span><strong>{money(gst)}</strong></div>
        </div>
        <div className="pt-calc__charge">
          <span>Total (inc GST)</span>
          <strong>{money(total)}</strong>
        </div>
        <p className="pt-calc__note">Each person prices at their charge-out rate from Billable capacity. A ballpark to quote from — confirm the final number on a written quote.</p>
      </div>
    </div>
  );
}

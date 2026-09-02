"use client";

import { useEffect, useMemo, useState } from "react";

type Crew = {
  id: string; label: string; people: number; hrsWeek: number; wage: number;
  leaveDays: number; phDays: number; sickDays: number; schoolDays: number;
  travelHrsWeek: number; adminHrsWeek: number;
};

type Model = {
  weeksYear: number; oncosts: number; margin: number;
  crew: Crew[];
  officeWages: number; vehicles: number; standard: number;
};

const KEY = "ag_capacity_model";

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hrs = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const uid = () => Math.random().toString(36).slice(2, 8);
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

const DEFAULT: Model = {
  weeksYear: 52, oncosts: 25, margin: 40,
  crew: [
    { id: uid(), label: "Tradesman", people: 2, hrsWeek: 38, wage: 45, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 5, adminHrsWeek: 2 },
    { id: uid(), label: "Apprentice", people: 1, hrsWeek: 38, wage: 22, leaveDays: 20, phDays: 11, sickDays: 6, schoolDays: 40, travelHrsWeek: 4, adminHrsWeek: 1 },
  ],
  officeWages: 70000, vehicles: 24000, standard: 60000,
};

// Module-scope field component so inputs keep focus across re-renders.
function CapField({ label, value, onChange, post, ready }: { label: string; value: number; onChange: (n: number) => void; post?: string; ready: boolean }) {
  return (
    <label className="pt-cap__f">
      <span>{label}</span>
      <span className="pt-calc__field">
        <input type="number" min="0" value={ready ? value : ""} onChange={(e) => onChange(parse(e.target.value))} />
        {post && <span className="pt-calc__post">{post}</span>}
      </span>
    </label>
  );
}

function calcCrew(c: Crew, weeksYear: number, oncosts: number) {
  const hrsPerDay = c.hrsWeek / 5;
  const paidHrs = c.people * c.hrsWeek * weeksYear;
  const offDays = c.leaveDays + c.phDays + c.sickDays + c.schoolDays;
  const nonBillHrs = c.people * (offDays * hrsPerDay + (c.travelHrsWeek + c.adminHrsWeek) * weeksYear);
  const billHrs = Math.max(0, paidHrs - nonBillHrs);
  const rate = c.wage * (1 + oncosts / 100);
  const wageCost = paidHrs * rate;
  const nonBillWageCost = nonBillHrs * rate;
  return { paidHrs, billHrs, nonBillHrs, wageCost, nonBillWageCost, billWageCost: wageCost - nonBillWageCost };
}

export function CapacityCalc() {
  const [m, setM] = useState<Model>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setM({ ...DEFAULT, ...JSON.parse(s) });
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
  }, [m, ready]);

  const totals = useMemo(() => {
    const per = m.crew.map((c) => calcCrew(c, m.weeksYear, m.oncosts));
    const billHrs = per.reduce((s, p) => s + p.billHrs, 0);
    const paidHrs = per.reduce((s, p) => s + p.paidHrs, 0);
    const crewWages = per.reduce((s, p) => s + p.wageCost, 0);
    const labourOverhead = per.reduce((s, p) => s + p.nonBillWageCost, 0);
    const billWages = crewWages - labourOverhead;
    const totalCost = crewWages + m.officeWages + m.vehicles + m.standard;
    const denom = billHrs || 1;
    const layers = [
      { key: "wages", label: "Field wages (billable time)", annual: billWages },
      { key: "labour", label: "Labour overhead (school, sick, travel, admin)", annual: labourOverhead },
      { key: "office", label: "Office & non-billable staff", annual: m.officeWages },
      { key: "vehicles", label: "Vehicles", annual: m.vehicles },
      { key: "standard", label: "Standard (tools, marketing, rent…)", annual: m.standard },
    ].map((l) => ({ ...l, perHr: l.annual / denom }));
    const costPerHr = totalCost / denom;
    const chargeOut = costPerHr * (1 + m.margin / 100);
    const utilisation = paidHrs ? billHrs / paidHrs : 0;
    return { billHrs, paidHrs, crewWages, labourOverhead, billWages, totalCost, costPerHr, chargeOut, utilisation, layers };
  }, [m]);

  const setCrew = (id: string, patch: Partial<Crew>) => setM((s) => ({ ...s, crew: s.crew.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <div className="pt-calc">
      <div className="pt-calc__inputs">
        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Settings</h3>
          <div className="pt-cap__row3">
            <CapField label="Weeks / year" value={m.weeksYear} onChange={(v) => setM({ ...m, weeksYear: v })} ready={ready} />
            <CapField label="On-costs (super etc.)" value={m.oncosts} onChange={(v) => setM({ ...m, oncosts: v })} post="%" ready={ready} />
            <CapField label="Margin" value={m.margin} onChange={(v) => setM({ ...m, margin: v })} post="%" ready={ready} />
          </div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Billable crew</h3>
          <p className="pt-calc__hint">Paid hours minus the time you can&rsquo;t bill — leave, sick, apprentice school, driving and admin.</p>
          {m.crew.map((c) => {
            const cc = calcCrew(c, m.weeksYear, m.oncosts);
            return (
              <div key={c.id} className="pt-cap__crew">
                <div className="pt-cap__crewhead">
                  <input className="pt-cap__name" value={c.label} onChange={(e) => setCrew(c.id, { label: e.target.value })} placeholder="Role" />
                  <button type="button" className="pf-x" onClick={() => setM((s) => ({ ...s, crew: s.crew.filter((x) => x.id !== c.id) }))} aria-label="Remove">×</button>
                </div>
                <div className="pt-cap__grid">
                  <CapField label="People" value={c.people} onChange={(v) => setCrew(c.id, { people: v })} ready={ready} />
                  <CapField label="Hours / week" value={c.hrsWeek} onChange={(v) => setCrew(c.id, { hrsWeek: v })} ready={ready} />
                  <CapField label="Wage $/hr" value={c.wage} onChange={(v) => setCrew(c.id, { wage: v })} ready={ready} />
                  <CapField label="Leave (days)" value={c.leaveDays} onChange={(v) => setCrew(c.id, { leaveDays: v })} ready={ready} />
                  <CapField label="Pub. hols (days)" value={c.phDays} onChange={(v) => setCrew(c.id, { phDays: v })} ready={ready} />
                  <CapField label="Sick (days)" value={c.sickDays} onChange={(v) => setCrew(c.id, { sickDays: v })} ready={ready} />
                  <CapField label="School (days)" value={c.schoolDays} onChange={(v) => setCrew(c.id, { schoolDays: v })} ready={ready} />
                  <CapField label="Driving hrs/wk" value={c.travelHrsWeek} onChange={(v) => setCrew(c.id, { travelHrsWeek: v })} ready={ready} />
                  <CapField label="Admin hrs/wk" value={c.adminHrsWeek} onChange={(v) => setCrew(c.id, { adminHrsWeek: v })} ready={ready} />
                </div>
                <div className="pt-cap__crewsum">
                  <span>Billable: <strong>{hrs(cc.billHrs)}</strong> of {hrs(cc.paidHrs)} paid</span>
                  <span>Wages: <strong>{money(cc.wageCost)}</strong></span>
                </div>
              </div>
            );
          })}
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setM((s) => ({ ...s, crew: [...s.crew, { id: uid(), label: "New role", people: 1, hrsWeek: 38, wage: 40, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 4, adminHrsWeek: 2 }] }))}>+ Add a role</button>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">The other overheads (per year)</h3>
          <p className="pt-calc__hint">Everything that isn&rsquo;t field-crew wages, recovered across the billable hours above.</p>
          <div className="pt-calc__row"><span>Office &amp; non-billable staff <em>(admin, scheduling)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? m.officeWages : ""} onChange={(e) => setM({ ...m, officeWages: parse(e.target.value) })} /></span></div>
          <div className="pt-calc__row"><span>Vehicles <em>(rego, insurance, fuel, servicing)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? m.vehicles : ""} onChange={(e) => setM({ ...m, vehicles: parse(e.target.value) })} /></span></div>
          <div className="pt-calc__row"><span>Standard <em>(tools, marketing, rent, software)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? m.standard : ""} onChange={(e) => setM({ ...m, standard: parse(e.target.value) })} /></span></div>
        </div>
      </div>

      <div className="pt-calc__result">
        <div className="pt-calc__result-lead">Charge-out rate to break even + margin</div>
        <div className="pt-calc__big">{money(totals.chargeOut)}<span> /hr</span></div>

        <div className="pt-calc__breakdown">
          <div><span>Billable hours / year</span><strong>{hrs(totals.billHrs)}</strong></div>
          <div><span>Utilisation</span><strong>{Math.round(totals.utilisation * 100)}%</strong></div>
          <div className="pt-calc__break-total"><span>Cost per billable hour</span><strong>{money2(totals.costPerHr)}</strong></div>
        </div>

        <div className="pt-cap__layers">
          <div className="pt-cap__layers-h">What makes up the hour</div>
          {totals.layers.map((l) => (
            <div key={l.key} className="pt-cap__layer">
              <span className="pt-cap__layer-lbl">{l.label}</span>
              <span className="pt-cap__layer-val">{money2(l.perHr)}</span>
            </div>
          ))}
          <div className="pt-cap__layer pt-cap__layer--total"><span className="pt-cap__layer-lbl">Cost / billable hour</span><span className="pt-cap__layer-val">{money2(totals.costPerHr)}</span></div>
        </div>

        <div className="pt-calc__charge">
          <span>Charge at {m.margin}% margin</span>
          <strong>{money(totals.chargeOut)}<em> /hr</em></strong>
        </div>
        <p className="pt-calc__note">Total to recover: {money(totals.totalCost)}/yr across {hrs(totals.billHrs)} billable. Saved to this browser — ask me to make it shared across the team when you&rsquo;re ready.</p>
      </div>
    </div>
  );
}

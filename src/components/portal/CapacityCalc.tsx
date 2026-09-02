"use client";

import { useEffect, useMemo, useState } from "react";

type PersonType = "tradesman" | "lead" | "apprentice" | "hybrid" | "office";

type Person = {
  id: string; name: string; type: PersonType; hrsWeek: number; wage: number;
  leaveDays: number; phDays: number; sickDays: number; schoolDays: number;
  travelHrsWeek: number; adminHrsWeek: number; officeHrsWeek: number;
};

type Model = {
  weeksYear: number; oncosts: number; margin: number;
  people: Person[];
  vehicles: number; standard: number;
};

const KEY = "ag_capacity_model_v2";

const TYPE_LABELS: Record<PersonType, string> = {
  tradesman: "Tradesman", lead: "Lead hand", apprentice: "Apprentice", hybrid: "Hybrid (field + office)", office: "Office / admin",
};

// Sensible starting numbers per type; picking a type applies these.
const TYPE_DEFAULTS: Record<PersonType, Omit<Person, "id" | "name" | "type">> = {
  tradesman: { hrsWeek: 38, wage: 45, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 5, adminHrsWeek: 2, officeHrsWeek: 0 },
  lead: { hrsWeek: 38, wage: 55, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 4, adminHrsWeek: 5, officeHrsWeek: 3 },
  apprentice: { hrsWeek: 38, wage: 22, leaveDays: 20, phDays: 11, sickDays: 6, schoolDays: 40, travelHrsWeek: 4, adminHrsWeek: 1, officeHrsWeek: 0 },
  hybrid: { hrsWeek: 38, wage: 45, leaveDays: 20, phDays: 11, sickDays: 5, schoolDays: 0, travelHrsWeek: 3, adminHrsWeek: 3, officeHrsWeek: 15 },
  office: { hrsWeek: 38, wage: 35, leaveDays: 20, phDays: 11, sickDays: 6, schoolDays: 0, travelHrsWeek: 0, adminHrsWeek: 0, officeHrsWeek: 38 },
};

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hrs = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const uid = () => Math.random().toString(36).slice(2, 8);
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

const DEFAULT: Model = {
  weeksYear: 52, oncosts: 25, margin: 40,
  people: [
    { id: uid(), name: "Tradesman", type: "tradesman", ...TYPE_DEFAULTS.tradesman },
    { id: uid(), name: "Apprentice", type: "apprentice", ...TYPE_DEFAULTS.apprentice },
    { id: uid(), name: "Office", type: "office", ...TYPE_DEFAULTS.office },
  ],
  vehicles: 24000, standard: 60000,
};

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

function calcPerson(p: Person, weeksYear: number, oncosts: number) {
  const rate = p.wage * (1 + oncosts / 100);
  const paidHrs = p.hrsWeek * weeksYear;
  if (p.type === "office") {
    return { paidHrs, billHrs: 0, fieldWages: 0, labourOh: 0, officeOh: paidHrs * rate };
  }
  const hrsPerDay = p.hrsWeek / 5;
  const daysOffHrs = (p.leaveDays + p.phDays + p.sickDays + p.schoolDays) * hrsPerDay;
  const travelAdminHrs = (p.travelHrsWeek + p.adminHrsWeek) * weeksYear;
  const officeHrs = Math.min(p.officeHrsWeek * weeksYear, Math.max(0, paidHrs - daysOffHrs));
  const billHrs = Math.max(0, paidHrs - daysOffHrs - travelAdminHrs - officeHrs);
  return { paidHrs, billHrs, fieldWages: billHrs * rate, labourOh: (daysOffHrs + travelAdminHrs) * rate, officeOh: officeHrs * rate };
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
    const per = m.people.map((p) => calcPerson(p, m.weeksYear, m.oncosts));
    const billHrs = per.reduce((s, p) => s + p.billHrs, 0);
    const fieldWages = per.reduce((s, p) => s + p.fieldWages, 0);
    const labourOh = per.reduce((s, p) => s + p.labourOh, 0);
    const officeOh = per.reduce((s, p) => s + p.officeOh, 0);
    const denom = billHrs || 1;
    const paidBillableHrs = m.people.reduce((s, p, i) => s + (p.type === "office" ? 0 : per[i].paidHrs), 0);
    const layers = [
      { key: "wages", label: "Field wages (billable time)", annual: fieldWages },
      { key: "labour", label: "Labour overhead (school, sick, travel, admin)", annual: labourOh },
      { key: "office", label: "Office & non-billable staff", annual: officeOh },
      { key: "vehicles", label: "Vehicles", annual: m.vehicles },
      { key: "standard", label: "Standard (tools, marketing, rent…)", annual: m.standard },
    ].map((l) => ({ ...l, perHr: l.annual / denom }));
    const totalCost = fieldWages + labourOh + officeOh + m.vehicles + m.standard;
    const costPerHr = totalCost / denom;
    const chargeOut = costPerHr * (1 + m.margin / 100);
    const utilisation = paidBillableHrs ? billHrs / paidBillableHrs : 0;
    return { billHrs, totalCost, costPerHr, chargeOut, utilisation, layers };
  }, [m]);

  const setPerson = (id: string, patch: Partial<Person>) => setM((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const changeType = (id: string, type: PersonType) => setM((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, type, ...TYPE_DEFAULTS[type] } : p)) }));

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
          <h3 className="pt-calc__h">The crew</h3>
          <p className="pt-calc__hint">One row per person. Their type sets how their time is treated — a tradesman is billable, an apprentice has school, office is all overhead, a hybrid splits their week.</p>
          {m.people.map((p) => {
            const cc = calcPerson(p, m.weeksYear, m.oncosts);
            const isOffice = p.type === "office";
            return (
              <div key={p.id} className="pt-cap__crew">
                <div className="pt-cap__crewhead">
                  <input className="pt-cap__name" value={p.name} onChange={(e) => setPerson(p.id, { name: e.target.value })} placeholder="Name" />
                  <select className="pt-cap__type" value={p.type} onChange={(e) => changeType(p.id, e.target.value as PersonType)}>
                    {(Object.keys(TYPE_LABELS) as PersonType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                  <button type="button" className="pf-x" onClick={() => setM((s) => ({ ...s, people: s.people.filter((x) => x.id !== p.id) }))} aria-label="Remove">×</button>
                </div>
                <div className="pt-cap__grid">
                  <CapField label="Hours / week" value={p.hrsWeek} onChange={(v) => setPerson(p.id, { hrsWeek: v })} ready={ready} />
                  <CapField label="Wage $/hr" value={p.wage} onChange={(v) => setPerson(p.id, { wage: v })} ready={ready} />
                  {!isOffice && <CapField label="Leave (days)" value={p.leaveDays} onChange={(v) => setPerson(p.id, { leaveDays: v })} ready={ready} />}
                  {!isOffice && <CapField label="Pub. hols (days)" value={p.phDays} onChange={(v) => setPerson(p.id, { phDays: v })} ready={ready} />}
                  {!isOffice && <CapField label="Sick (days)" value={p.sickDays} onChange={(v) => setPerson(p.id, { sickDays: v })} ready={ready} />}
                  {p.type === "apprentice" && <CapField label="School (days)" value={p.schoolDays} onChange={(v) => setPerson(p.id, { schoolDays: v })} ready={ready} />}
                  {!isOffice && <CapField label="Driving hrs/wk" value={p.travelHrsWeek} onChange={(v) => setPerson(p.id, { travelHrsWeek: v })} ready={ready} />}
                  {!isOffice && <CapField label="Admin hrs/wk" value={p.adminHrsWeek} onChange={(v) => setPerson(p.id, { adminHrsWeek: v })} ready={ready} />}
                  {p.type === "hybrid" && <CapField label="Office hrs/wk" value={p.officeHrsWeek} onChange={(v) => setPerson(p.id, { officeHrsWeek: v })} ready={ready} />}
                </div>
                <div className="pt-cap__crewsum">
                  {isOffice ? (
                    <span>All hours are non-billable — <strong>{money(cc.officeOh)}</strong>/yr of office overhead</span>
                  ) : (
                    <>
                      <span>Billable: <strong>{hrs(cc.billHrs)}</strong></span>
                      <span>Field wages <strong>{money(cc.fieldWages)}</strong> · overhead <strong>{money(cc.labourOh + cc.officeOh)}</strong></span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setM((s) => ({ ...s, people: [...s.people, { id: uid(), name: "New person", type: "tradesman", ...TYPE_DEFAULTS.tradesman }] }))}>+ Add a person</button>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">The other overheads (per year)</h3>
          <p className="pt-calc__hint">Office &amp; non-billable staff come from the crew above. Add the rest here.</p>
          <div className="pt-calc__row"><span>Vehicles <em>(rego, insurance, fuel, servicing)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? m.vehicles : ""} onChange={(e) => setM({ ...m, vehicles: parse(e.target.value) })} /></span></div>
          <div className="pt-calc__row"><span>Standard <em>(tools, marketing, rent, software)</em></span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={ready ? m.standard : ""} onChange={(e) => setM({ ...m, standard: parse(e.target.value) })} /></span></div>
        </div>
      </div>

      <div className="pt-calc__result">
        <div className="pt-calc__result-lead">Charge-out rate to break even + margin</div>
        <div className="pt-calc__big">{money(totals.chargeOut)}<span> /hr</span></div>

        <div className="pt-calc__breakdown">
          <div><span>Billable hours / year</span><strong>{hrs(totals.billHrs)}</strong></div>
          <div><span>Field utilisation</span><strong>{Math.round(totals.utilisation * 100)}%</strong></div>
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

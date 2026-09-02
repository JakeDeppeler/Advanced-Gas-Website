"use client";

import { useMemo, useState } from "react";

/**
 * Overhead-recovery / charge-out rate calculator.
 *
 * A general-purpose version of the classic trades sum: total annual
 * overheads ÷ the hours you can actually bill = the overhead you have to
 * recover on every billable hour before you've made a cent. Add labour cost
 * and a target margin and it gives a charge-out rate.
 *
 * The inputs and the exact formula are meant to be swapped for Jake's own
 * overhead tool — this is the working shell to drop those numbers into.
 */

const money = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

const OVERHEAD_FIELDS = [
  { key: "premises", label: "Premises / rent & outgoings" },
  { key: "vehicles", label: "Vehicles, fuel & maintenance" },
  { key: "insurance", label: "Insurance (PL, vehicle, tools)" },
  { key: "adminWages", label: "Admin & office wages" },
  { key: "software", label: "Software & subscriptions" },
  { key: "marketing", label: "Marketing & advertising" },
  { key: "toolsEquip", label: "Tools & equipment" },
  { key: "accounting", label: "Accounting, licences & fees" },
  { key: "other", label: "Other overheads" },
] as const;

type OverheadKey = (typeof OVERHEAD_FIELDS)[number]["key"];

const DEFAULT_OVERHEADS: Record<OverheadKey, number> = {
  premises: 24000,
  vehicles: 32000,
  insurance: 14000,
  adminWages: 65000,
  software: 6000,
  marketing: 18000,
  toolsEquip: 9000,
  accounting: 7000,
  other: 6000,
};

function num(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function OverheadCalc() {
  const [oh, setOh] = useState<Record<OverheadKey, string>>(
    Object.fromEntries(OVERHEAD_FIELDS.map((f) => [f.key, String(DEFAULT_OVERHEADS[f.key])])) as Record<OverheadKey, string>,
  );
  const [techs, setTechs] = useState("3");
  const [weeks, setWeeks] = useState("46");
  const [hoursWeek, setHoursWeek] = useState("38");
  const [util, setUtil] = useState("75");
  const [labour, setLabour] = useState("42");
  const [margin, setMargin] = useState("15");

  const r = useMemo(() => {
    const totalOverhead = OVERHEAD_FIELDS.reduce((s, f) => s + num(oh[f.key]), 0);
    const billableHours = num(techs) * num(weeks) * num(hoursWeek) * (num(util) / 100);
    const ohPerHour = billableHours > 0 ? totalOverhead / billableHours : 0;
    const labourCost = num(labour);
    const costPerHour = labourCost + ohPerHour;
    const m = Math.min(Math.max(num(margin), 0), 95) / 100;
    const chargeOut = m < 1 ? costPerHour / (1 - m) : costPerHour;
    return { totalOverhead, billableHours, ohPerHour, labourCost, costPerHour, chargeOut };
  }, [oh, techs, weeks, hoursWeek, util, labour, margin]);

  return (
    <div className="pt-calc">
      <div className="pt-calc__inputs">
        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">1 · Annual overheads</h3>
          <p className="pt-calc__hint">Everything the business pays whether or not a job runs.</p>
          {OVERHEAD_FIELDS.map((f) => (
            <label key={f.key} className="pt-calc__row">
              <span>{f.label}</span>
              <span className="pt-calc__field">
                <span className="pt-calc__pre">$</span>
                <input
                  inputMode="numeric"
                  value={oh[f.key]}
                  onChange={(e) => setOh((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </span>
            </label>
          ))}
          <div className="pt-calc__subtotal">
            <span>Total annual overhead</span>
            <strong>{money(r.totalOverhead)}</strong>
          </div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">2 · Billable capacity</h3>
          <p className="pt-calc__hint">Hours you can actually invoice — after leave, travel, quoting and downtime.</p>
          <label className="pt-calc__row"><span>Field techs</span><span className="pt-calc__field"><input inputMode="numeric" value={techs} onChange={(e) => setTechs(e.target.value)} /></span></label>
          <label className="pt-calc__row"><span>Weeks worked / year</span><span className="pt-calc__field"><input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></span></label>
          <label className="pt-calc__row"><span>Paid hours / week each</span><span className="pt-calc__field"><input inputMode="numeric" value={hoursWeek} onChange={(e) => setHoursWeek(e.target.value)} /></span></label>
          <label className="pt-calc__row"><span>Billable utilisation</span><span className="pt-calc__field"><input inputMode="numeric" value={util} onChange={(e) => setUtil(e.target.value)} /><span className="pt-calc__post">%</span></span></label>
          <div className="pt-calc__subtotal">
            <span>Billable hours / year</span>
            <strong>{Math.round(r.billableHours).toLocaleString("en-AU")} hrs</strong>
          </div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">3 · Rate</h3>
          <p className="pt-calc__hint">Add the average cost of an hour on the tools and the margin you want to make.</p>
          <label className="pt-calc__row"><span>Labour cost / hour (all-in)</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input inputMode="numeric" value={labour} onChange={(e) => setLabour(e.target.value)} /></span></label>
          <label className="pt-calc__row"><span>Target net margin</span><span className="pt-calc__field"><input inputMode="numeric" value={margin} onChange={(e) => setMargin(e.target.value)} /><span className="pt-calc__post">%</span></span></label>
        </div>
      </div>

      <aside className="pt-calc__result">
        <div className="pt-calc__result-lead">Overhead to recover, per billable hour</div>
        <div className="pt-calc__big">{money(r.ohPerHour)}<span>/hr</span></div>
        <div className="pt-calc__breakdown">
          <div><span>Labour cost / hr</span><strong>{money(r.labourCost)}</strong></div>
          <div><span>+ Overhead / hr</span><strong>{money(r.ohPerHour)}</strong></div>
          <div className="pt-calc__break-total"><span>= True cost / hr</span><strong>{money(r.costPerHour)}</strong></div>
        </div>
        <div className="pt-calc__charge">
          <span>Charge-out rate at {num(margin)}% margin</span>
          <strong>{money(r.chargeOut)}<em>/hr</em></strong>
        </div>
        <p className="pt-calc__note">
          Below the true-cost figure you&rsquo;re losing money on the hour before parts. This is the general version — send through your own overhead sheet and I&rsquo;ll wire your exact line items and formula in.
        </p>
      </aside>
    </div>
  );
}

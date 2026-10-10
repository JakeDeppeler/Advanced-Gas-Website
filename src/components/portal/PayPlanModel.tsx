"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePayPlan } from "@/app/portal/finance/planning/commission/actions";
import { computeCapacity, LEVEL_BILLABLE, LEVEL_LABEL, loadedWage, type CapSettings, type CrewMember } from "@/lib/portal/crew";
import type { PayPlan } from "@/lib/portal/payPlan";

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The pay plan for the new year: qualified tradesmen on one base wage plus a
 * commission on their sales, set against what everyone's paid today.
 *
 * Commission is worked on a van's average sales from Xero, because the
 * business's sales can't yet be put against each tech one by one — the
 * timesheets only reach a quarter of the invoiced work. Once the plan is live,
 * each tech's own sales should replace the average.
 */
export function PayPlanModel({ people, settings, salesPerVan, gpMargin, plan, today }: {
  people: CrewMember[]; settings: CapSettings;
  /** A van's sales a year (ex GST), the business average from Xero. */
  salesPerVan: number | null;
  /** Of every sales dollar, what's left after parts, equipment and subbies. */
  gpMargin: number | null;
  plan: PayPlan; today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wage, setWage] = useState(plan.wage);
  const [pct, setPct] = useState(plan.pct);
  const [startOn, setStartOn] = useState(plan.startOn);
  const [sales, setSales] = useState(Math.round(salesPerVan ?? 400_000));
  const crew = people.filter((p) => LEVEL_BILLABLE[p.level]);
  const [who, setWho] = useState<string[]>(plan.who ?? crew.filter((p) => p.level === "tradesman").map((p) => p.id));

  const rows = useMemo(() => crew.map((p) => {
    const on = who.includes(p.id);
    const paidHrs = p.costing.hrsWeek * settings.weeksYear;
    const extraWages = on ? (loadedWage(wage, settings) - loadedWage(p.costing.wage, settings)) * paidHrs : 0;
    const comm = on && p.costing.ownVan ? (sales * pct) / 100 : 0;
    return { p, on, extraWages, comm };
  }), [crew, who, wage, pct, sales, settings]);

  const extraWages = rows.reduce((a, r) => a + r.extraWages, 0);
  const commission = rows.reduce((a, r) => a + r.comm, 0);
  const extra = extraWages + commission;
  const capToday = useMemo(() => computeCapacity(people, settings), [people, settings]);
  const capPlan = useMemo(() => computeCapacity(people.map((p) => (who.includes(p.id) ? { ...p, costing: { ...p.costing, wage } } : p)), settings), [people, settings, who, wage]);
  const hourToday = capToday.costPerHr;
  const hourPlan = capPlan.totalBillHrs > 0 ? (capPlan.totalCost + commission) / capPlan.totalBillHrs : 0;
  // Extra sales that would pay for it: each new dollar of sales leaves its gross
  // margin, less the commission paid on it.
  const keep = gpMargin != null ? gpMargin - pct / 100 : null;
  const needSales = keep != null && keep > 0 ? extra / keep : null;
  const allSales = sales * Math.max(1, capToday.realVans);
  const weeksTo = Math.max(0, Math.ceil((Date.parse(`${startOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / (7 * 86_400_000)));
  const startLabel = new Date(`${startOn}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const changed = wage !== plan.wage || pct !== plan.pct || startOn !== plan.startOn || JSON.stringify([...who].sort()) !== JSON.stringify([...(plan.who ?? crew.filter((p) => p.level === "tradesman").map((p) => p.id))].sort());

  const save = () => start(async () => {
    const r = await savePayPlan({ wage, pct, startOn, who });
    setMsg(r.ok ? { ok: true, text: "Saved. Our hourly rate's plan view uses it now." } : { ok: false, text: r.error ?? "Couldn't save." });
    router.refresh();
  });

  return (
    <div className="pt-wi">
      <div className="pt-rev__tiles">
        <div className="pt-rev__tile is-feature"><span className="pt-rev__k">Starts</span><strong>{startLabel}</strong><span className="pt-rev__sub">{weeksTo} weeks to get everyone trained up</span></div>
        <div className="pt-rev__tile"><span className="pt-rev__k">Commission paid a year</span><strong>{m0(commission)}</strong><span className="pt-rev__sub">{pct}% of their sales</span></div>
        <div className="pt-rev__tile"><span className="pt-rev__k">Extra on wages a year</span><strong>{m0(extraWages)}</strong><span className="pt-rev__sub">moving to ${wage} an hour, with super & on-costs</span></div>
        <div className="pt-rev__tile"><span className="pt-rev__k">An hour costs us</span><strong>{m2(hourPlan)}</strong><span className="pt-rev__sub">against {m2(hourToday)} today ({hourPlan >= hourToday ? "+" : "−"}{m2(Math.abs(hourPlan - hourToday))})</span></div>
      </div>

      <section className="pt-panel" aria-labelledby="pp-set">
        <h2 id="pp-set" className="pt-panel__h">The plan</h2>
        <div className="pt-wi__knobs">
          <label className="pt-field"><span>Starts on</span><input id="pp-start" type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} /></label>
          <label className="pt-field"><span>Base wage for a qualified tradesman ($ an hour)</span><input id="pp-wage" type="number" min={0} step={0.5} value={wage} onChange={(e) => setWage(Number(e.target.value) || 0)} /></label>
          <label className="pt-field"><span>Commission (% of their sales)</span><input id="pp-pct" type="number" min={0} max={30} step={0.5} value={pct} onChange={(e) => setPct(Number(e.target.value) || 0)} /></label>
          <label className="pt-field"><span>A van&rsquo;s sales a year ($, ex GST)</span><input id="pp-sales" type="number" min={0} step={1000} value={sales} onChange={(e) => setSales(Number(e.target.value) || 0)} /><em className="pt-pp__hint">{salesPerVan != null ? `${m0(salesPerVan)} on average over the last 12 months, from Xero` : "Xero isn't answering; put in your own figure"}</em></label>
        </div>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl">
            <thead><tr><th scope="col">On the plan</th><th scope="col">Paid today</th><th scope="col">On the plan</th><th scope="col">Extra wages a year</th><th scope="col">Commission a year</th></tr></thead>
            <tbody>
              {rows.map(({ p, on, extraWages: ew, comm }) => (
                <tr key={p.id} className={on ? undefined : "is-off"}>
                  <th scope="row">
                    <label className="pt-pp__who"><input type="checkbox" checked={on} onChange={(e) => setWho((w) => (e.target.checked ? [...w, p.id] : w.filter((x) => x !== p.id)))} aria-label={`${p.name} on the plan`} /> {p.name}</label>
                    <em> {LEVEL_LABEL[p.level]}{!p.costing.ownVan ? ", rides with a tech" : ""}</em>
                  </th>
                  <td>{m2(p.costing.wage)}</td>
                  <td>{on ? m2(wage) : "—"}</td>
                  <td>{on ? m0(ew) : "—"}</td>
                  <td>{on ? (p.costing.ownVan ? m0(comm) : "no van of their own") : "—"}</td>
                </tr>
              ))}
              <tr className="is-total"><th scope="row">All of it</th><td /><td /><td>{m0(extraWages)}</td><td>{m0(commission)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="pt-pp__save">
          <button type="button" className="pt-btn pt-btn--navy" onClick={save} disabled={pending || !changed}>Save the plan</button>
          {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</span>}
        </div>
      </section>

      <section className="pt-panel" aria-labelledby="pp-pays">
        <h2 id="pp-pays" className="pt-panel__h">Does it pay for itself?</h2>
        <ul className="pt-rev__list">
          <li><span>What the plan costs a year<em>extra wages plus commission</em></span><strong>{m0(extra)}</strong></li>
          {gpMargin != null && <li><span>Of every extra dollar of sales, the business keeps<em>after parts, equipment and subbies ({Math.round(gpMargin * 100)}¢), less the {pct}% commission</em></span><strong>{Math.round((keep ?? 0) * 100)}¢</strong></li>}
          {needSales != null && (
            <li className="is-total"><span>Sales need to grow by<em>for the plan to cost nothing — {Math.round((needSales / allSales) * 100)}% on today&rsquo;s {m0(allSales)} a year</em></span><strong>{m0(needSales)} a year</strong></li>
          )}
        </ul>
        <p className="pt-hr__foot">
          Commission here is {pct}% of a van&rsquo;s average sales. Once it&rsquo;s live, pay it on each tech&rsquo;s own invoiced work from ServiceTitan rather than the average.
        </p>
      </section>
    </div>
  );
}

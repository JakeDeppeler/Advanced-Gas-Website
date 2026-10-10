import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { listUsers, getCapSettings, getSettings, listVehicles, dbConfigured } from "@/lib/portal/db";
import { withFleet } from "@/lib/portal/costSettings";
import { personBills, yearSpend } from "@/lib/portal/hourBill";
import { onPlan, readPayPlan, withPlanWages } from "@/lib/portal/payPlan";
import { firstName } from "@/lib/todos/types";
import { HourBill } from "@/components/portal/HourBill";
import { getPLDetail, lastTwelveMonths } from "@/lib/portal/xero";
import {
  alwaysSupervised, assumptionsFor, loadedWage, onCostsOf, computeCapacity, daysOff, fleetDepOf, LEVEL_BILLABLE, LEVEL_LABEL, OVERHEAD_FIELDS, OVERHEAD_GROUPS, overheadLines,
  type CapSettings, type CrewLevel, type CrewMember,
} from "@/lib/portal/crew";

export const dynamic = "force-dynamic";
export const metadata = { title: "Our hourly rate — Team portal" };

const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const pc = (n: number) => `${Math.round(n * 100)}%`;

/**
 * What makes our hour what it is.
 *
 * The same sums as Costs & capacity — the same people, the same settings, the
 * same computeCapacity — laid out as one hour taken apart: where the billable
 * hours come from, every dollar that has to come back out of each one, the
 * margin on top, and what would move it. Nothing is worked out differently
 * here, so the two pages can't disagree; change an input there and this
 * follows.
 */
export default async function HourlyPage({ searchParams }: { searchParams?: { plan?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, stored, vehicles, planRaw] = ready
    ? await Promise.all([listUsers(), getCapSettings(), listVehicles(), getSettings<unknown>("payplan").catch(() => null)])
    : [[], null, [], null];
  const s: CapSettings = withFleet(stored, vehicles);
  const today: CrewMember[] = users
    .filter((u) => u.active && u.id && u.level)
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
  // Two ways: what everyone is paid today, or the pay plan being trained up for
  // — the qualified tradesmen on its wage, plus its commission on their sales.
  const plan = readPayPlan(planRaw);
  const planMode = searchParams?.plan === "1";
  const people = planMode ? withPlanWages(today, plan) : today;
  const capToday = computeCapacity(today, s);
  const cap = computeCapacity(people, s);
  const has = cap.totalBillHrs > 0;
  const charge = cap.costPerHr * (1 + s.margin / 100);

  // Where the hours go, person by person on the same rules calcPerson uses.
  const m = assumptionsFor(s);
  const hrs = { paid: 0, leave: 0, ph: 0, sick: 0, school: 0, rdo: 0, travel: 0, admin: 0, office: 0, callbacks: 0, billable: 0 };
  for (const p of people) {
    const c = p.costing;
    if (!LEVEL_BILLABLE[p.level] || !c.ownVan) continue;
    const paid = c.hrsWeek * s.weeksYear;
    const hpd = c.hrsWeek / 5;
    const leave = c.leaveDays * hpd, ph = c.phDays * hpd, sick = c.sickDays * hpd, school = c.schoolDays * hpd, rdo = c.rdoDays * hpd;
    const daysOff = leave + ph + sick + school + rdo;
    const travel = c.travelHrsWeek * (m.travelPct / 100) * s.weeksYear;
    const admin = c.adminHrsWeek * (m.adminPct / 100) * s.weeksYear;
    const office = Math.min(c.officeHrsWeek * s.weeksYear, Math.max(0, paid - daysOff));
    const beforeCb = Math.max(0, paid - daysOff - travel - admin - office);
    const callbacks = beforeCb * ((c.callbackPct ?? m.callbackPct ?? s.callbackPct ?? 0) / 100);
    Object.assign(hrs, {
      paid: hrs.paid + paid, leave: hrs.leave + leave, ph: hrs.ph + ph, sick: hrs.sick + sick, school: hrs.school + school, rdo: hrs.rdo + rdo,
      travel: hrs.travel + travel, admin: hrs.admin + admin, office: hrs.office + office, callbacks: hrs.callbacks + callbacks,
      billable: hrs.billable + Math.max(0, beforeCb - callbacks),
    });
  }
  const lost = [
    { label: "Annual leave", v: hrs.leave, kind: "Entitlement" },
    { label: "Public holidays", v: hrs.ph, kind: "Entitlement" },
    { label: "Sick days", v: hrs.sick, kind: "Entitlement" },
    { label: "Trade school", v: hrs.school, kind: "Entitlement" },
    { label: "RDOs", v: hrs.rdo, kind: "Entitlement" },
    { label: "Travel between jobs", v: hrs.travel, kind: "In play" },
    { label: "Admin between jobs", v: hrs.admin, kind: "In play" },
    { label: "Office time", v: hrs.office, kind: "In play" },
    { label: "Going back to fix our own work", v: hrs.callbacks, kind: "In play" },
  ].filter((x) => x.v > 0.5);

  // Every dollar in an hour. The overhead groups when the lines are filled in;
  // one figure when the overhead is kept as a single number.
  const oh = overheadLines(s);
  const internal = s.ohSource === "internal";
  const fleetDep = fleetDepOf(s);
  const groups = OVERHEAD_GROUPS.map((g) => {
    const lines = OVERHEAD_FIELDS.filter((f) => f.group === g.key)
      .map((f) => ({ label: f.key === "vehDep" && fleetDep > 0 ? "Van depreciation, from the Vehicles tab" : f.label, annual: Number(oh[f.key]) || 0 }))
      .filter((l) => l.annual > 0);
    return { key: g.key, label: g.label, blurb: g.blurb, annual: lines.reduce((a, l) => a + l.annual, 0), lines };
  }).filter((g) => g.annual > 0);
  const per = (annual: number) => (has ? annual / cap.totalBillHrs : 0);
  const layers: Array<{ key: string; label: string; note: string; annual: number; lines?: Array<{ label: string; annual: number }> }> = [
    { key: "wages", label: "Wages for the hour on the tools", note: "What the crew is paid for the hours they bill", annual: cap.fieldWages },
    { key: "labour", label: "Paid hours off the tools", note: "Leave, holidays, sick days, school, travel, admin — paid, never billed", annual: cap.labourOh },
    { key: "office", label: "Office & admin staff", note: "Wages for the people who don't go out on jobs", annual: cap.officeOh },
    ...(internal
      ? [
          { key: "oh", label: "Overheads", note: "Kept as one figure on Costs & capacity", annual: Number(s.internalOverhead) || 0 },
          { key: "dep", label: "Van depreciation", note: "What the vans lose in value a year, from the Vehicles tab", annual: fleetDep },
        ]
      : groups.map((g) => ({ key: g.key, label: g.label, note: g.blurb, annual: g.annual, lines: g.lines }))),
  ].filter((l) => l.annual > 0);
  const marginPerHr = charge - cap.costPerHr;
  const maxLayer = Math.max(1, ...layers.map((l) => per(l.annual)), marginPerHr);

  // A job with an apprentice on it. The tradesman's hour is the one above; the
  // apprentice adds their whole year's pay, recovered over the hours they're
  // actually on a job in the van. The tradesman doesn't go to trade school, so
  // on school days the van goes out with him alone, at his rate, and nothing
  // the apprentice is paid for those days comes back unless it's on the days
  // they are there.
  const yearDays = s.weeksYear * 5;
  const leadPeople = people.filter((p) => p.costing.ownVan && LEVEL_BILLABLE[p.level] && !alwaysSupervised(p.level));
  const leadPick = leadPeople.some((p) => p.level === "tradesman") ? leadPeople.filter((p) => p.level === "tradesman") : leadPeople;
  const leadCosts = leadPick.map((p) => cap.rates.find((r) => r.id === p.id)?.costPerHr).filter((v): v is number => v != null);
  const leadCost = leadCosts.length ? leadCosts.reduce((a, v) => a + v, 0) / leadCosts.length : null;
  const leadLabel = leadPick.length ? LEVEL_LABEL[leadPick[0].level] : "Tradesman";
  const riders = cap.rates
    .filter((r) => r.crewHrs != null && r.costPerHr != null)
    .map((r) => ({ r, p: people.find((x) => x.id === r.id)! }))
    // A tradesman without a van of his own rides along too, but he doesn't go
    // to school; this is about the people who do.
    .filter(({ p }) => p && alwaysSupervised(p.level))
    .map(({ r, p }) => {
      const c = p.costing;
      const rate = loadedWage(c.wage, s);
      const hpd = c.hrsWeek / 5;
      const crewHrs = r.crewHrs as number;
      const full = r.costPerHr as number;
      const school = c.schoolDays * hpd, away = (c.leaveDays + c.phDays + c.sickDays + c.rdoDays) * hpd;
      const schoolPer = crewHrs > 0 ? (school * rate) / crewHrs : 0;
      const awayPer = crewHrs > 0 ? (away * rate) / crewHrs : 0;
      const feePer = crewHrs > 0 ? (Math.max(0, Number(s.schoolFees?.[p.id]) || 0)) / crewHrs : 0;
      const schemePer = crewHrs > 0 ? (Math.max(0, Number(s.apprenticeScheme?.[p.id]) || 0)) / crewHrs : 0;
      return {
        p, c, rate, crewHrs, full, schoolPer, awayPer, feePer, schemePer,
        // Whatever's left is their time in the van that isn't billed: the drive
        // and the pack-up between jobs, the same as the tradesman's.
        vanPer: Math.max(0, full - rate - schoolPer - awayPer - feePer + schemePer),
        paid: c.hrsWeek * s.weeksYear, hpd,
        days: Math.max(0, yearDays - daysOff(c)),
      };
    });

  // What moves it.
  const raise = has ? computeCapacity(people.map((p) => ({ ...p, costing: { ...p.costing, wage: p.costing.wage + 1 } })), s).costPerHr - cap.costPerHr : 0;
  const busier = has ? cap.totalCost / (cap.totalBillHrs * 1.05) : 0;
  const tenK = has ? 10_000 / cap.totalBillHrs : 0;

  const bills = personBills(people, s, cap);

  // The wages on the cards against what Xero actually paid, so a wage left at
  // last year's rate shows up here rather than quietly under-pricing an hour.
  let wageCheck: { cards: number; xero: number } | null = null;
  let salesPerVan: number | null = null;
  try {
    const { from, to } = lastTwelveMonths();
    const pl = await getPLDetail(from, to);
    if (pl && pl.income > 0 && capToday.realVans > 0) salesPerVan = pl.income / capToday.realVans;
    const xero = pl?.sections.flatMap((x) => x.lines).filter((l) => /wages|salar/i.test(l.label)).reduce((a, l) => a + l.amount, 0) ?? 0;
    const cards = people.reduce((a, p) => a + p.costing.wage * p.costing.hrsWeek * s.weeksYear, 0);
    if (xero > 0 && cards > 0) wageCheck = { cards, xero };
  } catch { /* Xero not connected: the check is left off rather than guessed */ }

  // The commission: the plan's percentage of a van's sales — the business's
  // average over the last twelve months in Xero — for each person on the plan
  // who runs a van.
  const planVans = planMode ? people.filter((p) => onPlan(p, plan) && p.costing.ownVan && LEVEL_BILLABLE[p.level]) : [];
  const commEach = salesPerVan != null ? (salesPerVan * plan.pct) / 100 : 0;
  const commission = commEach * planVans.length;
  const commOf = (id: string) => (planVans.some((p) => p.id === id) ? commEach : 0);
  const yearCost = cap.totalCost + commission;
  const hourCost = has ? yearCost / cap.totalBillHrs : 0;
  const hourCharge = hourCost * (1 + s.margin / 100);
  const todayHour = capToday.totalBillHrs > 0 ? capToday.costPerHr : 0;
  const startLabel = new Date(`${plan.startOn}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  const spend = [
    ...yearSpend(s, cap),
    ...(commission > 0 ? [{ key: "commission", label: `Commission, ${plan.pct}% of their sales`, note: planVans.map((p) => firstName(p.name)).join(" & "), annual: commission }] : []),
  ];
  const spendTop = Math.max(1, ...spend.map((x) => x.annual));
  const pairCharge = leadCost != null && riders.length
    ? (leadCost + riders.reduce((a, x) => a + x.full, 0) / riders.length) * (1 + s.margin / 100)
    : null;

  const crew = cap.rates
    .map((r) => ({ r, p: people.find((x) => x.id === r.id)! }))
    .filter(({ r, p }) => p && LEVEL_BILLABLE[p.level] && (r.rate != null || r.uplift != null))
    .sort((a, b) => (b.r.rate ?? 0) - (a.r.rate ?? 0));

  return (
    <PortalShell user={user}>
      <FinanceHead title="Our hourly rate" lede="What the business spends in a year, what that makes an hour on the tools cost, and what we charge for it." />

      {!has ? (
        <div className="pt-note pt-note--warn">
          <strong>There&rsquo;s no crew with billable hours yet,</strong> so there&rsquo;s no hour to take apart. Add the crew&rsquo;s levels and hours on <Link href="/portal/finance/capacity">Costs &amp; capacity</Link>.
        </div>
      ) : (
        <>
          <nav className="pt-td__people pt-hs__mode" aria-label="Which pay">
            <Link href="/portal/finance/hourly" className={`pt-td__pill${planMode ? "" : " is-on"}`} aria-current={planMode ? undefined : "page"}>Today&rsquo;s pay</Link>
            <Link href="/portal/finance/hourly?plan=1" className={`pt-td__pill${planMode ? " is-on" : ""}`} aria-current={planMode ? "page" : undefined}>
              From {startLabel}: ${plan.wage} + {plan.pct}% commission
            </Link>
          </nav>
          {planMode && (
            <p className="pt-note" style={{ margin: 0 }}>
              <strong>The plan from {startLabel}.</strong>{" "}
              {planVans.length
                ? `${planVans.map((p) => firstName(p.name)).join(" and ")} on $${plan.wage} an hour plus ${plan.pct}% of their sales; everyone else as they are today. `
                : `Nobody on the plan runs a van, so there's no commission to show. `}
              {salesPerVan != null
                ? `Commission is worked on a van's average sales, ${m0(salesPerVan)} a year from Xero — about ${m0(commEach)} each.`
                : "Xero isn't answering, so the commission can't be worked out."}{" "}
              An hour costs {m2(hourCost)} against {m2(todayHour)} today ({hourCost >= todayHour ? "+" : "−"}{m2(Math.abs(hourCost - todayHour))}). Change the plan on <Link href="/portal/finance/planning/commission">Planning → Pay plan</Link>.
            </p>
          )}

          <section className="pt-panel pt-hs" aria-labelledby="hs-h">
            <h2 id="hs-h" className="pt-sr">The short version</h2>
            <div className="pt-hs__nums">
              <div><span>We spend a year</span><strong>{m0(yearCost)}</strong><em>every wage and every bill{commission > 0 ? ", and commission" : ""}</em></div>
              <div><span>Hours we can bill</span><strong>{h0(cap.totalBillHrs)}</strong><em>across {cap.vanCount} {cap.vanCount === 1 ? "van" : "vans"}</em></div>
              <div><span>So an hour costs us</span><strong>{m2(hourCost)}</strong><em>{m0(yearCost)} ÷ {h0(cap.totalBillHrs)}</em></div>
              <div className="is-charge"><span>We charge</span><strong>{m2(hourCharge)}</strong><em>with our {s.margin}% margin</em></div>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="hs-spend">
            <h2 id="hs-spend" className="pt-panel__h">Where the money goes each year</h2>
            <div className="pt-hs__spend">
              {spend.map((x) => (
                <div key={x.key} className="pt-hs__row">
                  <span className="pt-hs__lbl">{x.label}<em>{x.note}</em></span>
                  <span className="pt-hs__bar" aria-hidden="true"><i style={{ width: `${Math.max(0, (x.annual / spendTop) * 100)}%` }} /></span>
                  <strong className="pt-hs__yr">{m0(x.annual)}<em>a year</em></strong>
                  <span className="pt-hs__ph">{m2(per(x.annual))}<em>an hour</em></span>
                </div>
              ))}
              <div className="pt-hs__row is-total">
                <span className="pt-hs__lbl">All of it</span><span />
                <strong className="pt-hs__yr">{m0(yearCost)}<em>a year</em></strong>
                <span className="pt-hs__ph">{m2(hourCost)}<em>an hour</em></span>
              </div>
            </div>
          </section>

          <section className="pt-panel" aria-labelledby="hs-people">
            <h2 id="hs-people" className="pt-panel__h">What each person costs, and what we charge</h2>
            <div className="pt-fleet__wrap">
              <table className="pt-rev__pl">
                <thead><tr><th scope="col">Who</th><th scope="col">Costs us an hour</th><th scope="col">We charge an hour</th></tr></thead>
                <tbody>
                  {crew.map(({ r, p }) => (
                    <tr key={r.id}>
                      <th scope="row">{p.name}<em> {LEVEL_LABEL[p.level]}{r.uplift != null ? ", rides with a tech" : ""}</em></th>
                      {r.uplift != null
                        ? <><td>+{m2(r.costPerHr ?? 0)}</td><td>+{m2(r.uplift)} <em>on top of the tradesman</em></td></>
                        : (() => {
                            // On the plan, a commission earner's hour carries their commission too.
                            const add = r.billHrs > 0 ? commOf(r.id) / r.billHrs : 0;
                            const cost = r.costPerHr != null ? r.costPerHr + add : null;
                            const rate = p.costing.rateOverride != null ? r.rate : cost != null ? cost * (1 + s.margin / 100) : null;
                            return <><td>{cost != null ? m2(cost) : "—"}{add > 0 && <em>{m2(add)} of it commission</em>}</td><td>{rate != null ? m2(rate) : "—"}</td></>;
                          })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pairCharge != null && leadCost != null && (
              <p className="pt-hs__pair">
                One hour of a {leadLabel.toLowerCase()} on their own: <strong>{m2(leadCost * (1 + s.margin / 100))}</strong>. With an apprentice on the job: <strong>{m2(pairCharge)}</strong>.
                That&rsquo;s still one hour of the van, not two.
              </p>
            )}
          </section>

          <details className="pt-hr__more">
            <summary>Show the full breakdown{planMode ? " (the plan's wages; commission left out)" : ""}</summary>
          <div className="pt-rev__tiles">
            <div className="pt-rev__tile is-feature">
              <span className="pt-rev__k">What an hour costs us</span>
              <strong>{m2(cap.costPerHr)}</strong>
              <span className="pt-rev__sub">every billable hour, before any margin</span>
            </div>
            <div className="pt-rev__tile">
              <span className="pt-rev__k">What we charge for it</span>
              <strong>{m2(charge)}</strong>
              <span className="pt-rev__sub">with the {s.margin}% margin, across the crew</span>
            </div>
            <div className="pt-rev__tile">
              <span className="pt-rev__k">Billable hours a year</span>
              <strong>{h0(cap.totalBillHrs)}</strong>
              <span className="pt-rev__sub">{h0(cap.hrsPerVan)} a van, across {cap.vanCount}</span>
            </div>
            <div className="pt-rev__tile">
              <span className="pt-rev__k">Time on the tools</span>
              <strong>{pc(cap.util.actual)}</strong>
              <span className="pt-rev__sub">of the hours the crew is paid for · {pc(cap.util.ceiling)} is the most possible</span>
            </div>
          </div>

          <div className="pt-two">
            <section className="pt-panel" aria-labelledby="hr-hours">
              <h2 id="hr-hours" className="pt-panel__h">Where the billable hours come from</h2>
              <p className="pt-panel__sub">Every hour the crew with vans is paid for in a year, and what comes out of it before a customer can be charged.</p>
              <div className="pt-hr__funnel">
                <div className="pt-hr__frow is-start"><span>Paid hours</span><span className="pt-hr__ftrack"><i style={{ width: "100%" }} /></span><strong>{h0(hrs.paid)}</strong></div>
                {lost.map((x) => (
                  <div key={x.label} className="pt-hr__frow is-out">
                    <span>{x.label}<em>{x.kind === "Entitlement" ? "can't be scheduled away" : "in play"}</em></span>
                    <span className="pt-hr__ftrack"><i style={{ width: `${hrs.paid ? (x.v / hrs.paid) * 100 : 0}%` }} /></span>
                    <strong>−{h0(x.v)}</strong>
                  </div>
                ))}
                <div className="pt-hr__frow is-end"><span>Billable hours</span><span className="pt-hr__ftrack"><i style={{ width: `${hrs.paid ? (hrs.billable / hrs.paid) * 100 : 0}%` }} /></span><strong>{h0(hrs.billable)}</strong></div>
              </div>
              <p className="pt-hr__foot">
                {pc(hrs.paid ? hrs.billable / hrs.paid : 0)} of paid time is billable. Every hour that isn&rsquo;t still has to be paid for — so it goes on the price of the ones that are.
                {riders.length > 0 && " Apprentices riding in someone else's van aren't counted here: the van bills one hour whether one or two are on site. Their year is further down."}
              </p>
            </section>

            <section className="pt-panel" aria-labelledby="hr-moves">
              <h2 id="hr-moves" className="pt-panel__h">What moves it</h2>
              <p className="pt-panel__sub">The same sums, with one thing changed.</p>
              <ul className="pt-rev__list">
                <li><span>5% more billable hours<em>less travel and admin, the same crew</em></span><strong className="is-good">{m2(busier)} an hour · −{m2(cap.costPerHr - busier)}</strong></li>
                <li><span>Every $10,000 a year of overhead<em>spread over {h0(cap.totalBillHrs)}</em></span><strong className="is-bad">+{m2(tenK)} an hour</strong></li>
                <li><span>A $1 an hour pay rise for everyone<em>paid hours cost more than billed ones</em></span><strong className="is-bad">+{m2(raise)} an hour</strong></li>
                {[s.margin - 10, s.margin + 10].filter((x) => x > 0).map((mg) => (
                  <li key={mg}><span>Charging at a {mg}% margin<em>instead of {s.margin}%</em></span><strong>{m2(cap.costPerHr * (1 + mg / 100))} an hour</strong></li>
                ))}
              </ul>
            </section>
          </div>

          <section className="pt-panel" aria-labelledby="hr-hour">
            <h2 id="hr-hour" className="pt-panel__h">What makes up an hour</h2>
            <p className="pt-panel__sub">Every dollar that has to come back out of one billable hour, then the margin. Open a line to see what&rsquo;s in it.</p>
            <div className="pt-hr__stack" role="img" aria-label={`An hour charged at ${m2(charge)}: ${layers.map((l) => `${l.label} ${m2(per(l.annual))}`).join(", ")}, margin ${m2(marginPerHr)}`}>
              {layers.map((l, i) => <i key={l.key} className={`pt-hr__seg s${i % 8}`} style={{ width: `${(per(l.annual) / charge) * 100}%` }} title={`${l.label}: ${m2(per(l.annual))}`} />)}
              <i className="pt-hr__seg is-margin" style={{ width: `${(marginPerHr / charge) * 100}%` }} title={`Margin: ${m2(marginPerHr)}`} />
            </div>
            <div className="pt-hr__ledger">
              {layers.map((l, i) => {
                const row = (
                  <>
                    <span className={`pt-hr__dot s${i % 8}`} aria-hidden="true" />
                    <span className="pt-hr__lbl"><span className="pt-hr__name">{l.label}</span><em>{l.note}</em></span>
                    <span className="pt-hr__bar" aria-hidden="true"><i className={`s${i % 8}`} style={{ width: `${(per(l.annual) / maxLayer) * 100}%` }} /></span>
                    <span className="pt-hr__yr">{m0(l.annual)}<em>a year</em></span>
                    <strong className="pt-hr__ph">{m2(per(l.annual))}<em>{pc(per(l.annual) / charge)}</em></strong>
                  </>
                );
                return l.lines && l.lines.length ? (
                  <details key={l.key} className="pt-hr__line">
                    <summary>{row}</summary>
                    <ul>{l.lines.map((x) => <li key={x.label}><span>{x.label}</span><span>{m0(x.annual)} a year</span><strong>{m2(per(x.annual))}</strong></li>)}</ul>
                  </details>
                ) : <div key={l.key} className="pt-hr__line is-flat">{row}</div>;
              })}
              <div className="pt-hr__line is-total"><span /><span className="pt-hr__lbl">What an hour costs us</span><span /><span className="pt-hr__yr">{m0(cap.totalCost)}<em>a year</em></span><strong className="pt-hr__ph">{m2(cap.costPerHr)}</strong></div>
              <div className="pt-hr__line is-flat">
                <span className="pt-hr__dot is-margin" aria-hidden="true" />
                <span className="pt-hr__lbl">Margin, {s.margin}%<em>what&rsquo;s left to keep, and to cover the hours that go wrong</em></span>
                <span className="pt-hr__bar" aria-hidden="true"><i className="is-margin" style={{ width: `${(marginPerHr / maxLayer) * 100}%` }} /></span>
                <span className="pt-hr__yr">{m0(marginPerHr * cap.totalBillHrs)}<em>a year</em></span>
                <strong className="pt-hr__ph">{m2(marginPerHr)}<em>{pc(marginPerHr / charge)}</em></strong>
              </div>
              <div className="pt-hr__line is-total is-charge"><span /><span className="pt-hr__lbl">What we charge an hour</span><span /><span /><strong className="pt-hr__ph">{m2(charge)}</strong></div>
            </div>
          </section>

          {riders.length > 0 && (() => {
            const mk = 1 + s.margin / 100;
            const lead = leadCost ?? 0;
            const row = (label: string, note: string | null, cell: (x: (typeof riders)[number]) => string, cls?: string) => (
              <tr className={cls}>
                <th scope="row">{label}{note && <em> {note}</em>}</th>
                {riders.map((x) => <td key={x.p.id}>{cell(x)}</td>)}
              </tr>
            );
            const days = (n: number) => `${Math.round(n)} ${Math.round(n) === 1 ? "day" : "days"}`;
            return (
              <section className="pt-panel" aria-labelledby="hr-app">
                <h2 id="hr-app" className="pt-panel__h">A job with an apprentice on it</h2>
                <p className="pt-panel__sub">
                  The {leadLabel.toLowerCase()} doesn&rsquo;t go to trade school; the apprentice does. On school days the van goes out with the {leadLabel.toLowerCase()} on their own, quoted at their rate. So everything an apprentice is paid for in a year, school included, has to come back on the days they&rsquo;re on a job.
                </p>
                <div className="pt-two">
                  <div>
                    <h3 className="pt-hr__h3">Their year</h3>
                    <div className="pt-fleet__wrap">
                      <table className="pt-rev__pl">
                        <thead><tr><th scope="col"><span className="pt-sr">Item</span></th>{riders.map((x) => <th key={x.p.id} scope="col">{x.p.name}</th>)}</tr></thead>
                        <tbody>
                          {row("Weekdays paid for", null, () => days(yearDays))}
                          {row("Trade school", null, (x) => (x.c.schoolDays ? `−${days(x.c.schoolDays)}` : "none"))}
                          {row("Annual leave", null, (x) => `−${days(x.c.leaveDays)}`)}
                          {row("Public holidays", null, (x) => `−${days(x.c.phDays)}`)}
                          {row("Sick days", null, (x) => `−${days(x.c.sickDays)}`)}
                          {row("RDOs", null, (x) => `−${days(x.c.rdoDays)}`)}
                          {row("Days out in the van", null, (x) => days(x.days), "is-total")}
                          {row("Hours on jobs", "what the van bills on those days", (x) => h0(x.crewHrs))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className="pt-hr__h3">One hour on a job, with them on it</h3>
                    <div className="pt-fleet__wrap">
                      <table className="pt-rev__pl">
                        <thead><tr><th scope="col"><span className="pt-sr">Item</span></th>{riders.map((x) => <th key={x.p.id} scope="col">{x.p.name}</th>)}</tr></thead>
                        <tbody>
                          {leadCost != null && row(`${leadLabel}'s hour`, "pay, and the overhead every hour carries", () => m2(lead))}
                          {row("Apprentice's pay for the hour", null, (x) => `+${m2(x.rate)}`)}
                          {row("Their trade-school pay", "spread over their hours on jobs", (x) => `+${m2(x.schoolPer)}`)}
                          {row("Their leave, holidays, sick days and RDOs", null, (x) => `+${m2(x.awayPer)}`)}
                          {riders.some((x) => x.feePer > 0.005) && row("Their trade-school fees", "from their card on Costs & capacity", (x) => `+${m2(x.feePer)}`)}
                          {riders.some((x) => x.schemePer > 0.005) && row("Less the government apprentice incentive", null, (x) => `−${m2(x.schemePer)}`)}
                          {riders.some((x) => x.vanPer > 0.005) && row("In the van between jobs", "the drive and pack-up, paid but not billed", (x) => `+${m2(x.vanPer)}`)}
                          {row(leadCost != null ? "What the crew hour costs" : "What they add to an hour", null, (x) => m2(lead + x.full), "is-total")}
                          {row(`Margin, ${s.margin}%`, null, (x) => `+${m2((lead + x.full) * (mk - 1))}`)}
                          {row(leadCost != null ? "What we charge for the crew hour" : "What they add, charged", null, (x) => m2((lead + x.full) * mk), "is-total")}
                          {leadCost != null && row(`${leadLabel} on their own`, null, () => m2(lead * mk))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <p className="pt-hr__foot">
                  This is what an apprentice adds to a job on the <Link href="/portal/job-calculator">Job calculator</Link> and on the tradesman + apprentice figures on <Link href="/portal/finance/capacity">Costs &amp; capacity</Link>, so school, leave and sick pay are in every quote they&rsquo;re on.
                </p>
              </section>
            );
          })()}

          {bills.length > 0 && (
            <HourBill bills={bills} superPct={onCostsOf(s).superPct}>
                {wageCheck && (
                  <p className="pt-hr__foot">
                    Checked against Xero: the cards add up to {m0(wageCheck.cards)} a year in wages; Xero paid {m0(wageCheck.xero)} over the last twelve months
                    {Math.abs(wageCheck.xero - wageCheck.cards) / Math.max(1, wageCheck.xero) > 0.08
                      ? wageCheck.xero > wageCheck.cards
                        ? `, ${m0(wageCheck.xero - wageCheck.cards)} more than the cards. Overtime, bonuses and anyone who has left are in Xero's figure and not on a card; if the gap is bigger than those, a wage on Costs & capacity is out of date and every rate here is low.`
                        : `, ${m0(wageCheck.cards - wageCheck.xero)} less than the cards. Someone who started part way through the year would do that; otherwise a wage on a card is higher than what's being paid.`
                      : ", close enough that the cards are right."}
                  </p>
                )}
            </HourBill>
          )}

          <section className="pt-panel" aria-labelledby="hr-crew">
            <h2 id="hr-crew" className="pt-panel__h">Each person&rsquo;s hour</h2>
            <p className="pt-panel__sub">Their pay with super, WorkCover and long service leave; their own time off the tools; the {m2(cap.businessPerHr)} of office and overhead every billable hour carries; then the margin.</p>
            <div className="pt-fleet__wrap">
              <table className="pt-rev__pl">
                <thead><tr><th scope="col">Who</th><th scope="col">Pay an hour</th><th scope="col">+ the rest</th><th scope="col">Costs us</th><th scope="col">We charge</th><th scope="col">Billable a year</th></tr></thead>
                <tbody>
                  {crew.map(({ r, p }) => (
                    <tr key={r.id}>
                      <th scope="row">{p.name}<em> {LEVEL_LABEL[p.level]}</em></th>
                      {r.uplift != null ? (
                        <>
                          <td>{m2(loadedWage(p.costing.wage, s))}</td>
                          <td colSpan={2}>rides with a tech</td>
                          <td>+{m2(r.uplift)} on the crew&rsquo;s rate</td>
                          <td>—</td>
                        </>
                      ) : (
                        <>
                          <td>{m2(loadedWage(p.costing.wage, s))}</td>
                          <td>{r.costPerHr != null ? m2(r.costPerHr - loadedWage(p.costing.wage, s)) : "—"}</td>
                          <td>{r.costPerHr != null ? m2(r.costPerHr) : "—"}</td>
                          <td>{r.rate != null ? m2(r.rate) : "—"}{p.costing.rateOverride != null ? <em> set by hand</em> : null}</td>
                          <td>{h0(r.billHrs)}{p.costing.schoolDays > 0 && <em> after {p.costing.schoolDays} school days</em>}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pt-panel__sub" style={{ margin: "14px 0 0" }}>
              Change any of it — wages, hours, days off, overheads, the margin — on <Link href="/portal/finance/capacity">Costs &amp; capacity</Link>, and this page follows.
            </p>
          </section>
          </details>
        </>
      )}
    </PortalShell>
  );
}

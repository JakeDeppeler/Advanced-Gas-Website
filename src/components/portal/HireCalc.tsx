"use client";

import { useMemo, useState } from "react";
import {
  calcPerson, computeCapacity, defaultsFor, fleetDepOf, LEVEL_LABEL, withVans,
  type CapSettings, type CrewLevel, type CrewMember,
} from "@/lib/portal/crew";
import { growthSet, markupPerVan, newVanDep, newVanUpfront, type Growth } from "@/lib/portal/growthTypes";

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")}`;
const pc = (n: number) => `${Math.round(n * 100)}%`;

/** Weeks a person actually works in a year, for the "a week" figures: 52 less leave and public holidays. */
const WORK_WEEKS = 46;

const WHO: Array<{ level: CrewLevel; label: string }> = [
  { level: "tradesman", label: "Tradesman" },
  { level: "lead", label: "Lead hand" },
  { level: "hybrid", label: "Field and office" },
  { level: "apprentice", label: "Apprentice" },
];

/**
 * Hire someone: the four questions, answered from Our numbers and nothing
 * else.
 *
 *   How much more work does it take to cover them?
 *   How much do the overheads go up?
 *   What does the van take, up front and a month?
 *   What's the profit in it?
 *
 * The business is run on the hour paying for every wage and overhead, and the
 * markup on materials and units being the profit. So the work to cover them
 * is their whole added cost at the charge-out rate, and the profit is what
 * their hours earn past that plus the markup on what their van installs.
 *
 * Every cost is computeCapacity with them added, against without — the same
 * sums as Our hourly rate. A van that comes with them brings its running costs
 * (withVans) and its own depreciation from the new-van numbers. Nothing here
 * is saved; the only inputs are who, what they're paid, and how busy.
 */
export function HireCalc({ people, settings, growth }: { people: CrewMember[]; settings: CapSettings; growth: Growth }) {
  const [level, setLevel] = useState<CrewLevel>("tradesman");
  const [wage, setWage] = useState<number>(defaultsFor("tradesman").wage);
  const [van, setVan] = useState(true);
  const [busy, setBusy] = useState(85);
  const set = growthSet(growth);

  const pick = (l: CrewLevel) => {
    setLevel(l);
    setWage(defaultsFor(l).wage);
    setVan(l !== "apprentice");
  };

  const r = useMemo(() => {
    const base = computeCapacity(people, settings);
    const costing = { ...defaultsFor(level), wage, ownVan: van };
    const crew = [...people, { id: "new-hire", name: "New hire", level, costing }];
    const first = computeCapacity(crew, settings);
    let s2 = withVans(settings, base.realVans, first.realVans);
    // The new van's own depreciation, from what it costs, rather than the
    // average of a fleet bought years ago.
    if (van && set.van) s2 = { ...s2, fleetDep: fleetDepOf(settings) + newVanDep(growth.newVan) };
    const cap = computeCapacity(crew, s2);

    const me = calcPerson(level, costing, s2);
    // The whole business's cost includes the ride-alongs, whose wages are kept
    // out of totalCost (so a tech alone isn't charged for an apprentice who
    // isn't there) and recovered on the crew rate instead.
    const addedCost = (cap.totalCost + cap.ridesCost) - (base.totalCost + base.ridesCost);
    const pay = me.wageCost;
    const overheadsUp = Math.max(0, addedCost - pay);

    // What their time sells for: their own hours at today's rate when they
    // run a van; the extra on the crew's hour when they ride along.
    const charge = base.costPerHr * (1 + settings.margin / 100);
    const rate = cap.rates.find((x) => x.id === "new-hire");
    const riding = !van || !me.chargeable;
    const priceHr = riding ? rate?.uplift ?? 0 : charge;
    const hrsAvail = riding ? rate?.crewHrs ?? 0 : cap.totalBillHrs - base.totalBillHrs;

    const coverHrs = priceHr > 0 ? addedCost / priceHr : null;
    const coverShare = coverHrs != null && hrsAvail > 0 ? coverHrs / hrsAvail : null;
    const labourSold = hrsAvail * (busy / 100) * priceHr;
    const labourProfit = labourSold - addedCost;
    const markup = !riding && set.markup ? markupPerVan(growth.markup) * (busy / 100) : 0;
    const profit = labourProfit + markup;

    const upfront = van && set.van ? newVanUpfront(growth.newVan) : 0;
    const monthly = van && set.van ? growth.newVan.monthly : 0;
    const dep = van && set.van ? newVanDep(growth.newVan) : 0;
    // Depreciation is a cost on paper; the repayment is the cash.
    const cashAfterVan = profit + dep - monthly * 12;
    const paybackMonths = upfront > 0 && cashAfterVan > 0 ? upfront / (cashAfterVan / 12) : null;

    return { addedCost, pay, overheadsUp, charge, priceHr, hrsAvail, coverHrs, coverShare, labourSold, labourProfit, markup, profit, upfront, monthly, dep, cashAfterVan, paybackMonths, riding };
  }, [people, settings, growth, level, wage, van, busy, set.van, set.markup]);

  const who = LEVEL_LABEL[level].toLowerCase();
  const verdict = r.profit >= 0 ? "pays" : "costs";

  return (
    <div className="pt-hire">
      <section className="pt-panel pt-hire__ask" aria-labelledby="hire-h">
        <h2 id="hire-h" className="pt-panel__h">Who are you thinking of hiring?</h2>
        <div className="pt-hire__inputs">
          <div className="pt-seg" role="group" aria-label="Who">
            {WHO.map((w) => (
              <button key={w.level} type="button" className={`pt-seg__b${level === w.level ? " is-on" : ""}`} aria-pressed={level === w.level} onClick={() => pick(w.level)}>{w.label}</button>
            ))}
          </div>
          <label className="pt-hire__field" htmlFor="hire-wage">
            <span>Pay an hour</span>
            <span className="pt-calc__field"><span className="pt-calc__post">$</span>
              <input id="hire-wage" type="number" min={0} step={0.5} value={wage} onChange={(e) => setWage(Math.max(0, Number(e.target.value) || 0))} />
            </span>
          </label>
          <label className="pt-hire__check" htmlFor="hire-van">
            <input id="hire-van" type="checkbox" checked={van} onChange={(e) => setVan(e.target.checked)} />
            {level === "apprentice" ? "Gets their own van" : "Needs their own van"}
          </label>
          <label className="pt-hire__field pt-hire__busy" htmlFor="hire-busy">
            <span>How busy we keep them <b>{busy}%</b></span>
            <input id="hire-busy" type="range" min={40} max={100} step={5} value={busy} onChange={(e) => setBusy(Number(e.target.value))} />
          </label>
        </div>
      </section>

      <div className="pt-hire__answers">
        <article className="pt-hire__card">
          <h3>Work to cover them</h3>
          <strong>{r.coverHrs != null ? `${h0(r.coverHrs / WORK_WEEKS)} hrs a week` : "—"}</strong>
          <p>
            {m0(r.addedCost / WORK_WEEKS)} of labour a week, {m0(r.addedCost)} a year
            {r.coverShare != null && <>, which is <b>{pc(r.coverShare)}</b> of the hours they {r.riding ? "are out on a crew" : "can bill"}</>}.
          </p>
        </article>
        <article className="pt-hire__card">
          <h3>Overheads go up</h3>
          <strong>{m0(r.overheadsUp)} a year</strong>
          <p>
            {r.overheadsUp > 1
              ? van ? "Fuel, insurance, rego and servicing for another van, and its depreciation." : "Their share of what grows with the crew."
              : "Nothing much — they ride with a tech, so no van comes with them."}
            {" "}On top of their pay of {m0(r.pay)} with super, WorkCover and leave.
          </p>
        </article>
        <article className="pt-hire__card">
          <h3>Van outlay</h3>
          {!van ? (
            <><strong>No van</strong><p>They ride with someone who already has one.</p></>
          ) : set.van ? (
            <><strong>{m0(r.upfront)} up front</strong><p>Then {m0(r.monthly)} a month on the finance — {m0(r.monthly * 12)} a year.</p></>
          ) : (
            <><strong>Not set yet</strong><p>Put what a new van costs on <a href="/portal/finance/capacity?part=vans">Our numbers → Vans &amp; loans</a>.</p></>
          )}
        </article>
        <article className={`pt-hire__card is-${r.profit >= 0 ? "good" : "bad"}`}>
          <h3>Profit in hiring them</h3>
          <strong><span aria-hidden="true">{r.profit >= 0 ? "▲ " : "▼ "}</span>{m0(r.profit)} a year</strong>
          <p>{m0(r.profit / WORK_WEEKS)} a working week, if they&rsquo;re {busy}% busy.{van && set.van ? ` After the van's repayments: ${m0(r.cashAfterVan)} a year in the bank.` : ""}</p>
        </article>
      </div>

      <section className="pt-panel" aria-labelledby="hire-how-h">
        <h2 id="hire-how-h" className="pt-panel__h">How that adds up</h2>
        <p className="pt-panel__sub">A {who} on {m0(wage)} an hour, {busy}% busy. The hour pays for the wages and overheads; the markup on materials and units is the profit.</p>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl pt-hire__table">
            <tbody>
              <tr><th scope="row">Their labour sold<em> {h0(r.hrsAvail * busy / 100)} hrs at {m0(r.priceHr)}{r.riding ? " on top of the tech's hour" : " an hour"}</em></th><td>{m0(r.labourSold)}</td></tr>
              <tr><th scope="row">Less their pay<em> with super, WorkCover, leave and their time off the tools</em></th><td>−{m0(r.pay)}</td></tr>
              {r.overheadsUp > 1 && <tr><th scope="row">Less the overheads that come with them<em> {van ? "the van's running and depreciation" : "what grows with the crew"}</em></th><td>−{m0(r.overheadsUp)}</td></tr>}
              <tr className="is-total"><th scope="row">What their hours make</th><td className={r.labourProfit >= 0 ? "is-good" : "is-bad"}>{m0(r.labourProfit)}</td></tr>
              <tr>
                <th scope="row">Markup on the materials and units they install
                  <em> {r.riding ? "none of their own — they help a tech who already buys them" : set.markup ? `one van's year from Our numbers, at ${busy}%` : "not set yet"}</em>
                </th>
                <td>{r.riding || set.markup ? `+${m0(r.markup)}` : <a href="/portal/finance/capacity?part=markup">Set it</a>}</td>
              </tr>
              <tr className="is-total"><th scope="row">Profit in hiring them</th><td className={r.profit >= 0 ? "is-good" : "is-bad"}>{m0(r.profit)}</td></tr>
              {van && set.van && (
                <>
                  <tr><th scope="row">Add back the van&rsquo;s depreciation<em> a cost on paper, not cash</em></th><td>+{m0(r.dep)}</td></tr>
                  <tr><th scope="row">Less the van&rsquo;s repayments<em> {m0(r.monthly)} a month</em></th><td>−{m0(r.monthly * 12)}</td></tr>
                  <tr className="is-total"><th scope="row">Cash left a year</th><td className={r.cashAfterVan >= 0 ? "is-good" : "is-bad"}>{m0(r.cashAfterVan)}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <p className="pt-hr__foot">
          {r.profit >= 0
            ? <>Hiring them {verdict} its way: it covers itself once they&rsquo;re {r.coverShare != null ? pc(r.coverShare) : "—"} busy, and every hour past that is profit.</>
            : <>At {busy}% busy they cost more than they bring in. They need to be at least {r.coverShare != null ? pc(r.coverShare) : "—"} busy before the markup on top is profit.</>}
          {r.paybackMonths != null && <> The van&rsquo;s {m0(r.upfront)} up front comes back in about {Math.ceil(r.paybackMonths)} months.</>}
          {" "}Every figure is from <a href="/portal/finance/capacity">Our numbers</a>; change them there.
        </p>
      </section>
    </div>
  );
}

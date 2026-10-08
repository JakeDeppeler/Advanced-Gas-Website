"use client";

import { useMemo, useState } from "react";
import { alwaysSupervised, computeCapacity, LEVEL_BILLABLE, type CapSettings, type CrewMember } from "@/lib/portal/crew";

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;

/**
 * Pace pay: everyone on the tools on one base wage, plus a share of what their
 * van brings in over the pace the business needs.
 *
 * "Brings in" is gross profit — the work billed before GST, less the parts,
 * equipment and subcontractors on it — because that is the part the crew's
 * effort moves; paying on sales would pay as much for a $9,000 unit as for
 * the day it took to fit it.
 *
 * The pace is what a van has to bring in a week to cover its share of every
 * wage and overhead at the new base, plus the business's margin on top. Below
 * it nobody earns commission and the business is where it would have been;
 * over it, every dollar is split — the crew's share and the business's share —
 * which is the point of it: the only commission ever paid is out of profit
 * that wasn't there before.
 */
export function CommissionModel({ people, settings, actualGp, gpSpan }: {
  people: CrewMember[]; settings: CapSettings;
  /** What each van brought in a week, after parts and subbies, over the last twelve months in Xero. */
  actualGp: number | null; gpSpan: string | null;
}) {
  const [base, setBase] = useState(45);
  const [pct, setPct] = useState(10);
  const [margin, setMargin] = useState(settings.margin);
  const [apprToo, setApprToo] = useState(false);

  const runsVan = (p: CrewMember) => LEVEL_BILLABLE[p.level] && p.costing.ownVan && (apprToo || !alwaysSupervised(p.level));

  const today = useMemo(() => computeCapacity(people, settings), [people, settings]);
  const moved = useMemo(
    () => people.map((p) => (runsVan(p) ? { ...p, costing: { ...p.costing, wage: base } } : p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [people, base, apprToo],
  );
  const cap = useMemo(() => computeCapacity(moved, settings), [moved, settings]);

  const vans = Math.max(1, cap.realVans);
  const weeks = settings.weeksYear;
  const costWeek = cap.totalCost / vans / weeks;
  const pace = costWeek * (1 + margin / 100);
  const todayCostWeek = today.totalCost / Math.max(1, today.realVans) / weeks;
  const [gp, setGp] = useState(() => Math.round((actualGp ?? pace) / 50) * 50);

  const commission = (g: number) => Math.max(0, g - pace) * (pct / 100);
  const bizYear = (g: number) => (g - costWeek - commission(g)) * vans * weeks;
  const todayBizYear = (g: number) => (g - todayCostWeek) * vans * weeks;
  const wageBill = (cs: CrewMember[]) => cs.filter(runsVan).reduce((a, p) => a + p.costing.wage * p.costing.hrsWeek * weeks, 0);
  const wageShift = wageBill(moved) - wageBill(people);

  // How much more a van has to bring in, over what it does now, before the
  // business is better off on pace pay than it is today.
  const evenLift = useMemo(() => {
    if (actualGp == null || actualGp <= 0) return null;
    const target = todayBizYear(actualGp);
    for (let lift = 0; lift <= 100; lift += 0.5) if (bizYear(actualGp * (1 + lift / 100)) >= target) return lift;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualGp, pace, pct, costWeek, todayCostWeek]);

  const levels = [
    { k: "Breaking even", g: costWeek },
    { k: "On pace", g: pace },
    ...(actualGp != null ? [{ k: "What a van does now", g: actualGp, now: true }] : []),
    { k: "10% over pace", g: pace * 1.1 },
    { k: "20% over pace", g: pace * 1.2 },
    { k: "30% over pace", g: pace * 1.3 },
    { k: "50% over pace", g: pace * 1.5 },
  ].sort((a, b) => a.g - b.g);

  const hrsWeek = 38;
  const comm = commission(gp);

  return (
    <div className="pt-wi">
      <section className="pt-panel" aria-labelledby="cm-set-h">
        <h2 id="cm-set-h" className="pt-panel__h">How it would work</h2>
        <p className="pt-panel__sub">
          Everyone running a van goes on the same base wage. Each van has a weekly pace: what it has to bring in, after parts,
          equipment and subbies, to pay its share of every wage and overhead and leave the business its margin. Over the pace,
          the crew in the van gets a share of every dollar. Under it, there&rsquo;s no commission and nothing is taken back.
        </p>
        <div className="pt-wi__knobs">
          <Knob id="cm-base" label="Base wage for everyone running a van" value={base} min={30} max={70} step={0.5} show={`$${base.toFixed(2)}/hr`} onChange={setBase} />
          <Knob id="cm-pct" label="Crew's share of everything over pace" value={pct} min={0} max={50} step={1} show={`${pct}%`} onChange={setPct} />
          <Knob id="cm-margin" label="Margin the pace is set at" value={margin} min={0} max={50} step={1} show={`${margin}%`} onChange={setMargin} />
        </div>
        <label className="pt-wi__check">
          <input id="cm-appr" type="checkbox" checked={apprToo} onChange={(e) => setApprToo(e.target.checked)} />
          Apprentices running their own van go on the base wage too
        </label>
        <div className="pt-rev__tiles">
          <div className="pt-rev__tile is-feature">
            <span className="pt-rev__k">A van&rsquo;s pace</span>
            <strong>{m0(pace)}</strong>
            <span className="pt-rev__sub">a week, after parts and subbies · {m0(pace / hrsWeek)} an hour on the clock</span>
          </div>
          <div className="pt-rev__tile">
            <span className="pt-rev__k">Breaking even</span>
            <strong>{m0(costWeek)}</strong>
            <span className="pt-rev__sub">a week covers the van&rsquo;s share of every cost, no profit</span>
          </div>
          <div className="pt-rev__tile">
            <span className="pt-rev__k">What a van does now</span>
            <strong>{actualGp != null ? m0(actualGp) : "—"}</strong>
            <span className="pt-rev__sub">{actualGp != null ? `a week on average, from Xero${gpSpan ? ` (${gpSpan})` : ""}` : "Xero isn't connected"}</span>
          </div>
          <div className="pt-rev__tile">
            <span className="pt-rev__k">Moving to ${base.toFixed(2)}</span>
            <strong>{wageShift === 0 ? "$0" : `${wageShift > 0 ? "+" : "−"}${m0(Math.abs(wageShift))}`}</strong>
            <span className="pt-rev__sub">a year on the wage bill, before any commission</span>
          </div>
        </div>
      </section>

      <section className="pt-panel" aria-labelledby="cm-try-h">
        <h2 id="cm-try-h" className="pt-panel__h">One van, one week</h2>
        <Knob id="cm-gp" label="What the van brings in this week, after parts and subbies" value={gp} min={Math.round(Math.min(costWeek * 0.6, actualGp ?? Infinity) / 50) * 50} max={Math.round(pace * 2 / 50) * 50} step={50} show={m0(gp)} onChange={setGp} />
        <div className="pt-two">
          <div className="pt-cm__side">
            <h3 className="pt-hr__h3">The tech</h3>
            <ul className="pt-rev__list">
              <li><span>Base, {hrsWeek} hours at ${base.toFixed(2)}</span><strong>{m0(base * hrsWeek)}</strong></li>
              <li><span>Commission<em>{gp > pace ? `${pct}% of the ${m0(gp - pace)} over pace` : "under pace, so none this week"}</em></span><strong className={comm > 0 ? "is-good" : undefined}>{comm > 0 ? `+${m0(comm)}` : "$0"}</strong></li>
              <li className="is-total"><span>Their week</span><strong>{m0(base * hrsWeek + comm)}</strong></li>
              <li><span>A year at this pace<em>{weeks} weeks</em></span><strong>{m0((base * hrsWeek + comm) * weeks)}</strong></li>
            </ul>
          </div>
          <div className="pt-cm__side">
            <h3 className="pt-hr__h3">The business</h3>
            <ul className="pt-rev__list">
              <li><span>The van brings in</span><strong>{m0(gp)}</strong></li>
              <li><span>Its share of every wage and overhead</span><strong>−{m0(costWeek)}</strong></li>
              <li><span>Commission</span><strong>{comm > 0 ? `−${m0(comm)}` : "$0"}</strong></li>
              <li className="is-total"><span>Profit from this van this week</span><strong className={gp - costWeek - comm < 0 ? "is-bad" : "is-good"}>{m0(gp - costWeek - comm)}</strong></li>
              <li><span>Every van at this pace, for a year</span><strong>{m0(bizYear(gp))}</strong></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="pt-panel" aria-labelledby="cm-tab-h">
        <h2 id="cm-tab-h" className="pt-panel__h">At every pace</h2>
        <p className="pt-panel__sub">Per van, per week, and the year across all {vans} vans. Of every extra dollar over pace, {pct} cents go to the crew and {100 - pct} stay in the business.</p>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl">
            <thead><tr><th scope="col">A van brings in a week</th><th scope="col">Tech&rsquo;s commission a week</th><th scope="col">Tech&rsquo;s extra a year</th><th scope="col">Business profit a year</th><th scope="col">Today&rsquo;s pay, same work</th></tr></thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.k} className={"now" in l && l.now ? "is-total" : undefined}>
                  <th scope="row">{m0(l.g)}<em> {l.k}</em></th>
                  <td>{commission(l.g) > 0 ? m0(commission(l.g)) : "—"}</td>
                  <td>{commission(l.g) > 0 ? m0(commission(l.g) * weeks) : "—"}</td>
                  <td className={bizYear(l.g) < 0 ? "is-bad" : undefined}>{m0(bizYear(l.g))}</td>
                  <td>{m0(todayBizYear(l.g))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-hr__foot">
          &ldquo;Today&rsquo;s pay, same work&rdquo; is the business&rsquo;s profit on today&rsquo;s wages with no commission, for the same work.{" "}
          {actualGp != null && (actualGp <= pace
            ? `Right now a van brings in ${m0(pace - actualGp)} a week less than pace, so no commission would be paid: it costs the business nothing until a van goes over, and from there ${100 - pct} cents of every extra dollar stay in the business.`
            : evenLift != null && evenLift > 0
              ? `The vans are already over pace, so commission would be paid on work they do today. It pays for itself once they bring in about ${evenLift}% more than now (${m0(actualGp * (1 + evenLift / 100))} a week).`
              : "")}
          {" "}Commission is worked out on the van, so a tech and an apprentice in one van share it however you decide.
        </p>
      </section>
    </div>
  );
}

function Knob({ id, label, value, min, max, step, show, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number; show: string; onChange: (n: number) => void;
}) {
  return (
    <div className="pt-wi__knob">
      <label htmlFor={id}><span>{label}</span><b>{show}</b></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

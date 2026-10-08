"use client";

import { useMemo, useState } from "react";
import {
  computeCapacity, defaultsFor, LEVEL_BILLABLE, LEVEL_LABEL, withVans,
  type CapSettings, type CrewLevel, type CrewMember,
} from "@/lib/portal/crew";

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const m2 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;

type Row = CrewMember & { on: boolean; added?: boolean };
const ADDABLE: CrewLevel[] = ["tradesman", "apprentice", "hybrid", "office", "admin"];

/**
 * The business with people added, taken away or paid differently, and a cut of
 * the profit taken out — set against how it stands today.
 *
 * Every figure is computeCapacity on a copy of the real crew and settings, so a
 * change here reads exactly as it would if it were made on Costs & capacity.
 * Nothing is saved. A van that comes or goes takes its own running costs with
 * it (withVans); the factory and the office stay where they are.
 */
export function CrewWhatIf({ people, settings, meId }: { people: CrewMember[]; settings: CapSettings; meId: string | null }) {
  const [rows, setRows] = useState<Row[]>(() => people.map((p) => ({ ...p, on: true })));
  const [margin, setMargin] = useState(settings.margin);
  const [cut, setCut] = useState(0);
  const [sold, setSold] = useState(100);
  const [addLevel, setAddLevel] = useState<CrewLevel>("tradesman");
  const [seq, setSeq] = useState(1);

  const base = useMemo(() => computeCapacity(people, settings), [people, settings]);
  const now = useMemo(() => outcome(base, settings, settings.margin, 0, 100), [base, settings]);

  const scen = useMemo(() => {
    const crew = rows.filter((r) => r.on).map(({ on: _on, added: _a, ...p }) => p);
    const first = computeCapacity(crew, settings);
    const s2 = withVans({ ...settings, margin }, base.realVans, first.realVans);
    const cap = computeCapacity(crew, s2);
    return { cap, s2, out: outcome(cap, s2, margin, cut, sold) };
  }, [rows, settings, margin, cut, sold, base.realVans]);
  const then = scen.out;

  // What the hour would have to be charged at for the business to keep what it
  // makes today, after the cut has come out.
  const keepCharge = then.hours > 0 && cut < 100
    ? (then.yearCost + now.left / (1 - cut / 100)) / then.hours
    : null;

  const changed = rows.some((r, i) => !r.on || r.added || r.costing.wage !== people[i]?.costing.wage || r.costing.ownVan !== people[i]?.costing.ownVan) || margin !== settings.margin || cut > 0 || sold !== 100;

  const set = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const setWage = (id: string, wage: number) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, costing: { ...r.costing, wage } } : r)));
  const add = () => {
    const costing = defaultsFor(addLevel);
    setRows((rs) => [...rs, { id: `new-${seq}`, name: `New ${LEVEL_LABEL[addLevel].toLowerCase()}`, level: addLevel, costing, on: true, added: true }]);
    setSeq((n) => n + 1);
  };
  const reset = () => { setRows(people.map((p) => ({ ...p, on: true }))); setMargin(settings.margin); setCut(0); setSold(100); };

  const rateNow = new Map(base.rates.map((r) => [r.id, r]));
  const rateThen = new Map(scen.cap.rates.map((r) => [r.id, r]));

  return (
    <div className="pt-wi">
      <section className="pt-panel" aria-labelledby="wi-crew-h">
        <h2 id="wi-crew-h" className="pt-panel__h">The crew</h2>
        <p className="pt-panel__sub">Take someone off, change what they&rsquo;re paid, or add someone new. Nothing here is saved.</p>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl pt-wi__crew">
            <thead><tr><th scope="col">Who</th><th scope="col">Wage an hour</th><th scope="col">Own van</th><th scope="col">Charged at now</th><th scope="col">Then</th><th scope="col"><span className="pt-sr">In or out</span></th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const a = rateNow.get(r.id), b = rateThen.get(r.id);
                const fmt = (x: typeof a) => (x?.rate != null ? m2(x.rate) : x?.uplift != null ? `+${m2(x.uplift)} on a crew` : LEVEL_BILLABLE[r.level] ? "—" : "overhead");
                return (
                  <tr key={r.id} className={r.on ? undefined : "is-off"}>
                    <th scope="row">{r.name}{r.id === meId && <em> you</em>}<em> {LEVEL_LABEL[r.level]}{r.added ? " · new" : ""}</em></th>
                    <td>
                      <span className="pt-calc__field pt-wi__wage">
                        <span className="pt-calc__post">$</span>
                        <input id={`wi-w-${r.id}`} type="number" min={0} step={0.5} value={r.costing.wage} disabled={!r.on}
                          onChange={(e) => setWage(r.id, Number(e.target.value) || 0)} aria-label={`${r.name}'s wage an hour`} />
                      </span>
                    </td>
                    <td>
                      {LEVEL_BILLABLE[r.level]
                        ? <input id={`wi-v-${r.id}`} type="checkbox" checked={r.costing.ownVan} disabled={!r.on} onChange={(e) => set(r.id, { costing: { ...r.costing, ownVan: e.target.checked } })} aria-label={`${r.name} runs their own van`} />
                        : "—"}
                    </td>
                    <td>{r.added ? "—" : fmt(a)}</td>
                    <td>{r.on ? fmt(b) : "gone"}</td>
                    <td>
                      {r.added
                        ? <button type="button" className="pt-todo__editbtn" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>Remove</button>
                        : <button type="button" className="pt-todo__editbtn" aria-pressed={!r.on} onClick={() => set(r.id, { on: !r.on })}>{r.on ? "Take off" : "Put back"}</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pt-wi__add">
          <label className="pt-jp__sel"><span>Add someone</span>
            <select id="wi-add-level" value={addLevel} onChange={(e) => setAddLevel(e.target.value as CrewLevel)}>
              {ADDABLE.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </label>
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={add}>+ Add</button>
          <span className="pt-wi__hint">Starts on the usual card for that level; change the wage above. A new tradesman comes with a van, and the van&rsquo;s running costs come with it.</span>
        </div>
      </section>

      <section className="pt-panel" aria-labelledby="wi-money-h">
        <h2 id="wi-money-h" className="pt-panel__h">The money</h2>
        <div className="pt-wi__knobs">
          <Knob id="wi-margin" label="Margin on every hour" value={margin} min={0} max={80} step={1} post="%" onChange={setMargin} />
          <Knob id="wi-cut" label="Cut of the profit taken out" value={cut} min={0} max={60} step={1} post="%" onChange={setCut}
            note="what goes to the owners, or into a bonus pool, before the rest stays in the business" />
          <Knob id="wi-sold" label="Billable hours actually sold" value={sold} min={40} max={100} step={1} post="%" onChange={setSold}
            note="100% is every hour the crew could bill; a real year sells fewer" />
        </div>
      </section>

      <section className="pt-panel" aria-labelledby="wi-out-h">
        <div className="pt-wi__outhead">
          <h2 id="wi-out-h" className="pt-panel__h">Today, and with these changes</h2>
          {changed && <button type="button" className="pt-todo__editbtn" onClick={reset}>Back to today</button>}
        </div>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl">
            <thead><tr><th scope="col"><span className="pt-sr">Measure</span></th><th scope="col">Today</th><th scope="col">What if</th><th scope="col">Change</th></tr></thead>
            <tbody>
              <Line label="Vans on the road" a={base.realVans} b={scen.cap.realVans} d={(n) => String(n)} />
              <Line label="Billable hours a year" a={now.hours} b={then.hours} d={h0} up="good" />
              <Line label="What an hour costs us" a={now.costPerHr} b={then.costPerHr} d={m2} up="bad" />
              <Line label="What we charge an hour" a={now.charge} b={then.charge} d={m2} />
              <Line label="What the year costs to run" note="every wage and every overhead" a={now.yearCost} b={then.yearCost} d={m0} up="bad" />
              <Line label="Labour sold in a year" note={`${sold}% of the billable hours, at the charge-out rate`} a={now.revenue} b={then.revenue} d={m0} up="good" />
              <Line label="Profit" a={now.profit} b={then.profit} d={m0} total up="good" />
              {cut > 0 && <Line label={`Your cut, ${cut}%`} a={0} b={then.cutAmt} d={m0} />}
              <Line label="Left in the business" a={now.left} b={then.left} d={m0} total up="good" />
            </tbody>
          </table>
        </div>
        {cut > 0 && keepCharge != null && (
          <p className="pt-hr__foot">
            To take {cut}% out and still leave {m0(now.left)} in the business, every hour would need to be charged at <strong>{m2(keepCharge)}</strong>, {keepCharge >= then.charge ? `${m2(keepCharge - then.charge)} more` : `${m2(then.charge - keepCharge)} less`} than the {m2(then.charge)} above.
          </p>
        )}
        <p className="pt-hr__foot">
          Labour only: the profit on parts and equipment is on top of this, and the materials themselves aren&rsquo;t in it. Wages carry super, WorkCover and long service leave; a van added or taken away brings or takes its fuel, insurance, servicing and depreciation.
        </p>
      </section>
    </div>
  );
}

type Out = { hours: number; costPerHr: number; charge: number; yearCost: number; revenue: number; profit: number; cutAmt: number; left: number };

function outcome(cap: ReturnType<typeof computeCapacity>, _s: CapSettings, margin: number, cut: number, sold: number): Out {
  const hours = cap.totalBillHrs;
  const charge = cap.costPerHr * (1 + margin / 100);
  const revenue = hours * (sold / 100) * charge;
  const profit = revenue - cap.totalCost;
  const cutAmt = profit > 0 ? profit * (cut / 100) : 0;
  return { hours, costPerHr: cap.costPerHr, charge, yearCost: cap.totalCost, revenue, profit, cutAmt, left: profit - cutAmt };
}

function Knob({ id, label, value, min, max, step, post, note, onChange }: {
  id: string; label: string; value: number; min: number; max: number; step: number; post: string; note?: string; onChange: (n: number) => void;
}) {
  return (
    <div className="pt-wi__knob">
      <label htmlFor={id}><span>{label}</span><b>{value}{post}</b></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {note && <em>{note}</em>}
    </div>
  );
}

function Line({ label, note, a, b, d, total, up }: { label: string; note?: string; a: number; b: number; d: (n: number) => string; total?: boolean; up?: "good" | "bad" }) {
  const diff = b - a;
  const same = Math.abs(diff) < 0.005;
  const better = up === "good" ? diff > 0 : up === "bad" ? diff < 0 : null;
  return (
    <tr className={total ? "is-total" : undefined}>
      <th scope="row">{label}{note && <em> {note}</em>}</th>
      <td>{d(a)}</td>
      <td>{d(b)}</td>
      <td className={same || better == null ? undefined : better ? "is-good" : "is-bad"}>
        {same ? "no change" : `${diff > 0 ? "▲ +" : "▼ −"}${d(Math.abs(diff))}`}
        {!same && better != null && <span className="pt-sr">{better ? " (better)" : " (worse)"}</span>}
      </td>
    </tr>
  );
}

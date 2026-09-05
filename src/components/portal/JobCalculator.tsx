"use client";

import { useMemo, useState } from "react";
import { CREW_LEVELS, LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";

export type CrewRate = {
  id: string; name: string; level: CrewLevel;
  /** null when they ride with a tech — on the job, but not a chargeable body. */
  rate: number | null;
};

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money2 = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parse = (v: string) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };

/**
 * The jobs that come up often enough to be worth a starting point. Hours and
 * minimum prices are Advanced Gas's own, so picking one lands you close before
 * you adjust for the actual site.
 */
const JOBS = [
  { k: "custom", label: "Something else", hrs: 2, min: 0 },
  { k: "evap1", label: "Evap service — single storey", hrs: 2, min: 300 },
  { k: "evap2", label: "Evap service — double storey", hrs: 2.5, min: 375 },
  { k: "heater", label: "Heater service", hrs: 1.5, min: 220 },
  { k: "ducted", label: "Ducted split service", hrs: 1.5, min: 220 },
  { k: "split", label: "Split system service", hrs: 1.5, min: 220 },
] as const;
type JobKey = (typeof JOBS)[number]["k"];

type MatLine = { id: number; what: string; cost: number; qty: number };

export function JobCalculator({ crew, costPerHr, calloutFee }: { crew: CrewRate[]; costPerHr: number | null; calloutFee: number }) {
  const [job, setJob] = useState<JobKey>("custom");
  const [sel, setSel] = useState<Record<string, number>>({});
  const [travelHrs, setTravelHrs] = useState(0);
  const [chargeTravel, setChargeTravel] = useState(true);
  const [afterHours, setAfterHours] = useState(false);
  const [callout, setCallout] = useState(calloutFee);
  const [manualRate, setManualRate] = useState(0);
  const [manualHrs, setManualHrs] = useState(0);
  const [mats, setMats] = useState<MatLine[]>([{ id: 1, what: "", cost: 0, qty: 1 }]);
  const [markup, setMarkup] = useState(20);
  const [discount, setDiscount] = useState(0);

  const chargeable = crew.filter((c) => c.rate !== null);
  const ridealong = crew.filter((c) => c.rate === null);

  function pickJob(k: JobKey) {
    setJob(k);
    const j = JOBS.find((x) => x.k === k);
    // Seed everyone already picked with the usual hours for that job.
    if (j && j.k !== "custom") setSel((s) => Object.fromEntries(Object.keys(s).map((id) => [id, j.hrs])));
  }

  const toggle = (id: string, on: boolean) => setSel((s) => {
    const next = { ...s };
    if (on) next[id] = next[id] ?? (JOBS.find((j) => j.k === job)?.hrs ?? 2);
    else delete next[id];
    return next;
  });
  const setHrs = (id: string, h: number) => setSel((s) => ({ ...s, [id]: h }));

  const lines = chargeable
    .filter((c) => sel[c.id] !== undefined)
    .map((c) => ({ ...c, hrs: sel[c.id] || 0, total: (c.rate as number) * (sel[c.id] || 0) }));

  const onSiteHrs = lines.reduce((a, l) => a + l.hrs, 0) + manualHrs;
  const billedTravel = chargeTravel ? travelHrs : 0;
  const topRate = lines.length ? Math.max(...lines.map((l) => l.rate as number)) : manualRate;

  const crewLabour = lines.reduce((a, l) => a + l.total, 0);
  const travelLabour = billedTravel * topRate;
  const manualLabour = manualRate * manualHrs;
  const labour = crewLabour + travelLabour + manualLabour;

  const matCost = mats.reduce((a, m) => a + m.cost * m.qty, 0);
  const matCharged = matCost * (1 + markup / 100);
  const calloutCharged = afterHours ? callout : 0;

  const beforeDiscount = labour + matCharged + calloutCharged;
  const discounted = beforeDiscount * (1 - discount / 100);
  const gst = discounted * 0.1;
  const total = discounted + gst;

  // What the job costs us: every hour anyone spends on it — travel included,
  // charged or not — at the true cost of an hour, plus materials at cost.
  const jobHours = onSiteHrs + travelHrs;
  const ourCost = costPerHr !== null ? jobHours * costPerHr + matCost : null;
  const profit = ourCost !== null ? discounted - ourCost : null;
  const marginPct = profit !== null && discounted > 0 ? (profit / discounted) * 100 : null;

  const jobDef = JOBS.find((j) => j.k === job);
  const underMin = jobDef && jobDef.min > 0 && discounted < jobDef.min;

  const addMat = () => setMats((m) => [...m, { id: Math.max(0, ...m.map((x) => x.id)) + 1, what: "", cost: 0, qty: 1 }]);
  const setMat = (id: number, patch: Partial<MatLine>) => setMats((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delMat = (id: number) => setMats((m) => (m.length === 1 ? m : m.filter((x) => x.id !== id)));

  const byLevel = useMemo(() => {
    const order = CREW_LEVELS.map((l) => l.key);
    return order
      .map((lv) => ({ level: lv, people: crew.filter((c) => c.level === lv) }))
      .filter((g) => g.people.length > 0);
  }, [crew]);

  return (
    <div className="pt-calc">
      <div className="pt-calc__inputs">
        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">What sort of job</h3>
          <div className="pt-job__jobs">
            {JOBS.map((j) => (
              <button key={j.k} type="button" className={`pt-job__job${job === j.k ? " is-on" : ""}`} onClick={() => pickJob(j.k)}>
                <strong>{j.label}</strong>
                {j.min > 0 && <span>from {money(j.min)} · {j.hrs} hrs</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">When</h3>
          <p className="pt-calc__hint">Business hours are 7am to 3:30pm. Anything outside that is a call-out.</p>
          <div className="pt-seg" role="group" aria-label="When">
            <button type="button" className={`pt-seg__b${afterHours ? "" : " is-on"}`} aria-pressed={!afterHours} onClick={() => setAfterHours(false)}>Business hours</button>
            <button type="button" className={`pt-seg__b pt-seg__b--repair${afterHours ? " is-on" : ""}`} aria-pressed={afterHours} onClick={() => setAfterHours(true)}>After hours</button>
          </div>
          {afterHours && (
            <div className="pt-calc__row" style={{ marginTop: 12 }}>
              <span>Call-out fee</span>
              <span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={callout} onChange={(e) => setCallout(parse(e.target.value))} /></span>
            </div>
          )}
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Who&rsquo;s on the job</h3>
          {crew.length === 0 ? (
            <p className="pt-calc__hint">No crew rates yet — set each person&rsquo;s level and numbers in <strong>Finance → Costs &amp; capacity</strong> and they&rsquo;ll show here. In the meantime, use the extra labour line below.</p>
          ) : (
            byLevel.map((g) => (
              <div key={g.level} className="pt-job__group">
                <div className="pt-job__grouph">{LEVEL_LABEL[g.level]}</div>
                <div className="pt-job__crew">
                  {g.people.map((c) => {
                    const rides = c.rate === null;
                    const on = sel[c.id] !== undefined;
                    return (
                      <div key={c.id} className={`pt-job__row${on ? " is-on" : ""}${rides ? " is-rides" : ""}`}>
                        <label className="pt-job__pick">
                          <input type="checkbox" checked={on} disabled={rides} onChange={(e) => toggle(c.id, e.target.checked)} />
                          <span className="pt-job__who">
                            <strong>{c.name}</strong>
                            <span>{rides ? "Rides with a tech — not charged separately" : `${money(c.rate as number)}/hr`}</span>
                          </span>
                        </label>
                        {on && !rides && (
                          <span className="pt-job__hrs">
                            <input type="number" min="0" step="0.5" value={sel[c.id]} onChange={(e) => setHrs(c.id, parse(e.target.value))} />
                            <span>hrs</span>
                            <strong>{money((c.rate as number) * (sel[c.id] || 0))}</strong>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          {ridealong.length > 0 && (
            <p className="pt-calc__hint pt-job__ridenote">
              Sending {ridealong.map((r) => r.name).join(" or ")} out with a tech doesn&rsquo;t change the price — their wage is already recovered inside the tech&rsquo;s rate, so billing for them charges the customer twice.
            </p>
          )}
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Travel</h3>
          <div className="pt-calc__row"><span>Time on the road <em>(both ways)</em></span><span className="pt-calc__field"><input type="number" min="0" step="0.25" value={travelHrs} onChange={(e) => setTravelHrs(parse(e.target.value))} /><span className="pt-calc__post">hrs</span></span></div>
          <div className="pt-seg" role="group" aria-label="Travel charging" style={{ marginTop: 10 }}>
            <button type="button" className={`pt-seg__b${chargeTravel ? " is-on" : ""}`} aria-pressed={chargeTravel} onClick={() => setChargeTravel(true)}>Charge it</button>
            <button type="button" className={`pt-seg__b pt-seg__b--repair${chargeTravel ? "" : " is-on"}`} aria-pressed={!chargeTravel} onClick={() => setChargeTravel(false)}>Wear it</button>
          </div>
          {!chargeTravel && travelHrs > 0 && (
            <p className="pt-calc__hint" style={{ marginTop: 8 }}>Still costs us {costPerHr !== null ? money(travelHrs * costPerHr) : "time"} — it comes out of the job&rsquo;s profit below.</p>
          )}
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Extra labour <em style={{ fontWeight: 400, color: "var(--pt-ink-3)" }}>(subbie or manual)</em></h3>
          <div className="pt-calc__row"><span>Rate</span><span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={manualRate} onChange={(e) => setManualRate(parse(e.target.value))} /><span className="pt-calc__post">/hr</span></span></div>
          <div className="pt-calc__row"><span>Hours</span><span className="pt-calc__field"><input type="number" min="0" step="0.5" value={manualHrs} onChange={(e) => setManualHrs(parse(e.target.value))} /><span className="pt-calc__post">hrs</span></span></div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Materials</h3>
          <div className="pt-job__mats">
            {mats.map((m) => (
              <div key={m.id} className="pt-job__mat">
                <input className="pt-job__matwhat" placeholder="What is it" value={m.what} onChange={(e) => setMat(m.id, { what: e.target.value })} />
                <span className="pt-calc__field"><span className="pt-calc__pre">$</span><input type="number" min="0" value={m.cost} onChange={(e) => setMat(m.id, { cost: parse(e.target.value) })} /></span>
                <span className="pt-calc__field"><span className="pt-calc__pre">×</span><input type="number" min="1" value={m.qty} onChange={(e) => setMat(m.id, { qty: parse(e.target.value) })} /></span>
                <button type="button" className="pf-x" aria-label="Remove line" onClick={() => delMat(m.id)}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={addMat} style={{ marginTop: 10 }}>+ Another line</button>
          <div className="pt-calc__row" style={{ marginTop: 12 }}><span>Markup on materials</span><span className="pt-calc__field"><input type="number" min="0" value={markup} onChange={(e) => setMarkup(parse(e.target.value))} /><span className="pt-calc__post">%</span></span></div>
          <div className="pt-calc__row"><span>Discount off the job</span><span className="pt-calc__field"><input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(parse(e.target.value))} /><span className="pt-calc__post">%</span></span></div>
        </div>
      </div>

      <div className="pt-calc__result">
        <div className="pt-calc__result-lead">Price for this job (inc GST)</div>
        <div className="pt-calc__big">{money(total)}</div>

        {underMin && (
          <div className="pt-job__flag is-warn">Under the {money(jobDef!.min)} minimum for a {jobDef!.label.toLowerCase()}.</div>
        )}

        <div className="pt-calc__breakdown">
          {lines.map((l) => (
            <div key={l.id}><span>{l.name} ({l.hrs} hrs)</span><strong>{money(l.total)}</strong></div>
          ))}
          {travelLabour > 0 && <div><span>Travel ({billedTravel} hrs)</span><strong>{money(travelLabour)}</strong></div>}
          {manualLabour > 0 && <div><span>Extra labour ({manualHrs} hrs)</span><strong>{money(manualLabour)}</strong></div>}
          <div className="pt-calc__break-total"><span>Labour</span><strong>{money(labour)}</strong></div>
          {matCost > 0 && <div><span>Materials + {markup}%</span><strong>{money(matCharged)}</strong></div>}
          {calloutCharged > 0 && <div><span>After-hours call-out</span><strong>{money(calloutCharged)}</strong></div>}
          {discount > 0 && <div><span>Discount {discount}%</span><strong>−{money(beforeDiscount - discounted)}</strong></div>}
          <div><span>GST 10%</span><strong>{money(gst)}</strong></div>
        </div>

        <div className="pt-calc__charge">
          <span>Total (inc GST)</span>
          <strong>{money(total)}</strong>
        </div>

        {ourCost !== null ? (
          <div className={`pt-job__worth${profit !== null && profit < 0 ? " is-bad" : marginPct !== null && marginPct < 15 ? " is-thin" : ""}`}>
            <div className="pt-job__worth-h">Is it worth doing</div>
            <div className="pt-job__worthrow"><span>{jobHours} hrs at {money2(costPerHr as number)} + materials</span><strong>{money(ourCost)}</strong></div>
            <div className="pt-job__worthrow"><span>You keep (ex GST)</span><strong>{money(profit as number)}</strong></div>
            <div className="pt-job__worthrow pt-job__worthrow--total">
              <span>Margin</span>
              <strong>{marginPct !== null ? `${Math.round(marginPct)}%` : "—"}</strong>
            </div>
            <p className="pt-job__verdict">
              {profit !== null && profit < 0
                ? "This job loses money at that price."
                : marginPct !== null && marginPct < 15
                  ? "Thin. It covers costs but there's little in it for the business."
                  : "Comfortably above what the hours cost to put on the road."}
            </p>
          </div>
        ) : (
          <p className="pt-calc__note">Set the crew up in <strong>Finance → Costs &amp; capacity</strong> to see what this job costs you and what&rsquo;s left in it.</p>
        )}

        <p className="pt-calc__note">A ballpark to quote from — confirm the final number on a written quote.</p>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NumField } from "@/components/portal/NumField";
import { money } from "@/lib/portal/format";
import { savePace } from "@/app/portal/finance/goals/actions";
import { currentYear, periodLabel, type PaceSettings, type YearBasis } from "@/lib/portal/yearGoal";
import {
  buildPace,
  STAGE_LABEL,
  STAGE_NOTE,
  STAGES,
  type PaceData,
  type PaceGoal,
  type Rate,
  type Stage,
  type Standing,
} from "@/lib/dashboard/pace";
import type { JobProfit, ProfitSummary } from "@/lib/dashboard/jobProfit";

/** "$3.2M", "$750K" — a goal as people say it. */
function short(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(Math.round((n / 1_000_000) * 100) / 100).toString()}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`;
  return money(n);
}

/** Whole jobs from ten up; a tenth below, because "0 a day" hides 0.4. */
function jobs(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10) return Math.round(n).toLocaleString("en-AU");
  const r = Math.round(n * 10) / 10;
  return r.toLocaleString("en-AU", { maximumFractionDigits: 1 });
}

/** "$60.6K" — money at the size of a card. */
const kilo = (n: number) => (Math.abs(n) >= 10_000 ? `$${(Math.round(n / 100) / 10).toLocaleString("en-AU")}K` : money(n));

const pc = (n: number | null | undefined, dp = 0) =>
  n == null ? "—" : `${(n * 100).toLocaleString("en-AU", { maximumFractionDigits: dp, minimumFractionDigits: 0 })}%`;

/** A stage's figure: money for sold-as-dollars and invoiced, jobs otherwise. */
const isMoney = (s: Stage) => s === "invoiced";

function fig(s: Stage, n: number | null | undefined): string {
  if (n == null) return "—";
  return isMoney(s) ? money(n) : jobs(n);
}

/**
 * The words on a verdict, never the colour alone: a glyph, the word, and the
 * size of the gap. The glyphs differ in shape as well as direction so the
 * three states separate in greyscale and under any colour vision.
 */
function Verdict({ s, stage, partial }: { s: Standing; stage: Stage; partial?: boolean }) {
  if (partial) return <span className="pt-pace__v is-none">Phone calls aren&rsquo;t counted</span>;
  if (s.verdict == null || s.gap == null) return <span className="pt-pace__v is-none">Not enough to say</span>;
  const size = isMoney(stage) ? money(Math.abs(s.gap)) : jobs(Math.abs(s.gap));
  if (s.verdict === "on") return <span className="pt-pace__v is-on"><i aria-hidden="true">●</i> On pace</span>;
  if (s.verdict === "ahead") return <span className="pt-pace__v is-ahead"><i aria-hidden="true">▲</i> Ahead by {size}</span>;
  return <span className="pt-pace__v is-behind"><i aria-hidden="true">▼</i> Behind by {size}</span>;
}

/** Moved closer to the line or further from it, in words. */
function Drift({ now, then, label }: { now: number; then: number | null; label: string }) {
  if (then == null) return null;
  const d = now - then;
  const word = Math.abs(d) < 1 ? "No change" : d > 0 ? `${money(d)} better` : `${money(-d)} worse`;
  return (
    <div className="pt-pace__drift">
      <span>{label}</span>
      <strong className={Math.abs(d) < 1 ? "" : d > 0 ? "is-up" : "is-down"}>
        <i aria-hidden="true">{Math.abs(d) < 1 ? "●" : d > 0 ? "▲" : "▼"}</i> {word}
      </strong>
      <em>{then >= 0 ? `${money(then)} ahead then` : `${money(-then)} behind then`}</em>
    </div>
  );
}

function rateLine(r: Rate, show: (n: number) => string, measuredWord = "measured"): string {
  if (r.set) return r.measured != null ? `you set this · ${measuredWord} ${show(r.measured)}` : "you set this";
  return r.measured != null ? measuredWord : "not enough to measure yet";
}

export function PacePlanner({
  goal: savedGoal,
  sample,
  settings: savedSettings,
  data,
  profit,
  canSave,
}: {
  goal: PaceGoal;
  /** No goal is saved: these are the figures asked for, not yet on the wall. */
  sample: boolean;
  settings: PaceSettings;
  data: PaceData | null;
  profit: { summary: ProfitSummary; worst: JobProfit[] } | null;
  canSave: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [goal, setGoal] = useState<PaceGoal>(savedGoal);
  const [s, setS] = useState<PaceSettings>(savedSettings);
  const [editing, setEditing] = useState(sample);
  const [dirty, setDirty] = useState(sample);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const v = useMemo(() => (data ? buildPace(goal, s, data) : null), [goal, s, data]);
  const now = new Date();
  const label = periodLabel(goal);
  const g = (patch: Partial<PaceGoal>) => { setGoal((p) => ({ ...p, ...patch })); setDirty(true); setMsg(null); };
  const set = (patch: Partial<PaceSettings>) => { setS((p) => ({ ...p, ...patch })); setDirty(true); setMsg(null); };
  const num = (raw: string) => (raw.trim() === "" ? null : Number(raw.replace(/,/g, "")));
  const asFrac = (raw: string) => { const n = num(raw); return n == null || !Number.isFinite(n) || n <= 0 ? null : Math.min(100, n) / 100; };

  function save() {
    setMsg(null);
    start(async () => {
      const res = await savePace({
        revenue: goal.revenue,
        profitPct: goal.profitPct ?? null,
        basis: goal.basis,
        year: goal.year,
        pace: s,
      });
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setDirty(false);
      setEditing(false);
      setMsg({ ok: true, text: "Saved. The wall board paces against it from its next refresh." });
      router.refresh();
    });
  }

  const y = v?.yearView ?? null;
  const cal = data?.calendar;
  const monthName = data ? new Date(`${data.today}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" }) : "";
  const asOf = data ? new Date(data.asOf).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" }) : null;
  const m = data?.measured ?? null;
  // The year's lanes at a week of this month's plan.
  const weekly = (n: number | null) => (n == null || !v || !(v.goal > 0) || v.week.invoiced.value == null ? null : (n * v.week.invoiced.value) / v.goal);

  return (
    <div className="pt-pace">
      <div className="pt-head pt-head--split">
        <div>
          <h1>{goal.revenue > 0 ? `${short(goal.revenue)}${goal.profitPct ? ` at ${goal.profitPct}%` : ""}` : "Pace"}</h1>
          <p>
            What the goal takes at every step — leads, bookings, quotes, sales, jobs done and invoices — and whether
            each one is keeping up. {label}{asOf ? `, as of ${asOf}` : ""}. Money includes GST.
          </p>
        </div>
        <button type="button" className="pt-btn pt-btn--ghost pt-pace__edit" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          {editing ? "Done" : "Change the goal"}
        </button>
      </div>

      {sample && (
        <div className="pt-note pt-pace__note">
          <strong>Not saved yet.</strong> These are the figures you asked for — {short(goal.revenue)} at {goal.profitPct}% for {label}.
          Press <strong>Save</strong> and the wall board starts pacing against them.
        </div>
      )}

      {editing && (
        <section className="pt-panel pt-pace__form" aria-label="The goal">
          <NumField label="Turnover goal" hint="for the year, including GST" prefix="$" value={goal.revenue ? String(goal.revenue) : ""} onChange={(raw) => g({ revenue: num(raw) ?? 0 })} />
          <NumField label="Profit to keep" hint="of the price before GST" suffix="%" decimal value={goal.profitPct == null ? "" : String(goal.profitPct)} onChange={(raw) => g({ profitPct: num(raw) })} />
          <label className="pt-field">
            <span>Year</span>
            <select value={`${goal.basis}:${goal.year}`} onChange={(e) => { const [b, yr] = e.target.value.split(":"); g({ basis: b as YearBasis, year: Number(yr) }); }}>
              {(["financial", "calendar"] as YearBasis[]).flatMap((b) => [0, 1].map((d) => {
                const yr = currentYear(b, now) + d;
                return <option key={`${b}${yr}`} value={`${b}:${yr}`}>{periodLabel({ basis: b, year: yr })}{b === "financial" ? " (July to June)" : " (calendar)"}</option>;
              }))}
            </select>
          </label>
          <NumField label="Leads that book" hint="nothing measures this yet" suffix="%" decimal value={s.bookRate == null ? "" : String(Math.round(s.bookRate * 1000) / 10)} onChange={(raw) => set({ bookRate: asFrac(raw) })} placeholder="e.g. 70" />
          <NumField label="Plan on a close rate" hint={v?.rates.closeRate.measured != null ? `measured ${pc(v.rates.closeRate.measured)} — leave blank to use it` : "leave blank to use the measured one"} suffix="%" decimal value={s.closeRate == null ? "" : String(Math.round(s.closeRate * 1000) / 10)} onChange={(raw) => set({ closeRate: asFrac(raw) })} />
          <NumField label="Plan on an average sale" hint={v?.rates.avgSale.measured != null ? `measured ${money(v.rates.avgSale.measured)} — leave blank to use it` : "leave blank to use the measured one"} prefix="$" value={s.avgSale == null ? "" : String(Math.round(s.avgSale))} onChange={(raw) => { const n = num(raw); set({ avgSale: n && n > 0 ? n : null }); }} />
          {canSave && (
            <div className="pt-pace__save">
              <button type="button" className="pt-btn pt-btn--orange" onClick={save} disabled={busy || !dirty || !(goal.revenue > 0)}>
                {busy ? "Saving…" : "Save"}
              </button>
              <span role="status" className={msg ? (msg.ok ? "pt-pace__ok" : "pt-pace__err") : "pt-pace__hint"}>
                {msg ? msg.text : dirty ? "Every figure below already shows this. Save puts it on the wall." : "Saved for everyone."}
              </span>
            </div>
          )}
        </section>
      )}
      {!editing && msg && <p className={msg.ok ? "pt-pace__ok" : "pt-pace__err"} role="status">{msg.text}</p>}

      {!data ? (
        <div className="pt-note pt-note--warn">
          <strong>No figures yet.</strong> The board hasn&rsquo;t taken a snapshot from ServiceTitan, so there&rsquo;s nothing to pace. It does every ten minutes once the sync is running.
        </div>
      ) : !v ? (
        <div className="pt-note pt-note--warn">
          <strong>The goal doesn&rsquo;t cover today.</strong> Pick {periodLabel({ basis: goal.basis, year: currentYear(goal.basis, now) })} under <em>Year</em> above.
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------- the year */}
          <section className={`pt-pace__year ${y && y.gap < 0 ? "is-behind" : "is-ahead"}`} aria-label="The year">
            {y ? (
              <>
                <div className="pt-pace__yearmain">
                  <span className="pt-pace__eyebrow">The year · {y.label}</span>
                  <strong className="pt-pace__gap">
                    {Math.abs(y.gap) < y.goal * 0.005 ? "On pace" : y.gap < 0 ? `${money(-y.gap)} behind` : `${money(y.gap)} ahead`}
                  </strong>
                  <p>
                    {money(y.ytd)} invoiced of {money(y.goal)}. The goal says {money(y.byNow)} by now.
                  </p>
                  <span className="pt-pace__track" aria-hidden="true">
                    <i style={{ width: `${Math.min(100, (y.ytd / y.goal) * 100)}%` }} />
                    <b style={{ left: `${Math.min(100, (y.byNow / y.goal) * 100)}%` }} />
                  </span>
                  <span className="pt-pace__trackkey">
                    <span>Bar: invoiced so far</span>
                    <span>Line: where the goal says we should be</span>
                  </span>
                </div>
                <div className="pt-pace__yearside">
                  <Drift now={y.gap} then={y.gapYesterday} label="Since yesterday" />
                  <Drift now={y.gap} then={y.gapLastWeek} label="Since last week" />
                  <div className="pt-pace__drift">
                    <span>{y.gap < 0 ? "To get back on track" : "To stay on track"}</span>
                    <strong>{y.weekNeeded == null ? "—" : `${money(y.weekNeeded)} a week`}</strong>
                    <em>
                      {y.weekPlanned == null ? "" : `against ${money(y.weekPlanned)} planned for ${monthName}`}
                      {y.catchUp != null && y.catchUp > 1.005 ? ` — every stage ×${y.catchUp.toFixed(2)}` : ""}
                    </em>
                  </div>
                </div>
                {y.landing != null && (
                  <p className="pt-pace__landing">
                    At the last four weeks&rsquo; rate the year lands at <strong>{short(y.landing)}</strong>
                    {y.landing < y.goal ? `, ${short(y.goal - y.landing)} short` : `, ${short(y.landing - y.goal)} over`}. That rate doesn&rsquo;t allow for the season.
                  </p>
                )}
              </>
            ) : (
              <p className="pt-pace__landing">Save the goal and the year&rsquo;s running total starts from the next snapshot.</p>
            )}
          </section>

          {/* ---------------------------------------------------- the week */}
          <div className="pt-pace__sech">
            <h2>This week</h2>
            <span>
              {cal ? `Day ${Math.min(cal.week.total, cal.week.elapsed + 1)} of ${cal.week.total}` : ""} · what each step needs this week, and where it&rsquo;s up to
            </span>
          </div>
          <ol className="pt-pace__chain">
            {STAGES.map((st) => {
              const w = v.standing.week[st];
              const partial = st === "leads";
              const need = st === "invoiced" ? v.week.invoiced.value : v.week[st].count;
              const last = st === "invoiced" ? v.lastWeek.invoiced : v.lastWeek[st];
              return (
                <li key={st} className={`pt-pace__stage${w.verdict ? ` is-${w.verdict}` : ""}`}>
                  <span className="pt-pace__k">{STAGE_LABEL[st]}</span>
                  <span className="pt-pace__note2">{STAGE_NOTE[st]}</span>
                  <strong className={`pt-pace__need${isMoney(st) ? " is-money" : ""}`}>
                    {/* Thousands on the card, where a full figure wraps a
                        sixth of the page wide; the table has every digit. */}
                    {need == null ? "—" : isMoney(st) ? kilo(need) : jobs(need)}
                    {need != null && <small> a week</small>}
                  </strong>
                  {need == null && st === "leads" && <span className="pt-pace__why">Set the share of leads that book</span>}
                  {need == null && st !== "leads" && <span className="pt-pace__why">Not enough history to work out yet</span>}
                  <span className="pt-pace__done">
                    <b>{fig(st, w.done)}</b> so far{w.byNow != null && need != null ? ` · ${fig(st, w.byNow)} by now` : ""}
                  </span>
                  <Verdict s={w} stage={st} partial={partial} />
                  {w.verdict === "behind" && w.perDayLeft != null && cal && cal.week.remaining > 0 && (
                    <span className="pt-pace__catch">{fig(st, w.perDayLeft)} a day to land the week</span>
                  )}
                  <span className="pt-pace__last">Last week {fig(st, last)}</span>
                  {st === "sold" && v.week.sold.value != null && (
                    <span className="pt-pace__last">{money(v.week.sold.value)} sold a week · {money(v.thisWeek.soldValue ?? 0)} so far</span>
                  )}
                </li>
              );
            })}
          </ol>

          {/* ---------------------------------------------------- the plan */}
          <section className="pt-panel pt-pace__plan">
            <div className="pt-pace__sech pt-pace__sech--in">
              <h2>What it takes</h2>
              <span>The goal worked back through each step, and {monthName} so far</span>
            </div>
            <div className="pt-pace__tablewrap">
              <table className="pt-pace__table">
                <thead>
                  <tr>
                    <th scope="col">Step</th>
                    <th scope="col">A year</th>
                    <th scope="col">{monthName}</th>
                    <th scope="col">A week</th>
                    <th scope="col">A day</th>
                    <th scope="col">{monthName} so far</th>
                    <th scope="col">Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {STAGES.map((st) => {
                    const val = (p: typeof v.year) => (st === "invoiced" ? p.invoiced.value : p[st].count);
                    const mo = v.standing.month[st];
                    return (
                      <tr key={st}>
                        <th scope="row">
                          <span className="pt-pace__rk">{STAGE_LABEL[st]}</span>
                          <span className="pt-pace__rn">{STAGE_NOTE[st]}</span>
                        </th>
                        <td>{fig(st, val(v.year))}</td>
                        <td>{fig(st, val(v.month))}</td>
                        <td className="is-strong">{fig(st, val(v.week))}</td>
                        <td>{fig(st, val(v.day))}</td>
                        <td>{fig(st, mo.done)}</td>
                        <td><Verdict s={mo} stage={st} partial={st === "leads"} /></td>
                      </tr>
                    );
                  })}
                  <tr className="pt-pace__sub">
                    <th scope="row"><span className="pt-pace__rn">Sold, in dollars</span></th>
                    <td>{v.year.sold.value == null ? "—" : money(v.year.sold.value)}</td>
                    <td>{v.month.sold.value == null ? "—" : money(v.month.sold.value)}</td>
                    <td className="is-strong">{v.week.sold.value == null ? "—" : money(v.week.sold.value)}</td>
                    <td>{v.day.sold.value == null ? "—" : money(v.day.sold.value)}</td>
                    <td>{data.periods.month.soldValue == null ? "—" : money(data.periods.month.soldValue)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="pt-pace__foot">
              A week of it is {jobs(weekly(v.lanes.quoteVisits))} quote visits and {jobs(weekly(v.lanes.serviceBooked))} service calls booked,
              and {jobs(weekly(v.lanes.installs))} installs and {jobs(weekly(v.lanes.serviceJobs))} service jobs done. Each month is planned at its share of the year
              {goal.shape ? ", as shaped on Finance · The year" : " — an even twelfth until the year is shaped on Finance · The year"}.
            </p>
          </section>

          {/* ---------------------------------------------------- the rates */}
          <section className="pt-panel pt-pace__rates">
            <div className="pt-pace__sech pt-pace__sech--in">
              <h2>The rates it&rsquo;s built on</h2>
              <span>
                {m ? `Measured ${fmtDay(m.from)} to ${fmtDay(m.to)} — ${jobs(m.weeks)} working weeks since ServiceTitan went live` : "Nothing measured yet"}
              </span>
            </div>
            <div className="pt-pace__rategrid">
              <RateTile label="Leads that book" value={pc(v.rates.bookRate.value)} line={v.rates.bookRate.set ? "you set this" : "set it under Change the goal"} sub={`Calls aren't recorded anywhere this can read${data.calls ? ` — ServiceTitan's phone log has ${data.calls} in this window` : ""}, so it can't be measured.`} unset={v.rates.bookRate.value == null} />
              <RateTile label="Close rate" value={pc(v.rates.closeRate.value)} line={rateLine(v.rates.closeRate, (n) => pc(n))} sub={m ? `${m.sold} of ${m.quoted} jobs quoted said yes. Per job, not per option.` : ""} />
              <RateTile label="Average sale" value={v.rates.avgSale.value == null ? "—" : money(v.rates.avgSale.value)} line={rateLine(v.rates.avgSale, money)} sub={m ? `${money(m.soldValue)} across ${m.sold} jobs sold, including GST.` : ""} />
              <RateTile label="Through a quote" value={pc(v.rates.soldShare.value)} line="measured" sub="Of everything invoiced, the share on install and quote jobs. The rest is service and repairs." />
              <RateTile label="Quote visits per job quoted" value={v.rates.visitsPerQuote.value == null ? "—" : v.rates.visitsPerQuote.value.toFixed(2)} line="measured" sub={m ? `${m.quoteVisits} visits booked for ${m.quoted} jobs quoted — some get priced on a service call.` : ""} />
              <RateTile label="A service job" value={v.rates.avgService.value == null ? "—" : money(v.rates.avgService.value)} line="measured" sub={m ? `${money(m.serviceInvoiced)} over ${m.serviceCompleted} done. $0 warranty and follow-up calls are in it — they still take a booking.` : ""} />
              <RateTile label="Service calls that go ahead" value={pc(v.rates.serviceCompletion.value)} line="measured" sub={m ? `${m.serviceCompleted} done for ${m.serviceBooked} booked.` : ""} />
            </div>
            <p className="pt-pace__foot">
              Change a rate under <strong>Change the goal</strong> and every figure on this page moves with it — try a 30% close rate and
              see how many fewer quotes it takes. Nothing reaches the wall until it&rsquo;s saved.
            </p>
          </section>

          {/* ---------------------------------------------------- profit */}
          <section className="pt-panel pt-pace__profit">
            <div className="pt-pace__sech pt-pace__sech--in">
              <h2>Is the profit there?</h2>
              <span>{monthName}&rsquo;s jobs, before GST · <Link href="/portal/profit">every job</Link></span>
            </div>
            {!profit ? (
              <p className="pt-pace__foot">Couldn&rsquo;t read this month&rsquo;s invoices.</p>
            ) : (
              <>
                <div className="pt-pace__pfigs">
                  <div className={`pt-pace__pfig is-feature`}>
                    <span>Margin on costed jobs</span>
                    <strong>{pc(profit.summary.margin)}</strong>
                    <em>
                      {profit.summary.margin == null
                        ? `${profit.summary.costed} costed so far — needs five`
                        : goal.profitPct
                          ? profit.summary.margin >= goal.profitPct / 100 ? `at or over the ${goal.profitPct}% goal` : `under the ${goal.profitPct}% goal`
                          : "no profit goal set"}
                    </em>
                  </div>
                  <div className="pt-pace__pfig">
                    <span>Profit on them</span>
                    <strong>{money(profit.summary.profit)}</strong>
                    <em>on {money(profit.summary.revenue)} of work</em>
                  </div>
                  <div className="pt-pace__pfig">
                    <span>Under {goal.profitPct ?? "—"}%</span>
                    <strong>{profit.summary.under}</strong>
                    <em>{profit.summary.losing ? `${profit.summary.losing} losing money` : "none losing money"}</em>
                  </div>
                  <div className="pt-pace__pfig">
                    <span>Couldn&rsquo;t be costed</span>
                    <strong>{profit.summary.jobs - profit.summary.costed}</strong>
                    <em>{money(profit.summary.uncostedRevenue)} of work · see why on every job</em>
                  </div>
                </div>
                {profit.worst.length > 0 && (
                  <div className="pt-pace__tablewrap">
                    <table className="pt-pace__table pt-pace__table--jobs">
                      <thead>
                        <tr><th scope="col">Lowest margins</th><th scope="col">Price</th><th scope="col">Parts</th><th scope="col">Hours</th><th scope="col">Profit</th><th scope="col">Margin</th></tr>
                      </thead>
                      <tbody>
                        {profit.worst.map((j) => (
                          <tr key={`${j.jobId}-${j.date}`}>
                            <th scope="row">
                              <span className="pt-pace__rk">{j.jobType ?? "Job"}</span>
                              <span className="pt-pace__rn">{[j.jobNumber ? `#${j.jobNumber}` : null, j.customer, fmtDay(j.date)].filter(Boolean).join(" · ")}</span>
                            </th>
                            <td>{money(j.price)}</td>
                            <td>{money(j.materials)}</td>
                            <td>{j.hours == null ? "—" : `${j.hours.toLocaleString("en-AU", { maximumFractionDigits: 1 })}${j.hoursFrom === "sold" ? " sold" : ""}`}</td>
                            <td>{j.profit == null ? "—" : money(j.profit)}</td>
                            <td className={j.margin != null && goal.profitPct != null && j.margin < goal.profitPct / 100 ? "is-low" : ""}>
                              {pc(j.margin)}{j.margin != null && goal.profitPct != null && j.margin < goal.profitPct / 100 ? " ▼" : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="pt-pace__foot">
                  Price before GST, less the equipment and materials cost on the invoice, less the hours at{" "}
                  {profit.summary.costPerHr != null ? `${money(profit.summary.costPerHr)} an hour` : "the crew's cost an hour"} — wages plus each hour&rsquo;s share of
                  the overheads, from Costs &amp; capacity. {profit.summary.fromTimesheets ? `${profit.summary.fromTimesheets} jobs use clocked hours; the rest use the hours sold.` : "Hours are the hours each job was sold with until ServiceTitan's timesheets come through."}
                </p>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function RateTile({ label, value, line, sub, unset }: { label: string; value: string; line: string; sub: string; unset?: boolean }) {
  return (
    <div className={`pt-pace__rate${unset ? " is-unset" : ""}`}>
      <span className="pt-pace__rlabel">{label}</span>
      <strong>{value}</strong>
      <span className="pt-pace__rline">{line}</span>
      <p>{sub}</p>
    </div>
  );
}

function fmtDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
}

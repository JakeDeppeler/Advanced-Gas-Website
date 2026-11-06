"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NumField } from "@/components/portal/NumField";
import { money } from "@/lib/portal/format";
import { savePace } from "@/app/portal/finance/goals/actions";
import { currentYear, periodLabel, yearSpans, type PaceSettings, type YearBasis } from "@/lib/portal/yearGoal";
import { Card, Grid, Hero, Pair, Say, Bad, Good, Tile, type Status } from "@/components/portal/kit/Kit";
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

/** "$3.2M", "$750K" — a goal as people say it. */
function short(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(Math.round((n / 1_000_000) * 100) / 100).toString()}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`;
  return money(n);
}

/** Whole jobs from ten up; a tenth below, because "0 a day" hides 0.4. */
function jobs(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 10) return Math.round(n).toLocaleString("en-AU");
  const r = Math.round(n * 10) / 10;
  return r.toLocaleString("en-AU", { maximumFractionDigits: 1 });
}

const pc = (n: number | null | undefined, dp = 0) =>
  n == null ? "" : `${(n * 100).toLocaleString("en-AU", { maximumFractionDigits: dp, minimumFractionDigits: 0 })}%`;

/** A stage's figure: money for sold-as-dollars and invoiced, jobs otherwise. */
const isMoney = (s: Stage) => s === "invoiced";

function fig(s: Stage, n: number | null | undefined): string {
  if (n == null) return "";
  return isMoney(s) ? money(n) : jobs(n);
}

/**
 * A step's standing as a pill: a glyph, the word and the size of the gap,
 * never the colour alone. Leads get no verdict, because phone calls aren't
 * counted and "behind" would be a statement about the data.
 */
function pill(s: Standing | null, stage: Stage): Status {
  if (!s || s.verdict == null || s.gap == null) return { k: "none", w: stage === "leads" ? "Calls not counted" : "Not enough to say" };
  const size = isMoney(stage) ? money(Math.abs(s.gap)) : jobs(Math.abs(s.gap));
  if (s.verdict === "on") return { k: "good", w: "On pace", s: "●" };
  return s.verdict === "ahead" ? { k: "good", w: `Ahead by ${size}`, s: "▲" } : { k: "bad", w: `Behind by ${size}`, s: "▼" };
}

/** The four steps that get a tile: leads are left to the table, invoiced has the big figure. */
const TILE_STAGES: Stage[] = ["booked", "quoted", "sold", "completed"];


function rateLine(r: Rate, show: (n: number) => string, measuredWord = "measured"): string {
  if (r.set) return r.measured != null ? `you set this · ${measuredWord} ${show(r.measured)}` : "you set this";
  return r.measured != null ? measuredWord : "not enough to measure yet";
}

export function PacePlanner({
  goal: savedGoal,
  sample,
  settings: savedSettings,
  data,
  canSave,
  view = "week",
  lower = null,
}: {
  goal: PaceGoal;
  /** The lower of the two year goals ($2.5M under $3M), named over the title beside it. */
  lower?: number | null;
  /** No goal is saved: these are the figures asked for, not yet on the wall. */
  sample: boolean;
  settings: PaceSettings;
  data: PaceData | null;
  canSave: boolean;
  /**
   * Which of Pace's three tabs. They're one layout at three time frames: the
   * money invoiced against the goal, what it takes to land it, the four steps
   * that feed it, and the goal worked back through every step. The month used
   * to carry its sold jobs and their margins, and the year a chart from Xero;
   * those are Jobs › Job profit and Finance, and three different pages under
   * one tab was what made Pace hard to read.
   */
  view?: "week" | "month" | "year";
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

  const cal = data?.calendar;
  const monthName = data ? new Date(`${data.today}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" }) : "";
  const asOf = data ? new Date(data.asOf).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" }) : null;
  const m = data?.measured ?? null;
  // The year's lanes at a week of this month's plan.
  const weekly = (n: number | null) => (n == null || !v || !(v.goal > 0) || v.week.invoiced.value == null ? null : (n * v.week.invoiced.value) / v.goal);

  // The period, said the way people say it, and how far through it we are.
  const span = data ? yearSpans(goal.basis, goal.year) : [];
  const yearFrom = span[0]?.from, yearTo = span[span.length - 1]?.to;
  const yearDone = data && yearFrom && yearTo ? (Date.parse(`${data.today}T12:00:00Z`) - Date.parse(`${yearFrom}T00:00:00Z`)) / (Date.parse(`${yearTo}T23:59:59Z`) - Date.parse(`${yearFrom}T00:00:00Z`)) : null;
  const monthIn = data ? span.findIndex((x) => data.today >= x.from && data.today <= x.to) + 1 : 0;
  const words = view === "week" ? { the: "the week", now: "this week" } : view === "month" ? { the: monthName, now: `in ${monthName}` } : { the: "the year", now: `in ${label}` };
  const time = !cal ? null
    : view === "week" ? { at: `day ${Math.min(cal.week.total, cal.week.elapsed + 1)} of ${cal.week.total}`, frac: cal.week.total ? cal.week.elapsed / cal.week.total : null, left: cal.week.remaining }
    : view === "month" ? { at: `day ${Math.min(cal.month.total, cal.month.elapsed + 1)} of ${cal.month.total}`, frac: cal.month.total ? cal.month.elapsed / cal.month.total : null, left: cal.month.remaining }
    : { at: monthIn > 0 ? `month ${monthIn} of ${span.length}` : "", frac: yearDone, left: null };

  return (
    <div className="pk pt-pace">
      <div className="pk-head">
        <div>
          <div className="pk-eyebrow">
            {goal.revenue > 0 ? <>{lower && lower > 0 && lower < goal.revenue ? `${short(lower)} and ${short(goal.revenue)} goals` : short(goal.revenue)}{goal.profitPct ? ` at ${goal.profitPct}%` : ""} · </> : null}
            {view === "week" ? "This week" : view === "month" ? monthName : label}{time?.at ? `, ${time.at}` : ""}{asOf ? ` · as of ${asOf}` : ""} · money includes GST
          </div>
          <h1>Pace</h1>
        </div>
        <button type="button" className="pt-btn pt-btn--ghost pt-pace__edit" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          {editing ? "Done" : "Change the goal"}
        </button>
      </div>

      {sample && (
        <div className="pt-note pt-pace__note">
          <strong>Not saved yet.</strong> These are the figures you asked for, {short(goal.revenue)} at {goal.profitPct}% for {label}.
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
          <NumField label="Plan on a close rate" hint={v?.rates.closeRate.measured != null ? `measured ${pc(v.rates.closeRate.measured)}, leave blank to use it` : "leave blank to use the measured one"} suffix="%" decimal value={s.closeRate == null ? "" : String(Math.round(s.closeRate * 1000) / 10)} onChange={(raw) => set({ closeRate: asFrac(raw) })} />
          <NumField label="Plan on an average sale" hint={v?.rates.avgSale.measured != null ? `measured ${money(v.rates.avgSale.measured)}, leave blank to use it` : "leave blank to use the measured one"} prefix="$" value={s.avgSale == null ? "" : String(Math.round(s.avgSale))} onChange={(raw) => { const n = num(raw); set({ avgSale: n && n > 0 ? n : null }); }} />
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
      ) : (() => {
        // The money: the same three figures at every time frame. The week and
        // month come from ServiceTitan's snapshot; the year from the running
        // total the wall board keeps, which reaches back past ServiceTitan.
        const y = v.yearView;
        const inv: Standing | null = view === "week" ? v.standing.week.invoiced : view === "month" ? v.standing.month.invoiced
          : y ? { need: y.goal, byNow: y.byNow, done: y.ytd, gap: y.gap, perDayLeft: null, verdict: Math.abs(y.gap) < y.byNow * 0.05 ? "on" : y.gap < 0 ? "behind" : "ahead" } : null;
        const steps = view === "week" ? v.standing.week : view === "month" ? v.standing.month : null;
        const behind = steps ? TILE_STAGES.filter((st) => steps[st].verdict === "behind").map((st) => STAGE_LABEL[st].toLowerCase()) : [];
        const landed = inv?.need != null && inv.done != null && inv.done >= inv.need;
        return (
          <>
            <Say>
              {inv?.gap == null ? <>Not enough measured yet to say how {words.the} is going.</>
                : inv.verdict === "behind" ? <>Invoicing is <Bad>{money(-inv.gap)} behind</Bad> for {words.the}.</>
                : inv.verdict === "ahead" ? <>Invoicing is <Good>{money(inv.gap)} ahead</Good> for {words.the}.</>
                : <>Invoicing is <Good>on pace</Good> for {words.the}.</>}
              {steps ? (behind.length ? <> {sentence(behind)} {behind.length === 1 ? "is" : "are"} behind.</> : <> Every step is keeping up.</>)
                : y?.landing != null ? <> At this year&rsquo;s rate it lands at {short(y.landing)}.</> : null}
            </Say>

            <Pair>
              <Hero dark label={`Invoiced ${words.now}`} right={inv?.need != null ? `goal ${money(inv.need)}` : undefined}
                fig={inv?.done != null ? money(inv.done) : ""} frac={inv?.need ? (inv.done ?? 0) / inv.need : null}
                sub={inv?.byNow != null ? `goal by now ${money(inv.byNow)} · ${pill(inv, "invoiced").w.toLowerCase()}` : "no goal for this year"} />
              {view === "year" ? (
                <Hero label="To land the year" right={time?.at} frac={time?.frac ?? null}
                  fig={y?.weekNeeded != null ? `${money(y.weekNeeded)} a week` : ""}
                  sub={y?.weekPlanned != null ? `against ${money(y.weekPlanned)} a week planned for ${monthName}` : "save the goal to start the year's total"} />
              ) : (
                <Hero label={`To land ${words.the}`} right={time?.at} frac={time?.frac ?? null}
                  fig={landed ? "Landed ✓" : inv?.perDayLeft != null ? `${money(inv.perDayLeft)} a day` : ""}
                  sub={landed ? `${words.the === "the week" ? "The week's" : `${monthName}'s`} goal is in` : time?.left ? `for the ${time.left} working ${time.left === 1 ? "day" : "days"} left` : `${words.the} is over`} />
              )}
            </Pair>

            <Grid>
              {TILE_STAGES.map((st) => {
                if (!steps) {
                  // ServiceTitan's counts start when it went live, so a year
                  // to date can't be counted: the tile says so rather than
                  // calling two months a year.
                  const need = st === "invoiced" ? v.year.invoiced.value : v.year[st].count;
                  return <Tile key={st} label={STAGE_LABEL[st]} st={{ k: "none", w: "Not counted" }} fig="" frac={null}
                    sub={`${fig(st, need)} a year · ServiceTitan counts from ${m ? fmtDay(m.from) : "when it went live"}`} />;
                }
                const w = steps[st];
                return <Tile key={st} label={STAGE_LABEL[st]} st={pill(w, st)} fig={fig(st, w.done)} frac={w.need ? (w.done ?? 0) / w.need : null}
                  sub={w.need != null ? `of ${fig(st, w.need)} ${STAGE_NOTE[st]}${w.byNow != null ? ` · ${fig(st, w.byNow)} by now` : ""}` : "not enough history yet"} />;
              })}
            </Grid>

            <Card title="What the goal takes" aside="worked back through every step">
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead>
                    <tr><th>Step</th><th>A year</th><th>{monthName}</th><th>A week</th><th>A day</th></tr>
                  </thead>
                  <tbody>
                    {STAGES.map((st) => {
                      const val = (p: typeof v.year) => (st === "invoiced" ? p.invoiced.value : p[st].count);
                      return (
                        <tr key={st}>
                          <td><b>{STAGE_LABEL[st]}</b> <span className="ks">{STAGE_NOTE[st]}</span></td>
                          <td>{fig(st, val(v.year))}</td>
                          <td>{fig(st, val(v.month))}</td>
                          <td><b>{fig(st, val(v.week))}</b></td>
                          <td>{fig(st, val(v.day))}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td><span className="ks">Sold, in dollars</span></td>
                      <td>{v.year.sold.value == null ? "" : money(v.year.sold.value)}</td>
                      <td>{v.month.sold.value == null ? "" : money(v.month.sold.value)}</td>
                      <td><b>{v.week.sold.value == null ? "" : money(v.week.sold.value)}</b></td>
                      <td>{v.day.sold.value == null ? "" : money(v.day.sold.value)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="pt-pace__foot">
                A week of it is {jobs(weekly(v.lanes.quoteVisits))} quote visits and {jobs(weekly(v.lanes.serviceBooked))} service calls booked,
                and {jobs(weekly(v.lanes.installs))} installs and {jobs(weekly(v.lanes.serviceJobs))} service jobs done. Each month is planned at its share of the year
                {goal.shape ? ", as shaped on Finance · The year" : ", an even twelfth until the year is shaped on Finance · The year"}.
              </p>
            </Card>

            <details className="pt-panel pt-pace__rates pt-pace__ratesfold">
              <summary>
                <b>The rates it&rsquo;s built on</b>
                <span>{m ? `measured ${fmtDay(m.from)} to ${fmtDay(m.to)}, ${jobs(m.weeks)} working weeks` : "nothing measured yet"}</span>
              </summary>
              <div className="pt-pace__rategrid">
                <RateTile label="Leads that book" value={pc(v.rates.bookRate.value)} line={v.rates.bookRate.set ? "you set this" : "set it under Change the goal"} sub={`Calls aren't recorded anywhere this can read${data.calls ? `, ServiceTitan's phone log has ${data.calls} in this window` : ""}, so it can't be measured.`} unset={v.rates.bookRate.value == null} />
                <RateTile label="Close rate" value={pc(v.rates.closeRate.value)} line={rateLine(v.rates.closeRate, (n) => pc(n))} sub={m ? `${m.sold} of ${m.quoted} jobs quoted said yes. Per job, not per option.` : ""} />
                <RateTile label="Average sale" value={v.rates.avgSale.value == null ? "" : money(v.rates.avgSale.value)} line={rateLine(v.rates.avgSale, money)} sub={m ? `${money(m.soldValue)} across ${m.sold} jobs sold, including GST.` : ""} />
                <RateTile label="Through a quote" value={pc(v.rates.soldShare.value)} line="measured" sub="Of everything invoiced, the share on install and quote jobs. The rest is service and repairs." />
                <RateTile label="Quote visits per job quoted" value={v.rates.visitsPerQuote.value == null ? "" : v.rates.visitsPerQuote.value.toFixed(2)} line="measured" sub={m ? `${m.quoteVisits} visits booked for ${m.quoted} jobs quoted, some get priced on a service call.` : ""} />
                <RateTile label="A service job" value={v.rates.avgService.value == null ? "" : money(v.rates.avgService.value)} line="measured" sub={m ? `${money(m.serviceInvoiced)} over ${m.serviceCompleted} done. $0 warranty and follow-up calls are in it, they still take a booking.` : ""} />
                <RateTile label="Service calls that go ahead" value={pc(v.rates.serviceCompletion.value)} line="measured" sub={m ? `${m.serviceCompleted} done for ${m.serviceBooked} booked.` : ""} />
              </div>
              <p className="pt-pace__foot">
                Change a rate under <strong>Change the goal</strong> and every figure on this page moves with it. Nothing reaches the wall until it&rsquo;s saved.
              </p>
            </details>
          </>
        );
      })()}
    </div>
  );
}

/** "booked and completed", "booked, quoted and completed". */
function sentence(xs: string[]): string {
  const up = xs.map((x, i) => (i === 0 ? x[0].toUpperCase() + x.slice(1) : x));
  return up.length < 2 ? up.join("") : `${up.slice(0, -1).join(", ")} and ${up[up.length - 1]}`;
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

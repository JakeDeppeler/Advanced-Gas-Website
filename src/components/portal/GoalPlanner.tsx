"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NumField } from "@/components/portal/NumField";
import { money } from "@/lib/portal/format";
import { saveYearGoal } from "@/app/portal/finance/goals/actions";
import {
  closeTheGap,
  currentYear,
  mixTotals,
  periodLabel,
  type GoalJob,
  type YearBasis,
  type YearGoal,
} from "@/lib/portal/yearGoal";

/** "$3M", "$2.5M", "$750k" — the size of a goal as people say it. */
function short(n: number): string {
  if (n >= 1_000_000) return `$${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return money(n);
}

const num = (s: string) => {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/**
 * The year goal, to the Profit · the $3M goal mock: what the year is aiming at,
 * the week it is built from, and how far the week falls short.
 *
 * This is the one place the goal is set. The wall board, Finance's The year and
 * Targets all read what is saved here — so nothing here reaches the wall until
 * Save is pressed, and the design's starting figures never do.
 */
export function GoalPlanner({
  initial,
  sample,
  sampleMix,
  techs,
  booked,
  month,
  canSave,
}: {
  initial: YearGoal;
  /** Nothing is saved yet: the figures are the design's starting ones. */
  sample: boolean;
  /** A goal is saved but its week isn't: the rows are the design's example. */
  sampleMix: boolean;
  /** People on the crew who run jobs, for "jobs per tech a week". */
  techs: number;
  /** Jobs booked this month so far, from ServiceTitan via the board's sync. Null when it hasn't synced. */
  booked: number | null;
  /** This month's working days, so the jobs-booked target matches the board's. */
  month: { name: string; workingDays: number; daysPerWeek: number };
  canSave: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [g, setG] = useState<YearGoal>(initial);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = (patch: Partial<YearGoal>) => { setG((p) => ({ ...p, ...patch })); setDirty(true); setMsg(null); };
  const setJob = (id: string, patch: Partial<GoalJob>) =>
    set({ mix: g.mix.map((j) => (j.id === id ? { ...j, ...patch } : j)) });

  const t = useMemo(() => mixTotals(g.mix, g.weeks), [g.mix, g.weeks]);
  const goalProfit = g.profitPct ? g.revenue * (g.profitPct / 100) : null;
  const short$ = g.revenue - t.revenueYear;
  const gap = closeTheGap(g.mix, g.weeks, short$);
  const marginPct = t.margin == null ? null : Math.round(t.margin * 100);
  const bookingsTarget = t.jobsWeek > 0 && month.daysPerWeek > 0
    ? Math.round((t.jobsWeek * month.workingDays) / month.daysPerWeek)
    : null;
  const now = new Date();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveYearGoal(g);
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setDirty(false);
      setEditing(false);
      setMsg({ ok: true, text: "Saved. The wall board paces against it from its next refresh." });
      router.refresh();
    });
  }

  return (
    <div className="pt-goal">
      <div className="pt-head pt-head--split">
        <div>
          <h1>{g.revenue > 0 ? `${short(g.revenue)}${g.profitPct ? ` at ${g.profitPct}% profit` : ""}` : "The year goal"}</h1>
          <p>
            How many of each job we need booked every week to get there — and how far off the current mix is.
            {" "}{periodLabel(g)}.
          </p>
        </div>
        <button type="button" className="pt-btn pt-btn--ghost pt-goal__edit" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          {editing ? "Done" : "Change the goal"}
        </button>
      </div>

      {sample && (
        <div className="pt-note pt-goal__note">
          <strong>Not saved yet.</strong> These are the design&rsquo;s starting figures — $3M at 25% and its example
          week. Change them to this year&rsquo;s and press <strong>Save the goal</strong>; the wall board starts pacing
          against it from then, and not before.
        </div>
      )}

      {editing && (
        <section className="pt-panel pt-goal__form">
          <label className="pt-field">
            <span>Year runs</span>
            <select value={g.basis} onChange={(e) => set({ basis: e.target.value as YearBasis, year: currentYear(e.target.value as YearBasis, now) })}>
              <option value="financial">July to June (financial year)</option>
              <option value="calendar">January to December</option>
            </select>
          </label>
          <label className="pt-field">
            <span>Year</span>
            <select value={g.year} onChange={(e) => set({ year: Number(e.target.value) })}>
              {[-1, 0, 1].map((d) => {
                const y = currentYear(g.basis, now) + d;
                return <option key={y} value={y}>{periodLabel({ basis: g.basis, year: y })}</option>;
              })}
            </select>
          </label>
          <NumField label="Revenue goal" hint="to invoice across the year" prefix="$" value={g.revenue ? String(g.revenue) : ""} onChange={(v) => set({ revenue: num(v) })} />
          <NumField label="Profit to keep" suffix="%" decimal value={g.profitPct == null ? "" : String(g.profitPct)} onChange={(v) => set({ profitPct: v.trim() === "" ? null : num(v) })} />
          <NumField label="Working weeks" hint="a year" value={String(g.weeks)} onChange={(v) => set({ weeks: Math.max(1, Math.min(52, Math.round(num(v)) || 1)) })} />
          <NumField label="Overheads" hint="optional — for The year's overhead line" prefix="$" value={g.overhead == null ? "" : String(g.overhead)} onChange={(v) => set({ overhead: v.trim() === "" ? null : num(v) })} />
        </section>
      )}

      <div className="pt-goal__heroes">
        <section className="pt-goal__hero is-navy">
          <div className="pt-goal__herohead"><span>Revenue a year at this mix</span><span>goal {money(g.revenue)}</span></div>
          <strong>{money(t.revenueYear)}</strong>
          <span className="pt-goal__bar" aria-hidden="true"><i style={{ width: `${g.revenue > 0 ? Math.min(100, (t.revenueYear / g.revenue) * 100) : 0}%` }} /></span>
          <p className="pt-goal__verdict">
            {g.revenue <= 0
              ? "Set a revenue goal to measure the week against."
              : short$ > 0
                ? `${money(short$)} short${gap ? ` — about ${gap.extra} more ${gap.name.toLowerCase()} a week closes it` : ""}`
                : `Clears the goal by ${money(-short$)}`}
          </p>
        </section>
        <section className="pt-goal__hero">
          <div className="pt-goal__herohead">
            <span>Profit a year at this mix</span>
            <span>{goalProfit == null ? "no profit goal set" : `goal ${money(goalProfit)} · ${g.profitPct}%`}</span>
          </div>
          <strong>{money(t.profitYear)}{marginPct != null && <small> {marginPct}%</small>}</strong>
          <span className="pt-goal__bar is-dark" aria-hidden="true"><i style={{ width: `${goalProfit ? Math.min(100, (t.profitYear / goalProfit) * 100) : 0}%` }} /></span>
          <p className={`pt-goal__verdict ${g.profitPct && marginPct != null && marginPct >= g.profitPct ? "is-good" : "is-warn"}`}>
            {!g.profitPct
              ? "Set a profit percentage to measure the margin against."
              : marginPct == null
                ? "Plan the week below to see the margin."
                : marginPct >= g.profitPct
                  ? `On track for ${g.profitPct}%`
                  : `Below ${g.profitPct}% — the mix keeps ${marginPct}%`}
          </p>
        </section>
      </div>

      <section className="pt-panel pt-goal__mix">
        <div className="pt-goal__mixhead">
          <h2 className="pt-panel__h">Jobs a week, by type</h2>
          <span>
            {sampleMix && !dirty && !sample ? "The design's example week — not saved yet · " : ""}
            {g.weeks} working weeks · edit the averages to your real numbers
          </span>
        </div>
        <div className="pt-goal__tablewrap">
          <table className="pt-goal__table">
            <thead>
              <tr>
                <th scope="col">Job type</th>
                <th scope="col">Avg job</th>
                <th scope="col">Avg margin</th>
                <th scope="col">A year</th>
                <th scope="col">A week</th>
                <th scope="col">Revenue / yr</th>
              </tr>
            </thead>
            <tbody>
              {g.mix.map((j) => {
                const low = g.profitPct != null && j.margin < g.profitPct;
                return (
                  <tr key={j.id}>
                    <th scope="row">
                      <input className="pt-goal__name" value={j.name} aria-label="Job type" onChange={(e) => setJob(j.id, { name: e.target.value })} />
                    </th>
                    <td>
                      <span className="pt-goal__cell"><span>$</span>
                        {/* Sized by its own text, so the $ sits against the figure. */}
                        <span className="pt-goal__auto" data-value={j.avgJob ? j.avgJob.toLocaleString("en-AU") : "0"}>
                          <input
                            size={1}
                            inputMode="numeric"
                            aria-label={`${j.name} average job`}
                            value={j.avgJob ? j.avgJob.toLocaleString("en-AU") : ""}
                            onChange={(e) => setJob(j.id, { avgJob: num(e.target.value) })}
                          />
                        </span>
                      </span>
                    </td>
                    <td>
                      {/* Under the goal's percentage is written in the accent
                          and said in the footnote — the colour is never the only
                          place it shows. */}
                      <span className={`pt-goal__cell pt-goal__cell--pct${low ? " is-low" : ""}`}>
                        <span className="pt-goal__auto" data-value={j.margin ? String(j.margin) : "0"}>
                          <input
                            size={1}
                            inputMode="decimal"
                            aria-label={`${j.name} average margin`}
                            value={j.margin ? String(j.margin) : ""}
                            onChange={(e) => setJob(j.id, { margin: Math.min(99, num(e.target.value)) })}
                          />
                        </span>
                        <span>%</span>
                      </span>
                    </td>
                    <td className="pt-goal__num">{Math.round(j.perWeek * g.weeks).toLocaleString("en-AU")}</td>
                    <td>
                      <span className="pt-goal__step">
                        <button type="button" aria-label={`One fewer ${j.name} a week`} onClick={() => setJob(j.id, { perWeek: Math.max(0, j.perWeek - 1) })}>−</button>
                        <input inputMode="decimal" aria-label={`${j.name} a week`} value={String(j.perWeek)} onChange={(e) => setJob(j.id, { perWeek: Math.max(0, num(e.target.value)) })} />
                        <button type="button" aria-label={`One more ${j.name} a week`} onClick={() => setJob(j.id, { perWeek: j.perWeek + 1 })}>+</button>
                      </span>
                    </td>
                    <td className="pt-goal__num pt-goal__rev">{money(j.perWeek * j.avgJob * g.weeks)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Every week</th>
                <td />
                <td className="pt-goal__num">{marginPct == null ? "—" : `${marginPct}%`}</td>
                <td className="pt-goal__num">{Math.round(t.jobsYear).toLocaleString("en-AU")}</td>
                <td className="pt-goal__num pt-goal__jobs">{Math.round(t.jobsWeek * 10) / 10} jobs</td>
                <td className="pt-goal__num">{money(t.revenueYear)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button
          type="button"
          className="pt-goal__add"
          onClick={() => set({ mix: [...g.mix, { id: `job${Date.now()}`, name: "New job type", avgJob: 0, margin: 0, perWeek: 0 }] })}
        >
          + Add a job type
        </button>
      </section>

      <div className="pt-goal__three">
        <section className="pt-goal__tile">
          <span>Revenue needed a week</span>
          <strong>{g.revenue > 0 ? money(g.revenue / g.weeks) : "—"}</strong>
          <em>this mix books {money(t.revenueWeek)}</em>
        </section>
        <section className="pt-goal__tile">
          <span>Jobs per tech a week</span>
          <strong>{techs > 0 ? (Math.round((t.jobsWeek / techs) * 10) / 10).toLocaleString("en-AU") : "—"}</strong>
          <em>{techs > 0 ? `across ${techs} tech${techs === 1 ? "" : "s"}` : "nobody on the crew list runs jobs yet"}</em>
        </section>
        <section className="pt-goal__tile">
          <span>Jobs booked in {month.name}</span>
          <strong>{booked == null ? "—" : booked.toLocaleString("en-AU")}</strong>
          <em>
            {booked == null
              ? "waiting on ServiceTitan's first sync"
              : bookingsTarget != null
                ? `the week above asks for ${bookingsTarget.toLocaleString("en-AU")} this month`
                : "plan the week above for a target"}
          </em>
        </section>
      </div>

      {canSave && (
        <div className="pt-goal__save">
          <button type="button" className="pt-btn pt-btn--orange" onClick={save} disabled={pending || (!dirty && !sample)}>
            {pending ? "Saving…" : "Save the goal"}
          </button>
          {msg
            ? <span className={msg.ok ? "pt-goal__ok" : "pt-goal__err"} role="status">{msg.text}</span>
            : <span className="pt-goal__hint">{dirty ? "Unsaved changes." : sample ? "Nothing saved yet." : "Saved for everyone."} The wall board, The year and Targets all read this.</span>}
        </div>
      )}

      <p className="pt-goal__foot">
        Average job values and margins are starting assumptions — set them from your real jobs as they come in.
        {g.profitPct != null && ` A job type under ${g.profitPct}% drags the whole mix down even if revenue hits ${short(g.revenue)}.`}
      </p>
    </div>
  );
}

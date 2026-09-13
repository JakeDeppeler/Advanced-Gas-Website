"use client";

import { useMemo, useState, useTransition } from "react";
import { money } from "@/lib/portal/format";
import { planTargets, planTypes, DEFAULT_TARGETS, DEFAULT_JOB_TYPES, type Targets, type Capacity, type JobType } from "@/lib/portal/targets";
import { saveTargets } from "@/app/portal/finance/planning/actions";

const parse = (v: string) => { const n = parseFloat(v.replace(/[^0-9.]/g, "")); return Number.isNaN(n) ? 0 : n; };
const num = (n: number | null, dp = 1) =>
  n == null ? "—" : n.toLocaleString("en-AU", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/**
 * Working backwards from a year's revenue to what Monday has to look like.
 *
 * Three questions, in the order they actually get asked: how much work has to
 * be finished, how much of the crew's week that is, and how much has to be
 * quoted to win it. The last one is the one that gets forgotten, and it is the
 * only one with a lead time on it.
 */
export function RevenuePlanner({ initial, cap, actual, ytd = null, canSave }: {
  initial: Targets | null;
  cap: Capacity | null;
  /** What the quote book says has actually happened. */
  actual: { winRate: number | null; avgJob: number | null; won: number; quotesPerWeek?: number | null };
  /** Revenue banked so far this calendar year, from the filed accounts. */
  ytd?: number | null;
  canSave?: boolean;
}) {
  const [t, setT] = useState<Targets>(() => {
    const base = initial ?? {
      ...DEFAULT_TARGETS,
      winRate: actual.winRate ?? DEFAULT_TARGETS.winRate,
      avgJob: actual.avgJob ?? DEFAULT_TARGETS.avgJob,
    };
    return { ...base, jobTypes: base.jobTypes?.length ? base.jobTypes : DEFAULT_JOB_TYPES };
  });
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const plan = useMemo(() => planTargets(t, cap), [t, cap]);
  const mix = useMemo(() => planTypes(t, cap?.weeksYear ?? 52), [t, cap]);
  const setType = (id: string, patch: Partial<JobType>) =>
    set({ jobTypes: (t.jobTypes ?? []).map((j) => (j.id === id ? { ...j, ...patch } : j)) });
  const set = (patch: Partial<Targets>) => { setT((p) => ({ ...p, ...patch })); setMsg(null); };

  const save = () =>
    start(async () => {
      const r = await saveTargets(t);
      setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save.");
    });

  const load = plan.load;
  const over = load != null && load > 1;

  // Where the year is up to, and what the rest of it has to look like as a
  // result. A target divided by fifty-two is a plan on the first of January
  // and a fiction by March.
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const daysLeft = Math.max(1, Math.ceil((yearEnd.getTime() - now.getTime()) / 86_400_000));
  const weeksLeft = daysLeft / 7;
  const behind = ytd != null ? Math.max(0, t.revenue - ytd) : null;
  const neededWeek = behind != null ? behind / weeksLeft : null;
  const pace = ytd != null && t.revenue > 0 ? ytd / t.revenue : null;
  const yearGone = 1 - daysLeft / 365;

  // The quoting pace, which is the one with a lead time on it: what has to go
  // out against what actually has been.
  const quotesNeeded = plan.week.quotes;
  const quotesActual = actual.quotesPerWeek ?? null;

  const month = planTargets({ ...t, daysWeek: t.daysWeek }, cap);
  const perMonth = (n: number | null) => (n == null ? null : (n * (cap?.weeksYear ?? 52)) / 12);
  const rows: { k: string; label: string; note: string; day: string; week: string; mth: string; year: string }[] = [
    {
      k: "rev", label: "Work finished", note: "Invoiced, not quoted",
      day: money(plan.day.revenue), week: money(plan.week.revenue), mth: money(perMonth(plan.week.revenue) as number), year: money(plan.year.revenue),
    },
    {
      k: "hrs", label: "Hours on the tools", note: "That money at the charge-out rate",
      day: num(plan.day.hours), week: num(plan.week.hours), mth: num(perMonth(plan.week.hours), 0), year: num(plan.year.hours, 0),
    },
    {
      k: "jobs", label: "Jobs", note: `At ${money(t.avgJob)} a job`,
      day: num(plan.day.jobs), week: num(plan.week.jobs), mth: num(perMonth(plan.week.jobs), 0), year: num(plan.year.jobs, 0),
    },
    {
      k: "quoted", label: "Quotes out", note: `To win that at a ${t.winRate}% win rate`,
      day: money(plan.day.quoted ?? 0), week: money(plan.week.quoted ?? 0), mth: money(perMonth(plan.week.quoted) ?? 0), year: money(plan.year.quoted ?? 0),
    },
    {
      k: "count", label: "Quotes written", note: "The same money as a number of quotes",
      day: num(plan.day.quotes), week: num(plan.week.quotes), mth: num(perMonth(plan.week.quotes), 0), year: num(plan.year.quotes, 0),
    },
  ];

  return (
    <section className="pt-panel pt-tgt">
      <h2 className="pt-panel__h">The numbers behind it.</h2>
      <p className="pt-panel__sub">
        Set the year&rsquo;s revenue and the rest works backwards from it. <strong>Average job is what you invoice</strong>,
        not what is left after costs: it is the figure with the margin already in it, because that is what a customer
        pays and what divides into a revenue target. The quoting is the line with a lead time on it, so it is the one
        worth watching.
      </p>

      <div className="pt-tgt__fields">
        <label className="pt-cap__f">
          <span>Revenue target (year)</span>
          <span className="pt-calc__field"><span className="pt-calc__pre">$</span>
            <input inputMode="numeric" value={t.revenue ? t.revenue.toLocaleString("en-AU") : ""} onChange={(e) => set({ revenue: parse(e.target.value) })} />
          </span>
        </label>
        <label className="pt-cap__f">
          <span>Quote to win rate</span>
          <span className="pt-calc__field">
            <input type="number" min={1} max={100} value={t.winRate} onChange={(e) => set({ winRate: parse(e.target.value) })} />
            <span className="pt-calc__post">%</span>
          </span>
          {actual.winRate != null && (
            <button type="button" className="pt-tgt__actual" onClick={() => set({ winRate: actual.winRate as number })}>
              Your actual is {actual.winRate}% &mdash; use it
            </button>
          )}
        </label>
        <label className="pt-cap__f">
          <span>Average job <em className="pt-tgt__hint">· what you invoice</em></span>
          <span className="pt-calc__field"><span className="pt-calc__pre">$</span>
            <input inputMode="numeric" value={t.avgJob ? t.avgJob.toLocaleString("en-AU") : ""} onChange={(e) => set({ avgJob: parse(e.target.value) })} />
          </span>
          {actual.avgJob != null && (
            <button type="button" className="pt-tgt__actual" onClick={() => set({ avgJob: actual.avgJob as number })}>
              {money(actual.avgJob)} across {actual.won} won &mdash; use it
            </button>
          )}
        </label>
        <label className="pt-cap__f">
          <span>Days a week</span>
          <span className="pt-calc__field">
            <input type="number" min={1} max={7} value={t.daysWeek} onChange={(e) => set({ daysWeek: parse(e.target.value) })} />
          </span>
        </label>
      </div>

      <div className="pt-tgt__tablewrap">
        <table className="pt-tgt__table">
          <thead>
            <tr><th>To hit it</th><th>Each day</th><th>Each week</th><th>Each month</th><th>The year</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className={r.k === "quoted" ? "is-key" : undefined}>
                <th scope="row"><strong>{r.label}</strong><span>{r.note}</span></th>
                <td>{r.day}</td><td>{r.week}</td><td>{r.mth}</td><td>{r.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ytd != null && (
        <div className="pt-tgt__track">
          <div className="pt-tgt__trackbar">
            <i style={{ width: `${Math.min(100, (pace ?? 0) * 100)}%` }} />
            <b style={{ left: `${Math.min(100, yearGone * 100)}%` }} title="Where the year is up to" />
          </div>
          <p>
            <strong>{money(ytd)}</strong> invoiced so far, which is{" "}
            <strong>{Math.round((pace ?? 0) * 100)}%</strong> of the target with{" "}
            <strong>{Math.round((1 - yearGone) * 100)}%</strong> of the year left.{" "}
            {behind != null && neededWeek != null && (
              <>That leaves <strong>{money(behind)}</strong> to invoice across {Math.round(weeksLeft)} weeks, which is{" "}
              <strong>{money(neededWeek)}</strong> a week from here rather than the {money(plan.week.revenue)} an even
              year would have asked for.</>
            )}
          </p>
        </div>
      )}

      {quotesNeeded != null && quotesActual != null && (
        <div className={`pt-tgt__check${quotesActual < quotesNeeded ? " is-over" : ""}`}>
          <strong>
            {quotesActual < quotesNeeded ? "Not enough quotes are going out." : "The quoting is keeping up."}
          </strong>
          <p>
            The target needs <strong>{num(quotesNeeded)} quotes a week</strong> and over the last twelve weeks{" "}
            <strong>{num(quotesActual)}</strong> a week have actually been written.{" "}
            {quotesActual < quotesNeeded
              ? `That is ${num(quotesNeeded - quotesActual)} a week short, and it is the figure with a lead time on it: a quiet week of quoting shows up as a quiet month of work.`
              : "Nothing to fix here, which is the one part of this that cannot be caught up later."}
          </p>
        </div>
      )}

      <p className="pt-tgt__scope">
        Every figure above is the <strong>whole business</strong>, not one person.
        {plan.vans != null && plan.week.hours != null && (
          <> Across {plan.vans} {plan.vans === 1 ? "van" : "vans"} that is{" "}
            <strong>{num(plan.week.hours / plan.vans)} hours</strong> a week each, or{" "}
            <strong>{num(plan.week.hours / plan.vans / Math.max(1, t.daysWeek))}</strong> a day.
            {plan.week.jobs != null && (
              <> At {money(t.avgJob)} a job, {num(plan.week.jobs / plan.vans / Math.max(1, t.daysWeek))} jobs a day per van.</>
            )}
          </>
        )}
      </p>

      {plan.hoursAvailableWeek != null && (
        <div className={`pt-tgt__check${over ? " is-over" : ""}`}>
          <strong>
            {over
              ? `That is more week than the crew has.`
              : `The crew has the hours for it.`}
          </strong>
          <p>
            The target needs <strong>{num(plan.week.hours)} hours</strong> a week and the crew can bill{" "}
            <strong>{num(plan.hoursAvailableWeek)}</strong>, which is{" "}
            <strong>{load != null ? `${Math.round(load * 100)}%` : "—"}</strong> of it.{" "}
            {plan.ceiling != null && (
              <>Every billable hour sold at the current rate comes to <strong>{money(plan.ceiling)}</strong> a year, so a
              target above that needs another van or a higher rate, not a longer day.</>
            )}
          </p>
        </div>
      )}

      <div className="pt-tgt__mix">
        <h3 className="pt-tgt__h3">By the kind of work</h3>
        <p className="pt-tgt__sub">
          One average ticket puts a heater service and a multi-head in the same box with a factor of ten between them.
          Put what each kind is worth and what share of the year&rsquo;s money it brings in, off last year&rsquo;s
          invoices, and the week gets broken up properly. Leave a row at zero and it sits out.
        </p>

        <div className="pt-tgt__tablewrap">
          <table className="pt-tgt__table pt-tgt__table--mix">
            <thead>
              <tr>
                <th>Kind of work</th><th>Average</th><th>Share of revenue</th>
                <th>Jobs a week</th><th>Jobs a day</th><th>Quotes a week</th>
              </tr>
            </thead>
            <tbody>
              {(t.jobTypes ?? []).map((j) => {
                const line = mix?.lines.find((l) => l.id === j.id) ?? null;
                return (
                  <tr key={j.id} className={line ? undefined : "is-off"}>
                    <th scope="row">
                      <input
                        className="pt-tgt__name"
                        value={j.name}
                        onChange={(e) => setType(j.id, { name: e.target.value })}
                        aria-label="Kind of work"
                      />
                    </th>
                    <td>
                      <span className="pt-calc__field pt-tgt__cell"><span className="pt-calc__pre">$</span>
                        <input inputMode="numeric" value={j.value ? j.value.toLocaleString("en-AU") : ""}
                          placeholder="0" onChange={(e) => setType(j.id, { value: parse(e.target.value) })} />
                      </span>
                    </td>
                    <td>
                      <span className="pt-calc__field pt-tgt__cell">
                        <input type="number" min={0} max={100} value={j.share || ""} placeholder="0"
                          onChange={(e) => setType(j.id, { share: parse(e.target.value) })} />
                        <span className="pt-calc__post">%</span>
                      </span>
                    </td>
                    <td>{line ? num(line.jobsWeek) : "—"}</td>
                    <td>{line ? num(line.jobsDay) : "—"}</td>
                    <td>{line ? num(line.quotesWeek) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {mix && Math.round(mix.shareTotal) !== 100 && (
          <p className="pt-tgt__warn">
            The shares add up to {Math.round(mix.shareTotal)}%, not 100%. The rows still price out on their own, but
            together they are {mix.shareTotal > 100 ? "claiming more than" : "leaving"}{" "}
            {money(Math.abs(t.revenue * (mix.shareTotal - 100) / 100))} of the year{mix.shareTotal > 100 ? "." : " unaccounted for."}
          </p>
        )}
      </div>

      {canSave && (
        <div className="pt-tgt__save">
          <button type="button" className="pt-btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save the target"}
          </button>
          {msg && <span className="pt-tgt__msg">{msg}</span>}
          <span className="pt-tgt__note">Saved for everyone, not just this browser.</span>
        </div>
      )}
    </section>
  );
}

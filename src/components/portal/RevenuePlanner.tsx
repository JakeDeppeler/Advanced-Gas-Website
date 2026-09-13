"use client";

import { useMemo, useState, useTransition } from "react";
import { money } from "@/lib/portal/format";
import { planTargets, DEFAULT_TARGETS, type Targets, type Capacity } from "@/lib/portal/targets";
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
export function RevenuePlanner({ initial, cap, canSave }: {
  initial: Targets | null; cap: Capacity | null; canSave: boolean;
}) {
  const [t, setT] = useState<Targets>(initial ?? DEFAULT_TARGETS);
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const plan = useMemo(() => planTargets(t, cap), [t, cap]);
  const set = (patch: Partial<Targets>) => { setT((p) => ({ ...p, ...patch })); setMsg(null); };

  const save = () =>
    start(async () => {
      const r = await saveTargets(t);
      setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save.");
    });

  const load = plan.load;
  const over = load != null && load > 1;

  const rows: { k: string; label: string; note: string; day: string; week: string; year: string }[] = [
    {
      k: "rev", label: "Work finished", note: "Invoiced, not quoted",
      day: money(plan.day.revenue), week: money(plan.week.revenue), year: money(plan.year.revenue),
    },
    {
      k: "hrs", label: "Hours on the tools", note: "That money at the charge-out rate",
      day: num(plan.day.hours), week: num(plan.week.hours), year: num(plan.year.hours, 0),
    },
    {
      k: "jobs", label: "Jobs", note: `At ${money(t.avgJob)} a job`,
      day: num(plan.day.jobs), week: num(plan.week.jobs), year: num(plan.year.jobs, 0),
    },
    {
      k: "quoted", label: "Quotes out", note: `To win that at a ${t.winRate}% win rate`,
      day: money(plan.day.quoted ?? 0), week: money(plan.week.quoted ?? 0), year: money(plan.year.quoted ?? 0),
    },
    {
      k: "count", label: "Quotes written", note: "The same money as a number of quotes",
      day: num(plan.day.quotes), week: num(plan.week.quotes), year: num(plan.year.quotes, 0),
    },
  ];

  return (
    <section className="pt-panel pt-tgt">
      <h2 className="pt-panel__h">What that means for a week.</h2>
      <p className="pt-panel__sub">
        Set the year&rsquo;s revenue and this works backwards: the work that has to be finished, the hours that takes
        out of the crew&rsquo;s week, and the quoting it takes to win it. The quoting is the one with a lead time, so
        it is the one worth watching.
      </p>

      <div className="pt-tgt__fields">
        <label className="pt-cap__f">
          <span>Revenue target (year)</span>
          <span className="pt-calc__field"><span className="pt-calc__pre">$</span>
            <input inputMode="numeric" value={t.revenue ? t.revenue.toLocaleString("en-AU") : ""} onChange={(e) => set({ revenue: parse(e.target.value) })} />
          </span>
        </label>
        <label className="pt-cap__f">
          <span>Win rate</span>
          <span className="pt-calc__field">
            <input type="number" min={1} max={100} value={t.winRate} onChange={(e) => set({ winRate: parse(e.target.value) })} />
            <span className="pt-calc__post">%</span>
          </span>
        </label>
        <label className="pt-cap__f">
          <span>Average job</span>
          <span className="pt-calc__field"><span className="pt-calc__pre">$</span>
            <input inputMode="numeric" value={t.avgJob ? t.avgJob.toLocaleString("en-AU") : ""} onChange={(e) => set({ avgJob: parse(e.target.value) })} />
          </span>
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
            <tr><th>To hit it</th><th>Each day</th><th>Each week</th><th>The year</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className={r.k === "quoted" ? "is-key" : undefined}>
                <th scope="row"><strong>{r.label}</strong><span>{r.note}</span></th>
                <td>{r.day}</td><td>{r.week}</td><td>{r.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

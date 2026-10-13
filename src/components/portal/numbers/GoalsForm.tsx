"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Goals } from "@/lib/portal/goalsTypes";
import { saveGoalsPage } from "@/app/portal/numbers/actions";

type Row = { key: keyof Goals | "profitPct"; label: string; used: string; unit: string };
const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Money",
    rows: [
      { key: "gm", label: "Gross margin", used: "Our KPIs, Profit & finance", unit: "% or more" },
      { key: "ovh", label: "Overheads", used: "Our KPIs, Profit & finance", unit: "% or less" },
      { key: "profitPct", label: "Net profit", used: "Home, Our KPIs, Pace, the wall board", unit: "% or more" },
      { key: "wagesPct", label: "Wages as % of sales", used: "Our KPIs", unit: "% or less" },
    ],
  },
  {
    title: "Selling",
    rows: [
      { key: "quotesMonth", label: "Quotes a month", used: "Our KPIs, Sales", unit: "quotes" },
      { key: "winRate", label: "Win rate to aim for", used: "Our KPIs, Sales, each person on Team · the plan still runs on the real rate", unit: "%" },
      { key: "avgJob", label: "Average job", used: "Our KPIs, Sales", unit: "$ with GST" },
      { key: "followup", label: "Quotes followed up in 2 days", used: "Our KPIs, Sales", unit: "%" },
    ],
  },
  {
    title: "Jobs & getting paid",
    rows: [
      { key: "jobsMonth", label: "Jobs a month", used: "Our KPIs", unit: "jobs" },
      { key: "overdue", label: "Overdue", used: "Our KPIs", unit: "$ or less" },
      { key: "billable", label: "Billable hours", used: "Our KPIs", unit: "% of hours rostered" },
    ],
  },
];

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/**
 * Our numbers › Goals: the numbers every page is measured against. The year's
 * sales are the twelve months added up, so they can't disagree. A blank box is
 * "no goal", and the pages that use it say so.
 */
export function GoalsForm({ months: initialMonths, labels, current, profitPct, goals, canSave, suggest = {} }: {
  /**
   * What each empty goal would be to hit the year goal, from the Pace plan or
   * the benchmark: filled into the empty boxes, and kept only when saved.
   */
  suggest?: Partial<Record<string, { v: number; why: string }>>;
  months: number[];
  labels: string[];
  /** Index of this month in `labels`. */
  current: number;
  profitPct: number | null;
  goals: Goals;
  canSave: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  // Kept in dollars, exactly as stored: shown to a decimal of a thousand, but a
  // month only changes when it's typed in, so saving an untouched form can't
  // round $3,200,000 into $3,200,400.
  const [months, setMonths] = useState(initialMonths);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const g of GROUPS) for (const r of g.rows) {
      const v = r.key === "profitPct" ? profitPct : goals[r.key as keyof Goals];
      o[r.key] = v == null ? (suggest[r.key] ? String(suggest[r.key]!.v) : "") : String(v);
    }
    return o;
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const total = months.reduce((a, b) => a + (Number(b) || 0), 0);
  const shown = (i: number) => typed[i] ?? String(Math.round(months[i] / 100) / 10);
  const top = useMemo(() => Math.max(1, ...months.map((m) => Number(m) || 0)), [months]);

  const num = (k: string) => (vals[k] === "" ? null : Number(vals[k]));
  const save = () =>
    start(async () => {
      const g = {} as Goals;
      for (const grp of GROUPS) for (const r of grp.rows) if (r.key !== "profitPct") (g as Record<string, number | null>)[r.key] = num(r.key);
      const res = await saveGoalsPage({ months, profitPct: num("profitPct"), goals: g });
      setMsg(res.ok ? { ok: true, text: "Saved. Every page that uses these has moved with them." } : { ok: false, text: res.error ?? "Couldn’t save." });
      if (res.ok) router.refresh();
    });

  return (
    <section className="pk-card pk-pad">
      <div className="pk-card-h"><b>Goals</b><span>what every KPI is measured against</span></div>
      <div className="pk-glh">Sales</div>
      <div className="pk-kv">
        <span className="t"><b>Sales this year</b><span>used on Home, Sales, Pace and the wall board · the months below add up to this</span></span>
        <span className="v pk-big">{money(total)}</span>
      </div>
      <div className="pk-months">
        <div className="pk-ks">Sales goal by month, in $K. Busier in summer, quieter in winter.</div>
        <div className="pk-mrow">
          {months.map((m, i) => (
            <label key={labels[i]} className={`pk-mon${i === current ? " on" : ""}`}>
              <span className="bar" aria-hidden="true"><i style={{ height: `${((Number(m) || 0) / top) * 100}%` }} /></span>
              <input id={`goal-m${i}`} inputMode="decimal" value={shown(i)} disabled={!canSave} aria-label={`${labels[i]} sales goal in thousands`}
                onChange={(e) => {
                  const t = e.target.value.replace(/[^0-9.]/g, "");
                  setTyped((x) => ({ ...x, [i]: t }));
                  setMonths((ms) => ms.map((x, j) => (j === i ? (Number(t) || 0) * 1000 : x)));
                }} />
              <span className="lab">{labels[i]}</span>
            </label>
          ))}
        </div>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="pk-glh">{g.title}</div>
          {g.rows.map((r) => (
            <div className="pk-kv" key={r.key}>
              <span className="t"><b>{r.label}</b><span>used on {r.used}{(r.key === "profitPct" ? profitPct : goals[r.key as keyof Goals]) == null && suggest[r.key] ? <> · <b style={{ color: "var(--ink2)", display: "inline", fontWeight: 600 }}>filled in {suggest[r.key]!.why}</b>, save to keep it</> : null}</span></span>
              <input id={`goal-${r.key}`} className="pk-in num" inputMode="decimal" value={vals[r.key]} placeholder="no goal" disabled={!canSave}
                aria-label={r.label} onChange={(e) => setVals((v) => ({ ...v, [r.key]: e.target.value.replace(/[^0-9.]/g, "") }))} />
              <span className="pk-unit">{r.unit}</span>
            </div>
          ))}
        </div>
      ))}
      {canSave ? (
        <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
          <button type="button" className="pk-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save the goals"}</button>
          {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
        </div>
      ) : <p className="pk-note" style={{ marginTop: 12 }}>Only the office can change the goals.</p>}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCrew } from "@/app/portal/finance/capacity/actions";
import { CREW_LEVELS, type Costing, type CrewLevel } from "@/lib/portal/crew";

type Num = Exclude<{ [K in keyof Costing]: Costing[K] extends number | null | undefined ? K : never }[keyof Costing], undefined>;
type Field = { k: Num; label: string; unit: string; sub?: string; blank?: string };

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Pay", fields: [
    { k: "wage", label: "Wage", unit: "$ an hour", sub: "before super" },
    { k: "otMult", label: "Overtime", unit: "× the wage" },
    { k: "nightMult", label: "Nights", unit: "× the wage" },
  ] },
  { title: "A normal week", fields: [
    { k: "hrsWeek", label: "Hours paid", unit: "a week" },
    { k: "travelHrsWeek", label: "Driving between jobs", unit: "hours a week", sub: "paid, not billed" },
    { k: "adminHrsWeek", label: "Paperwork and quoting", unit: "hours a week" },
    { k: "officeHrsWeek", label: "In the office", unit: "hours a week" },
  ] },
  { title: "Time off the tools, a year", fields: [
    { k: "leaveDays", label: "Annual leave", unit: "days" },
    { k: "phDays", label: "Public holidays", unit: "days" },
    { k: "sickDays", label: "Sick leave", unit: "days" },
    { k: "rdoDays", label: "RDOs", unit: "days", sub: "one a month is the standard" },
    { k: "schoolDays", label: "Trade school", unit: "days", sub: "apprentices" },
  ] },
  { title: "On the job", fields: [
    { k: "callbackPct", label: "Call-backs", unit: "% of their time", sub: "going back to fix their own work", blank: "business-wide figure" },
    { k: "rateOverride", label: "Charge-out override", unit: "$ an hour", sub: "only if they’re priced differently from the working", blank: "worked out" },
  ] },
];

/**
 * One person's wage, hours and time off, on their own file. The same record
 * Pricing & costs › Team & wages edits, saved by the same action, so the hourly
 * rate, the Job calculator and Planning move with it either way.
 */
export function CrewPay({ userId, first, level: level0, costing, rate }: {
  userId: string; first: string; level: CrewLevel; costing: Costing;
  /** What an hour of them is priced at now, worked out on the server. */
  rate: number | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [level, setLevel] = useState<CrewLevel>(level0);
  const [ownVan, setOwnVan] = useState(costing.ownVan);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const g of GROUPS) for (const f of g.fields) { const v = costing[f.k]; o[f.k] = v == null ? "" : String(v); }
    return o;
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = () => start(async () => {
    const next: Costing = { ...costing, ownVan };
    for (const g of GROUPS) for (const f of g.fields) {
      const raw = vals[f.k].trim();
      if (raw === "") {
        if (!f.blank) { setMsg({ ok: false, text: `${f.label} needs a figure.` }); return; }
        (next as Record<string, unknown>)[f.k] = null;
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) { setMsg({ ok: false, text: `${f.label} isn’t a number.` }); return; }
        (next as Record<string, unknown>)[f.k] = n;
      }
    }
    const res = await saveCrew({ userId, level, costing: next });
    setMsg(res.ok ? { ok: true, text: `Saved. ${first}’s rate and every price that uses it have moved.` } : { ok: false, text: res.error ?? "Couldn’t save." });
    if (res.ok) router.refresh();
  });

  return (
    <section className="pk-card pk-pad">
      <div className="pk-card-h"><b>Pay &amp; hours</b><span>{rate != null ? `charged out at $${rate.toFixed(2)} an hour` : "not costed yet"}</span></div>
      <div className="pk-kv">
        <span className="t"><b>Level</b><span>what they do, and the starting figures for it</span></span>
        <select id={`crew-level-${userId}`} className="pk-in" value={level} onChange={(e) => setLevel(e.target.value as CrewLevel)} aria-label="Level">
          {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </div>
      <div className="pk-kv">
        <span className="t"><b>Runs their own van</b><span>billable hours are counted per van, not per head</span></span>
        <label className="pk-check"><input id={`crew-van-${userId}`} type="checkbox" checked={ownVan} onChange={(e) => setOwnVan(e.target.checked)} /> {ownVan ? "Yes" : "No"}</label>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="pk-glh">{g.title}</div>
          {g.fields.map((f) => (
            <div className="pk-kv" key={f.k}>
              <span className="t"><b>{f.label}</b>{f.sub && <span>{f.sub}</span>}</span>
              <input id={`crew-${f.k}-${userId}`} className="pk-in num" inputMode="decimal" value={vals[f.k]} placeholder={f.blank ?? ""}
                aria-label={f.label} onChange={(e) => setVals((v) => ({ ...v, [f.k]: e.target.value.replace(/[^0-9.]/g, "") }))} />
              <span className="pk-unit">{f.unit}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
        <button type="button" className="pk-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : `Save ${first}’s pay & hours`}</button>
        {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}

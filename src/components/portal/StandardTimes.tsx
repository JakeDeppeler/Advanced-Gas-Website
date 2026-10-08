"use client";

import { useState, useTransition } from "react";
import { setStandardTime, setVeuRebate } from "@/app/portal/board/times/actions";
import type { JobTypeRow } from "@/lib/board/standardTimes";

/**
 * One row per kind of job, busiest first, with the hours it should take.
 *
 * Busiest first because the list is forty types long and the office should
 * spend its time on the ones that turn up, not on the single job of something
 * from February. Each row says how many of its recent jobs already carry quoted
 * hours from an invoice, so it is obvious which types the board is already able
 * to measure and which are the ones worth setting.
 *
 * Saved per row as it is changed rather than behind one Save button: forty
 * fields and one button is a form somebody abandons half-finished, and a
 * half-finished save here is a page of settings nobody can tell apart from a
 * page of unset ones.
 */
export function StandardTimes({ rows, set, rebate }: { rows: JobTypeRow[]; set: number; rebate: number | null }) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.name, r.hours == null ? "" : String(r.hours)])),
  );
  const [saved, setSaved] = useState<Record<string, "ok" | "err">>({});
  const [, start] = useTransition();

  const commit = (name: string, raw: string) => {
    const txt = raw.trim();
    const hours = txt === "" ? null : Number(txt);
    if (hours != null && (!Number.isFinite(hours) || hours <= 0 || hours > 24)) {
      setSaved((s) => ({ ...s, [name]: "err" }));
      return;
    }
    start(async () => {
      const res = await setStandardTime(name, hours);
      setSaved((s) => ({ ...s, [name]: res.ok ? "ok" : "err" }));
    });
  };

  const covered = rows.filter((r) => r.jobs > 0 && (r.hours != null || r.quoted > 0)).length;
  const busy = rows.filter((r) => r.jobs > 0).length;

  return (
    <>
      <VeuRebate rebate={rebate} />
      <div className="pt-panel">
      <div className="pt-panel__head">
        <h2 className="pt-panel__h">Hours per job type</h2>
        <span className="pt-panel__sub">
          {set} set · {covered} of {busy} active types can be measured
        </span>
      </div>

      <table className="pt-table pt-times">
        <thead>
          <tr>
            <th>Job type</th>
            <th className="pt-times__n">Jobs · 90 days</th>
            <th className="pt-times__n">Quoted in hours</th>
            <th className="pt-times__n">Should take</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4}>No job types yet. They arrive with the next ServiceTitan sync.</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.name} className={r.jobs === 0 ? "is-quiet" : undefined}>
              <td>
                <strong>{r.name}</strong>
              </td>
              <td className="pt-times__n">{r.jobs || "—"}</td>
              {/* How often the board can already measure this type without help.
                  A type at 0 of 12 is the one worth setting; one at 12 of 12
                  gains nothing from a standard time. */}
              <td className="pt-times__n">{r.jobs > 0 ? `${r.quoted} of ${r.jobs}` : "—"}</td>
              <td className="pt-times__n">
                <span className="pt-times__field">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    inputMode="decimal"
                    aria-label={`Hours for ${r.name}`}
                    value={vals[r.name] ?? ""}
                    placeholder="—"
                    onChange={(e) => setVals((v) => ({ ...v, [r.name]: e.target.value }))}
                    onBlur={(e) => commit(r.name, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <em>h</em>
                  {saved[r.name] === "ok" && <b className="pt-times__ok">Saved</b>}
                  {saved[r.name] === "err" && <b className="pt-times__err">0–24</b>}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

/**
 * What a VEU job brings back.
 *
 * The board's "Margin · sold" figure reads the estimate, and a VEU job is sold
 * at a reduced price because the rebate pays the rest — so without this it
 * drags the team's margin down for work that is perfectly fine, and one of them
 * this month computes as sold below cost. Set it and those jobs count properly.
 * Left blank it is not counted and the board says so, which is the only honest
 * thing to do with a number nobody has given it.
 */
function VeuRebate({ rebate }: { rebate: number | null }) {
  const [val, setVal] = useState(rebate == null ? "" : String(rebate));
  const [saved, setSaved] = useState<"ok" | "err" | null>(null);
  const [, start] = useTransition();

  const commit = () => {
    const txt = val.trim();
    const amount = txt === "" ? null : Number(txt);
    if (amount != null && (!Number.isFinite(amount) || amount <= 0 || amount > 20000)) {
      setSaved("err");
      return;
    }
    start(async () => {
      const res = await setVeuRebate(amount);
      setSaved(res.ok ? "ok" : "err");
    });
  };

  return (
    <div className="pt-panel">
      <div className="pt-panel__head">
        <h2 className="pt-panel__h">VEU rebate per job</h2>
        <span className="pt-panel__sub">
          {rebate == null ? "Not set — VEU jobs drag the sold margin down" : `Counted as income on every VEU job`}
        </span>
      </div>
      <p className="pt-panel__note">
        A VEU job is sold cheap because the rebate covers the rest, so on the estimate alone it looks thin and sometimes
        below cost. Put what one is typically worth here and the board&rsquo;s <strong>Margin · sold</strong> counts it
        as income. Leave it blank and it isn&rsquo;t counted, and the board says so rather than guessing.
      </p>
      <span className="pt-times__field">
        <em>$</em>
        <input
          type="number"
          min="0"
          max="20000"
          step="50"
          inputMode="decimal"
          aria-label="VEU rebate per job"
          value={val}
          placeholder="—"
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <em>per job</em>
        {saved === "ok" && <b className="pt-times__ok">Saved</b>}
        {saved === "err" && <b className="pt-times__err">0–20,000</b>}
      </span>
    </div>
  );
}

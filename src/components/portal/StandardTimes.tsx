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
export function StandardTimes({ rows, rebate }: { rows: JobTypeRow[]; set: number; rebate: number | null }) {
  const covered = rows.filter((r) => r.jobs > 0 && (r.hours != null || r.quoted > 0)).length;
  const busy = rows.filter((r) => r.jobs > 0).length;
  const unset = rows.filter((r) => r.jobs > 0 && r.hours == null).length;

  return (
    <>
      <div className="pt-panel">
        <div className="pt-panel__head">
          <h2 className="pt-panel__h">Hours per job type</h2>
          <span className="pt-panel__sub">
            {covered} of {busy} types booked in the last 90 days can be measured
            {unset > 0 ? ` · ${unset} still need a time` : ""} · click a time to change it in ServiceTitan
          </span>
        </div>

        <table className="pt-table pt-times st2">
          <thead>
            <tr>
              <th>Job type</th>
              <th className="pt-times__n">Jobs · 90 days</th>
              <th className="pt-times__n">Quoted in hours</th>
              <th className="pt-times__n">Time in ServiceTitan</th>
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
                <td><strong>{r.name}</strong></td>
                <td className="pt-times__n">{r.jobs || "–"}</td>
                {/* How often the board can already measure this type without help.
                    A type at 0 of 12 is the one worth setting; one at 12 of 12
                    gains nothing from a standard time. */}
                <td className="pt-times__n">{r.jobs > 0 ? `${r.quoted} of ${r.jobs}` : "–"}</td>
                <td className="pt-times__n"><TimeCell row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VeuRebate rebate={rebate} />
    </>
  );
}

/** 1.5 → "1 h 30 m", 4 → "4 h". */
function hoursWords(h: number): string {
  const mins = Math.round(h * 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return hh && mm ? `${hh} h ${mm} m` : hh ? `${hh} h` : `${mm} m`;
}

/**
 * The time, read straight from the job type in ServiceTitan, and changed in
 * the row it sits in: click it, type the hours, Enter. A save goes to
 * ServiceTitan first; only if ServiceTitan refuses is it kept in the portal,
 * and the row says so rather than looking the same as one that saved.
 */
function TimeCell({ row }: { row: JobTypeRow }) {
  const [hours, setHours] = useState(row.hours);
  const [from, setFrom] = useState(row.from);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const open = () => { setVal(hours == null ? "" : String(hours)); setMsg(null); setEditing(true); };
  const save = () => {
    const txt = val.trim();
    const next = txt === "" ? null : Number(txt);
    if (next != null && (!Number.isFinite(next) || next <= 0 || next > 24)) {
      setMsg({ ok: false, text: "Between 0 and 24 hours" });
      return;
    }
    if (next === hours) { setEditing(false); return; }
    start(async () => {
      const res = await setStandardTime(row.name, next);
      if (!res.ok) { setMsg({ ok: false, text: res.error ?? "Couldn't save" }); return; }
      const kept = /didn't take/.test(res.note ?? "");
      setHours(next);
      setFrom(next == null ? null : kept ? "portal" : "servicetitan");
      setEditing(false);
      setMsg({ ok: !kept, text: kept ? "Kept here, ServiceTitan refused it" : "Saved in ServiceTitan" });
    });
  };

  if (editing) {
    return (
      <span className="st2-edit">
        <input
          id={`st-${row.name}`}
          type="number" min="0" max="24" step="0.25" inputMode="decimal" autoFocus
          aria-label={`Hours for ${row.name}`}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          disabled={pending}
        />
        <em>h</em>
        <button type="button" className="qp-btn dark st2-btn" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="qp-btn st2-btn" onClick={() => setEditing(false)} disabled={pending}>Cancel</button>
        {msg && !msg.ok && <b className="pt-times__err">{msg.text}</b>}
      </span>
    );
  }
  return (
    <span className="st2-show">
      {msg && <b className={msg.ok ? "pt-times__ok" : "pt-times__err"}>{msg.text}</b>}
      {from === "portal" && !msg && <span className="st2-tag" title="ServiceTitan wouldn't take this time, so the portal is holding it">portal only</span>}
      <button type="button" className={`st2-time${hours == null ? " is-unset" : ""}`} onClick={open} title={`Change the time for ${row.name}`} aria-label={`${hours == null ? "No time" : hoursWords(hours)} for ${row.name}. Change the time for ${row.name}`}>
        {hours == null ? "Not set" : hoursWords(hours)}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </button>
    </span>
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
          {rebate == null ? "Not set, VEU jobs drag the sold margin down" : `Counted as income on every VEU job`}
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
          placeholder=""
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

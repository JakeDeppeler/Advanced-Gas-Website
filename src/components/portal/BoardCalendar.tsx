"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pushToBoard, saveBoardCalendar } from "@/app/portal/finance/board/actions";
import { workingDaysInMonth } from "@/lib/dashboard/dates";

/**
 * Which days the board's per-day figures divide by. The targets themselves
 * come from the year goal; this is the calendar they are paced over.
 *
 * The working calendar lived only in SQL — DASHBOARD.md documented an `insert`
 * as the procedure — which meant the one thing the office needed to correct
 * each year, the public holidays, was the one thing it couldn't.
 */

const WEEKDAYS = [
  { n: 1, short: "Mon" }, { n: 2, short: "Tue" }, { n: 3, short: "Wed" }, { n: 4, short: "Thu" },
  { n: 5, short: "Fri" }, { n: 6, short: "Sat" }, { n: 7, short: "Sun" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function BoardCalendar({
  workingDays: initialDays,
  holidays: initialHolidays,
  now,
}: {
  workingDays: number[];
  holidays: string[];
  /** The server's now, so the browser's first render agrees with it. */
  now: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [days, setDays] = useState<number[]>(initialDays);
  const [hols, setHols] = useState<string[]>(initialHolidays);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const clean = JSON.stringify({ d: initialDays, h: initialHolidays });
  const dirty = JSON.stringify({ d: days, h: hols }) !== clean;

  const nowDate = new Date(now);
  const todayIso = nowDate.toISOString().slice(0, 10);
  const cal = { days: [...days].sort((a, b) => a - b), holidays: hols };
  // The board's own function, so the count shown is the count it will use.
  const thisMonth = workingDaysInMonth(nowDate, cal);
  const nextDate = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, 15));
  const next = workingDaysInMonth(nextDate, cal);

  function touch<T>(set: (v: T) => void, v: T) {
    set(v);
    setNote(null);
    setErr(null);
  }

  function save() {
    setErr(null);
    start(async () => {
      const res = await saveBoardCalendar({ workingDays: cal.days, holidays: hols });
      if (!res.ok) return setErr(res.error ?? "Couldn't save.");
      setNote("Saved. The board picks this up on its next refresh, within about a minute.");
      router.refresh();
    });
  }

  function push() {
    setErr(null);
    start(async () => {
      const res = await pushToBoard();
      if (!res.ok) return setErr(res.error ?? "Couldn't recompute the board.");
      setNote("Board recomputed — the wall is showing these figures now.");
      router.refresh();
    });
  }

  return (
    <>
      <section className="pt-panel">
        <h2 className="pt-panel__h">What counts as a working day</h2>
        <p className="pt-panel__sub">
          The divisor under every per-day figure on the board. Being &ldquo;80% through the month&rdquo; means nothing
          if the days left are a long weekend, so the board paces on working days rather than calendar ones.
        </p>

        <div className="pt-bd__days" role="group" aria-label="Days of the week that count">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.n);
            return (
              <button
                key={d.n}
                type="button"
                aria-pressed={on}
                className={`pt-bd__day${on ? " is-on" : ""}`}
                onClick={() => touch(setDays, on ? days.filter((x) => x !== d.n) : [...days, d.n])}
              >
                {d.short}
              </button>
            );
          })}
        </div>

        <div className="pt-bd__dayfacts">
          <div>
            <span>{MONTHS[nowDate.getUTCMonth()]}</span>
            <strong>{thisMonth.total} working days</strong>
            <em>
              {thisMonth.elapsed} gone, {thisMonth.remaining} left
            </em>
          </div>
          <div>
            <span>{MONTHS[nextDate.getUTCMonth()]}</span>
            <strong>{next.total} working days</strong>
            <em>for what it&rsquo;s worth planning against</em>
          </div>
        </div>

        <h3 className="pt-bd__h3">Days off</h3>
        <p className="pt-panel__sub">
          Victorian public holidays and any shutdown days. They live here rather than in the code so the office can
          correct them without a deploy. An empty list is fine — the per-day figure is just slightly optimistic in a
          month with a holiday in it.
        </p>

        <div className="pt-bd__addday">
          <label className="pt-field">
            <span>Add a day off</span>
            <input
              type="date"
              onChange={(e) => {
                const v = e.target.value;
                if (v && !hols.includes(v)) touch(setHols, [...hols, v].sort());
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {hols.length === 0 ? (
          <p className="pt-bd__hint">No days off recorded.</p>
        ) : (
          <ul className="pt-bd__hols">
            {hols.map((h) => (
              <li key={h} className={h < todayIso ? "is-past" : ""}>
                <strong>
                  {new Date(h + "T00:00:00Z").toLocaleDateString("en-AU", {
                    timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric",
                  })}
                </strong>
                {h < todayIso && <em>gone</em>}
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost pt-btn--sm"
                  onClick={() => touch(setHols, hols.filter((x) => x !== h))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={`pt-bd__bar${dirty ? " is-dirty" : ""}`}>
        <div className="pt-bd__barsay">
          {err ? (
            <span className="pt-bd__barerr">{err}</span>
          ) : dirty ? (
            <span>Unsaved changes. The board keeps using the stored settings until you save.</span>
          ) : (
            <span>{note ?? "Nothing to save."}</span>
          )}
        </div>
        <div className="pt-bd__baracts">
          {dirty && (
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              disabled={pending}
              onClick={() => {
                setDays(initialDays);
                setHols(initialHolidays);
                setErr(null);
              }}
            >
              Discard
            </button>
          )}
          <button type="button" className="pt-btn" onClick={save} disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save"}
          </button>
          {!dirty && (
            <button type="button" className="pt-btn pt-btn--ghost" onClick={push} disabled={pending}>
              {pending ? "Working…" : "Push it to the board now"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

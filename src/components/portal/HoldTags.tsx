"use client";

import { useState, useTransition } from "react";
import { resetHoldTags, setHoldTag } from "@/app/portal/board/hold/actions";
import type { HoldSide, HoldTagRow } from "@/lib/board/holdTags";

/**
 * One row per tag, holds first, with three buttons: not a hold, on us, on the
 * customer.
 *
 * Saved per row as it is changed rather than behind one Save button — forty-odd
 * rows and one button is a form somebody abandons half-finished, and a
 * half-finished save here changes what the wall counts.
 */
export function HoldTags({ rows, configured, held }: { rows: HoldTagRow[]; configured: boolean; held: number }) {
  const [sides, setSides] = useState<Record<string, HoldSide | null>>(
    Object.fromEntries(rows.map((r) => [r.name, r.side])),
  );
  const [saved, setSaved] = useState<Record<string, "ok" | "err">>({});
  const [, start] = useTransition();

  const set = (name: string, side: HoldSide | null) => {
    setSides((s) => ({ ...s, [name]: side }));
    start(async () => {
      const res = await setHoldTag(name, side);
      setSaved((s) => ({ ...s, [name]: res.ok ? "ok" : "err" }));
    });
  };

  const back = () => {
    start(async () => {
      const res = await resetHoldTags();
      if (res.ok) {
        setSides(Object.fromEntries(rows.map((r) => [r.name, r.byDefault])));
        setSaved({});
      }
    });
  };

  const holds = Object.values(sides).filter(Boolean).length;

  return (
    <div className="pt-panel">
      <div className="pt-panel__head">
        <h2 className="pt-panel__h">Which tags mean held</h2>
        <span className="pt-panel__sub">
          {holds} of {rows.length} · {held} open {held === 1 ? "job" : "jobs"} on the board right now ·{" "}
          {configured ? "set here" : "the default list"}
        </span>
      </div>

      {configured && (
        <p className="pt-note">
          <button type="button" className="pt-btn pt-btn--ghost pt-hold__reset" onClick={back}>
            Back to the default list
          </button>{" "}
          , the eleven the board picks out of the tag names by itself.
        </p>
      )}

      <table className="pt-table pt-hold">
        <thead>
          <tr>
            <th>Tag</th>
            <th className="pt-hold__n">On open jobs</th>
            <th className="pt-hold__set">Held?</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3}>No tags yet. They arrive with the next ServiceTitan sync.</td>
            </tr>
          )}
          {rows.map((r) => {
            const side = sides[r.name] ?? null;
            return (
              <tr key={r.name} className={r.open === 0 ? "is-quiet" : undefined}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td className="pt-hold__n">{r.open || ""}</td>
                <td className="pt-hold__set">
                  <span className="pt-seg">
                    {([
                      [null, "No"],
                      ["us", "On us"],
                      ["them", "On them"],
                    ] as Array<[HoldSide | null, string]>).map(([v, label]) => (
                      <button
                        key={label}
                        type="button"
                        className={`pt-seg__b ${side === v ? "is-on" : ""}`}
                        onClick={() => set(r.name, v)}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                  {saved[r.name] === "err" ? <span className="pt-inline is-err">not saved</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

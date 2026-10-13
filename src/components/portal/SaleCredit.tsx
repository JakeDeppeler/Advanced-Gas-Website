"use client";

import { useMemo, useState, useTransition } from "react";
import { setSaleCredit } from "@/app/portal/board/credit/actions";
import type { SoldJob } from "@/lib/board/saleCredit";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—";

/**
 * What has sold in the last sixty days, newest first, with who the board
 * credits it to and a box to change that.
 *
 * Changed per row rather than behind a Save button, like the rest of the
 * board's settings — but unlike them this one moves money between people, so
 * every moved row says so on its face and carries who moved it and when.
 */
export function SaleCredit({ jobs, people, moves }: { jobs: SoldJob[]; people: string[]; moves: number }) {
  const [rows, setRows] = useState(jobs);
  const [saved, setSaved] = useState<Record<string, "ok" | "err">>({});
  const [onlyMoved, setOnlyMoved] = useState(false);
  const [, start] = useTransition();

  const shown = useMemo(() => (onlyMoved ? rows.filter((r) => r.move) : rows), [rows, onlyMoved]);

  const change = (job: SoldJob, to: string) => {
    const next = to === "" ? null : to;
    setRows((rs) =>
      rs.map((r) =>
        r.key !== job.key
          ? r
          : {
              ...r,
              credited: next ?? r.original,
              move: next == null ? null : { to: next, from: r.move?.from ?? r.original, by: null, at: new Date().toISOString() },
            },
      ),
    );
    start(async () => {
      const res = await setSaleCredit(job.key, next);
      setSaved((s) => ({ ...s, [job.key]: res.ok ? "ok" : "err" }));
    });
  };

  return (
    <div className="pt-panel">
      <div className="pt-panel__head">
        <h2 className="pt-panel__h">Sold in the last 60 days</h2>
        <span className="pt-panel__sub">
          {rows.length} {rows.length === 1 ? "job" : "jobs"} · {moves} moved
        </span>
      </div>

      {rows.some((r) => r.move) && (
        <p className="pt-note">
          <label className="pt-oh__toggle">
            <input type="checkbox" checked={onlyMoved} onChange={(e) => setOnlyMoved(e.target.checked)} /> Only the ones
            that have been moved
          </label>
        </p>
      )}

      <table className="pt-table pt-credit">
        <thead>
          <tr>
            <th>Job</th>
            <th className="pt-credit__n">Sold</th>
            <th className="pt-credit__n">Value</th>
            <th className="pt-credit__set">Credited to</th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr>
              <td colSpan={4}>Nothing has sold in the last sixty days.</td>
            </tr>
          )}
          {shown.map((j) => (
            <tr key={j.key} className={j.move ? "is-moved" : undefined}>
              <td>
                <strong>{j.customer ?? (j.jobNumber ? `Job ${j.jobNumber}` : "Quote")}</strong>
                <span className="pt-credit__where">
                  {/* A sale with no job on it says so, rather than leaving the
                      line blank: it is identified by the customer and the day
                      it was written, and the row has to say which quote that
                      is before anybody moves it. */}
                  {[j.jobNumber ? `#${j.jobNumber}` : "quote with no job on it", j.suburb].filter(Boolean).join(" · ")}
                </span>
                {/* What the move changed and who made it. The leaderboard and
                    the bonus on it follow this, so "it has always said that"
                    needs an answer on the page itself. */}
                {j.move ? (
                  <span className="pt-credit__moved">
                    moved from {j.move.from ?? "nobody"}
                    {j.move.by ? ` by ${j.move.by}` : ""}
                    {j.move.at ? ` on ${day(j.move.at)}` : ""}
                  </span>
                ) : null}
              </td>
              <td className="pt-credit__n">{day(j.soldOn)}</td>
              <td className="pt-credit__n">{money(j.value)}</td>
              <td className="pt-credit__set">
                <select
                  className="pt-credit__pick"
                  value={j.move ? j.move.to : ""}
                  onChange={(e) => change(j, e.target.value)}
                >
                  {/* Always first, always named: the way back is a thing somebody has to be
                      able to find without remembering who had it. */}
                  <option value="">{j.original ?? "nobody"} — unchanged</option>
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {saved[j.key] === "err" ? <span className="pt-inline is-err">not saved</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

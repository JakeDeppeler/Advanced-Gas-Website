"use client";

import { useState } from "react";
import { money } from "@/lib/portal/format";

export type QuietRow = {
  id: number;
  label: string;
  value: number;
  options: number;
  ageDays: number;
  jobNumber?: string | null;
  customer?: string | null;
  suburb?: string | null;
};

type Order = "quiet" | "value";

const FIRST = 10;

/**
 * The quotes gone quiet, to ring through: longest quiet first or biggest
 * first, ten at a time or the lot.
 *
 * Each order breaks its ties on the other, so two quotes both quiet for nine
 * days come biggest first, and two at $7,000 come the longer-quiet first.
 * The rows are already on the page; sorting and showing more is done here
 * rather than with a round trip.
 */
export function QuietQuotes({ rows, total }: { rows: QuietRow[]; total: number }) {
  const [order, setOrder] = useState<Order>("quiet");
  const [all, setAll] = useState(false);

  const sorted = [...rows].sort(order === "quiet"
    ? (a, b) => b.ageDays - a.ageDays || b.value - a.value
    : (a, b) => b.value - a.value || b.ageDays - a.ageDays);
  const shown = all ? sorted : sorted.slice(0, FIRST);
  const more = rows.length > FIRST;

  return (
    <>
      <div className="pt-quiet__bar">
        <div className="pt-seg" role="group" aria-label="Order">
          <button type="button" className={`pt-seg__b${order === "quiet" ? " is-on" : ""}`} aria-pressed={order === "quiet"} onClick={() => setOrder("quiet")}>
            Longest quiet
          </button>
          <button type="button" className={`pt-seg__b${order === "value" ? " is-on" : ""}`} aria-pressed={order === "value"} onClick={() => setOrder("value")}>
            Biggest first
          </button>
        </div>
        <span className="pt-quiet__count">
          {shown.length === rows.length ? `All ${rows.length}` : `${shown.length} of ${rows.length}`}
        </span>
      </div>

      <div className="pt-fleet__wrap">
        <table className="pt-fleet pt-otab">
          <thead>
            <tr>
              <th>Quote</th>
              <th>Options</th>
              <th className="pt-otab__num" aria-sort={order === "quiet" ? "descending" : undefined}>Quiet for</th>
              <th className="pt-otab__num" aria-sort={order === "value" ? "descending" : undefined}>Worth</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const sub = [r.customer ? r.label : null, r.suburb, r.jobNumber ? `job ${r.jobNumber}` : `estimate ${r.id}`].filter(Boolean).join(" · ");
              return (
                <tr key={r.id}>
                  <td><strong>{r.customer || r.label}</strong><span className="pt-fleet__sub">{sub}</span></td>
                  <td>{r.options}</td>
                  <td className="pt-otab__num">{r.ageDays} {r.ageDays === 1 ? "day" : "days"}</td>
                  <td className="pt-otab__num"><strong>{money(r.value)}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {more && (
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm pt-quiet__more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? `Show the first ${FIRST}` : `Show all ${rows.length}`}
        </button>
      )}
      {total > rows.length && (
        <p className="pt-panel__sub">
          These are the {rows.length} largest of {total}; the rest arrive with the board&rsquo;s next refresh.
        </p>
      )}
    </>
  );
}

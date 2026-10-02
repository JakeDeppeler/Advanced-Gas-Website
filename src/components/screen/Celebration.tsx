"use client";

import { useEffect } from "react";

export type Sale = { id: number; name: string | null; value: number; soldOn: string };

/**
 * The sale celebration.
 *
 * Fires when a sold estimate appears that the screen hasn't shown before.
 * "Real time" is bounded by the sync: the board learns about a sale on the next
 * sync run, so this lands within about ten minutes of the quote being closed,
 * not the instant it happens. Worth knowing before anyone treats a quiet screen
 * as proof that nothing sold.
 *
 * Motion is suppressed under prefers-reduced-motion — the card still appears
 * with the name and the number, which is the part that matters.
 */
export function Celebration({ sale, onDone }: { sale: Sale; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 7000);
    return () => clearTimeout(t);
  }, [sale.id, onDone]);

  const amount = `$${Math.round(sale.value).toLocaleString("en-AU")}`;

  return (
    <div className="celebrate" role="status" aria-live="polite">
      <div className="celebrate__sky">
        {/* Decorative only — the announcement is carried by the text below. */}
        <span className="celebrate__star celebrate__star--1" aria-hidden />
        <span className="celebrate__star celebrate__star--2" aria-hidden />
        <span className="celebrate__star celebrate__star--3" aria-hidden />
        <span className="celebrate__moon" aria-hidden>
          🌕
        </span>
        <span className="celebrate__rocket" aria-hidden>
          🚀
        </span>
      </div>

      <div className="celebrate__card">
        <span className="celebrate__kicker">Sold</span>
        <span className="celebrate__amount">{amount}</span>
        <span className="celebrate__who">{sale.name ?? "Advanced Gas"}</span>
      </div>
    </div>
  );
}

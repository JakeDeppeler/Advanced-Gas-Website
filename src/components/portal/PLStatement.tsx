"use client";

import { useState, type ReactNode } from "react";
import {
  Delta, Mover, headlines, money, rankMovers, signed,
  type PLDetail,
} from "@/components/portal/plParts";

export type { PLDetail } from "@/components/portal/plParts";

/** Long expense sections start folded — otherwise the page opens as a wall of accounts. */
const FOLD_OVER = 6;

export function PLStatement({
  now, before, nowLabel, beforeLabel, picker,
}: { now: PLDetail; before: PLDetail | null; nowLabel: string; beforeLabel: string; picker: ReactNode }) {
  const [closed, setClosed] = useState<Set<string>>(
    () => new Set(now.sections.filter((s) => s.lines.length > FOLD_OVER).map((s) => s.title)),
  );
  const [allMovers, setAllMovers] = useState(false);

  const toggle = (t: string) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(t)) next.delete(t); else next.add(t);
    return next;
  });

  const heads = headlines(now, before);
  const movers = rankMovers(now, before);
  const shown = allMovers ? movers : movers.slice(0, 8);

  // The one-sentence read: what each side did, and what it did to profit.
  const inD = before ? now.income - before.income : null;
  const outD = before ? (now.costOfSales + now.operatingExpenses) - (before.costOfSales + before.operatingExpenses) : null;
  const profitD = before ? now.netProfit - before.netProfit : null;

  return (
    <>
      <section className="pt-panel">
        <div className="pt-ov__charthead">
          <h2 className="pt-panel__h">Where the difference is</h2>
          {picker}
        </div>
        <p className="pt-panel__sub">
          <strong>{nowLabel}</strong>{before ? <>, against <strong>{beforeLabel}</strong>.</> : <>. No comparison period available.</>}
        </p>

        <div className="pt-pl__heads">
          {heads.map((h) => (
            <div key={h.label} className="pt-pl__head">
              <span className="pt-pl__headlabel">{h.label}</span>
              <strong className={`pt-pl__headval${h.now < 0 ? " is-neg" : ""}`}>{money(h.now)}</strong>
              {h.before !== null ? <Delta kind={h.kind} now={h.now} before={h.before} /> : <span className="pt-pl__delta is-flat">—</span>}
            </div>
          ))}
        </div>

        {before && profitD !== null && inD !== null && outD !== null && (
          <>
            <p className="pt-pl__read">
              Money in is <strong className={inD >= 0 ? "is-good" : "is-bad"}>{signed(inD)}</strong> and money out is{" "}
              <strong className={outD <= 0 ? "is-good" : "is-bad"}>{signed(outD)}</strong>, so profit is{" "}
              <strong className={profitD >= 0 ? "is-good" : "is-bad"}>{signed(profitD)}</strong>.
              {Math.abs(outD) > Math.abs(inD)
                ? " Costs moved more than sales did."
                : " Sales moved more than costs did."}
              {movers.length > 0 && " These are the accounts that shifted furthest:"}
            </p>

            {shown.length === 0 ? (
              <div className="pf-empty">Nothing moved between the two periods.</div>
            ) : (
              <div className="pt-pl__movers">
                {shown.map((r) => <Mover key={`${r.section}|${r.label}`} row={r} />)}
              </div>
            )}

            {movers.length > 8 && (
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm pt-pl__morebtn" onClick={() => setAllMovers((v) => !v)}>
                {allMovers ? "Show the top 8 only" : `Show all ${movers.length} accounts that moved`}
              </button>
            )}
          </>
        )}
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">The full statement</h2>
        <p className="pt-panel__sub">Every account for {nowLabel}, exactly as Xero groups it. Click a heading to open or fold it.</p>
        <div className="pt-pl__sections">
          {now.sections.map((s) => {
            const foldable = s.lines.length > 0;
            const isOpen = foldable && !closed.has(s.title);
            const beforeSec = before?.sections.find((b) => b.title === s.title) ?? null;
            const kind = s.kind === "summary" ? "in" : s.kind;
            return (
              <div key={s.title} className={`pt-pl__sec${s.kind === "summary" ? " is-summary" : ""}`}>
                <button
                  type="button"
                  className="pt-pl__sechead"
                  onClick={() => foldable && toggle(s.title)}
                  aria-expanded={foldable ? isOpen : undefined}
                  disabled={!foldable}
                >
                  <span className="pt-pl__sectitle">
                    {foldable && <span className={`pt-pl__caret${isOpen ? " is-open" : ""}`} aria-hidden="true">›</span>}
                    {s.title}
                    {foldable && <span className="pt-pl__seccount">{s.lines.length}</span>}
                  </span>
                  <span className="pt-pl__sectotal">
                    <strong>{money(s.total)}</strong>
                    {beforeSec && <Delta kind={kind} now={s.total} before={beforeSec.total} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="pt-pl__lines">
                    {s.lines.map((l) => {
                      const was = beforeSec?.lines.find((b) => b.label === l.label)?.amount ?? null;
                      return (
                        <div key={l.label} className="pt-pl__line">
                          <span className="pt-pl__linelabel">{l.label}</span>
                          <span className="pt-pl__lineval">{money(l.amount)}</span>
                          {before ? <Delta kind={kind} now={l.amount} before={was ?? 0} /> : <span />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

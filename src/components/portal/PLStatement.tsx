"use client";

import { useState } from "react";

export type PLLine = { label: string; amount: number };
export type PLSection = { title: string; kind: "in" | "out" | "summary"; lines: PLLine[]; total: number };
export type PLDetail = {
  sections: PLSection[];
  income: number; costOfSales: number; grossProfit: number | null;
  operatingExpenses: number; netProfit: number;
};

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;
const pctChange = (now: number, before: number): string | null => {
  if (!before) return null;
  const p = ((now - before) / Math.abs(before)) * 100;
  if (!Number.isFinite(p)) return null;
  return `${p > 0 ? "+" : "−"}${Math.abs(Math.round(p))}%`;
};

/** Whether a movement is welcome depends on which side of the report it's on. */
const toneFor = (kind: "in" | "out", delta: number): "good" | "bad" | "flat" => {
  if (Math.abs(delta) < 1) return "flat";
  return (kind === "in") === (delta > 0) ? "good" : "bad";
};

type Row = { section: string; kind: "in" | "out"; label: string; now: number; before: number };

function mergeRows(now: PLDetail, before: PLDetail | null): Row[] {
  const map = new Map<string, Row>();
  for (const s of now.sections) {
    if (s.kind === "summary") continue;
    for (const l of s.lines) {
      map.set(`${s.title}|${l.label}`, { section: s.title, kind: s.kind, label: l.label, now: l.amount, before: 0 });
    }
  }
  for (const s of before?.sections ?? []) {
    if (s.kind === "summary") continue;
    for (const l of s.lines) {
      const k = `${s.title}|${l.label}`;
      const hit = map.get(k);
      if (hit) hit.before = l.amount;
      else map.set(k, { section: s.title, kind: s.kind, label: l.label, now: 0, before: l.amount });
    }
  }
  return [...map.values()];
}

function Delta({ kind, now, before }: { kind: "in" | "out"; now: number; before: number }) {
  const d = now - before;
  const tone = toneFor(kind, d);
  const p = pctChange(now, before);
  return (
    <span className={`pt-pl__delta is-${tone}`}>
      {signed(d)}{p ? <em> {p}</em> : null}
    </span>
  );
}

export function PLStatement({
  now, before, nowLabel, beforeLabel,
}: { now: PLDetail; before: PLDetail | null; nowLabel: string; beforeLabel: string }) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [allMovers, setAllMovers] = useState(false);

  const toggle = (t: string) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(t)) next.delete(t); else next.add(t);
    return next;
  });

  // Plenty of service businesses book everything as an operating expense and
  // have no cost of sales at all; showing those two would just repeat money in.
  const hasCostOfSales = now.costOfSales !== 0 || (before?.costOfSales ?? 0) !== 0;

  const heads: { label: string; kind: "in" | "out"; now: number; before: number | null }[] = [
    { label: "Money in", kind: "in", now: now.income, before: before?.income ?? null },
    ...(hasCostOfSales ? [
      { label: "Cost of sales", kind: "out" as const, now: now.costOfSales, before: before?.costOfSales ?? null },
      { label: "Gross profit", kind: "in" as const, now: now.grossProfit ?? now.income - now.costOfSales, before: before ? (before.grossProfit ?? before.income - before.costOfSales) : null },
    ] : []),
    { label: "Running costs", kind: "out", now: now.operatingExpenses, before: before?.operatingExpenses ?? null },
    { label: "Net profit", kind: "in", now: now.netProfit, before: before?.netProfit ?? null },
  ];

  const rows = mergeRows(now, before);
  const movers = before
    ? rows.filter((r) => Math.abs(r.now - r.before) >= 1).sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
    : [];
  const shown = allMovers ? movers : movers.slice(0, 8);

  // The one-sentence read: what happened to each side, and what it did to profit.
  const inD = before ? now.income - before.income : null;
  const outD = before ? (now.costOfSales + now.operatingExpenses) - (before.costOfSales + before.operatingExpenses) : null;
  const profitD = before ? now.netProfit - before.netProfit : null;

  return (
    <>
      <section className="pt-panel">
        <h2 className="pt-panel__h">{nowLabel}</h2>
        <p className="pt-panel__sub">{before ? <>Every figure compared with <strong>{beforeLabel}</strong>.</> : <>No comparison period available.</>}</p>
        <div className="pt-pl__heads">
          {heads.map((h) => (
            <div key={h.label} className="pt-pl__head">
              <span className="pt-pl__headlabel">{h.label}</span>
              <strong className={`pt-pl__headval${h.now < 0 ? " is-neg" : ""}`}>{money(h.now)}</strong>
              {h.before !== null ? <Delta kind={h.kind} now={h.now} before={h.before} /> : <span className="pt-pl__delta is-flat">—</span>}
            </div>
          ))}
        </div>
      </section>

      {before && profitD !== null && inD !== null && outD !== null && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Where the difference is</h2>
          <p className="pt-pl__read">
            Against {beforeLabel}, money in is <strong className={inD >= 0 ? "is-good" : "is-bad"}>{signed(inD)}</strong> and money out is{" "}
            <strong className={outD <= 0 ? "is-good" : "is-bad"}>{signed(outD)}</strong>, so profit is{" "}
            <strong className={profitD >= 0 ? "is-good" : "is-bad"}>{signed(profitD)}</strong>.
            {Math.abs(outD) > Math.abs(inD)
              ? " The costs side moved more than the sales side — the lines below are ranked by how much each one shifted."
              : " The sales side moved more than the costs side — the lines below are ranked by how much each one shifted."}
          </p>

          {shown.length === 0 ? (
            <div className="pf-empty">Nothing moved between the two periods.</div>
          ) : (
            <div className="pt-pl__movers">
              {shown.map((r) => {
                const d = r.now - r.before;
                return (
                  <div key={`${r.section}|${r.label}`} className={`pt-pl__mover is-${toneFor(r.kind, d)}`}>
                    <div className="pt-pl__moverid">
                      <strong>{r.label}</strong>
                      <span>{r.section}</span>
                    </div>
                    <div className="pt-pl__moverfig">
                      <span className="pt-pl__was">{money(r.before)} → {money(r.now)}</span>
                      <Delta kind={r.kind} now={r.now} before={r.before} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {movers.length > 8 && (
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" style={{ marginTop: 12 }} onClick={() => setAllMovers((v) => !v)}>
              {allMovers ? "Show the top 8 only" : `Show all ${movers.length} lines that moved`}
            </button>
          )}
        </section>
      )}

      <section className="pt-panel">
        <h2 className="pt-panel__h">The full statement</h2>
        <p className="pt-panel__sub">Straight from Xero, account by account. Click a heading to fold it away.</p>
        <div className="pt-pl__sections">
          {now.sections.map((s) => {
            const isOpen = !closed.has(s.title);
            const beforeSec = before?.sections.find((b) => b.title === s.title) ?? null;
            const kind = s.kind === "summary" ? "in" : s.kind;
            return (
              <div key={s.title} className={`pt-pl__sec${s.kind === "summary" ? " is-summary" : ""}`}>
                <button type="button" className="pt-pl__sechead" onClick={() => s.lines.length && toggle(s.title)} aria-expanded={isOpen}>
                  <span className="pt-pl__sectitle">
                    {s.lines.length > 0 && <span className={`pt-pl__caret${isOpen ? " is-open" : ""}`} aria-hidden="true">›</span>}
                    {s.title}
                  </span>
                  <span className="pt-pl__sectotal">
                    <strong>{money(s.total)}</strong>
                    {beforeSec && <Delta kind={kind} now={s.total} before={beforeSec.total} />}
                  </span>
                </button>
                {isOpen && s.lines.length > 0 && (
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

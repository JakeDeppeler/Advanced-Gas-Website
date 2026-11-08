"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMarkups } from "@/app/portal/pricing/actions";
import type { MarkupRule, MarkupRules } from "@/lib/pricebook/markupRules";

type Row = { brand: string; category: string; markup: string; keep: boolean };
const toRow = (r: MarkupRule): Row => ({ brand: r.brand ?? "", category: r.category ?? "", markup: r.markup == null ? "" : String(r.markup), keep: r.markup == null });

/**
 * The equipment markups by brand and kind of system. Saving works the price
 * changes out again; they show underneath for a look before anything goes to
 * ServiceTitan.
 */
export function MarkupRulesForm({ initial, brands, categories }: { initial: MarkupRules; brands: string[]; categories: readonly string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.rules.map(toRow));
  const [fallback, setFallback] = useState(String(initial.fallback));
  const [roundTo, setRoundTo] = useState(String(initial.roundTo));
  const [roundMode, setRoundMode] = useState(initial.roundMode);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const set = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveMarkups({
        rules: rows.filter((x) => x.brand || x.category).map((x) => ({ brand: x.brand || null, category: x.category || null, markup: x.keep ? null : Number(x.markup) })),
        fallback: Number(fallback), roundTo: Number(roundTo), roundMode, costFix: initial.costFix,
      });
      setMsg(r.ok ? { ok: true, text: `Saved. ${r.changes} price${r.changes === 1 ? "" : "s"} to change: look them over below, then press Update.` } : { ok: false, text: r.error ?? "Couldn’t save." });
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className="pt-panel mk">
      <h2 className="pt-panel__h">Equipment markups</h2>
      <p className="pt-loc__lede">
        On cost ex GST, by brand and kind of system. The closest match wins: brand and kind, then brand, then kind, then everything else.
        Every price lands on the rounding step, and never goes down: where the nearest step is lower, it goes to the next one up. Anything under $500 rounds to $10.
      </p>
      <table className="mk-t">
        <thead><tr><th>Brand</th><th>Kind of system</th><th>Markup</th><th aria-label="Remove" /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <select className="pk-in" value={r.brand} onChange={(e) => set(i, { brand: e.target.value })} aria-label="Brand">
                  <option value="">Any brand</option>
                  {[...new Set([...brands, r.brand].filter(Boolean))].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </td>
              <td>
                <select className="pk-in" value={r.category} onChange={(e) => set(i, { category: e.target.value })} aria-label="Kind of system">
                  <option value="">Every kind</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td className="mk-m">
                {r.keep ? <span className="mk-keep">Keep current price</span> : (
                  <span className="mk-pct"><input className="pk-in" type="number" min={0} max={200} step={0.5} value={r.markup} onChange={(e) => set(i, { markup: e.target.value })} aria-label="Markup %" />%</span>
                )}
                <label className="mk-chk"><input type="checkbox" checked={r.keep} onChange={(e) => set(i, { keep: e.target.checked })} /> keep</label>
              </td>
              <td><button type="button" className="rs-x" aria-label="Remove this markup" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>×</button></td>
            </tr>
          ))}
          <tr className="mk-fall">
            <td colSpan={2}><b>Everything else</b></td>
            <td className="mk-m"><span className="mk-pct"><input className="pk-in" type="number" min={0} max={200} step={0.5} value={fallback} onChange={(e) => setFallback(e.target.value)} aria-label="Markup for everything else %" />%</span></td>
            <td />
          </tr>
        </tbody>
      </table>
      <div className="mk-bar">
        <button type="button" className="pk-btn g" onClick={() => setRows((rs) => [...rs, { brand: "", category: "", markup: fallback, keep: false }])}>+ Add a markup</button>
        <label className="mk-round">Round to the
          <select className="pk-in" value={roundMode} onChange={(e) => setRoundMode(e.target.value === "up" ? "up" : "nearest")} aria-label="Rounding">
            <option value="nearest">nearest</option>
            <option value="up">next</option>
          </select>
          <select className="pk-in" value={roundTo} onChange={(e) => setRoundTo(e.target.value)} aria-label="Round to">
            <option value="100">$100</option><option value="50">$50</option><option value="10">$10</option><option value="1">$1</option>
          </select>
        </label>
        <button type="button" className="pk-btn" disabled={busy} onClick={save}>{busy ? "Working out prices…" : "Save and work out prices"}</button>
      </div>
      {msg && <div className={`pt-note${msg.ok ? "" : " pt-note--warn"}`} role="status">{msg.text}</div>}
    </section>
  );
}

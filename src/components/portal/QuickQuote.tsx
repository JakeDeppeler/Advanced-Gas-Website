"use client";

import { useMemo, useState } from "react";

export type QuoteRow = {
  brand: string;
  productSlug: string;
  name: string;
  model: string;
  categoryLabel: string;
  capacity?: string;
  veu: boolean;
  price?: string;
  bestFor: string;
};

const INCLUDED = "Includes labour, standard install, disposal of the old unit and a compliance certificate.";

function priceText(row: QuoteRow): string {
  return row.price ? row.price.replace(/^./, (c) => c.toUpperCase()) : "Priced at quote";
}

function customerSummary(row: QuoteRow): string {
  const cap = row.capacity ? ` (${row.capacity})` : "";
  const veu = row.veu ? " VEU rebate already applied." : "";
  const price = row.price ? row.price : "priced at quote";
  return `${row.brand} ${row.model}${cap} — ${price}. ${INCLUDED}${veu} Fixed quote back within 12 business hours.`;
}

export function QuickQuote({ rows }: { rows: QuoteRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<QuoteRow | null>(null);
  const [copied, setCopied] = useState(false);

  const cats = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) seen.set(r.categoryLabel, (seen.get(r.categoryLabel) ?? 0) + 1);
    return [...seen.entries()].map(([label, count]) => ({ label, count }));
  }, [rows]);

  const filtered = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (cat && r.categoryLabel !== cat) return false;
      if (!terms.length) return true;
      const hay = `${r.brand} ${r.name} ${r.model} ${r.capacity ?? ""} ${r.categoryLabel} ${r.bestFor}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, q, cat]);

  function copy() {
    if (!selected) return;
    navigator.clipboard?.writeText(customerSummary(selected)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  }

  return (
    <div className="pt-qq">
      <div className="pt-qq__list">
        <div className="pt-qq__search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand, model, capacity…" aria-label="Search the price list" />
          {q && <button type="button" className="pt-qq__clear" onClick={() => setQ("")} aria-label="Clear">×</button>}
        </div>

        <div className="pt-qq__chips">
          <button type="button" className={`pt-qq__chip${cat === "" ? " is-on" : ""}`} onClick={() => setCat("")}>All <span>{rows.length}</span></button>
          {cats.map((c) => (
            <button key={c.label} type="button" className={`pt-qq__chip${cat === c.label ? " is-on" : ""}`} onClick={() => setCat(c.label)}>
              {c.label} <span>{c.count}</span>
            </button>
          ))}
        </div>

        <div className="pt-qq__rows">
          {filtered.length === 0 ? (
            <div className="pt-qq__empty">No models match that.</div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.productSlug}
                type="button"
                className={`pt-qq__row${selected?.productSlug === r.productSlug ? " is-on" : ""}`}
                onClick={() => { setSelected(r); setCopied(false); }}
              >
                <span className="pt-qq__rowmain">
                  <strong>{r.brand} <span className="pt-qq__model">{r.model}</span></strong>
                  <span className="pt-qq__rowsub">{r.categoryLabel}{r.capacity ? ` · ${r.capacity}` : ""}</span>
                </span>
                <span className="pt-qq__rowprice">{r.price ? r.price.replace(/\s*installed$/i, "") : "Quote"}{r.veu && <em className="pt-qq__veu">VEU</em>}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="pt-qq__detail">
        {!selected ? (
          <div className="pt-qq__placeholder">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h4" /></svg>
            <p>Pick a model on the left and its installed price and a customer-ready summary show here.</p>
          </div>
        ) : (
          <div className="pt-qq__card">
            <div className="pt-qq__cat">{selected.categoryLabel}</div>
            <h2>{selected.brand} {selected.model}</h2>
            {selected.capacity && <div className="pt-qq__spec">{selected.capacity}</div>}

            <div className="pt-qq__pricebig">
              {priceText(selected)}
              {selected.veu && <span className="pt-qq__veubadge">VEU rebate applied</span>}
            </div>

            <p className="pt-qq__bestfor">{selected.bestFor}</p>

            <div className="pt-qq__included">
              <div className="pt-qq__included-h">In the installed price</div>
              <ul>
                <li>Labour &amp; standard installation</li>
                <li>Disposal of the old unit</li>
                <li>Compliance certificate</li>
                {selected.veu && <li>VEU rebate applied</li>}
              </ul>
            </div>

            <div className="pt-qq__summary">
              <div className="pt-qq__summary-h">Read this to the customer</div>
              <p>{customerSummary(selected)}</p>
              <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" onClick={copy}>
                {copied ? "Copied ✓" : "Copy summary"}
              </button>
            </div>

            <p className="pt-qq__note">Prices marked &ldquo;from&rdquo; are the starting installed price — confirm the final number on a written quote.</p>
          </div>
        )}
      </div>
    </div>
  );
}

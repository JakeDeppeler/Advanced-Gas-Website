"use client";

import { useState } from "react";
import Link from "next/link";
import { MAX_OPTIONS, useQuote, type QuoteOption } from "@/components/portal/quoteStore";

const PIN = "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";

/** "Quoting for" — who this quote is for, typed in once and carried across screens. */
export function QuotingFor({ withQuote = true }: { withQuote?: boolean }) {
  const [q, update] = useQuote();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const n = q.options.length;

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
      <div className="tr-card tr-row" style={{ flex: "1 1 420px", padding: "12px 20px", minHeight: 0 }}>
        <span className="tr-row__ic tr-row__ic--grey"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PIN} /></svg></span>
        {editing ? (
          <form
            style={{ display: "flex", gap: 8, flex: 1 }}
            onSubmit={(e) => { e.preventDefault(); update((x) => ({ ...x, customer: draft.trim().slice(0, 120) })); setEditing(false); }}
          >
            <input className="tr-input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Customer · suburb · job number" aria-label="Who the quote is for" />
            <button type="submit" className="tr-btn tr-btn--navy">Save</button>
          </form>
        ) : (
          <>
            <span className="tr-row__k">
              <span>Quoting for</span>
              <strong>{q.customer || "Nobody yet"}</strong>
            </span>
            <button type="button" className="tr-link" style={{ background: "none", border: 0, font: "inherit", fontSize: 17, cursor: "pointer", minHeight: 44 }} onClick={() => { setDraft(q.customer); setEditing(true); }}>
              {q.customer ? "Change" : "Add"}
            </button>
          </>
        )}
      </div>
      {withQuote && (
        <Link href="/trade/quote" className="tr-card tr-card--navy" style={{ textDecoration: "none", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 150, padding: "12px 22px" }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,.75)", fontWeight: 600 }}>The quote</span>
          <strong style={{ fontSize: 18 }}>{n} {n === 1 ? "option" : "options"} →</strong>
        </Link>
      )}
    </div>
  );
}

/** "The quote · 2 options →" as a pill, for beside the shelf's filters. */
export function QuotePill() {
  const [q] = useQuote();
  const n = q.options.length;
  return <Link href="/trade/quote" className="tr-btn tr-btn--navy" style={{ borderRadius: 26 }}>The quote · {n} {n === 1 ? "option" : "options"} →</Link>;
}

/** + Add / ✓ Added — puts a model on the quote as an option. */
export function AddToQuote({ option, big = false }: { option: QuoteOption; big?: boolean }) {
  const [q, update, ready] = useQuote();
  const on = q.options.some((o) => o.id === option.id);
  const full = q.options.length >= MAX_OPTIONS;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={!ready || (!on && full)}
      title={!on && full ? `A quote holds ${MAX_OPTIONS} options. Take one off first.` : undefined}
      className={`tr-btn ${on ? "tr-btn--added" : "tr-btn--go"}${big ? " tr-btn--block" : ""}`}
      onClick={() => update((x) => ({ ...x, options: on ? x.options.filter((o) => o.id !== option.id) : [...x.options, option].slice(0, MAX_OPTIONS) }))}
    >
      {on ? "✓ Added" : full ? "Quote is full" : big ? "+ Add to the quote" : "+ Add"}
    </button>
  );
}

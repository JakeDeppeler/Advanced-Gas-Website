"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductArt } from "@/components/portal/ProductArt";
import { QuotingFor } from "@/components/portal/QuoteBits";
import { MAX_OPTIONS, optionTotal, useQuote } from "@/components/portal/quoteStore";

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;

/**
 * The quote: up to three options side by side, with what goes on all of them.
 *
 * The extras are typed in by the tech — a pipe run, a new circuit — because
 * the business has no price list for them written down, and a number on this
 * screen is one a customer will hold you to. "Show the customer" takes the
 * working out away and leaves the choice.
 */
export function QuoteBuilder() {
  const [q, update, ready] = useQuote();
  const [showing, setShowing] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");

  function addExtra() {
    const n = Number(amount.replace(/[$,\s]/g, ""));
    if (!label.trim()) { setMsg("Say what it is."); return; }
    if (!Number.isFinite(n) || n === 0) { setMsg("Put the amount in, inc GST. A discount goes in as a minus."); return; }
    update((x) => ({ ...x, extras: [...x.extras, { id: crypto.randomUUID(), label: label.trim().slice(0, 80), amount: Math.round(n * 100) / 100 }] }));
    setLabel(""); setAmount(""); setMsg("");
  }

  if (!ready) return <div className="tr-skel tr-skel--panel" />;

  if (showing) {
    return (
      <div className="tr-stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2 className="tr-h2">{q.customer ? `Your options, ${q.customer.split(/[·,]/)[0].trim()}` : "Your options"}</h2>
          <button type="button" className="tr-btn" onClick={() => setShowing(false)}>Back to editing</button>
        </div>
        <div className={`tr-grid tr-grid--${Math.max(1, Math.min(3, q.options.length))}`}>
          {q.options.map((o, i) => {
            const total = optionTotal(o, q.extras);
            return (
              <section key={o.id} className="tr-card tr-stack" style={{ gap: 10, padding: 14 }}>
                <div className="tr-art tr-art--tall"><ProductArt kind={o.art} label={o.name} /></div>
                <div style={{ padding: "0 6px 8px" }}>
                  <span className="tr-kicker">Option {i + 1}</span>
                  <span className="tr-prod__brand" style={{ display: "block", marginTop: 6 }}>{o.brand}</span>
                  <strong className="tr-prod__name" style={{ display: "block" }}>{o.name}</strong>
                  <span className="tr-big" style={{ display: "block", marginTop: 10 }}>{total != null ? money(total) : "Priced on site"}</span>
                  <span className="tr-small">Installed, inc GST</span>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="tr-stack">
      <QuotingFor withQuote={false} />
      <div className="tr-split" style={{ ["--tr-side" as string]: "300px" }}>
        <div className={`tr-grid tr-grid--${q.options.length >= 3 ? 3 : 2}`}>
          {q.options.map((o, i) => {
            const total = optionTotal(o, q.extras);
            return (
              <section key={o.id} className="tr-card tr-stack" style={{ gap: 10, padding: 14 }}>
                <div className="tr-art"><ProductArt kind={o.art} label={o.name} /></div>
                <div style={{ padding: "0 6px 6px" }} className="tr-stack tr-stack--sm">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="tr-kicker">Option {i + 1}</span>
                    <span style={{ display: "flex", gap: 12 }}>
                      <Link href={`/trade/pricebook/${o.cat}`} className="tr-small" style={{ fontWeight: 800, textDecoration: "none" }}>Swap</Link>
                      <button type="button" className="tr-small" style={{ background: "none", border: 0, font: "inherit", fontWeight: 800, cursor: "pointer", padding: 0 }} onClick={() => update((x) => ({ ...x, options: x.options.filter((y) => y.id !== o.id) }))}>Remove</button>
                    </span>
                  </div>
                  <span>
                    <span className="tr-prod__brand" style={{ display: "block" }}>{o.brand}</span>
                    <strong className="tr-prod__name" style={{ display: "block" }}>{o.name}</strong>
                  </span>
                  <div className="tr-opt__lines">
                    <div><span>{o.name}</span><strong>{o.priceLabel ?? "On site"}</strong></div>
                    {q.extras.map((e) => <div key={e.id}><span>{e.label}</span><strong style={e.amount < 0 ? { color: "var(--tr-green)" } : undefined}>{money(e.amount)}</strong></div>)}
                  </div>
                  <div className="tr-opt__total">
                    <span>They pay</span>
                    <strong>{total != null ? money(total) : "—"}</strong>
                  </div>
                  <span className="tr-small">{o.price == null ? "Measure up and price it before you show them." : o.priceNote}</span>
                </div>
              </section>
            );
          })}
          {q.options.length === 0 && (
            <section className="tr-card tr-stack" style={{ gridColumn: "1 / -1" }}>
              <h2>No options yet</h2>
              <p className="tr-muted">Find a system in the pricebook and tap + Add. Two or three options side by side is what a customer can choose between.</p>
              <Link href="/trade/pricebook" className="tr-btn tr-btn--go" style={{ alignSelf: "flex-start" }}>Open the pricebook</Link>
            </section>
          )}
        </div>

        <div className="tr-stack" style={{ gap: 12 }}>
          <section className="tr-card tr-stack" style={{ gap: 10 }}>
            <h2>On both options</h2>
            {q.extras.map((e) => (
              <div key={e.id} className="tr-choice" style={{ justifyContent: "space-between", gap: 8, cursor: "default" }}>
                <span>{e.label}<span className="tr-small" style={{ display: "block", fontWeight: 600 }}>{money(e.amount)}</span></span>
                <button type="button" className="tr-btn tr-btn--sm" style={{ minWidth: 40, padding: 0 }} aria-label={`Take ${e.label} off`} onClick={() => update((x) => ({ ...x, extras: x.extras.filter((y) => y.id !== e.id) }))}>×</button>
              </div>
            ))}
            <input className="tr-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Extra pipe run, 4 m" aria-label="What it is" />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="tr-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$ inc GST" aria-label="Amount, inc GST" />
              <button type="button" className="tr-btn" onClick={addExtra}>Add</button>
            </div>
            {msg && <p className="tr-note tr-note--warn">{msg}</p>}
            <p className="tr-small">Typed in by you, at your price — nothing here comes from a list.</p>
          </section>
          <button type="button" className="tr-btn tr-btn--block" disabled={!q.options.length} onClick={() => setShowing(true)}>Show the customer</button>
          {q.options.length < MAX_OPTIONS && <Link href="/trade/pricebook" className="tr-link" style={{ textAlign: "center", padding: "8px 0" }}>+ Add another option</Link>}
          <p className="tr-small">The quote still goes out of ServiceTitan. This is what you build it from.</p>
          {(q.options.length > 0 || q.extras.length > 0 || q.customer) && (
            <button type="button" className="tr-btn tr-btn--sm" onClick={() => update(() => ({ customer: "", options: [], extras: [] }))}>Start a new quote</button>
          )}
        </div>
      </div>
    </div>
  );
}

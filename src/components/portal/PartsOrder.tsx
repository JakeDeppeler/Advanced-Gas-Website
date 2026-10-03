"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendOrder } from "@/app/trade/van/actions";
import { NEEDED_BY, type PartLine } from "@/lib/portal/vanParts";

export type PartRow = {
  key: string;
  item: string;
  group: string;
  unit: string;
  min: number;
  /** On the van at the last count; null when it wasn't counted. */
  onVan: number | null;
  /** On the factory shelf, where the shelf has the same thing by name. */
  atFactory: number | null;
};

const ICON_BOX = "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8";

/**
 * Ask the office for parts: to restock the van, or for one job.
 *
 * The van's own stock list is the menu, with what the last count found beside
 * each line, so restocking is ticking what's low rather than remembering it.
 * Anything not on the list goes in by name. Where the factory shelf has the
 * same thing, it says so — the cheapest part is the one already paid for.
 */
export function PartsOrder({ rows, groups, prefillLow, hasVan, factoryPlace }: {
  rows: PartRow[];
  groups: string[];
  prefillLow: boolean;
  hasVan: boolean;
  factoryPlace: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const lowRows = rows.filter((r) => r.onVan != null && r.onVan <= r.min);
  const restock = (r: PartRow) => Math.max(1, r.min - (r.onVan ?? 0));
  const [forWhat, setFor] = useState<"van" | "job">(hasVan ? "van" : "job");
  const [job, setJob] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [qty, setQty] = useState<Record<string, number>>(() =>
    prefillLow ? Object.fromEntries(lowRows.map((r) => [r.key, restock(r)])) : {});
  const [extra, setExtra] = useState<PartLine[]>([]);
  const [extraName, setExtraName] = useState("");
  const [deliver, setDeliver] = useState<"factory" | "pickup">("factory");
  const [needed, setNeeded] = useState<"today" | "tomorrow" | "week">("tomorrow");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) =>
    (cat === "All" || (cat === "Low on the van" ? r.onVan != null && r.onVan <= r.min : r.group === cat))
    && (!needle || `${r.item} ${r.group}`.toLowerCase().includes(needle))), [rows, cat, needle]);

  const lines: (PartLine & { key?: string; atFactory?: number | null })[] = [
    ...rows.filter((r) => (qty[r.key] ?? 0) > 0).map((r) => ({ key: r.key, item: r.item, qty: qty[r.key], atFactory: r.atFactory })),
    ...extra,
  ];
  const onShelf = lines.filter((l) => (l.atFactory ?? 0) > 0);
  const set = (k: string, n: number) => setQty((s) => ({ ...s, [k]: Math.max(0, Math.min(999, n)) }));

  function addExtra() {
    const name = extraName.trim();
    if (!name) return;
    setExtra((x) => [...x, { item: name, qty: 1 }]);
    setExtraName("");
  }

  function send() {
    setMsg(null);
    start(async () => {
      const res = await sendOrder({
        forWhat, job, deliver, neededBy: needed, note,
        lines: lines.map((l) => ({ item: l.item, qty: l.qty })),
      });
      if (!res.ok) { setMsg({ text: res.error || "Couldn't send it." }); return; }
      setQty({}); setExtra([]); setNote(""); setJob("");
      setMsg({ ok: true, text: "Sent to the office. It's on your orders below." });
      router.refresh();
    });
  }

  return (
    <div className="tr-split" style={{ ["--tr-side" as string]: "360px" }}>
      <section className="tr-card tr-stack" style={{ gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div className="tr-seg2" role="group" aria-label="What it's for">
            {hasVan && <button type="button" aria-pressed={forWhat === "van"} className={forWhat === "van" ? "is-on" : undefined} onClick={() => setFor("van")}>For my van</button>}
            <button type="button" aria-pressed={forWhat === "job"} className={forWhat === "job" ? "is-on" : undefined} onClick={() => setFor("job")}>For a job</button>
          </div>
          <Link href="/trade/stock" className="tr-btn" style={{ background: "var(--tr-grey-tint)", borderColor: "var(--tr-grey-tint)" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON_BOX} /></svg>
            Factory stock
          </Link>
        </div>

        {forWhat === "job" && (
          <label className="tr-field">
            Which job
            <input value={job} onChange={(e) => setJob(e.target.value)} placeholder="Customer, suburb or job number" />
          </label>
        )}

        <label className="tr-search tr-search--flat">
          <span className="tr-sr">Search parts</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts, e.g. tempering valve" />
        </label>

        <div className="tr-pills">
          {["All", ...(lowRows.length ? ["Low on the van"] : []), ...groups].map((g) => (
            <button key={g} type="button" aria-pressed={cat === g} className={`tr-pill tr-pill--sm${cat === g ? " is-on" : ""}`} onClick={() => setCat(g)}>{g}</button>
          ))}
        </div>

        {!prefillLow && lowRows.length > 0 && forWhat === "van" && lowRows.some((r) => !qty[r.key]) && (
          <button type="button" className="tr-banner" style={{ border: 0, cursor: "pointer", font: "inherit", fontWeight: 800 }} onClick={() => setQty((s) => ({ ...s, ...Object.fromEntries(lowRows.map((r) => [r.key, s[r.key] || restock(r)])) }))}>
            Add the {lowRows.length} low on the van <span aria-hidden="true">+</span>
          </button>
        )}

        <div className="tr-rows">
          {shown.map((r) => {
            const low = r.onVan != null && r.onVan <= r.min;
            const n = qty[r.key] ?? 0;
            return (
              <div className="tr-row" key={r.key} style={{ minHeight: 68 }}>
                <span className="tr-row__k">
                  <strong style={{ fontSize: 17 }}>{r.item}</strong>
                  <span className={low ? "is-warn" : undefined}>
                    {r.onVan == null ? `Not counted · keep ${r.min}` : `${low ? "Low · " : ""}${r.onVan} on the van · keep ${r.min}`}
                  </span>
                </span>
                {r.atFactory != null && r.atFactory > 0 && <span className="tr-chip">{r.atFactory} at the factory</span>}
                <span className="tr-count">
                  <button type="button" aria-label={`One less ${r.item}`} onClick={() => set(r.key, n - 1)}>&minus;</button>
                  <strong>{n}</strong>
                  <button type="button" aria-label={`One more ${r.item}`} onClick={() => set(r.key, n + 1)}>+</button>
                </span>
              </div>
            );
          })}
          {shown.length === 0 && <p className="tr-empty" style={{ padding: "12px 0" }}>Nothing on the van list matches. Add it by name below.</p>}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input className="tr-input" value={extraName} onChange={(e) => setExtraName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }} placeholder="Something not on the list" aria-label="Something not on the list" />
          <button type="button" className="tr-btn" onClick={addExtra}>Add</button>
        </div>
      </section>

      <aside className="tr-card tr-stack" style={{ gap: 12, position: "sticky", top: 16 }}>
        <div>
          <h2 style={{ fontSize: 23, fontWeight: 900 }}>Your order · {lines.length} {lines.length === 1 ? "item" : "items"}</h2>
          <span className="tr-muted" style={{ fontWeight: 700 }}>{forWhat === "van" ? "Restocking your van" : job ? `For ${job}` : "For a job"}</span>
        </div>
        {lines.length ? (
          <div className="tr-rows">
            {lines.map((l, i) => (
              <div className="tr-row" key={`${l.key ?? "x"}-${l.item}-${i}`} style={{ minHeight: 52, padding: "8px 0" }}>
                <span className="tr-row__k"><strong style={{ fontSize: 16 }}>{l.item}</strong></span>
                <strong className="tr-num">×{l.qty}</strong>
                <button
                  type="button" className="tr-btn tr-btn--sm" style={{ minWidth: 40, padding: 0 }} aria-label={`Take ${l.item} off the order`}
                  onClick={() => (l.key ? set(l.key, 0) : setExtra((x) => x.filter((_, j) => j !== i - (lines.length - extra.length))))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="tr-empty">Nothing on it yet. Use + on the left.</p>
        )}

        {onShelf.length > 0 && (
          <Link href="/trade/stock" className="tr-note tr-note--grey" style={{ textDecoration: "none" }}>
            <strong style={{ display: "block", fontSize: 17 }}>{onShelf.length} of these {onShelf.length === 1 ? "is" : "are"} at the factory</strong>
            Grab it from the shelf instead and log it · Factory stock →
          </Link>
        )}

        <span className="tr-small" style={{ fontWeight: 700 }}>Where should it go?</span>
        <button type="button" aria-pressed={deliver === "factory"} className={`tr-choice${deliver === "factory" ? " is-on" : ""}`} onClick={() => setDeliver("factory")}>Deliver to the factory{factoryPlace ? ` · ${factoryPlace}` : ""}</button>
        <button type="button" aria-pressed={deliver === "pickup"} className={`tr-choice${deliver === "pickup" ? " is-on" : ""}`} onClick={() => setDeliver("pickup")}>I&rsquo;ll pick it up from Reece</button>

        <span className="tr-small" style={{ fontWeight: 700 }}>Needed by</span>
        <div className="tr-grid tr-grid--3" style={{ gap: 6 }}>
          {NEEDED_BY.map((n) => (
            <button key={n.k} type="button" aria-pressed={needed === n.k} className={`tr-choice${needed === n.k ? " is-on" : ""}`} style={{ justifyContent: "center", padding: "0 6px" }} onClick={() => setNeeded(n.k)}>{n.label}</button>
          ))}
        </div>
        <textarea className="tr-input" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the office should know?" aria-label="Note for the office" />
        {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
        <button type="button" className="tr-btn tr-btn--go tr-btn--block" disabled={busy || !lines.length} onClick={send}>
          {busy ? "Sending…" : "Send to the office"}
        </button>
      </aside>
    </div>
  );
}

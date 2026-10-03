"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { takeFromFactory } from "@/app/trade/van/actions";

export type ShelfItem = { id: string; name: string; unit: string; qty: number; minQty: number; location: string | null; category: string | null };

/**
 * The factory shelf, from the van's side: find it, pick how many, say where
 * it's going, take it. It comes off the count the moment it's logged.
 */
export function TradeStock({ items, vanName, children }: { items: ShelfItem[]; vanName: string | null; children?: React.ReactNode }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [pick, setPick] = useState<Record<string, number>>({});
  const [where, setWhere] = useState<"van" | "job">(vanName ? "van" : "job");
  const [job, setJob] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const cats = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean) as string[])].sort(), [items]);
  const needle = q.trim().toLowerCase();
  const shown = items.filter((i) =>
    (cat === "All" || i.category === cat) && (!needle || `${i.name} ${i.location ?? ""} ${i.category ?? ""}`.toLowerCase().includes(needle)));
  const taking = items.filter((i) => (pick[i.id] ?? 0) > 0);
  const set = (i: ShelfItem, n: number) => setPick((s) => ({ ...s, [i.id]: Math.max(0, Math.min(i.qty, n)) }));

  function take() {
    setMsg(null);
    if (where === "job" && !job.trim()) { setMsg({ text: "Which job is it for?" }); return; }
    start(async () => {
      const res = await takeFromFactory({
        lines: taking.map((i) => ({ itemId: i.id, qty: pick[i.id] })),
        forWhat: where === "van" ? `Van · ${vanName ?? "my van"}` : `Job · ${job.trim()}`,
      });
      if (!res.ok) { setMsg({ text: res.error || "Couldn't log it." }); return; }
      setPick({}); setJob("");
      setMsg({ ok: true, text: "Logged. It's off the shelf count." });
      router.refresh();
    });
  }

  return (
    <div className="tr-split" style={{ ["--tr-side" as string]: "320px" }}>
      <section className="tr-card tr-stack" style={{ gap: 14 }}>
        <label className="tr-search tr-search--flat">
          <span className="tr-sr">Search the factory</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the factory, e.g. bracket" />
        </label>
        {cats.length > 0 && (
          <div className="tr-pills">
            {["All", ...cats].map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} className={`tr-pill tr-pill--sm${cat === c ? " is-on" : ""}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        )}
        <div className="tr-rows">
          {shown.map((i) => {
            const low = i.minQty > 0 && i.qty <= i.minQty;
            const n = pick[i.id] ?? 0;
            return (
              <div className="tr-row" key={i.id} style={{ minHeight: 66 }}>
                <span className="tr-row__k">
                  <strong style={{ fontSize: 17 }}>{i.name}</strong>
                  <span>{[i.location, i.minQty > 0 ? `keep ${i.minQty}` : null].filter(Boolean).join(" · ") || i.unit}</span>
                </span>
                <span style={{ fontWeight: 800, fontSize: 16.5, color: i.qty <= 0 ? "var(--tr-red)" : low ? "var(--tr-orange-ink)" : "var(--tr-green)", whiteSpace: "nowrap" }}>
                  {i.qty <= 0 ? "None on shelf" : `${i.qty} on shelf`}{low && i.qty > 0 ? " · low" : ""}
                </span>
                <span className="tr-count">
                  <button type="button" aria-label={`One less ${i.name}`} onClick={() => set(i, n - 1)} disabled={n <= 0}>&minus;</button>
                  <strong>{n}</strong>
                  <button type="button" aria-label={`One more ${i.name}`} onClick={() => set(i, n + 1)} disabled={n >= i.qty}>+</button>
                </span>
              </div>
            );
          })}
          {shown.length === 0 && <p className="tr-empty" style={{ padding: "10px 0" }}>{items.length ? "Nothing on the shelf matches." : "Nothing on the factory list yet. The office adds what's on the shelf."}</p>}
        </div>
      </section>

      <div className="tr-stack">
        <aside className="tr-card tr-stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>Taking {taking.length} {taking.length === 1 ? "item" : "items"}</h2>
          {taking.length ? (
            <div className="tr-rows">
              {taking.map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 16 }}>
                  <span>{i.name}</span><strong className="tr-num">×{pick[i.id]}</strong>
                </div>
              ))}
            </div>
          ) : <p className="tr-empty">Pick what you&rsquo;re taking with +.</p>}
          <span className="tr-small" style={{ fontWeight: 700 }}>Where&rsquo;s it going?</span>
          {vanName && <button type="button" aria-pressed={where === "van"} className={`tr-choice${where === "van" ? " is-on" : ""}`} onClick={() => setWhere("van")}>My van</button>}
          <button type="button" aria-pressed={where === "job"} className={`tr-choice${where === "job" ? " is-on" : ""}`} onClick={() => setWhere("job")}>A job</button>
          {where === "job" && <input className="tr-input" value={job} onChange={(e) => setJob(e.target.value)} placeholder="Customer, suburb or job number" aria-label="Which job" />}
          {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
          <button type="button" className="tr-btn tr-btn--go tr-btn--block" disabled={busy || !taking.length} onClick={take}>{busy ? "Logging…" : "Take it"}</button>
          <p className="tr-small">Comes off the factory count straight away, with your name and where it went.</p>
        </aside>
        {children}
      </div>
    </div>
  );
}

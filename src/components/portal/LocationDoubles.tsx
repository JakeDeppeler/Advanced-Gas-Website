"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Loc = { id: number; name: string; address: string; tags: string[] };
type Double = { unit: number; keep: Loc; retire: Loc[] };

/**
 * Units the customer has two active locations for. Merging keeps the older
 * record — that's where the unit's job history is — gives it the listed name,
 * contact, notes and the other's tags, and switches the newer one off (not
 * deleted: it can be switched back on in ServiceTitan).
 */
export function LocationDoubles({ customerId, doubles }: { customerId: number; doubles: Double[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, { ok: boolean; text: string }>>({});

  async function merge(d: Double) {
    setBusy(d.keep.id);
    try {
      const res = await fetch("/api/portal/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", customerId, keep: d.keep.id, retire: d.retire.map((r) => r.id) }),
      });
      const r = (await res.json().catch(() => ({}))) as { ok?: boolean; done?: string[]; error?: string };
      if (!res.ok || !r.ok) throw new Error(r.error || "Couldn’t merge.");
      setDone((x) => ({ ...x, [d.keep.id]: { ok: true, text: (r.done ?? []).join(" · ") } }));
      setTimeout(() => router.refresh(), 4000);
    } catch (e) {
      setDone((x) => ({ ...x, [d.keep.id]: { ok: false, text: (e as Error).message } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Doubled-up units</h2>
      <p className="pt-loc__lede">
        {doubles.length} unit{doubles.length === 1 ? " has" : "s have"} more than one active location. Merging keeps the older one,
        where any job history is, and switches the other off.
      </p>
      <ul className="pt-loc__dbl">
        {doubles.map((d) => (
          <li key={d.keep.id} className="pt-loc__dblrow">
            <strong className="pt-loc__dblunit">Unit {d.unit}{d.keep.address ? <span className="pt-fleet__sub">{d.keep.address}</span> : null}</strong>
            <div>
              <span className="pt-loc__muted">Keep</span> {d.keep.name}
              <span className="pt-fleet__sub">#{d.keep.id}{d.keep.tags.length ? ` · ${d.keep.tags.join(", ")}` : ""}</span>
            </div>
            <div>
              <span className="pt-loc__muted">Switch off</span> {d.retire.map((r) => r.name).join(", ")}
              <span className="pt-fleet__sub">
                {d.retire.map((r) => `#${r.id}${r.tags.length ? ` · ${r.tags.join(", ")}` : ""}`).join(" / ")}
              </span>
            </div>
            <div className="pt-loc__dblgo">
              {done[d.keep.id] ? (
                <span className={`pt-inline pt-inline--sm ${done[d.keep.id].ok ? "is-ok" : "is-err"}`}>{done[d.keep.id].text}</span>
              ) : (
                <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" disabled={busy != null} onClick={() => void merge(d)}>
                  {busy === d.keep.id ? "Merging…" : "Merge"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

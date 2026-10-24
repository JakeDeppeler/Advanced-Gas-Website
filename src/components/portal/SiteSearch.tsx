"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Hit = { id: number; name: string; address: string };
type Saved = { customerId: number; count: number };

/**
 * Find the village as you type its name, or paste its customer number.
 * Asks ServiceTitan a quarter-second after the last key, and drops any answer
 * that comes back for a term the box no longer holds, so a slow reply to "car"
 * can't replace the results for "cardinia".
 */
export function SiteSearch({ saved }: { saved: Saved[] }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const latest = useRef("");
  const lists = new Map(saved.map((s) => [s.customerId, s.count]));

  useEffect(() => {
    const t = term.trim();
    latest.current = t;
    if (t.replace(/^#/, "").length < 2) { setHits(null); setErr(null); setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portal/locations?q=${encodeURIComponent(t)}`);
        const r = (await res.json().catch(() => ({}))) as { ok?: boolean; customers?: Hit[]; error?: string };
        if (latest.current !== t) return;
        if (!res.ok || !r.ok) throw new Error(r.error || "The search didn’t work.");
        setHits(r.customers ?? []); setErr(null);
      } catch (e) {
        if (latest.current === t) { setHits(null); setErr((e as Error).message); }
      } finally {
        if (latest.current === t) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [term]);

  return (
    <div className="pt-sitefind">
      <form
        className="pt-sbox pt-sbox--lg"
        role="search"
        onSubmit={(e) => { e.preventDefault(); if (hits?.[0]) router.push(`/portal/locations/${hits[0].id}`); }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input
          id="site-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Village or customer name, or ServiceTitan customer number"
          aria-label="Find a site"
          aria-controls="site-search-results"
          autoComplete="off"
          autoFocus
        />
      </form>

      <div id="site-search-results" aria-live="polite">
        {busy && hits == null && <p className="pt-loc__muted pt-sitefind__msg">Searching ServiceTitan…</p>}
        {err && <p className="pt-inline is-err pt-sitefind__msg">{err}</p>}
        {hits && hits.length === 0 && !busy && (
          <p className="pt-loc__muted pt-sitefind__msg">No customer in ServiceTitan matches “{term.trim()}”. Make the customer there first, then find it here.</p>
        )}
        {hits && hits.length > 0 && (
          <ul className={`pt-sitefind__list${busy ? " is-stale" : ""}`}>
            {hits.map((h) => {
              const n = lists.get(h.id);
              return (
                <li key={h.id}>
                  <Link href={`/portal/locations/${h.id}`} className="pt-sitefind__row">
                    <span className="pt-sitefind__name"><strong>{h.name}</strong><span className="pt-fleet__sub">#{h.id}{h.address ? ` · ${h.address}` : ""}</span></span>
                    <span className={`pt-sitefind__tag${n ? " is-saved" : ""}`}>{n ? `List saved · ${n} units` : "No list yet"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

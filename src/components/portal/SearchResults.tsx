"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SearchRow } from "@/components/portal/PortalSearch";

/**
 * The search results page.
 *
 * The dropdown in the bar is for the fast path — type three letters, hit enter,
 * gone. This is for the other case: you know roughly what you want and you need
 * to look down a list of it. Same index, so the two can never find different
 * things; the filters here are the kinds that index already carries.
 */
export function SearchResults({ rows, initial }: { rows: SearchRow[]; initial: string }) {
  const [q, setQ] = useState(initial);
  const [kind, setKind] = useState<string | null>(null);

  const index = useMemo(
    () => rows.map((r) => ({ row: r, hay: `${r.label} ${r.where} ${r.terms ?? ""}`.toLowerCase() })),
    [rows],
  );

  // "Handbook · Shelf A" and "Handbook · The customer" are one kind to somebody
  // searching, so the facet is the part before the dot.
  const kindOf = (where: string) => where.split("·")[0].trim();

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const words = needle.split(/\s+/);
    return index.filter(({ hay }) => words.every((w) => hay.includes(w))).map((m) => m.row);
  }, [q, index]);

  const facets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hits) counts.set(kindOf(h.where), (counts.get(kindOf(h.where)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [hits]);

  const shown = kind ? hits.filter((h) => kindOf(h.where) === kind) : hits;
  const typed = q.trim().length >= 2;

  return (
    <>
      <label className="pt-find__big">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setKind(null);
          }}
          placeholder="Search procedures, fault codes, prices…"
          aria-label="Search the portal"
          autoFocus
        />
      </label>

      {typed && facets.length > 0 && (
        <div className="pt-find__facets">
          <button type="button" aria-pressed={kind === null} className={kind === null ? "is-on" : undefined} onClick={() => setKind(null)}>
            All <span>{hits.length}</span>
          </button>
          {facets.map(([k, n]) => (
            <button key={k} type="button" aria-pressed={kind === k} className={kind === k ? "is-on" : undefined} onClick={() => setKind(k)}>
              {k} <span>{n}</span>
            </button>
          ))}
        </div>
      )}

      {!typed ? (
        <section className="pt-panel pt-empty">
          <span className="pt-empty__kicker">Start typing</span>
          <strong>Two letters is enough</strong>
          <span>Procedures by code, handbook topics, videos, prices and every tool.</span>
        </section>
      ) : shown.length === 0 ? (
        <section className="pt-panel pt-empty">
          <span className="pt-empty__kicker">No results</span>
          <strong>Nothing matches &ldquo;{q.trim()}&rdquo;</strong>
          <span>Check the spelling, or try one word instead of three.</span>
        </section>
      ) : (
        <section className="pt-panel pt-results">
          {shown.map((h, i) => (
            <Link key={`${h.href}-${i}`} href={h.href} className="pt-results__row">
              <span className="pt-results__kind">{kindOf(h.where)}</span>
              <span className="pt-results__title">{h.label}</span>
              <span className="pt-results__snip">{h.terms || h.where}</span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}

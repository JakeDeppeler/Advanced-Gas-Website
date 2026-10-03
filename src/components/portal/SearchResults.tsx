"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SearchRow } from "@/components/portal/PortalSearch";
import { NoResults } from "@/components/portal/States";

/**
 * The search results page.
 *
 * The dropdown in the bar is for the fast path — type three letters, hit enter,
 * gone. This is for the other case: you know roughly what you want and you need
 * to look down a list of it. Same index, so the two can never find different
 * things; the filters here are the kinds that index already carries.
 */
/**
 * What a result is, said as one of it and as the filter that holds it.
 *
 * "Handbook · Shelf A" and "Handbook · The customer" are one kind to somebody
 * searching, so the kind is the part before the dot.
 */
function kindOf(where: string): { one: string; facet: string } {
  const head = where.split("·")[0].trim();
  if (where.startsWith("Learning · video")) return { one: "Video", facet: "Videos" };
  const K: Record<string, [string, string]> = {
    "Fault code": ["Fault code", "Fault codes"],
    Processes: ["Procedure", "Processes"],
    Handbook: ["Handbook", "Handbook"],
    Tools: ["Tool", "Tools"],
    Section: ["Page", "Pages"],
  };
  const k = K[head];
  return k ? { one: k[0], facet: k[1] } : { one: head, facet: head };
}

/**
 * The line under a result: the sentence the words were found in, where the
 * match was in the body; otherwise the row's own one-liner.
 */
function snippet(h: SearchRow, q: string): string {
  const word = q.trim().toLowerCase().split(/\s+/)[0];
  if (h.body && word) {
    const sentences = h.body.split(/(?<=[.!?])\s+|\n+/);
    const hit = sentences.find((x) => x.toLowerCase().includes(word));
    if (hit) return hit.length > 160 ? `${hit.slice(0, 157).trimEnd()}…` : hit;
  }
  return h.snip || h.terms || h.where;
}

export function SearchResults({ rows, initial }: { rows: SearchRow[]; initial: string }) {
  const [q, setQ] = useState(initial);
  const [kind, setKind] = useState<string | null>(null);

  const index = useMemo(
    () => rows.map((r) => ({ row: r, hay: `${r.label} ${r.where} ${r.terms ?? ""} ${r.body ?? ""}`.toLowerCase() })),
    [rows],
  );

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const words = needle.split(/\s+/);
    return index.filter(({ hay }) => words.every((w) => hay.includes(w))).map((m) => m.row);
  }, [q, index]);

  const facets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hits) counts.set(kindOf(h.where).facet, (counts.get(kindOf(h.where).facet) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [hits]);

  const shown = kind ? hits.filter((h) => kindOf(h.where).facet === kind) : hits;
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
        <NoResults
          title={`Nothing matches “${q.trim()}”`}
          body="Check the spelling or the code on the unit, or try one word instead of three."
          action={<button type="button" className="pt-state__btn" onClick={() => { setQ(""); setKind(null); }}>Clear search</button>}
        />
      ) : (
        <section className="pt-panel pt-results">
          {shown.map((h, i) => (
            <Link key={`${h.href}-${i}`} href={h.href} className="pt-results__row">
              <span className="pt-results__kind">{kindOf(h.where).one}</span>
              <span className="pt-results__title">{h.label}</span>
              <span className="pt-results__snip">{snippet(h, q)}</span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}

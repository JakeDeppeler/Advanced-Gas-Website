"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Category filter + search for the pricing page.
 *
 * The page renders every category stacked, which is a long scroll when
 * someone only wants heater prices. The tabs filter to one category at a
 * time, with "All" as the default so nothing is hidden from a first-time
 * visitor or from Google — every block stays in the HTML, we just hide the
 * ones you didn't ask for.
 *
 * The search box sits above the tabs and works across the whole list at
 * once: type a brand, a model number, a capacity or a use-case and it hides
 * every row that doesn't match, across every category, and drops any block
 * left with no matches. It filters the already-rendered rows in place (no
 * data round-trip), so it stays in sync with whatever the server rendered.
 *
 * Children are the pre-rendered blocks; each carries a data-category so the
 * tabs can show and hide them without owning the markup.
 */
export function PricingTabs({
  categories,
  children,
}: {
  categories: { key: string; label: string; count: number }[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number | null>(null);
  const panelsRef = useRef<HTMLDivElement>(null);

  const searching = query.trim() !== "";

  // Filter the already-rendered rows in place whenever the query changes.
  useEffect(() => {
    const root = panelsRef.current;
    if (!root) return;
    const q = query.trim().toLowerCase();
    // Tokenise so multi-word queries match in any order across the row —
    // "kaden 17" hits "Kaden … Ducted 17 kW" even though the words aren't
    // adjacent. Every term must be present (AND), which keeps it precise.
    const terms = q.split(/\s+/).filter(Boolean);
    let total = 0;
    root.querySelectorAll<HTMLElement>(".pricing-block").forEach((block) => {
      let shown = 0;
      block.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
        const text = (row.textContent ?? "").toLowerCase();
        const hit = terms.length === 0 || terms.every((t) => text.includes(t));
        row.hidden = !hit;
        if (hit) shown += 1;
      });
      // While searching, drop any block left with nothing to show.
      block.toggleAttribute("data-empty", q !== "" && shown === 0);
      total += shown;
    });
    setMatches(q ? total : null);
  }, [query, children]);

  // While searching we show every category (data-active="all") and let the
  // per-block data-empty flag hide the ones with no matches.
  const effectiveActive = searching ? "all" : active;

  return (
    <>
      <div className="pricing-search">
        <svg className="pricing-search__icon" viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
          <path d="M9 2a7 7 0 015.3 11.6l4 4-1.4 1.4-4-4A7 7 0 119 2zm0 2a5 5 0 100 10A5 5 0 009 4z" fill="currentColor" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every model — brand, model number, size…"
          aria-label="Search the price list"
          className="pricing-search__input"
        />
        {searching && (
          <button type="button" className="pricing-search__clear" onClick={() => setQuery("")} aria-label="Clear search">
            Clear
          </button>
        )}
      </div>

      <div className="pricing-tabs" role="tablist" aria-label="Filter pricing by system type">
        <button
          type="button"
          role="tab"
          aria-selected={effectiveActive === "all"}
          className={`pricing-tabs__tab${effectiveActive === "all" ? " is-active" : ""}`}
          onClick={() => { setQuery(""); setActive("all"); }}
        >
          All pricing
          <span className="pricing-tabs__n">
            {categories.reduce((n, c) => n + c.count, 0)}
          </span>
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={effectiveActive === c.key}
            className={`pricing-tabs__tab${effectiveActive === c.key ? " is-active" : ""}`}
            onClick={() => { setQuery(""); setActive(c.key); }}
          >
            {c.label}
            <span className="pricing-tabs__n">{c.count}</span>
          </button>
        ))}
      </div>

      {searching && matches === 0 && (
        <p className="pricing-tabs__noresults">
          No models match &ldquo;{query.trim()}&rdquo;. Try a brand, a model number or a size &mdash; or{" "}
          <button type="button" className="pricing-tabs__noresults-clear" onClick={() => setQuery("")}>clear the search</button>.
        </p>
      )}

      <div
        ref={panelsRef}
        className={`pricing-tabs__panels is-${effectiveActive}`}
        data-active={effectiveActive}
        {...(searching ? { "data-searching": "true" } : {})}
      >
        {children}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";

/**
 * Category filter for the pricing page.
 *
 * The page renders every category stacked, which is a long scroll when
 * someone only wants heater prices. This filters to one at a time, with
 * "All" as the default so nothing is hidden from a first-time visitor
 * or from Google — every block stays in the HTML, we just hide the ones
 * you didn't ask for.
 *
 * Children are the pre-rendered blocks; each carries a data-category so
 * this can show and hide them without owning the markup.
 */
export function PricingTabs({
  categories,
  children,
}: {
  categories: { key: string; label: string; count: number }[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState("all");

  return (
    <>
      <div className="pricing-tabs" role="tablist" aria-label="Filter pricing by system type">
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          className={`pricing-tabs__tab${active === "all" ? " is-active" : ""}`}
          onClick={() => setActive("all")}
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
            aria-selected={active === c.key}
            className={`pricing-tabs__tab${active === c.key ? " is-active" : ""}`}
            onClick={() => setActive(c.key)}
          >
            {c.label}
            <span className="pricing-tabs__n">{c.count}</span>
          </button>
        ))}
      </div>

      <div className={`pricing-tabs__panels is-${active}`} data-active={active}>
        {children}
      </div>
    </>
  );
}

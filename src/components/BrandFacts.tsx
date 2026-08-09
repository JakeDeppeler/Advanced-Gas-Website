"use client";

import { useState } from "react";

/**
 * Brand at-a-glance facts.
 *
 * Was a four-across row of white boxes, which gave "why we install it" —
 * the only part anyone reads — the same weight as the ACN-level detail
 * beside it. Now the reason leads as plain prose, and the supporting
 * facts sit behind buttons so the section stays short until someone
 * actually wants the warranty terms.
 *
 * First button opens by default: a row of closed buttons with nothing
 * under it reads like a dead end.
 */
export function BrandFacts({
  ourTake,
  facts,
}: {
  ourTake: string;
  facts: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(0);
  if (facts.length === 0) return null;

  return (
    <div className="bfacts">
      <p className="bfacts__take">{ourTake}</p>

      <div className="bfacts__tabs" role="tablist" aria-label="Brand details">
        {facts.map((f, i) => (
          <button
            key={f.label}
            type="button"
            role="tab"
            id={`bfact-tab-${i}`}
            aria-selected={open === i}
            aria-controls={`bfact-panel-${i}`}
            className={`bfacts__tab${open === i ? " is-active" : ""}`}
            onClick={() => setOpen(i)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {facts.map((f, i) => (
        <div
          key={f.label}
          role="tabpanel"
          id={`bfact-panel-${i}`}
          aria-labelledby={`bfact-tab-${i}`}
          hidden={open !== i}
          className="bfacts__panel"
        >
          {f.value}
        </div>
      ))}
    </div>
  );
}

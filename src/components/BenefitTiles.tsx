"use client";

import { useState } from "react";
import { EVERYDAY_BENEFITS } from "@/lib/waterFiltration";
import { FiltrationIcon } from "./FiltrationIcons";

/**
 * Everyday benefits, as tabs rather than five <details>.
 *
 * The accordion version grew the open tile to the full width of the row
 * and shoved the other four onto a second line, so the page jumped every
 * time somebody clicked. Here the tiles never move: one shared panel
 * underneath swaps its contents, with a short cross-fade, and the panel
 * has a floor height so switching between a long answer and a short one
 * doesn't shift the rest of the page either.
 *
 * The first one is open on arrival — there's nothing to gain from making
 * somebody click before they can read anything.
 */
export function BenefitTiles() {
  const [open, setOpen] = useState(0);
  const active = EVERYDAY_BENEFITS[open];

  return (
    <div className="bentiles">
      <div className="bentiles__row" role="tablist" aria-label="Where filtered water turns up">
        {EVERYDAY_BENEFITS.map((a, i) => (
          <button
            key={a.area}
            type="button"
            role="tab"
            id={`bentile-${i}`}
            aria-selected={i === open}
            aria-controls="bentiles-panel"
            className={`bentile${i === open ? " is-on" : ""}`}
            style={{ ["--tint" as string]: a.tint }}
            onClick={() => setOpen(i)}
          >
            <span className="bentile__icon">
              <FiltrationIcon name={a.icon} />
            </span>
            <span className="bentile__name">{a.area}</span>
            <span className="bentile__line">{a.line}</span>
          </button>
        ))}
      </div>

      <div
        className="bentiles__panel"
        id="bentiles-panel"
        role="tabpanel"
        aria-labelledby={`bentile-${open}`}
        style={{ ["--tint" as string]: active.tint }}
      >
        {/* keyed so React remounts it and the fade-in animation reruns */}
        <div className="bentiles__inner" key={active.area}>
          <span className="bentiles__ico" aria-hidden="true">
            <FiltrationIcon name={active.icon} />
          </span>
          <p>
            <strong>{active.area}.</strong> {active.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

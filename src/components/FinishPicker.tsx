"use client";

import { useState } from "react";

/**
 * Clickable finish selector for the FilterWall.
 *
 * A row of static swatches told you the colours exist. Clicking one and
 * seeing the unit change is what actually helps somebody choose, and on
 * this product the finish is a real decision — it's going on an outside
 * wall for a decade.
 *
 * The unit is drawn rather than photographed. Ten product renders in ten
 * colours is a lot of files we don't have, and an SVG takes the selected
 * hex directly, so every finish is exact rather than approximated by a
 * tinted photo.
 */
export function FinishPicker({
  swatches,
}: {
  swatches: readonly { name: string; hex: string }[];
}) {
  const [active, setActive] = useState(0);
  const sw = swatches[active];
  // Custom colours are the back five on the spec sheet, and they carry a
  // shorter finish warranty. Worth surfacing at the moment of choosing.
  const isCustom = active >= 5;

  return (
    <div className="fpick">
      <div className="fpick__stage">
        <svg viewBox="0 0 320 260" role="img" aria-label={`FilterWall in ${sw.name}`}>
          {/* wall */}
          <rect x="0" y="0" width="320" height="260" rx="10" fill="#F3EFE5" />
          <path d="M0 214 H320" stroke="#DDD6C6" strokeWidth="2" />
          {/* shadow */}
          <ellipse cx="164" cy="212" rx="96" ry="9" fill="#0B1450" opacity="0.12" />
          {/* the unit */}
          <rect x="70" y="58" width="180" height="152" rx="7" fill={sw.hex} />
          <path d="M70 58 h180 v10 H70z" fill="#000" opacity="0.14" />
          <rect x="70" y="200" width="180" height="10" rx="3" fill="#000" opacity="0.22" />
          {/* subtle top-left sheen so a flat fill reads as metal */}
          <path d="M70 58 h180 v152 H70z" fill="url(#fpsheen)" opacity="0.5" />
          <defs>
            <linearGradient id="fpsheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="55%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.10" />
            </linearGradient>
          </defs>
          {/* pipework in and out */}
          <path d="M46 150 H70M250 150 H274" stroke="#B08D57" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      <div className="fpick__side">
        <span className="fpick__lbl">Ten finishes</span>
        <strong className="fpick__name">{sw.name}</strong>
        <div className="fpick__row" role="radiogroup" aria-label="Filter cover finish">
          {swatches.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="radio"
              aria-checked={i === active}
              aria-label={s.name}
              title={s.name}
              className={`fpick__sw${i === active ? " is-on" : ""}`}
              style={{ background: s.hex }}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <p className="fpick__note">
          {isCustom
            ? "A custom colour. Worth knowing: the five custom finishes carry a 2-year finish warranty rather than the full ten."
            : "A neutral finish, covered for the full warranty term."}
        </p>
        <p className="fpick__fine">
          Colours are indicative on a screen. We bring the real chart to the quote.
        </p>
      </div>
    </div>
  );
}

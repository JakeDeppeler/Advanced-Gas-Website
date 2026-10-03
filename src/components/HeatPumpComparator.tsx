"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { HEAT_PUMP_PRICE_NOTE, HEAT_PUMP_UNITS, type HeatPumpUnit } from "@/lib/heatPumpUnits";

/* ============================================================
   Side-by-side heat pump comparator.
   Pick up to 3 units and see them lined up as clean product
   cards with a photo, key specs and the cheapest / longest
   warranty auto-highlighted.
   ============================================================ */

type Unit = HeatPumpUnit;
const UNITS = HEAT_PUMP_UNITS;

const MAX = 3;

export function HeatPumpComparator() {
  const [selected, setSelected] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const selectedUnits = useMemo(
    () => selected.map((id) => UNITS.find((u) => u.id === id)!).filter(Boolean),
    [selected],
  );

  const visibleUnits = showAll ? UNITS : UNITS.slice(0, 6);

  const bestPrice = useMemo(() => {
    if (selectedUnits.length === 0) return null;
    return Math.min(...selectedUnits.map((u) => u.price));
  }, [selectedUnits]);

  const bestWarranty = useMemo(() => {
    if (selectedUnits.length === 0) return null;
    return Math.max(...selectedUnits.map((u) => u.warrantyYears));
  }, [selectedUnits]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  return (
    <div className="hpc">
      <div className="hpc__intro">
        <h3>Pick up to {MAX} units, tap a card to add or remove.</h3>
        <p>Best price and longest warranty are highlighted in orange automatically.</p>
      </div>

      {/* Picker grid, clean product tiles with photo + specs */}
      <div className="hpc__picker">
        {visibleUnits.map((u) => {
          const isOn = selected.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              className={`hpc__tile ${isOn ? "is-on" : ""}`}
              onClick={() => toggle(u.id)}
              aria-pressed={isOn}
            >
              <div className="hpc__tile-photo">
                <Image
                  src={u.photo}
                  alt={`${u.brand} ${u.model}`}
                  fill
                  sizes="(max-width: 900px) 50vw, 260px"
                  style={{ objectFit: "contain" }}
                />
                {u.ausMade && <span className="hpc__badge hpc__badge--aus">AU-made</span>}
                <span className={`hpc__badge hpc__badge--style hpc__badge--${u.style.toLowerCase()}`}>{u.style}</span>
              </div>
              <div className="hpc__tile-body">
                <div className="hpc__tile-brand">{u.brand}</div>
                <div className="hpc__tile-model">{u.model}</div>
                <div className="hpc__tile-price">{u.priceLabel} <small>inc GST</small></div>
              </div>
              <div className="hpc__tile-tick" aria-hidden="true">
                {isOn ? "✓ Selected" : "+ Add to compare"}
              </div>
            </button>
          );
        })}
      </div>

      {!showAll && UNITS.length > 6 && (
        <button
          type="button"
          className="hpc__more"
          onClick={() => setShowAll(true)}
        >
          Show all {UNITS.length} units →
        </button>
      )}

      {/* Comparison */}
      {selectedUnits.length === 0 ? (
        <div className="hpc__empty">
          <span aria-hidden="true">↑</span>
          <p>Pick at least two units above to see them lined up.</p>
        </div>
      ) : (
        <div className="hpc__rail">
          {selectedUnits.map((u) => (
            <article key={u.id} className="hpc__card">
              <button
                type="button"
                className="hpc__card-remove"
                onClick={() => toggle(u.id)}
                aria-label={`Remove ${u.model}`}
              >×</button>

              <div className="hpc__card-photo">
                <Image
                  src={u.photo}
                  alt={`${u.brand} ${u.model}`}
                  fill
                  sizes="(max-width: 900px) 90vw, 300px"
                  style={{ objectFit: "contain" }}
                />
                {u.ausMade && <span className="hpc__badge hpc__badge--aus">AU-made</span>}
              </div>

              <div className="hpc__card-head">
                <div className="hpc__card-brand">{u.brand}</div>
                <div className="hpc__card-model">{u.model}</div>
              </div>

              <div className={`hpc__price ${u.price === bestPrice ? "is-best" : ""}`}>
                <span className="hpc__price-num">{u.priceLabel}</span>
                <span className="hpc__price-lbl">fully installed, inc GST</span>
                {u.price === bestPrice && <span className="hpc__win">★ Cheapest</span>}
              </div>

              <div className="hpc__specs">
                <div className="hpc__spec">
                  <span>Tank</span>
                  <strong>{u.tank}</strong>
                </div>
                <div className="hpc__spec">
                  <span>Best for</span>
                  <strong>{u.people} people</strong>
                </div>
                <div className={`hpc__spec ${u.warrantyYears === bestWarranty ? "is-best" : ""}`}>
                  <span>Warranty</span>
                  <strong>
                    {u.warrantyLabel}
                    {u.warrantyYears === bestWarranty && <span className="hpc__win-inline"> ★</span>}
                  </strong>
                </div>
                <div className="hpc__spec">
                  <span>Style</span>
                  <strong>{u.style}</strong>
                </div>
                <div className="hpc__spec">
                  <span>Refrigerant</span>
                  <strong>{u.refrigerant}</strong>
                </div>
                <div className="hpc__spec">
                  <span>Wi-Fi</span>
                  <strong>{u.wifi}</strong>
                </div>
                <div className="hpc__spec">
                  <span>Made</span>
                  <strong>{u.origin}</strong>
                </div>
              </div>

              <a href="/quote" className="ds-btn ds-btn--orange hpc__cta">
                Quote this one →
              </a>
            </article>
          ))}
        </div>
      )}

      {selectedUnits.length >= 2 && (
        <div className="hpc__foot">
          <button
            type="button"
            className="hpc__reset"
            onClick={() => setSelected([])}
          >
            ← Start over
          </button>
          <p className="hpc__disclaimer">
            {HEAT_PUMP_PRICE_NOTE}
          </p>
        </div>
      )}
    </div>
  );
}

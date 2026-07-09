"use client";

import { useState, useMemo } from "react";

/* ============================================================
   Fun side-by-side heat pump comparator.
   Pick up to 3 units, see them lined up with the best value
   in each column highlighted. Click a card again to deselect.
   ============================================================ */

type Unit = {
  id: string;
  brand: string;
  model: string;
  style: "AIO" | "Split";
  tank: string;
  people: string;
  origin: string;
  ausMade: boolean;
  warrantyLabel: string;
  warrantyYears: number;   // for "longest warranty" highlight
  refrigerant: string;
  wifi: string;
  photo: string;
  price: number;           // for "cheapest" highlight
  priceLabel: string;
};

const UNITS: Unit[] = [
  {
    id: "reclaim-r290-200",
    brand: "Reclaim",
    model: "R290 all-in-one 200 L",
    style: "AIO",
    tank: "200 L",
    people: "1 to 2",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "10 yr tank",
    warrantyYears: 10,
    refrigerant: "R290",
    wifi: "Built in",
    photo: "/thermann-heat-pump.jpg",
    price: 2610,
    priceLabel: "$2,610",
  },
  {
    id: "reclaim-r290-300",
    brand: "Reclaim",
    model: "R290 all-in-one 300 L",
    style: "AIO",
    tank: "300 L",
    people: "3 to 4",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "10 yr tank",
    warrantyYears: 10,
    refrigerant: "R290",
    wifi: "Built in",
    photo: "/thermann-heat-pump.jpg",
    price: 2610,
    priceLabel: "$2,610",
  },
  {
    id: "reclaim-co2-315-gl",
    brand: "Reclaim",
    model: "CO₂ split 315 L glass-lined Wi-Fi",
    style: "Split",
    tank: "315 L",
    people: "4 to 5",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "10 yr tank",
    warrantyYears: 10,
    refrigerant: "CO₂",
    wifi: "Built in",
    photo: "/reclaim-split-back.jpg",
    price: 5340,
    priceLabel: "$5,340",
  },
  {
    id: "reclaim-co2-400-ss",
    brand: "Reclaim",
    model: "CO₂ split 400 L stainless Wi-Fi",
    style: "Split",
    tank: "400 L",
    people: "5+",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "15 yr tank",
    warrantyYears: 15,
    refrigerant: "CO₂",
    wifi: "Built in",
    photo: "/reclaim-split-back.jpg",
    price: 6745,
    priceLabel: "$6,745",
  },
  {
    id: "thermann-r290-285",
    brand: "Thermann",
    model: "R290 all-in-one 285 L",
    style: "AIO",
    tank: "285 L",
    people: "3 to 4",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "5 yr tank",
    warrantyYears: 5,
    refrigerant: "R290",
    wifi: "Built in",
    photo: "/thermann-heat-pump.jpg",
    price: 2610,
    priceLabel: "$2,610",
  },
  {
    id: "istore-275",
    brand: "iStore",
    model: "Air to Energy 275 L",
    style: "AIO",
    tank: "275 L",
    people: "3 to 5",
    origin: "Australian designed, Chinese built",
    ausMade: false,
    warrantyLabel: "6 yr tank",
    warrantyYears: 6,
    refrigerant: "R32",
    wifi: "Built in",
    photo: "/thermann-heat-pump.jpg",
    price: 2910,
    priceLabel: "$2,910",
  },
  {
    id: "dux-315",
    brand: "Dux",
    model: "Airoheat 315 L",
    style: "AIO",
    tank: "315 L",
    people: "4 to 5",
    origin: "Australian made",
    ausMade: true,
    warrantyLabel: "7 yr tank",
    warrantyYears: 7,
    refrigerant: "R134a",
    wifi: "Add-on",
    photo: "/thermann-heat-pump.jpg",
    price: 3600,
    priceLabel: "from $3,600",
  },
  {
    id: "rinnai-315",
    brand: "Rinnai",
    model: "Heat pump 315 L",
    style: "AIO",
    tank: "315 L",
    people: "4 to 5",
    origin: "Japanese, Aus support",
    ausMade: false,
    warrantyLabel: "5 yr tank",
    warrantyYears: 5,
    refrigerant: "R134a",
    wifi: "Not standard",
    photo: "/thermann-heat-pump.jpg",
    price: 3700,
    priceLabel: "from $3,700",
  },
];

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
        <h3>Pick up to {MAX} units to compare side by side.</h3>
        <p>Tap a card to add. Tap it again to remove. Best price and longest warranty are highlighted in orange automatically.</p>
      </div>

      {/* Picker grid */}
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
              <div className="hpc__tile-badges">
                {u.ausMade && <span className="hpc__badge hpc__badge--aus">AU-made</span>}
                <span className={`hpc__badge hpc__badge--style hpc__badge--${u.style.toLowerCase()}`}>{u.style}</span>
              </div>
              <div className="hpc__tile-brand">{u.brand}</div>
              <div className="hpc__tile-model">{u.model}</div>
              <div className="hpc__tile-price">{u.priceLabel}</div>
              <div className="hpc__tile-tick" aria-hidden="true">
                {isOn ? "✓ Selected" : "+ Add"}
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

      {/* Comparison rail */}
      {selectedUnits.length === 0 ? (
        <div className="hpc__empty">
          <span aria-hidden="true">👆</span>
          <p>Pick at least two units above to see them lined up.</p>
        </div>
      ) : (
        <div className="hpc__rail">
          <div className="hpc__labels">
            <span></span>
            <span>Tank</span>
            <span>Best for</span>
            <span>Made</span>
            <span>Warranty</span>
            <span>Refrigerant</span>
            <span>Wi-Fi</span>
            <span>Fully installed</span>
            <span></span>
          </div>
          {selectedUnits.map((u) => (
            <div key={u.id} className="hpc__col">
              <div className="hpc__col-head">
                <div className="hpc__col-brand">{u.brand}</div>
                <div className="hpc__col-model">{u.model}</div>
                <button
                  type="button"
                  className="hpc__col-remove"
                  onClick={() => toggle(u.id)}
                  aria-label={`Remove ${u.model}`}
                >×</button>
              </div>
              <div className="hpc__cell">{u.tank}</div>
              <div className="hpc__cell">{u.people} people</div>
              <div className="hpc__cell">
                {u.origin}
                {u.ausMade && <span className="hpc__inline-badge"> AU-made</span>}
              </div>
              <div className={`hpc__cell ${u.warrantyYears === bestWarranty ? "is-best" : ""}`}>
                {u.warrantyLabel}
                {u.warrantyYears === bestWarranty && <span className="hpc__win"> ★ longest</span>}
              </div>
              <div className="hpc__cell">{u.refrigerant}</div>
              <div className="hpc__cell">{u.wifi}</div>
              <div className={`hpc__cell hpc__cell--price ${u.price === bestPrice ? "is-best" : ""}`}>
                {u.priceLabel}
                {u.price === bestPrice && <span className="hpc__win"> ★ cheapest</span>}
              </div>
              <a href="/quote" className="ds-btn ds-btn--orange hpc__cta">
                Quote this one →
              </a>
            </div>
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
            Prices are indicative and assume Solar Homes rebate eligibility (owner-occupier, income under $150k, property under $3M, HW system 3+ years old). Real number confirmed at quote.
          </p>
        </div>
      )}
    </div>
  );
}

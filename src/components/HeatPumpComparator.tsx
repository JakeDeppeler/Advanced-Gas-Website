"use client";

import Image from "next/image";
import { useState, useMemo } from "react";

/* ============================================================
   Side-by-side heat pump comparator.
   Pick up to 3 units and see them lined up as clean product
   cards with a photo, key specs and the cheapest / longest
   warranty auto-highlighted.
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
  warrantyYears: number;
  refrigerant: string;
  wifi: string;
  photo: string;
  price: number;
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
    photo: "/thermann-heat-pump.webp",
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
    photo: "/thermann-heat-pump.webp",
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
    photo: "/reclaim-split-back.webp",
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
    photo: "/reclaim-split-back.webp",
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
    photo: "/thermann-heat-pump.webp",
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
    origin: "Australian designed",
    ausMade: false,
    warrantyLabel: "6 yr tank",
    warrantyYears: 6,
    refrigerant: "R32",
    wifi: "Built in",
    photo: "/thermann-heat-pump.webp",
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
    photo: "/thermann-heat-pump.webp",
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
    origin: "Japanese engineered",
    ausMade: false,
    warrantyLabel: "5 yr tank",
    warrantyYears: 5,
    refrigerant: "R134a",
    wifi: "Not standard",
    photo: "/thermann-heat-pump.webp",
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
        <h3>Pick up to {MAX} units, tap a card to add or remove.</h3>
        <p>Best price and longest warranty are highlighted in orange automatically.</p>
      </div>

      {/* Picker grid — clean product tiles with photo + specs */}
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
            Prices assume Solar Homes rebate eligibility (owner-occupier, income under $150k, property under $3M, HW system 3+ years old). Real number confirmed at quote.
          </p>
        </div>
      )}
    </div>
  );
}

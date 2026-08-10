"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { SafeImg } from "@/components/SafeImg";
import { productPhoto, type Brand, type Product } from "@/lib/brands";

/**
 * Client-side wrapper for the brand hub product grid.
 *
 * Adds a checkbox to each card, tracks up to 4 selected products in state,
 * and reveals a sticky bottom drawer with a "Compare" button when 2+ are
 * selected. The compare modal renders a side-by-side spec table so a
 * customer can weigh models without bouncing between product pages.
 *
 * The grid layout, cards, and photo logic all match the server-rendered
 * template on brand/[brand]/page.tsx so the DOM shape stays consistent.
 */

const MAX_COMPARE = 4;

type Props = {
  brand: Brand;
};

export function BrandCompare({ brand }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Group products by categoryLabel — same grouping the server template uses.
  const grouped = useMemo(() => {
    return brand.products.reduce<Record<string, Product[]>>((acc, p) => {
      (acc[p.categoryLabel] ||= []).push(p);
      return acc;
    }, {});
  }, [brand.products]);
  const groupOrder = Object.keys(grouped);

  const selectedProducts = useMemo(
    () => selected.map((s) => brand.products.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p)),
    [selected, brand.products],
  );

  const toggle = (slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, slug];
    });
  };

  const remove = (slug: string) => setSelected((prev) => prev.filter((s) => s !== slug));
  const clear = () => {
    setSelected([]);
    setShowModal(false);
  };

  // Lock body scroll when modal open.
  useEffect(() => {
    if (showModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showModal]);

  return (
    <>
      {groupOrder.map((groupName) => (
        <div key={groupName} className="brand-group">
          <h3 className="brand-group__title">
            <span className="brand-group__title-txt">{groupName}</span>
            <span className="brand-group__count">
              {grouped[groupName].length} {grouped[groupName].length === 1 ? "model" : "models"}
            </span>
          </h3>
          <div className="brand-group__grid">
            {grouped[groupName].map((p) => {
              const photo = productPhoto(p, brand);
              const isSelected = selected.includes(p.slug);
              const disabled = !isSelected && selected.length >= MAX_COMPARE;
              return (
                <div key={p.slug} className={`brand-card brand-card--compareable${isSelected ? " is-compared" : ""}`}>
                  <label
                    className={`brand-card__compare${disabled ? " is-disabled" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                    title={disabled ? `Max ${MAX_COMPARE} products at a time` : isSelected ? "Remove from compare" : "Add to compare"}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => toggle(p.slug)}
                      aria-label={`Compare ${p.name}`}
                    />
                    <span className="brand-card__compare-box" aria-hidden="true">
                      {isSelected ? "✓" : "+"}
                    </span>
                    <span className="brand-card__compare-lbl">Compare</span>
                  </label>
                  <Link href={`/brands/${brand.slug}/${p.slug}`} className="brand-card__link">
                    <div className="brand-card__photo">
                      {p.veuEligible && (
                        <span className="brand-card__pill--rebate brand-card__pill--overlay">VEU rebate</span>
                      )}
                      <SafeImg src={photo.src} fallback={photo.fallback} alt={photo.alt} loading="lazy" width="480" height="360" />
                    </div>
                    <div className="brand-card__inner">
                      <div className="brand-card__head">
                        <h4>{p.name}</h4>
                        <span className="brand-card__model">{p.model}</span>
                      </div>
                      {p.capacity && <div className="brand-card__cap">{p.capacity}</div>}
                      <p className="brand-card__take">{p.ourTake}</p>
                      <div className="brand-card__foot">
                        <span className={`brand-card__price${p.installedPriceFrom ? " brand-card__price--real" : ""}`}>
                          {p.installedPriceFrom ? (
                            <>
                              <em>from</em> {p.installedPriceFrom}
                            </>
                          ) : (
                            "Message for quote"
                          )}
                        </span>
                        <span className="brand-card__go" aria-hidden="true">→</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sticky compare drawer, appears when 1+ products are selected. */}
      {selected.length > 0 && (
        <div className={`compare-drawer${showModal ? " is-open" : ""}`}>
          <div className="compare-drawer__inner">
            <div className="compare-drawer__slots">
              {Array.from({ length: MAX_COMPARE }).map((_, i) => {
                const p = selectedProducts[i];
                if (!p) {
                  return (
                    <div key={i} className="compare-drawer__slot compare-drawer__slot--empty">
                      <span className="compare-drawer__slot-lbl">Slot {i + 1}</span>
                      <span className="compare-drawer__slot-hint">Pick a model above</span>
                    </div>
                  );
                }
                const photo = productPhoto(p, brand);
                return (
                  <div key={p.slug} className="compare-drawer__slot compare-drawer__slot--filled">
                    <button
                      className="compare-drawer__remove"
                      onClick={() => remove(p.slug)}
                      aria-label={`Remove ${p.name} from compare`}
                    >
                      ×
                    </button>
                    <div className="compare-drawer__thumb">
                      <SafeImg src={photo.src} fallback={photo.fallback} alt="" width="80" height="60" />
                    </div>
                    <span className="compare-drawer__name">{p.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="compare-drawer__actions">
              <button className="compare-drawer__clear" onClick={clear}>Clear</button>
              <button
                className="ds-btn ds-btn--orange"
                onClick={() => setShowModal(true)}
                disabled={selected.length < 2}
              >
                Compare {selected.length} {selected.length === 1 ? "model" : "models"} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare modal, side-by-side spec table. */}
      {showModal && selectedProducts.length >= 2 && (
        <div
          className="compare-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Compare ${brand.name} models`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="compare-modal__panel">
            <header className="compare-modal__head">
              <div>
                <div className="dp-hero__eyebrow"><span className="ds-dot" /> Compare · {brand.name}</div>
                <h2>{selectedProducts.length} models, side by side.</h2>
              </div>
              <button className="compare-modal__close" onClick={() => setShowModal(false)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="compare-modal__scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col" className="compare-table__rowhead">&nbsp;</th>
                    {selectedProducts.map((p) => {
                      const photo = productPhoto(p, brand);
                      return (
                        <th key={p.slug} scope="col" className="compare-table__prodhead">
                          <div className="compare-table__prodhead-inner">
                            <div className="compare-table__thumb">
                              <SafeImg src={photo.src} fallback={photo.fallback} alt={photo.alt} width="160" height="120" />
                            </div>
                            <h3>{p.name}</h3>
                            <span className="compare-table__model">{p.model}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Category" values={selectedProducts.map((p) => p.categoryLabel)} />
                  <CompareRow label="Capacity" values={selectedProducts.map((p) => p.capacity ?? ", ")} />
                  <CompareRow label="Refrigerant" values={selectedProducts.map((p) => p.refrigerant ?? ", ")} />
                  <CompareRow label="Star rating" values={selectedProducts.map((p) => p.starRating ?? ", ")} />
                  <CompareRow
                    label="VEU rebate"
                    values={selectedProducts.map((p) => (p.veuEligible ? "Eligible" : ", "))}
                  />
                  <CompareRow
                    label="Best for"
                    values={selectedProducts.map((p) => p.bestFor)}
                    wrap
                  />
                  <CompareRow
                    label="Our take"
                    values={selectedProducts.map((p) => p.ourTake)}
                    wrap
                  />
                  <CompareRow
                    label="Installed from"
                    values={selectedProducts.map((p) =>
                      p.installedPriceFrom ? `from ${p.installedPriceFrom}` : "Message for quote",
                    )}
                  />
                  {allSpecLabels(selectedProducts).map((label) => (
                    <CompareRow
                      key={label}
                      label={label}
                      values={selectedProducts.map((p) => {
                        const s = p.specs.find((sp) => sp.label === label);
                        return s ? s.value : ", ";
                      })}
                    />
                  ))}
                  <tr>
                    <th scope="row" className="compare-table__rowhead">&nbsp;</th>
                    {selectedProducts.map((p) => (
                      <td key={p.slug} className="compare-table__cta">
                        <Link
                          href={`/brands/${brand.slug}/${p.slug}`}
                          className="ds-btn ds-btn--ghost ds-btn--sm"
                          onClick={() => setShowModal(false)}
                        >
                          Full spec →
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <footer className="compare-modal__foot">
              <Link href="/quote" className="ds-btn ds-btn--orange">
                Quote any of these →
              </Link>
              <button className="ds-btn ds-btn--ghost" onClick={() => setShowModal(false)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function CompareRow({ label, values, wrap = false }: { label: string; values: string[]; wrap?: boolean }) {
  return (
    <tr>
      <th scope="row" className="compare-table__rowhead">{label}</th>
      {values.map((v, i) => (
        <td key={i} className={wrap ? "compare-table__cell compare-table__cell--wrap" : "compare-table__cell"}>{v}</td>
      ))}
    </tr>
  );
}

/** Collect every distinct spec label across the compared products,
 *  preserving first-appearance order — that way the union stays stable
 *  and each product's own spec sheet drives which rows show. */
function allSpecLabels(products: Product[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const p of products) {
    for (const s of p.specs) {
      if (!seen.has(s.label)) {
        seen.add(s.label);
        order.push(s.label);
      }
    }
  }
  return order;
}

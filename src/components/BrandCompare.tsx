"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { SafeImg } from "@/components/SafeImg";
import { groupFamilies } from "@/lib/productFamilies";
import { ProductFamilyCard, type FamilyCardItem } from "@/components/ProductFamilyCard";
import { productPhoto, type Brand, type Product } from "@/lib/brands";

/**
 * The range section on a brand page.
 *
 * Two shapes, depending on the brand. Where `brand.systems` is authored,
 * the range opens as "choose your system" — one card per shape, and the
 * models for a shape appear underneath when you press its button. That
 * exists because sixteen model cards in one grid is not a choice anybody
 * can make; you pick a shape first and the model follows from the heat
 * load. Where it isn't authored yet, every group renders at once, which
 * is what this component always used to do.
 *
 * Either way it adds a checkbox to each card, tracks up to 4 selected
 * products, and reveals a sticky drawer with a side-by-side spec table
 * so models can be weighed without bouncing between product pages. The
 * compare state lives here rather than per-group so a selection survives
 * switching shapes.
 */

const MAX_COMPARE = 4;

type Props = {
  brand: Brand;
};

export function BrandCompare({ brand }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  // Which shape's models are showing. Null until somebody presses one —
  // opening a group by default would put six wall splits in front of
  // someone who came for ducted.
  const [openSystem, setOpenSystem] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const systems = brand.systems ?? [];

  // Group products by categoryLabel — same grouping the server template uses.
  const grouped = useMemo(() => {
    return brand.products.filter((p) => !p.retired).reduce<Record<string, Product[]>>((acc, p) => {
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

  const cols = systems.length === 4 ? 4 : Math.min(systems.length, 3);
  const openGroup = systems.find((sy) => sy.id === openSystem) ?? null;
  const bySlug = useMemo(
    () => new Map(brand.products.map((p) => [p.slug, p])),
    [brand.products],
  );

  /**
   * One card per family, sizes as chips — the same card the range page uses.
   *
   * The groups here were already keyed on categoryLabel, which is the family
   * key, so every group was already a family; it was just being rendered one
   * member at a time. Kaden's page put four multi-heads in a row that differed
   * only in how many heads they ran.
   *
   * Compare survives it. The tick hangs off whichever size the chips have
   * landed on, so you pick 5.0 kW and tick that, rather than the row of
   * near-identical cards each carrying their own tick.
   */
  const familyCards = (list: Product[]) =>
    groupFamilies<FamilyCardItem>(
      list.map((p) => {
        const photo = productPhoto(p, brand);
        return {
          slug: p.slug,
          name: p.name,
          model: p.model,
          brand: brand.name,
          categoryLabel: p.categoryLabel,
          capacity: p.capacity,
          installedPriceFrom: p.installedPriceFrom,
          veuEligible: p.veuEligible,
          bestFor: p.bestFor,
          photo: photo.src,
          photoFallback: photo.fallback,
          accent: brand.accent,
          href: `/brands/${brand.slug}/${p.slug}`,
        };
      }),
      (i) => i.categoryLabel,
      (i) => i.categoryLabel,
    ).map((f) => (
      <ProductFamilyCard
        key={f.key}
        family={f}
        extra={(active) => {
          const isSelected = selected.includes(active.slug);
          const disabled = !isSelected && selected.length >= MAX_COMPARE;
          return (
            <label
              className={`brand-card__compare${disabled ? " is-disabled" : ""}`}
              title={disabled ? `Max ${MAX_COMPARE} products at a time` : isSelected ? "Remove from compare" : "Add to compare"}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(active.slug)}
                aria-label={`Compare ${active.name}`}
              />
              <span className="brand-card__compare-box" aria-hidden="true">{isSelected ? "\u2713" : "+"}</span>
              <span className="brand-card__compare-lbl">Compare</span>
            </label>
          );
        }}
      />
    ));

  /** The compare drawer and its modal. Rendered by whichever shape the
   *  brand's range takes, so the selection behaves the same in both. */
  const drawer = (
    <>
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

  if (systems.length > 0) {
    return (
      <>
        {/* Four shapes go four across; anything else caps at three, so
            five doesn't become a five-column squeeze or a 3 + 2 with the
            type of a four-across grid. */}
        <div
          className={`wf-styles__grid is-${cols}up`}
          style={{ "--cols": cols } as CSSProperties}
        >
          {systems.map((sy, i) => {
            const on = openSystem === sy.id;
            const n = sy.models.length;
            return (
              <article className={`wf-style${i === 0 ? " is-lead" : ""}`} key={sy.id}>
                <div className={`wf-style__photo${sy.photoScene ? " is-scene" : ""}`}>
                  <img src={sy.photo} alt={sy.photoAlt} loading="lazy" width="600" height="450" />
                </div>
                <div className="wf-style__body">
                  {sy.priceFrom && <span className="wf-style__tier">{sy.priceFrom}</span>}
                  <h3>{sy.label}</h3>
                  <p>{sy.blurb}</p>
                  <ul>
                    {sy.facts.map((f) => (
                      <li key={f.lead}>
                        <strong>{f.lead}</strong>
                        {f.note && <> · {f.note}</>}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`wf-style__more${on ? " is-open" : ""}`}
                    aria-expanded={on}
                    aria-controls="brand-range-drop"
                    onClick={() => {
                      const next = on ? null : sy.id;
                      setOpenSystem(next);
                      // The panel opens under all the cards, which on a
                      // five-card grid is well past the fold. Without
                      // this you press it and nothing appears to happen.
                      if (next) {
                        requestAnimationFrame(() =>
                          dropRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                        );
                      }
                    }}
                  >
                    {on ? "Hide the models" : n === 1 ? "See the model" : `The ${n} models`}
                    <span aria-hidden="true">{on ? "↑" : "↓"}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div ref={dropRef} className="wf-range__drop" id="brand-range-drop" hidden={!openGroup}>
          {openGroup && (
            <>
              <div className="wf-range__drophead">
                <h3>{openGroup.label}</h3>
                <p>
                  {openGroup.models.length}{" "}
                  {openGroup.models.length === 1 ? "model" : "sizes"}. Pick a size for its spec
                  sheet and our take, or tick <strong>Compare</strong> on two to four of them.
                </p>
              </div>
              <div className="brand-group__grid">
                {familyCards(
                  openGroup.models
                    .map((slug) => bySlug.get(slug))
                    .filter((p): p is Product => Boolean(p)),
                )}
              </div>
            </>
          )}
        </div>

        {drawer}
      </>
    );
  }

  return (
    <>
      {/* One grid, not one per category.
          The category headings were doing real work when each category held
          four near-identical cards — they were the only thing telling you the
          run of Kaden multi-heads had ended and the ducted units had started.
          Now each category IS one card, and the card's own name says which
          category it is, so the heading above it repeated it and the grid
          under it held a single item in a five-column layout with four empty
          cells beside it. */}
      {(
        <div className="brand-group">
          <div className="brand-group__grid">
            {familyCards(groupOrder.flatMap((g) => grouped[g]))}
          </div>
        </div>
      )}

      {drawer}
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SafeImg } from "@/components/SafeImg";

/**
 * The full range, filterable — the Kaden / Puretec product-listing shape
 * Jake sent through: a filter rail down the left, product cards across.
 *
 * Every card links to the model page that already exists, so this is a
 * way in rather than a second catalogue. Filters are checkboxes because
 * "show me splits AND multi-head" is a real question and radio buttons
 * can't answer it.
 *
 * Filter state lives in the component, not the URL. Somebody deep-linked
 * to a filtered view would be sharing a page that looks broken to them
 * next week when the catalogue moves; the page they'd actually want to
 * share is the model page.
 */

export type RangeItem = {
  slug: string;
  brandSlug: string;
  brand: string;
  name: string;
  model: string;
  category: string;
  categoryLabel: string;
  capacity?: string;
  veuEligible: boolean;
  installedPriceFrom?: string;
  bestFor: string;
  photo: string;
  photoFallback?: string;
  accent: string;
  /** Filtration rows point at their category page rather than a model
   *  page, because there isn't one per unit. */
  href?: string;
};

type Group = { key: string; label: string; options: { id: string; label: string; count: number }[] };

export function RangeExplorer({ items }: { items: RangeItem[] }) {
  const [brands, setBrands] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [rebate, setRebate] = useState(false);

  const groups: Group[] = useMemo(() => {
    const count = (pick: (i: RangeItem) => string) => {
      const m = new Map<string, number>();
      items.forEach((i) => m.set(pick(i), (m.get(pick(i)) ?? 0) + 1));
      return m;
    };
    const byBrand = count((i) => i.brand);
    const byCat = count((i) => i.categoryLabel);
    return [
      {
        key: "brand",
        label: "Brand",
        options: [...byBrand.entries()].sort().map(([id, n]) => ({ id, label: id, count: n })),
      },
      {
        key: "cat",
        label: "System type",
        options: [...byCat.entries()].sort().map(([id, n]) => ({ id, label: id, count: n })),
      },
    ];
  }, [items]);

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (brands.length === 0 || brands.includes(i.brand)) &&
          (cats.length === 0 || cats.includes(i.categoryLabel)) &&
          (!rebate || i.veuEligible),
      ),
    [items, brands, cats, rebate],
  );

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const anyFilter = brands.length > 0 || cats.length > 0 || rebate;

  return (
    <div className="rex">
      <aside className="rex__rail" aria-label="Filter the range">
        <div className="rex__railtop">
          <h2>Find your system</h2>
          {anyFilter && (
            <button
              type="button"
              className="rex__clear"
              onClick={() => {
                setBrands([]);
                setCats([]);
                setRebate(false);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {groups.map((g) => (
          <fieldset className="rex__group" key={g.key}>
            <legend>{g.label}</legend>
            {g.options.map((o) => {
              const list = g.key === "brand" ? brands : cats;
              const set = g.key === "brand" ? setBrands : setCats;
              return (
                <label className="rex__check" key={o.id}>
                  <input
                    type="checkbox"
                    checked={list.includes(o.id)}
                    onChange={() => toggle(list, set, o.id)}
                  />
                  <span>{o.label}</span>
                  <em>{o.count}</em>
                </label>
              );
            })}
          </fieldset>
        ))}

        <fieldset className="rex__group">
          <legend>Rebate</legend>
          <label className="rex__check">
            <input type="checkbox" checked={rebate} onChange={() => setRebate((v) => !v)} />
            <span>VEU eligible</span>
            <em>{items.filter((i) => i.veuEligible).length}</em>
          </label>
        </fieldset>
      </aside>

      <div className="rex__main">
        <div className="rex__count" aria-live="polite">
          Showing {shown.length} of {items.length} models
        </div>

        {shown.length === 0 ? (
          <p className="rex__none">
            Nothing matches that combination. Clear a filter, or{" "}
            <Link href="/quote">tell us what you&rsquo;re after</Link> and we&rsquo;ll find it.
          </p>
        ) : (
          <div className="rex__grid">
            {shown.map((it) => (
              <Link
                key={`${it.brand}-${it.name}`}
                href={it.href ?? `/brands/${it.brandSlug}/${it.slug}`}
                className="rexcard"
                style={{ ["--card-accent" as string]: it.accent }}
              >
                <span className="rexcard__brand">{it.brand}</span>
                <div className="rexcard__shot">
                  <SafeImg src={it.photo} fallback={it.photoFallback} alt={it.name} loading="lazy" width="320" height="240" />
                </div>
                <h3>{it.name}</h3>
                <span className="rexcard__model">{it.model}</span>
                <p>{it.bestFor}</p>
                <div className="rexcard__foot">
                  <span className="rexcard__cat">{it.categoryLabel}</span>
                  {it.veuEligible && <span className="rexcard__veu">VEU</span>}
                </div>
                {it.installedPriceFrom && (
                  <span className="rexcard__price">{it.installedPriceFrom} installed</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

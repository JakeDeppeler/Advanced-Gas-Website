/**
 * The pricebook as the iPad shows it: shelves, the models on each, and what a
 * model costs installed — where the business has written that down.
 *
 * Two sources of a price, and nothing invented:
 *
 *   - hot water heat pumps: the heat pump list the public comparator prices
 *     (`heatPumpUnits.ts`), installed and after rebates;
 *   - everything else: the published tiers on the service pages, claimed by a
 *     model only on an exact identification (see `installPrices.ts`).
 *
 * A model with neither says "priced on site". There is no weekly figure: the
 * business has no finance product written down, and a repayment worked out at
 * a made-up rate is a number somebody would be held to.
 *
 * Pure, so it can be checked without a database.
 */

import { HEAT_PUMP_PRICE_NOTE, HEAT_PUMP_UNITS } from "@/lib/heatPumpUnits";
import { PB_CATEGORIES, shelf, type PbCategory } from "@/lib/portal/installPrices";

export type ArtKind = "hp-aio" | "hp-split" | "split" | "multi" | "ducted" | "evap" | "gas-flow" | "gas-heater" | "gas-tank" | "controls";

export type PbProduct = {
  /** Stable across visits: the catalogue slug, or the comparator's id. */
  id: string;
  cat: string;
  brand: string;
  name: string;
  blurb: string;
  chips: { k: string; v: string }[];
  price: number | null;
  priceLabel: string | null;
  /** What the price is: "Installed, inc GST, after rebates", or the tier it came from. */
  priceNote: string;
  specs: { label: string; value: string }[];
  includes: string[];
  veu: boolean;
  /** The customer-facing page for it, to show them. */
  href: string;
  art: ArtKind;
  tag: string | null;
};

const ART: Record<string, ArtKind> = {
  "hot-water": "hp-aio", split: "split", multi: "multi", ducted: "ducted", "gas-heating": "gas-heater",
  "gas-flow": "gas-flow", "gas-tank": "gas-tank", evap: "evap", controls: "controls",
};

const dollars = (label: string) => {
  const m = /\$([\d,]+)/.exec(label);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

function heatPumps(): PbProduct[] {
  const cheapest = Math.min(...HEAT_PUMP_UNITS.map((u) => u.price));
  const longest = Math.max(...HEAT_PUMP_UNITS.map((u) => u.warrantyYears));
  return HEAT_PUMP_UNITS.map((u) => ({
    id: u.id,
    cat: "hot-water",
    brand: u.brand,
    // The comparator writes models in sentence case; the pricebook names them
    // the way the box does.
    name: u.model.replace(/all-in-one/i, "All-in-One").replace(/\bsplit\b/, "Split").replace(/^(\w)/, (c) => c.toUpperCase()),
    blurb: `${u.style === "AIO" ? "All-in-one, plugs in where the old tank was" : "Split: tank inside, heat pump outside"} · ${u.people} people`,
    chips: [{ k: "Tank", v: u.tank }, { k: "Type", v: u.style === "AIO" ? "All-in-one" : "Split" }],
    price: u.price,
    priceLabel: u.priceLabel,
    priceNote: "Installed, inc GST, after rebates",
    specs: [
      { label: "Tank", value: u.tank },
      { label: "Type", value: u.style === "AIO" ? "All-in-one" : "Split" },
      { label: "Household", value: `${u.people} people` },
      { label: "Refrigerant", value: u.refrigerant },
      { label: "Warranty", value: u.warrantyLabel },
      { label: "Wi-Fi", value: u.wifi },
      { label: "Made", value: u.origin },
    ],
    includes: [HEAT_PUMP_PRICE_NOTE],
    veu: true,
    href: "/heat-pumps",
    art: u.style === "AIO" ? "hp-aio" : "hp-split",
    // Worked out, the same way the public comparator highlights them — not a
    // label someone typed on one model.
    tag: u.price === cheapest ? "Best price" : u.warrantyYears === longest ? "Longest warranty" : null,
  }));
}

/** Every model on a shelf, priced ones first. */
export function shelfProducts(key: string): PbProduct[] {
  const s = shelf(key);
  const fromCatalogue: PbProduct[] = s.items.map((i) => {
    const price = i.tier ? dollars(i.tier.price) : null;
    return {
      id: `${i.brandSlug}--${i.slug}`,
      cat: s.cat.key,
      brand: i.brand,
      name: i.name,
      blurb: i.bestFor,
      chips: [
        ...(i.kw != null ? [{ k: "Size", v: `${i.kw} kW` }] : i.litres != null ? [{ k: "Size", v: `${i.litres} L` }] : []),
        ...(i.specs[0] && !/capacity|size/i.test(i.specs[0].label) ? [{ k: i.specs[0].label, v: i.specs[0].value }] : []),
      ].slice(0, 2),
      price,
      priceLabel: i.tier?.price ?? null,
      priceNote: i.tier ? `${i.tier.priceKey}, inc GST · ${i.tier.tier}` : "Priced on site",
      specs: i.specs,
      includes: i.tier?.includes ?? [],
      veu: i.veu,
      href: i.href,
      art: ART[s.cat.key] ?? "split",
      tag: null,
    };
  });
  const all = key === "hot-water" ? [...heatPumps(), ...fromCatalogue] : fromCatalogue;
  return all.sort((a, b) => Number(b.price != null) - Number(a.price != null) || (a.price ?? 0) - (b.price ?? 0));
}

export type PbShelfCard = { cat: PbCategory; from: number | null; veu: boolean; art: ArtKind; count: number };

/** The shelves with their lowest published price. */
export function shelfCards(): PbShelfCard[] {
  return PB_CATEGORIES.map((c) => {
    const items = shelfProducts(c.key);
    // Only an installed price can be a "from" for a shelf of installs.
    const tierFloor = shelf(c.key).tiers.filter((t) => t.priceKey === "Installed").map((t) => dollars(t.price)).filter((n): n is number => n != null);
    const prices = [...items.map((i) => i.price).filter((n): n is number => n != null), ...tierFloor];
    return { cat: c, from: prices.length ? Math.min(...prices) : null, veu: items.some((i) => i.veu), art: ART[c.key] ?? "split", count: items.length };
  });
}

export function findProduct(cat: string, id: string): PbProduct | null {
  return shelfProducts(cat).find((p) => p.id === id) ?? null;
}

export const productHref = (p: Pick<PbProduct, "cat" | "id">) => `/trade/pricebook/${p.cat}/${encodeURIComponent(p.id)}`;

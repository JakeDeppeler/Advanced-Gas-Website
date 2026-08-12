import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { brands } from "@/lib/brands";
import { SafeImg } from "@/components/SafeImg";
import "../detail.css";
import "./[brand]/brand.css";
import "./brands-hub.css";

export const metadata: Metadata = {
  title: "Brands We Install, and Why We Install Them",
  description:
    "Every brand we install across Melbourne's south-east: Mitsubishi Electric, Kaden, Brivis, Zonemate, Reclaim, Thermann and iStore, with our take on each.",
  alternates: { canonical: "/brands" },
};

/** Grouping the brand hub by category so a customer thinking
 *  "heat pump" or "aircon" can jump directly to the right shelf,
 *  rather than scanning a flat list of seven brand cards. */
/** Group order follows the brand order: air conditioning first because
 *  it is the bigger half of the business, then gas, then zoning, then
 *  hot water. Within each group the brands are listed in the same
 *  order they appear everywhere else on the site. */
const BRAND_GROUPS: { label: string; slug: string; brandSlugs: string[]; blurb: string }[] = [
  {
    label: "Air conditioning",
    slug: "aircon",
    brandSlugs: ["mitsubishi-electric", "kaden"],
    blurb: "Split, multi-head and ducted. Mitsubishi Electric is what we quote first; Kaden is what we reach for when a whole house needs doing at once.",
  },
  {
    label: "Gas heating",
    slug: "gas",
    brandSlugs: ["brivis"],
    blurb: "Like-for-like Brivis replacements, the same-footprint retrofit that keeps existing ducts, cupboard cavity and controller wiring.",
  },
  {
    label: "Zoning & control",
    slug: "zoning",
    brandSlugs: ["zonemate"],
    blurb: "Zone controllers and smart room sensors that turn a ducted system from 'on or off' into 'the room you're in, at the temp you want'.",
  },
  {
    label: "Heat pump hot water",
    slug: "heat-pump",
    brandSlugs: ["reclaim", "thermann", "istore"],
    blurb: "Three brands answering three different questions: Reclaim when you're staying in the house, Thermann when you want parts in every Reece store, iStore when the rebate is what decides it.",
  },
];

/** Per-brand one-liner pitched at a "why would I pick this over the others"
 *  question — the info that's genuinely useful when comparing brands rather
 *  than restating the tagline / intro that already sits on the brand hub. */
/** Short chip labels per product category for the hub cards. */
const CATEGORY_CHIP: Record<string, string> = {
  "split-system": "Splits",
  "multi-head": "Multi-head",
  "ducted": "Ducted",
  "cassette": "Cassette",
  "floor-console": "Floor console",
  "heat-pump": "Heat pump HW",
  "gas-continuous-flow": "Continuous flow",
  "gas-storage": "Gas storage",
  "electric-storage": "Electric storage",
  "solar-hot-water": "Solar HW",
  "controller": "Controllers",
  "zoning": "Zoning",
  "damper": "Dampers",
  "accessory": "Accessories",
};

const BRAND_PITCH: Record<string, {
  positioning: string;
  standoutStat: { value: string; label: string };
  bestFor: string;
}> = {
  "mitsubishi-electric": {
    positioning: "Premium default · lowest failure rate in our install base",
    standoutStat: { value: "10+", label: "years typical service life without a callback" },
    bestFor: "Family homes where reliability, quiet operation and long-term serviceability matter more than shaving $600 up-front",
  },
  "kaden": {
    positioning: "Reece-exclusive · same-day parts anywhere in Victoria",
    standoutStat: { value: "~30%", label: "cheaper than Mitsubishi equivalents, installed" },
    bestFor: "3+ bedroom fitouts where every room gets done in one visit rather than one a year",
  },
  "reclaim": {
    positioning: "Premium heat pump · CO₂ refrigerant, 15-year stainless tank option",
    standoutStat: { value: "-10°C", label: "still holds full heating capacity, unlike R290 rivals" },
    bestFor: "Long-term owners, hills postcodes, homes with rooftop solar for the PV-diverter payback",
  },
  "istore": {
    positioning: "Best-value heat pump · maximum VEU rebate outcome",
    standoutStat: { value: "Best rebate", label: "outcome of any heat pump we install" },
    bestFor: "Rebate-maximisers, tight budgets, straightforward like-for-like electric tank swaps",
  },
  "thermann": {
    positioning: "Australian-made by Dux · all-in-one heat pump + G-series continuous flow",
    standoutStat: { value: "200/300 L", label: "all-in-one integrated tanks, no split system to plumb" },
    bestFor: "Households that want an Australian-made brand and prefer the integrated tank+heat-pump form factor",
  },
  "zonemate": {
    positioning: "Zoning + control · Wi-Fi tablet, per-room sensors, retrofit-friendly",
    standoutStat: { value: "20-30%", label: "running-cost drop with proper zoning tuning" },
    bestFor: "Ducted homes where one room bakes and another stays cold, or apps-and-Alexa-loving owners",
  },
  "brivis": {
    positioning: "Retrofit incumbent · same-footprint into most existing ducted heater cavities",
    standoutStat: { value: "3-6 star", label: "output ratings across every kW size, 15/20/26/30" },
    bestFor: "Homes staying on gas ducted where the existing ducts, controller and cupboard cavity should all reuse",
  },
};

export default function BrandsIndex() {
  const totalModels = brands.reduce((sum, b) => sum + b.products.length, 0);

  return (
    <div className="page-detail page-brand page-brand-hub">
      <section className="dp-hero brands-hub-hero">
        <div className="wrap">
          <nav className="dp-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">Brands</span>
          </nav>
          <div className="dp-hero__eyebrow"><span className="ds-dot" /> Brands we install</div>
          <h1>
            {brands.length} brands, <span className="accent">{totalModels} models</span> · every one we install, honestly reviewed.
          </h1>
          <p className="dp-hero__sub">
            We install what works, not what we&rsquo;re paid to install. Every brand below is one
            we&rsquo;ve put into enough Melbourne homes to have a real opinion on. Tap a brand
            for the full range and our take on each individual model.
          </p>
          <div className="brands-hub-hero__jump" aria-label="Jump to category">
            {BRAND_GROUPS.map((g) => (
              <a key={g.slug} href={`#${g.slug}`} className="brands-hub-hero__jumpchip">
                {g.label}
                <span className="brands-hub-hero__jumpcount">
                  {g.brandSlugs.reduce((sum, sl) => sum + (brands.find((b) => b.slug === sl)?.products.length ?? 0), 0)}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {BRAND_GROUPS.map((group) => {
        const groupBrands = group.brandSlugs
          .map((sl) => brands.find((b) => b.slug === sl))
          .filter((b): b is NonNullable<typeof b> => Boolean(b));
        if (groupBrands.length === 0) return null;
        return (
          <section key={group.slug} className="brands-hub-group" id={group.slug}>
            <div className="wrap">
              <div className="brands-hub-group__head">
                <span className="ds-eyebrow"><span className="ds-dot" /> {group.label}</span>
                <p className="brands-hub-group__blurb">{group.blurb}</p>
              </div>
              <div className="brands-hub__grid">
                {groupBrands.map((b) => {
                  const pitch = BRAND_PITCH[b.slug];
                  // Category chips derived from the actual catalogue rather
                  // than hand-maintained — so a brand picking up a new
                  // product type shows it here automatically.
                  const categories = Array.from(
                    new Set(b.products.map((p) => CATEGORY_CHIP[p.category] ?? p.categoryLabel)),
                  ).slice(0, 5);
                  return (
                    <Link
                      key={b.slug}
                      href={`/brands/${b.slug}`}
                      className="bhc"
                      style={{ ["--card-accent" as string]: b.accent }}
                    >
                      {/* Accent rail carries the brand colour down the card */}
                      <span className="bhc__rail" aria-hidden="true" />

                      <div className="bhc__top">
                        <div className="bhc__id">
                          <h2>{b.name}</h2>
                          <span className="bhc__origin">{b.origin}</span>
                        </div>
                        <div className="bhc__pic">
                          <SafeImg src={b.photo} fallback={b.photoFallback} alt={b.photoAlt} loading="lazy" width="400" height="300" />
                        </div>
                      </div>

                      <p className="bhc__tagline">{b.tagline}</p>

                      {pitch && (
                        <div className="bhc__stat">
                          <strong>{pitch.standoutStat.value}</strong>
                          <span>{pitch.standoutStat.label}</span>
                        </div>
                      )}

                      {categories.length > 0 && (
                        <ul className="bhc__cats" aria-label={`${b.name} product types`}>
                          {categories.map((c) => <li key={c}>{c}</li>)}
                        </ul>
                      )}

                      {pitch && (
                        <p className="bhc__bestfor">
                          <b>Best for</b> {pitch.bestFor}
                        </p>
                      )}

                      <div className="bhc__foot">
                        <span className="bhc__count">
                          {b.products.length} model{b.products.length === 1 ? "" : "s"}
                        </span>
                        <span className="bhc__cta">View full range →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section className="brands-hub-help">
        <div className="wrap brands-hub-help__grid">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> Compare or ask</span>
            <h2>Two ways to narrow it down.</h2>
            <p>
              Open any brand page and use the <strong>Compare</strong> tick to line up 2-4 models
              side by side. Or skip that and tell us the room, the household and the budget, we&rsquo;ll
              come back with three real options from three different brands rather than pushing whatever
              carries the biggest margin.
            </p>
          </div>
          <div className="brands-hub-help__ctas">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--lg">Get honest brand advice →</Link>
            <a href={`tel:${site.phoneE164}`} className="ds-btn ds-btn--ghost ds-btn--lg">
              Or call {site.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="bigcta">
        <div className="wrap bigcta__row">
          <div>
            <h2>Not sure which brand suits your job?</h2>
            <p>Give us the room, the household, and the budget · we&rsquo;ll quote three real options.</p>
          </div>
          <div className="bigcta__btns">
            <Link href="/quote" className="ds-btn ds-btn--orange ds-btn--xl">Get honest advice →</Link>
            <a href={`tel:${site.phoneE164}`} className="bigcta__phone">
              or call <strong>{site.phone}</strong>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

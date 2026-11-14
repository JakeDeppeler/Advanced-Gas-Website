import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { brands, visibleProducts } from "@/lib/brands";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { Crumbs } from "@/components/homepage/page/kit";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";
import "@/components/homepage/tools/tools.css";
import "@/components/homepage/brand/hub.css";

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
    bestFor: "Family homes where reliability, quiet operation and long-term serviceability matter more than the lowest up-front price",
  },
  "kaden": {
    positioning: "Reece-exclusive · same-day parts anywhere in Victoria",
    standoutStat: { value: "Same day", label: "parts from Reece stores across Victoria" },
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
  const totalModels = brands.reduce((sum, b) => sum + visibleProducts(b).length, 0);
  const groups = BRAND_GROUPS.map((g) => ({
    ...g,
    list: g.brandSlugs.map((sl) => brands.find((b) => b.slug === sl)).filter((b): b is NonNullable<typeof b> => Boolean(b)),
  })).filter((g) => g.list.length > 0);

  return (
    // The redesign's block layout (Nov 2026), like the tools hub: the old
    // card grid is in git history. Two boxes because the blocks styles hang
    // off .bk sitting inside .ag. /range redirects here.
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx tl bh" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />
      <Crumbs trail={[{ name: "Brands" }]} back={{ label: "Get a free quote →", href: "/quote" }} />

      <section className="bxh tl__hero">
        <div className="wrap tl__hin">
          <div className="bxh__copy">
            <span className="lk2__eye cx__eye">Brands we install</span>
            <h1 className="bxh__h1 cx__h1">{brands.length} brands, <span>{totalModels} models</span>.</h1>
            <p className="bxh__sub">We install what works, not what we&apos;re paid to push. Every brand here is one we&apos;ve put into enough Melbourne homes to have a real opinion on, and each has its own page with the range and our take.</p>
            <div className="bxh__ctas">
              <a href="#aircon" className="abtn abtn--or abtn--flat">See the brands ↓</a>
              <Link href="/#find" className="abtn abtn--line">Or find your system</Link>
            </div>
          </div>
          <aside className="bh__logos" aria-label="The brands">
            {brands.map((b) => (
              <Link key={b.slug} href={`/brands/${b.slug}`} className="bh__logo">
                <span className="bh__limg"><Image src={b.photo} alt="" fill sizes="120px" /></span>
                <b>{b.name}</b>
              </Link>
            ))}
          </aside>
        </div>
      </section>

      <nav className="pxt" aria-label="On this page">
        <div className="wrap pxt__in">{groups.map((g) => <a key={g.slug} href={`#${g.slug}`}>{g.label}</a>)}</div>
      </nav>

      {groups.map((g, gi) => (
        <section key={g.slug} className={`bk__sec ${gi % 2 ? "bk__sec--cream" : "bk__sec--white"}`} id={g.slug}>
          <div className="wrap"><div className="bk__blk bk__col">
            <header className="bk__head">
              <h2 className="h2">{g.label}<span>.</span></h2>
              <p>{g.blurb}</p>
            </header>
            <div className="bh__grid" data-anim="stagger">
              {g.list.map((b) => {
                const pitch = BRAND_PITCH[b.slug];
                const models = visibleProducts(b).length;
                // From the catalogue, so a brand picking up a new kind of product shows it here without anyone remembering to.
                const cats = Array.from(new Set(visibleProducts(b).map((p) => CATEGORY_CHIP[p.category] ?? p.categoryLabel))).slice(0, 5);
                return (
                  <Link key={b.slug} href={`/brands/${b.slug}`} className="bh__card" style={{ ["--c" as string]: b.blockAccent ?? b.accent }}>
                    <span className="bh__img"><Image src={b.photo} alt={b.photoAlt} fill sizes="(max-width: 600px) 90vw, 420px" /></span>
                    <span className="bh__t">
                      <small>{b.origin}</small>
                      <strong>{b.name}</strong>
                      <span className="bh__tag">{b.tagline}</span>
                      {pitch && <span className="bh__stat"><b>{pitch.standoutStat.value}</b> {pitch.standoutStat.label}</span>}
                      {cats.length > 0 && <span className="bh__cats" aria-label={`${b.name} product types`}>{cats.map((c) => <i key={c}>{c}</i>)}</span>}
                      {pitch && <span className="bh__best"><b>Best for</b> {pitch.bestFor}</span>}
                      <em>{models} model{models === 1 ? "" : "s"} · Why we fit {b.name} <i aria-hidden="true">→</i></em>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div></div>
        </section>
      ))}

      <section className="bk__sec bk__sec--white bk__sec--end">
        <div className="wrap">
          <div className="bk__box bk__box--acc bk__cta">
            <div>
              <h2 className="bk__boxh">Not sure which brand <span>suits the job</span>?</h2>
              <p>Tell us the room, the household and what matters most. We&apos;ll come back with real options from more than one brand, each on a fixed written quote.</p>
            </div>
            <div className="bxh__ctas">
              <Link href="/quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href={`tel:${site.phoneE164}`} className="abtn abtn--line" data-call-from="brands-hub">Call {site.phone}</a>
            </div>
          </div>
        </div>
      </section>
    </div></div>
  );
}

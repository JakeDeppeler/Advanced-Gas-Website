import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { brands, type Brand } from "@/lib/brands";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import { BrandLockup } from "@/components/homepage/brand/BrandMark";
import { PageHero, HeroCard } from "@/components/homepage/page/PageHero";
import { SiteModeStrip } from "@/components/Header";
import { PHOTO } from "@/lib/homepage/data";
import { EndCta, accent } from "@/components/homepage/page/bands";
import "@/components/homepage/homepage.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";
import "./brands.css";

export const metadata: Metadata = {
  title: "Brands We Install, and Why We Install Them",
  description:
    "Every brand we install across Melbourne's south-east, from Mitsubishi Electric, Kaden and Brivis to Reclaim, iStore and Viessmann, with our take on each.",
  alternates: { canonical: "/brands" },
};

/** Group order: air conditioning first because it is the bigger half of
 *  the business, then ducted heating, then hot water, so the page runs navy,
 *  cream, navy. Within each group the brands are listed in Jake's brand
 *  order (Nov 2026), the same as everywhere else on the site.
 *
 *  Every brand the hero counts has a card (Nov 2026): Viessmann and Braemar
 *  were counted in "9 brands" and listed in the hero but had no card below.
 *  Braemar's Dominator replaces a gas ducted heater on the same ducts, so it
 *  sits beside Brivis, the heater it most often replaces; that also gives
 *  the heating group a pair rather than one card on its own.
 *
 *  `h` is the heading with its coloured part in braces, as the brand pages
 *  set theirs. The slugs are the page's anchors: the hero links to #aircon,
 *  and other pages may link to the rest. */
const BRAND_GROUPS: { label: string; h: string; slug: string; brandSlugs: string[]; blurb: string }[] = [
  {
    label: "Air conditioning",
    h: "Air {conditioning}.",
    slug: "aircon",
    brandSlugs: ["mitsubishi-electric", "kaden"],
    blurb: "Split, multi-head and ducted. Mitsubishi Electric is what we quote first; Kaden is what we reach for when a whole house needs doing at once.",
  },
  {
    label: "Ducted heating",
    h: "Ducted {heating}.",
    slug: "gas",
    brandSlugs: ["brivis", "braemar"],
    blurb: "Like-for-like Brivis replacements, the same-footprint retrofit that keeps existing ducts, cupboard cavity and controller wiring. Or off gas altogether: the Braemar Dominator goes in where the gas heater was, on the ducts you have.",
  },
  // Thermann is our gas hot water brand, so the group is hot water, not heat
  // pumps. The anchor stays #heat-pump for the links already pointing at it.
  {
    label: "Hot water",
    h: "Hot {water}.",
    slug: "heat-pump",
    brandSlugs: ["reclaim", "thermann", "viessmann", "istore"],
    // Reclaim leads (Jake, 24 Nov 2026: push the Reclaim all-in-one and split).
    blurb: "Reclaim first: the ECO all-in-one for a straight swap, the CO₂ split for the long stay. Thermann when you're staying on gas and want parts in every Reece store, Viessmann when you want a German name on the unit, iStore when the price is all that decides it.",
  },
];

/**
 * Who each brand suits, in a line: the "why would I pick this over the
 * others" answer, which the brand pages spread across a whole section.
 *
 * This used to carry a hand-written headline figure per brand as well. Two
 * of them couldn't be stood behind: one contradicted the figure on its own
 * brand page, and Mitsubishi's "10+ years without a callback" appears
 * nowhere else on the site. The card's figure now comes
 * from the brand's own data (its first "why we choose it" reason), so the
 * hub never says a number the brand page doesn't.
 */
const BEST_FOR: Record<string, string> = {
  "mitsubishi-electric": "Family homes where reliability, quiet operation and long-term serviceability matter more than the lowest up-front price",
  "kaden": "3+ bedroom fitouts where every room gets done in one visit rather than one a year",
  "reclaim": "Long-term owners, hills postcodes, homes with rooftop solar for the PV-diverter payback",
  "istore": "Tight budgets: the lowest heat pump price after the rebate, and straightforward like-for-like electric tank swaps",
  "thermann": "Households staying on gas that want continuous flow or a storage tank, with the parts in every Reece store",
  "viessmann": "Households replacing an old electric or gas tank that want a German brand and a quiet unit",
  "braemar": "Gas ducted homes that want cooling and to get off gas, without pulling the ducts out",
  "brivis": "Homes staying on gas ducted where the existing ducts, controller and cupboard cavity should all reuse",
};

/**
 * A photograph of the brand's equipment in place, where its own page
 * already shows one under its name (Jake: "if we have photo use those"):
 * the header scene, else the first "why" reason marked as a photograph,
 * else the year-ten photo, as long as that isn't the studio shot again.
 * Read from the data rather than listed here, so a brand that gains an
 * install photo gets it on this page without anyone remembering to.
 *
 * Two brands (Braemar, iStore) have none yet, and show the studio cut-out
 * on white instead; a photo of somebody else's unit under their name would
 * be worse than no photo.
 */
function scenePhoto(b: Brand): { src: string; alt: string; pos?: string } | undefined {
  if (b.heroScene) return { src: b.heroScene.src, alt: b.heroScene.alt };
  const r = b.reasons?.find((x) => x.cover && x.img);
  if (r?.img) return { src: r.img, alt: r.alt ?? b.photoAlt, pos: r.pos };
  if (b.servicing && b.servicing.photo !== b.photo) return { src: b.servicing.photo, alt: b.servicing.photoAlt, pos: b.servicing.photoPos };
  return undefined;
}

/** The maker's own logo where we have one (its alt carries the name), the name set in type where we don't, as the category pages do. */
function BrandName({ b }: { b: Brand }) {
  if (b.mark) return <BrandLockup tone="dark" />;
  if (b.logo) {
    // The SVGs carry the makers' colours; the raster one (iStore's) is drawn white for the quote box, so it goes dark here.
    const svg = b.logo.endsWith(".svg");
    return <span className={`bi__logo${svg ? "" : " bi__logo--mono"}`}><Image src={b.logo} alt={b.name} fill sizes="170px" unoptimized={svg} /></span>;
  }
  return <>{b.name}</>;
}

function BrandCard({ b, sizes }: { b: Brand; sizes: string }) {
  const scene = scenePhoto(b);
  const lead = b.reasons?.[0];
  const best = BEST_FOR[b.slug];
  return (
    <Link href={`/brands/${b.slug}`} className="bi__card" style={{ ["--c" as string]: b.blockAccent ?? b.accent }}>
      <span className={`bi__ph${scene ? "" : " bi__ph--cut"}`}>
        <Image src={scene?.src ?? b.photo} alt={scene?.alt ?? b.photoAlt} fill sizes={sizes} style={scene?.pos ? { objectPosition: scene.pos } : undefined} />
      </span>
      {/* Divs, not spans, from here: the name is a heading, and a heading can't sit in a span. */}
      <div className="bi__body">
        <div className="bi__top">
          <h3 className="bi__name"><BrandName b={b} /></h3>
        </div>
        <small className="bi__origin">{b.origin}</small>
        <span className="bi__tag">{b.tagline}</span>
        {lead && (
          <span className="bi__fig">
            <b>{lead.v}</b>
            <span><strong>{lead.k}</strong> {lead.d}</span>
          </span>
        )}
        {best && <span className="bi__best"><b>Best for</b> {best}</span>}
        <em className="bi__go">Why we fit {b.name} <i aria-hidden="true">→</i></em>
      </div>
    </Link>
  );
}

type Group = (typeof BRAND_GROUPS)[number] & { list: Brand[] };

function GroupHead({ g, id }: { g: Group; id?: string }) {
  return (
    <header className="bi__head" id={id}>
      <h2 className="h2">{accent(g.h)}</h2>
      <p>{g.blurb}</p>
    </header>
  );
}

/**
 * The group's brand count, counted rather than written. Model counts came off
 * (Nov 2026 audit): this page counted every catalogue record, retired sizes
 * and models no option sells included, so it disagreed with every brand page.
 */
function GroupMeta({ g }: { g: Group }) {
  return <span className="bi__meta"><b>{g.list.length}</b> brand{g.list.length === 1 ? "" : "s"}</span>;
}

/** The cards for one group. The group's size sets the columns (bi__grid--n), so a row is never left with one card in it. */
function Cards({ g, sizes }: { g: Group; sizes: string }) {
  return (
    <div className={`bi__grid bi__grid--${g.list.length}`} data-anim="stagger">
      {g.list.map((b) => <BrandCard key={b.slug} b={b} sizes={sizes} />)}
    </div>
  );
}

/** One group in the homepage's navy box ("Find your system", "Tools for you"), the cards white inside it. */
function BoxGroup({ g, sizes }: { g: Group; sizes: string }) {
  return (
    <section className="bk__sec bk__sec--white bi__sec" id={g.slug}>
      <div className="wrap">
        <div className="bi__box">
          <div className="bi__boxhead">
            <GroupHead g={g} />
            <GroupMeta g={g} />
          </div>
          <Cards g={g} sizes={sizes} />
        </div>
      </div>
    </section>
  );
}

/** One group on the homepage's cream services band, between the two navy boxes. */
function CreamGroup({ g, sizes }: { g: Group; sizes: string }) {
  return (
    <section className="bk__sec bk__sec--cream bi__sec" id={g.slug}>
      <div className="wrap bi__plain">
        <div className="bi__boxhead">
          <GroupHead g={g} />
          <GroupMeta g={g} />
        </div>
        <Cards g={g} sizes={sizes} />
      </div>
    </section>
  );
}

export default function BrandsIndex() {
  const groups: Group[] = BRAND_GROUPS.map((g) => {
    const list = g.brandSlugs.map((sl) => brands.find((b) => b.slug === sl)).filter((b): b is Brand => Boolean(b));
    return { ...g, list };
  }).filter((g) => g.list.length > 0);
  const by = (slug: string) => groups.find((g) => g.slug === slug);
  const air = by("aircon");
  const gas = by("gas");
  const hw = by("heat-pump");

  return (
    // Built from the homepage's own pieces (Jake, Nov 2026: he didn't like
    // the catalogue look, and every inside page should "resemble the home
    // page more"): its photo hero, its navy boxes of white photo cards, and
    // its cream band. The old bands of product cut-outs are in git history.
    // Two boxes because the blocks styles hang off .bk sitting inside .ag.
    // /range redirects here.
    <>
    <SiteModeStrip tabs={false} />
    <div className="ag ag--flat" data-no-reveal>
      {/* No label over the headline, as on the homepage; the card on the
          right was a grid of thumbnails too small to tell one unit from
          another, and is now the page's shelves, each with its brands. */}
      <PageHero
        crumbs={[{ name: "Brands" }]}
        title={`${brands.length} brands, {and our take on each}.`}
        sub="We install what works, not what we're paid to push. Every brand here is one we've put into enough Melbourne homes to have a real opinion on, and each has its own page with the range and our take."
        photo={PHOTO.outdoorUnit} pos="center 40%"
        ctas={<><a href="#aircon" className="abtn abtn--or">See the brands ↓</a><Link href="/#find" className="abtn abtn--line">Or find your system</Link></>}
        trust={[{ v: "Reece", k: "Trade partner" }]}
        card={
          <HeroCard label="Start with the job">
            <ul className="phx__rows">
              {groups.map((g) => (
                <li key={g.slug}>
                  <a href={`#${g.slug}`}>
                    <strong>{g.label} <i className="bi__rowgo" aria-hidden="true">↓</i></strong>
                    <span>{g.list.map((b) => b.name).join(" · ")}</span>
                  </a>
                </li>
              ))}
            </ul>
          </HeroCard>
        }
      />
      <div className="bk cx bi" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />

      {air && <BoxGroup g={air} sizes="(max-width: 700px) 90vw, 680px" />}

      {gas && <CreamGroup g={gas} sizes="(max-width: 700px) 90vw, 680px" />}

      {hw && <BoxGroup g={hw} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 340px" />}

      {/* The homepage's closing box, the team behind the orange, as every inside page ends. */}
      <EndCta
        title={<>Not sure which brand <span>suits the job</span>?</>}
        text="Tell us the room, the household and what matters most. We'll come back with real options from more than one brand, each on a fixed written quote."
        from="brands-hub"
      />
    </div></div>
    </>
  );
}

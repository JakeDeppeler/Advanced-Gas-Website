import Image from "next/image";
import Link from "next/link";
import type { ServiceContent } from "@/lib/serviceContent";
import type { SystemDetail, SystemSpotlight } from "@/lib/systemDetail";
import { resolveAsset } from "@/lib/publicAsset";
import { findBrand } from "@/lib/brands";
import { SHOW_PRICES, findSystem, lowerLabel, systemHref } from "@/lib/homepage/data";
import { LEARN, SYS_INTRO, learnFor } from "@/lib/homepage/learn";
import { HowItWorks } from "../how/HowItWorks";
import { ReasonIcon, type ReasonIconName } from "../brand/ReasonIcon";
import { BrandLockup } from "../brand/BrandMark";
import "./category.css";
import { Crumbs, Hero, Next } from "./kit";
import { AreaChips } from "./AreasServed";
import { accent, lastWord, BkHead, Bands, Tabs, EndCta, BandPage, type Band } from "./bands";

/** A /public path that exists, trying other extensions; the path as given if none does. */
const asset = (src: string) => resolveAsset(src) ?? src;

type Row = { tier: string; price: string; includes: string; group?: string; photo?: string; photoScene?: boolean; priceKey?: string };
type Sys = NonNullable<ServiceContent["systems"]>[number];

/**
 * Install systems that are also in Find your system, so a service page can
 * send people to the product pages with the real options rather than
 * re-listing them.
 */
export const FINDER_FOR: Record<string, string> = {
  "air-conditioning-installation/split": "split-system",
  "air-conditioning-installation/reverse-cycle": "reverse-cycle-split",
  "air-conditioning-installation/multi": "multi-head",
  "air-conditioning-installation/ducted": "ducted",
  "air-conditioning-installation/evap": "evaporative",
  "heat-pump-installation/split-heat-pump": "heat-pump",
  "heat-pump-installation/all-in-one": "heat-pump",
  "gas-plumbing/gas-ducted": "gas-ducted-heating",
  "gas-plumbing/continuous-flow": "gas-continuous-flow",
};

/**
 * The finder files both heat pumps under one system and tells them apart by
 * option, so the drawing for each comes from an option of that kind: the
 * CO₂ split's two-piece cutaway, and the all-in-one's single unit.
 */
const HOW_TIER: Record<string, string> = {
  "heat-pump-installation/split-heat-pump": "signature",
  "heat-pump-installation/all-in-one": "premium",
};

/** A service page's own drawing, where the page opens on why at all (the heat pump one). */
const SERVICE_HOW: Record<string, string> = { "heat-pump-installation": "heat-pump" };

/** Price-card groups that are a system in the finder: the group links to it. */
const GROUP_FINDER: Record<string, string> = {
  "Split system": "split-system",
  "Multi-head": "multi-head",
  "Ducted reverse-cycle": "ducted",
  "Gas ducted heating": "gas-ducted-heating",
  "Gas hot water": "gas-continuous-flow",
};

/** What a system card's link says: "install" is wrong for a service or a hire. */
const GO: Record<string, string> = {
  "aircon-servicing-repairs": "What the service covers",
  "gas-plumbing/gas-service": "What the service covers",
  "gas-plumbing/temporary-hot-water": "How the hire works",
};

/* ------------------------------------------------------------------ icons */

/**
 * The drawn icons, for the abstract points only (Jake, Nov 2026: photos
 * where we have them, drawings for things like sound or a rebate). Most come
 * from the brand pages' set; these few are the service pages' own, drawn to
 * the same 64-unit grid and line so the two read as one family.
 */
type IconKey = ReasonIconName | "truck" | "flame" | "phone" | "gauge" | "ruler" | "valve" | "alarm" | "heatpump";
const N = "#050A30";
const L = { fill: "none", stroke: "currentColor", strokeWidth: 3.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const K = { ...L, stroke: N };
const OWN: Partial<Record<IconKey, JSX.Element>> = {
  truck: (<><path d="M6 18 H38 V44 H6 Z" {...K} /><path d="M38 26 H49 L57 35 V44 H38" {...L} /><circle cx="17" cy="46" r="5.5" {...K} fill="#fff" /><circle cx="47" cy="46" r="5.5" {...K} fill="#fff" /></>),
  flame: (<><path d="M32 7 C35 18 47 24 47 39 a15 15 0 0 1 -30 0 C17 30 23 25 26 17 C28 23 30 25 32 25 C34 21 34 13 32 7Z" {...L} fill="currentColor" fillOpacity=".14" /><path d="M32 52 a6.5 6.5 0 0 1 -6.5 -6.5 c0 -5 6.5 -8 6.5 -13 c0 5 6.5 8 6.5 13 A6.5 6.5 0 0 1 32 52Z" {...K} /></>),
  phone: (<path d="M19 9 h8 l4 12 -6 4.5 a27 27 0 0 0 13.5 13.5 l4.5 -6 12 4 v8 a4 4 0 0 1 -4 4 C31 49 15 33 15 13 a4 4 0 0 1 4 -4Z" {...L} fill="currentColor" fillOpacity=".12" />),
  gauge: (<><path d="M10 44 a22 22 0 0 1 44 0" {...K} /><path d="M16 30 l3 2 M32 22 v4 M48 30 l-3 2" {...K} /><path d="M32 44 L44 30" {...L} /><circle cx="32" cy="44" r="4" fill={N} /><path d="M12 52 H52" {...K} /></>),
  ruler: (<><rect x="7" y="22" width="50" height="20" rx="3" {...K} /><path d="M15 22 V31 M23 22 V28 M31 22 V33 M39 22 V28 M47 22 V31" {...L} /></>),
  valve: (<><path d="M6 36 H22 M42 36 H58" {...K} /><path d="M22 28 H42 V44 H22 Z" {...L} fill="currentColor" fillOpacity=".12" /><path d="M32 28 V17 M23 14 H41" {...K} /></>),
  alarm: (<><circle cx="32" cy="32" r="15" {...K} /><circle cx="32" cy="32" r="4.5" fill="currentColor" /><path d="M11 19 q-6 13 0 26 M53 19 q6 13 0 26" {...L} /></>),
  heatpump: (<><rect x="7" y="15" width="50" height="34" rx="5" {...K} /><circle cx="26" cy="32" r="10" {...L} /><path d="M26 22 v20 M16 32 h20" {...L} strokeWidth={2.5} /><path d="M44 22 V42 M50 22 V42" {...K} /></>),
};

function Icon({ name }: { name: IconKey }) {
  const own = OWN[name];
  return own ? <svg viewBox="0 0 64 64" aria-hidden="true">{own}</svg> : <ReasonIcon name={name as ReasonIconName} />;
}

/** serviceContent's icon names, onto the drawings. */
const FROM_FIELD: Record<string, IconKey> = {
  shield: "shield", snowflake: "cold", ruler: "ruler", clock: "clock", flow: "bolt", remote: "controller", truck: "truck",
  gauge: "gauge", flame: "flame", valve: "valve", tag: "rebate", heatpump: "heatpump", tank: "tank", wrench: "wrench",
  alarm: "alarm", phone: "phone",
};
/**
 * The words decide first, because the content's icon field was picked from a
 * smaller set: a tile about noise wants the speaker, one about a rebate the
 * tag, whatever its field says.
 */
const BY_WORD: [RegExp, IconKey][] = [
  // Whole words: "a cheap unit quietly stops working" is about the cold, not noise.
  [/dBA|\bquiet\b|\bloud\b|\bnois/i, "quiet"],
  [/zon(e|ing)/i, "zones"],
  [/\bduct\b|ductwork/i, "duct"],
  [/rebate|VEU/i, "rebate"],
  [/solar|\bPV\b/i, "bolt"],
  [/Australian/i, "aus"],
  [/cold morning|-10|−10/i, "cold"],
  [/natural refrigerant|R290|propane|global-warming/i, "leaf"],
  [/\bleak/i, "wrench"],
  [/both seasons|heats and cools/i, "heatcool"],
];
const iconFor = (b: { t: string; line?: string; icon?: string }): IconKey =>
  BY_WORD.find(([re]) => re.test(`${b.t} ${b.line ?? ""}`))?.[1] ?? FROM_FIELD[b.icon ?? ""] ?? "check";

/* ------------------------------------------------------------- the parts */

/** What you get: a drawing per point, as the brand pages' "Why we choose". */
function Points({ items }: { items: { t: string; line?: string; d: string; icon?: string }[] }) {
  return (
    <ul className={`svi${items.length % 4 === 0 ? " svi--4" : ""}`} data-anim="stagger">
      {items.map((b) => (
        <li key={b.t}>
          <span className="svi__ico"><Icon name={iconFor(b)} /></span>
          <h3>{b.t}</h3>
          {b.line && <strong>{b.line}</strong>}
          <p>{b.d}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The kinds of job under a service, in the category pages' card: a photo of
 * one of ours, what it is, and two ways on. The card opens the system's
 * install page; where the finder has the same system, a second link goes
 * straight to its options rather than this page listing them again.
 */
function Systems({ slug, systems }: { slug: string; systems: Sys[] }) {
  const n = systems.length;
  return (
    <div className={`sjx${n === 2 || n === 4 || n === 5 ? ` sjx--${n}` : ""}`} data-anim="stagger">
      {systems.map((s) => {
        const key = `${slug}/${s.id}`;
        const finder = FINDER_FOR[key];
        const sys = finder ? findSystem(finder)?.sys : undefined;
        return (
          <article key={s.id} className="sjx__card">
            <span className={`sjx__img${s.photo.scene ? "" : " sjx__img--cut"}`}>
              <Image src={asset(s.photo.src)} alt="" fill sizes="(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 460px" />
            </span>
            <div className="sjx__txt">
              {s.brands?.length ? <span className="sjx__tag">{s.brands.join(" · ")}</span> : null}
              <h3><Link href={`/services/${slug}/${s.id}`}>{s.label}</Link></h3>
              <p>{s.blurb}</p>
              <div className="sjx__foot">
                <span className="sjx__go">{GO[key] ?? GO[slug] ?? "How we install it"} <i aria-hidden="true">→</i></span>
                {sys && <Link href={systemHref(sys.slug)} className="sjx__opt">{sys.tiers.length === 1 ? "The option" : `The ${sys.tiers.length} options`} →</Link>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * Price cards, grouped under their trade so a page covering three trades
 * still reads as three lists, each job with its own photo.
 *
 * With SHOW_PRICES off the figure is gone and said once in the heading
 * ("fixed, in writing") rather than on every card; what each job includes
 * stays, because that is still worth reading. A group that is a system in
 * the finder links to its options there.
 */
export function Prices({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  const groups = [...new Set(rows.map((r) => r.group ?? ""))].map((g) => ({ g, list: rows.filter((r) => (r.group ?? "") === g) }));
  return (
    <div className={`svp svp--${Math.min(groups.length, 4)}`} data-anim="stagger">
      {groups.map(({ g, list }) => {
        const sys = GROUP_FINDER[g] ? findSystem(GROUP_FINDER[g])?.sys : undefined;
        return (
          <article key={g} className="svp__card">
            <h3 className="svp__head">{g || "The jobs"}</h3>
            <ul className="svp__rows">
              {list.map((r) => (
                <li key={r.tier}>
                  {r.photo ? (
                    <span className={`svp__img${r.photoScene ? " svp__img--scene" : ""}`}>
                      <Image src={asset(r.photo)} alt="" fill sizes="88px" />
                    </span>
                  ) : (
                    // A call-out has nothing to photograph: a drawing stands in.
                    <span className="svp__img svp__img--ico"><Icon name={/emergency/i.test(r.tier) ? "alarm" : "wrench"} /></span>
                  )}
                  <div className="svp__t">
                    <strong>{r.tier}</strong>
                    {SHOW_PRICES && <em>{r.price} <small>{r.priceKey ?? "installed"}</small></em>}
                    <ul>{r.includes.split(/,\s*/).filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </li>
              ))}
            </ul>
            {/* At the foot, so cards of one row end level however many jobs each lists */}
            {sys && <Link href={systemHref(sys.slug)} className="svp__go">See the {lowerLabel(sys.label)} options <i aria-hidden="true">→</i></Link>}
          </article>
        );
      })}
    </div>
  );
}

function PricesHead() {
  return SHOW_PRICES
    ? <BkHead h="What it {costs}.">Every price includes GST. Your exact price is confirmed in writing after a free site check.</BkHead>
    : <BkHead h="What each job {covers}.">Every job is priced after a free site check, on a fixed written quote including GST. It only changes if the job does, and we tell you before it does.</BkHead>;
}

function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  return <div className="afaqs">{faqs.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>;
}

function Steps({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <ol className="lk2__tl kx__tl">
      {steps.slice(0, 4).map((s, i) => <li key={s.title}><span className="pxb__n" aria-hidden="true">{i + 1}</span><h3>{s.title}</h3><p>{s.detail}</p></li>)}
    </ol>
  );
}

/** A photo one side, words and figures the other: "how it looks" and "keeping it working". */
function Feature({ f, flip = false }: { f: { heading: string; note?: string; body?: string; photo: string; photoAlt: string; photoScene?: boolean; facts: { v: string; k: string }[] }; flip?: boolean }) {
  return (
    <div className={`pxbr${flip ? " kx__flip" : ""}`}>
      <div className={`pxbr__img${f.photoScene ? " pxbr__img--scene" : ""}`}>
        <Image src={asset(f.photo)} alt={f.photoAlt} fill sizes="(max-width: 1000px) 100vw, 640px" />
      </div>
      <div className="pxbr__t">
        <h2 className="h2">{accent(lastWord(f.heading))}</h2>
        <p className="pxbr__sub">{f.note ?? f.body}</p>
        <dl className="kx__facts" data-anim="stagger">{f.facts.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}</dl>
      </div>
    </div>
  );
}

/**
 * The makers we fit, in the category pages' brand card (product on white,
 * then the maker's logo, no colour bar: Jake, Nov 2026), each opening its
 * brand page. The line under the logo is this service's reason, not the
 * brand's tagline.
 */
function Brands({ pods }: { pods: { brand: string; reason: string; href?: string }[] }) {
  return (
    <div className="cx__brands" data-anim="stagger">
      {pods.map((p) => {
        const b = p.href ? findBrand(p.href.split("/").pop() ?? "") : undefined;
        const img = b?.heroProducts?.[0]?.src ?? b?.photo;
        const body = (
          <>
            {img && <span className="cx__bimg"><Image src={img} alt="" fill sizes="(max-width: 600px) 30vw, 300px" /></span>}
            <span className="cx__btxt">
              <span className="cx__blogo">
                {b?.mark ? <BrandLockup tone="dark" />
                  : b?.logo ? <span className={`cx__blimg${b.logo.endsWith(".svg") ? "" : " cx__blimg--mono"}`}><Image src={b.logo} alt={b.name} fill sizes="160px" unoptimized={b.logo.endsWith(".svg")} /></span>
                  : <strong>{p.brand}</strong>}
              </span>
              <span className="cx__btag">{p.reason}</span>
              {b && <em>Why we choose {b.name} <i aria-hidden="true">→</i></em>}
            </span>
          </>
        );
        return p.href
          ? <Link key={p.brand} href={p.href} className="cx__brand">{body}</Link>
          : <div key={p.brand} className="cx__brand">{body}</div>;
      })}
    </div>
  );
}

/** What's in the job and what isn't, so the boundary is read before the quote, not argued after it. */
function InOut({ inc, exc }: { inc: string[]; exc: string[] }) {
  return (
    <>
      <BkHead h="What's in the job, and {what isn't}.">One fixed price in writing. It only changes if the job does, and we tell you before it does.</BkHead>
      <div className="pcx">
        {inc.length > 0 && <div className="pcx__col pcx__col--pro"><h3><span aria-hidden="true">+</span> Included</h3><ul>{inc.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        {exc.length > 0 && <div className="pcx__col pcx__col--con"><h3><span aria-hidden="true">−</span> Not included</h3><ul>{exc.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      </div>
    </>
  );
}

/** "A split system", "an evaporative cooler", but "gas ducted heating" with no article. */
const howHead = (label: string) => {
  const l = lowerLabel(label);
  return `How ${/^gas /.test(l) ? "" : /^[aeiou]/.test(l) ? "an " : "a "}${l} {works}.`;
};

/** The suburbs nearest the workshop, as a band of the page. */
function Areas({ what }: { what: string }) {
  return (
    <>
      <BkHead h={`${what} in Pakenham and {the suburbs around it}.`}>
        Our own crews, out of the Sierra Circuit workshop in Pakenham, cover everywhere within about 75 km. These are the suburbs nearest it; each page has the drive time and the jobs we usually do there.
      </BkHead>
      <AreaChips />
    </>
  );
}

/** The part of a heading after its last comma is the coloured part, as the system pages' own lead and accent split it. */
function heroTitle(h1: string) {
  const i = h1.lastIndexOf(",");
  return i < 0 ? h1 : <>{h1.slice(0, i + 1)} <em>{h1.slice(i + 1).trim()}</em></>;
}

/** A service: what we do, the kinds of job under it, what it costs, how it runs. */
export function ServiceView({ slug, name, c, choose }: { slug: string; name: string; c: ServiceContent; choose?: { h2: string; lede: string } }) {
  const systems = c.systems ?? [];
  const howSlug = SERVICE_HOW[slug];
  const how = howSlug ? LEARN[howSlug] : undefined;
  const bands: Band[] = [
    ...(systems.length ? [{
      id: "systems", tab: "The systems",
      body: (
        <>
          <BkHead h={choose?.h2 ?? "Start with the one that {brought you here}."}>{choose?.lede}</BkHead>
          <Systems slug={slug} systems={systems} />
        </>
      ),
    }] : []),
    ...(how ? [{
      id: "how", tab: "How it works",
      body: (
        <>
          <BkHead h={lastWord(c.whyFirst?.heading ?? howHead(findSystem(howSlug)?.sys.label ?? name))}>{c.whyFirst?.blurb}</BkHead>
          <HowItWorks kind={how.diagram} steps={how.how} />
          {c.whyFirst?.caveat && <p className="svs__note">{c.whyFirst.caveat}</p>}
        </>
      ),
    }] : []),
    {
      id: "included", tab: "What you get",
      body: (
        <>
          <BkHead h="What you {get} from us." />
          <Points items={c.benefits} />
        </>
      ),
    },
    ...(c.brandPods?.length ? [{
      id: "brands", tab: "Brands",
      body: (
        <>
          <BkHead h={slug === "aircon-servicing-repairs" ? "The brands {we fit and service}." : "The brands {we fit}."}>Each one is here for a reason, and each has a page on why we choose it and when we wouldn&apos;t.</BkHead>
          <Brands pods={c.brandPods} />
        </>
      ),
    }] : []),
    ...(c.installPhotos?.shots.length ? [{
      id: "installs", tab: "Our installs",
      body: (
        <>
          <BkHead h={lastWord(c.installPhotos.heading)}>{c.installPhotos.blurb}</BkHead>
          <div className="bk__gal svgal" data-n={Math.min(c.installPhotos.shots.length, 3)} data-anim="stagger">
            {c.installPhotos.shots.map((p) => (
              <figure key={p.src} className="bk__ph">
                <Image src={asset(p.src)} alt={p.alt} fill sizes="(max-width: 1000px) 50vw, 460px" />
                {p.caption && <figcaption>{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </>
      ),
    }] : []),
    ...(c.looks ? [{ id: "looks", tab: "How it looks", cls: "", body: <Feature f={c.looks} /> }] : []),
    ...(c.pricing.length ? [{ id: "prices", tab: "Pricing", cls: "bk__boxed bk__col", body: <><PricesHead /><Prices rows={c.pricing} /></> }] : []),
    ...(c.included?.length || c.excluded?.length ? [{ id: "in-price", tab: "In the price", body: <InOut inc={c.included ?? []} exc={c.excluded ?? []} /> }] : []),
    ...(c.steps?.length ? [{
      id: "process", tab: "How it runs", navy: true,
      body: <><BkHead h="From the first call to {done}." /><Steps steps={c.steps} /></>,
    }] : []),
    ...(c.servicing ? [{ id: "servicing", tab: "Servicing", cls: "", body: <Feature f={c.servicing} flip /> }] : []),
    ...(c.faqs.length ? [{
      id: "faqs", tab: "FAQs", cls: "pp__two",
      body: (
        <>
          <BkHead h="Before you {book}.">Still want a human? <a href="tel:+61359478000" data-call-from="service-faq">Call (03) 5947 8000</a>.</BkHead>
          <Faqs faqs={c.faqs} />
        </>
      ),
    }] : []),
    { body: <Areas what={name} /> },
  ];
  return (
    <BandPage cls="bx">
      <Crumbs trail={[{ name: "Services", href: "/services" }, { name }]} />
      <Hero eye={name} title={heroTitle(c.h1)} sub={c.intro} img={c.heroPhoto ? asset(c.heroPhoto) : undefined} imgAlt={c.heroPhotoAlt} facts={c.heroFacts} />
      <Tabs list={bands} />
      <Bands list={bands} />
      <EndCta title={<>Ready to talk about <span>{name.toLowerCase()}</span>?</>} />
    </BandPage>
  );
}

/**
 * The thing that sets one system apart from its siblings (lib/systemDetail
 * spotlight), in the layout its argument wants: numbered cards, a photo
 * beside a list, two columns side by side, or steps in order.
 */
function Spotlight({ sp }: { sp: SystemSpotlight }) {
  return (
    <>
      <BkHead h={lastWord(sp.heading)}>{sp.blurb}</BkHead>
      {sp.layout === "table" && sp.columns ? (
        <div className="svs__tblwrap">
          <table className="svs__tbl">
            <thead><tr><th scope="col"><span className="sr-only">What</span></th><th scope="col">{sp.columns[0]}</th><th scope="col">{sp.columns[1]}</th></tr></thead>
            <tbody>
              {sp.items.map((x) => {
                const [a, b] = x.d.split("||").map((v) => v.trim());
                return (
                  <tr key={x.t}>
                    <th scope="row">{x.t}</th>
                    {/* data-l: the column name, shown above each value once the rows stack on a phone */}
                    <td data-l={sp.columns?.[0]}>{a}</td>
                    <td data-l={sp.columns?.[1]}>{b}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : sp.layout === "split" && sp.photo ? (
        <div className="svs__split">
          <span className="svs__img"><Image src={asset(sp.photo.src)} alt={sp.photo.alt} fill sizes="(max-width: 1000px) 90vw, 460px" /></span>
          <ol className="svs__list">{sp.items.map((x) => <li key={x.t}><h3>{x.t}</h3><p>{x.d}</p></li>)}</ol>
        </div>
      ) : sp.layout === "steps" ? (
        <ol className="svs__steps" data-anim="stagger">{sp.items.map((x) => <li key={x.t}><h3>{x.t}</h3><p>{x.d}</p></li>)}</ol>
      ) : (
        <ol className={`svs__cards${sp.items.length % 4 === 0 ? " svs__cards--4" : ""}`} data-anim="stagger">{sp.items.map((x) => <li key={x.t}><h3>{x.t}</h3><p>{x.d}</p></li>)}</ol>
      )}
      {sp.note && <p className="svs__note">{sp.note}</p>}
    </>
  );
}

/**
 * Where a system is in the finder, its options live on the finder's page;
 * this links there with the real catalogue's count and makers, rather than
 * repeating the products and their prices here.
 */
function Options({ finder }: { finder: string }) {
  const sys = findSystem(finder)?.sys;
  if (!sys) return null;
  const tiers = sys.tiers.filter((t) => !t.same);
  const brands = [...new Set(tiers.map((t) => t.brand))];
  const one = sys.tiers.length === 1;
  return (
    <Link href={systemHref(sys.slug)} className="svo">
      <span className={`svo__img svo__img--${Math.min(tiers.length, 4)}`}>
        {tiers.slice(0, 4).map((t) => <span key={t.slug}><Image src={t.img} alt="" fill sizes="(max-width: 1000px) 40vw, 200px" /></span>)}
      </span>
      <span className="svo__txt">
        <span className="sjx__tag">{sys.sub}</span>
        <strong>{sys.label}</strong>
        <span className="svo__intro">{SYS_INTRO[sys.slug] ?? ""}</span>
        <span className="svo__meta"><b>{one ? "One option" : `${sys.tiers.length} options`}</b> · {brands.join(", ")}</span>
        <span className="svo__go">{one ? `See the ${sys.label}` : `See the ${sys.tiers.length} options`} <i aria-hidden="true">→</i></span>
      </span>
    </Link>
  );
}

/**
 * Four of the system's specs for the header's figures. The figures are set
 * large, so a long value ("5-yr manufacturer + 6-yr workmanship") broke out
 * of its box on a phone; the short ones go first and the long ones only make
 * up the numbers.
 */
function heroSpecs(specs?: { label: string; value: string }[]) {
  if (!specs?.length) return undefined;
  const short = (x: { value: string }) => x.value.length <= 24;
  return [...specs.filter(short), ...specs.filter((x) => !short(x))].slice(0, 4).map((x) => ({ v: x.value, k: x.label }));
}

/** One system under a service: who it suits, how it works, what sets it apart, how we fit it. */
export function SystemView({ slug, name, s, d, finder }: { slug: string; name: string; s: Sys; d?: SystemDetail; finder?: string }) {
  const title = s.h1 ? <>{s.h1.lead} <em>{s.h1.accent}</em></> : s.label;
  const steps = d?.steps;
  const label = s.label.toLowerCase();
  const learn = finder ? learnFor(finder, HOW_TIER[`${slug}/${s.id}`] ?? "") : undefined;
  const finderSys = finder ? findSystem(finder)?.sys : undefined;
  const bands: Band[] = [
    ...(s.bestFor?.length || s.watchOut?.length ? [{
      id: "fit", tab: "Who it suits",
      body: (
        <>
          <BkHead h="Who it {suits}." />
          <div className="pcx">
            {s.bestFor?.length ? <div className="pcx__col pcx__col--pro"><h3><span aria-hidden="true">+</span> A good fit if</h3><ul>{s.bestFor.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
            {s.watchOut?.length ? <div className="pcx__col pcx__col--con"><h3><span aria-hidden="true">−</span> Worth knowing</h3><ul>{s.watchOut.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
          </div>
        </>
      ),
    }] : []),
    ...(learn ? [{
      id: "how", tab: "How it works",
      body: (
        <>
          <BkHead h={learn.title ? lastWord(learn.title) : howHead(finderSys?.label ?? s.label)} />
          <HowItWorks kind={learn.diagram} steps={learn.how} />
        </>
      ),
    }] : []),
    ...(d?.spotlight ? [{
      // The eyebrow ("The part that decides the job") is too long for a tab.
      id: "spotlight", tab: "The detail",
      cls: d.spotlight.layout === "table" ? "bk__boxed bk__col" : undefined,
      body: <Spotlight sp={d.spotlight} />,
    }] : []),
    {
      id: "included", tab: "What you get",
      body: (
        <>
          <BkHead h="What you {get} from us." />
          {s.benefitTiles?.length
            ? <Points items={s.benefitTiles.map((b) => ({ t: b.t, line: b.line, d: b.detail, icon: b.icon }))} />
            : <ul className="pp__hl kx__pts">{s.points.map((p) => <li key={p}><span aria-hidden="true">✓</span>{p}</li>)}</ul>}
        </>
      ),
    },
    ...(s.looks ? [{ id: "looks", tab: "How it looks", cls: "", body: <Feature f={s.looks} /> }] : []),
    ...(finder ? [{
      id: "range", tab: "The options", cls: "bk__boxed bk__col",
      body: (
        <>
          <BkHead h="The options, {side by side}.">Each has its own page: how it works, its pros and cons, which size to choose, the specs and the brand behind it.</BkHead>
          <Options finder={finder} />
        </>
      ),
    }] : d?.pricing?.length ? [{
      id: "prices", tab: "Pricing", cls: "bk__boxed bk__col",
      body: <><PricesHead /><Prices rows={d.pricing} />{d.pricingNote && <p className="svp__note">{d.pricingNote}</p>}</>,
    }] : []),
    ...(steps?.length ? [{
      id: "process", tab: "How it runs", navy: true,
      body: <><BkHead h="From the first call to {done}." /><Steps steps={steps} /></>,
    }] : []),
    ...(s.servicing ? [{ id: "servicing", tab: "Servicing", cls: "", body: <Feature f={s.servicing} flip /> }] : []),
    ...(s.faqs?.length ? [{
      id: "faqs", tab: "FAQs", cls: "pp__two",
      body: <><BkHead h={`About ${label}, {before you book}.`}>Still want a human? <a href="tel:+61359478000" data-call-from="system-faq">Call (03) 5947 8000</a>.</BkHead><Faqs faqs={s.faqs} /></>,
    }] : []),
    {
      id: "next", tab: "Where next",
      body: (
        <>
          <BkHead h="Keep {going}." />
          <Next items={[
            ...(finder ? [{ t: "The options", s: `Every ${label} we install, side by side`, href: `/find/${finder}` }] : []),
            { t: `All ${name.toLowerCase()}`, s: "The other jobs under this service", href: `/services/${slug}` },
            { t: "What customers say", s: "Reviews from real jobs", href: "/reviews" },
          ]} />
        </>
      ),
    },
    { body: <Areas what={s.label} /> },
  ];
  return (
    <BandPage cls="bx">
      <Crumbs trail={[{ name: "Services", href: "/services" }, { name, href: `/services/${slug}` }, { name: s.label }]} />
      <Hero
        eye={`${name} · ${s.label}`} title={title} sub={s.intro ?? s.blurb}
        img={asset(s.photo.src)} imgAlt={s.photo.alt} scene={!!s.photo.scene} ctas={!finder}
        facts={heroSpecs(d?.specs)}
      >
        {finder && (
          <div className="bxh__ctas">
            <Link href={`/find/${finder}`} className="abtn abtn--or abtn--flat">See the options →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="system-hero">Call (03) 5947 8000</a>
          </div>
        )}
      </Hero>
      <Tabs list={bands} />
      <Bands list={bands} />
      <EndCta title={<>Ready to talk about <span>{label}</span>?</>} />
    </BandPage>
  );
}

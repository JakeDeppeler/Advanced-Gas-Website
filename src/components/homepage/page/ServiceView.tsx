import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { ServiceContent } from "@/lib/serviceContent";
import type { SystemDetail, SystemSpotlight } from "@/lib/systemDetail";
import { resolveAsset } from "@/lib/publicAsset";
import { getReviews } from "@/lib/googleReviews";
import { HOME_BRANDS, PHOTO, SHOW_PRICES, TOOLS, findSystem, lowerLabel, systemHref } from "@/lib/homepage/data";
import { LEARN, SYS_INTRO, learnFor } from "@/lib/homepage/learn";
import { SiteModeStrip } from "@/components/Header";
import { HowItWorks } from "../how/HowItWorks";
import { ReasonIcon, type ReasonIconName } from "../brand/ReasonIcon";
import { AreaChips } from "./AreasServed";
import { EndCta } from "./bands";
import { PageHero, CallButton } from "./PageHero";
import "../homepage.css";
import "./service.css";

/**
 * The service pages (/services/<slug>) and their system pages
 * (/services/<slug>/<system>), built from the homepage's own sections
 * (Jake, Nov 2026: "they need to resemble the home page more"), so someone
 * arriving from the homepage stays on the same page family: the photo hero
 * with the quote form, the brand chips, the photo cards, the navy bento,
 * the scrolling reviews, the FAQ block, the tools box and the closing box.
 *
 * Every word, figure and photo is the page's own, from lib/serviceContent
 * and lib/systemDetail; the homepage's classes only lay them out. A part a
 * page has no content for is left out rather than filled in.
 */

/** A /public path that exists, trying other extensions; the path as given if none does. */
const asset = (src: string) => resolveAsset(src) ?? src;

type Row = { tier: string; price: string; includes: string; group?: string; photo?: string; photoScene?: boolean; priceKey?: string };
type Sys = NonNullable<ServiceContent["systems"]>[number];
type Fact = { v: string; k: string };

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

/**
 * The hero photo, full width under the navy scrim as the homepage's team
 * photo is: one of our own jobs, and one the page doesn't show again lower
 * down (the system cards and "how it looks" have the rest). A service not
 * listed uses its content's hero photo.
 */
const HERO_PHOTO: Record<string, { src: string; pos?: string }> = {
  // An installer of ours with a whole house of Kaden systems, ready to go in
  "air-conditioning-installation": { src: "/kaden-team-with-chaz.jpg", pos: "center 62%" },
  // A Reclaim split on its slab among the garden beds, a shot no card uses
  "heat-pump-installation": { src: "/reclaim-split-back-2.jpg", pos: "center 60%" },
  "aircon-servicing-repairs": { src: "/evap-cooler-service.webp", pos: "center 55%" },
  // The homepage's own: the trenching photo would be the obvious one, but the
  // page already shows it (gas-line-safe.webp is the same file) further down.
  "gas-plumbing": { src: PHOTO.team, pos: "center 35%" },
};

/**
 * The bento's big photo tile: the homepage's (an installer with a whole
 * house of systems), unless the page's hero already is that photo, when it
 * takes the team in front of the vans instead.
 */
const bentoPhoto = (hero: string) => (hero === PHOTO.whyBig ? PHOTO.team : PHOTO.whyBig);

/**
 * Which of the hero quote form's services it opens on, by the form's own
 * label. Gas & plumbing spans heating, hot water and gas fitting, so its form
 * starts at the first question, as the homepage's does.
 */
const QUOTE_FOR: Record<string, string> = {
  "air-conditioning-installation": "Cooling",
  "heat-pump-installation": "Hot water",
  "aircon-servicing-repairs": "Cooling",
  "gas-plumbing/gas-ducted": "Heating",
  "gas-plumbing/continuous-flow": "Hot water",
  "gas-plumbing/gas-service": "Gas & plumbing",
  "gas-plumbing/temporary-hot-water": "Hot water",
};

/**
 * Reviews that mention the job lead the scrolling columns, the rest follow,
 * as the category pages pick theirs. A system without its own words uses
 * its service's.
 */
const REVIEW_WORD: Record<string, RegExp> = {
  "air-conditioning-installation": /air ?con|split|ducted|cool|mitsubishi|kaden|evap/i,
  "air-conditioning-installation/split": /split|mitsubishi|kaden/i,
  "air-conditioning-installation/reverse-cycle": /split|reverse|ducted/i,
  "air-conditioning-installation/multi": /split|multi/i,
  "air-conditioning-installation/ducted": /ducted|zon/i,
  "air-conditioning-installation/evap": /evap|cool/i,
  "heat-pump-installation": /heat pump|hot water|reclaim|thermann|istore|veu/i,
  "aircon-servicing-repairs": /servic|repair|clean|follow-up|air ?con|split|ducted/i,
  "gas-plumbing": /gas|heater|hot water|brivis|emergency/i,
  "gas-plumbing/gas-ducted": /ducted|heater|brivis|gas/i,
  "gas-plumbing/continuous-flow": /hot water|gas|thermann/i,
  "gas-plumbing/temporary-hot-water": /hot water|emergency|loaner/i,
};

/** The homepage's calculators that belong with each service, in the order they're most use there. */
const TOOLS_FOR: Record<string, string[]> = {
  "air-conditioning-installation": ["/tools/sizing-calculator", "/tools/running-cost-calculator", "/tools/heating-comparator"],
  "heat-pump-installation": ["/hot-water#size", "/tools/veu-rebate-estimator", "/tools/hot-water-savings"],
  "aircon-servicing-repairs": ["/tools/fault-codes", "/tools/running-cost-calculator", "/tools/sizing-calculator"],
  "gas-plumbing": ["/tools/heating-comparator", "/tools/hot-water-savings", "/hot-water#size"],
};

/** The links under the FAQ heading, as the homepage's "VEU rebate explained · Repair or replace? · Blog". */
const READ_MORE: Record<string, [string, string][]> = {
  "air-conditioning-installation": [["Cooling options", "/cooling"], ["Repair or replace?", "/upgrade-or-repair"], ["Blog & guides", "/blog"]],
  "heat-pump-installation": [["VEU rebate explained", "/rebates"], ["Hot water options", "/hot-water"], ["Blog & guides", "/blog"]],
  "aircon-servicing-repairs": [["Repair or replace?", "/upgrade-or-repair"], ["Fault code lookup", "/tools/fault-codes"], ["Blog & guides", "/blog"]],
  "gas-plumbing": [["Heating options", "/heating"], ["Hot water options", "/hot-water"], ["Blog & guides", "/blog"]],
};

/**
 * Pages that list their jobs without prices. Aircon installation (Jake, Nov
 * 2026: "just keep the system cards"): every job on it is a system in the
 * finder, and the system cards already go to its options.
 */
const NO_PRICE_CARDS = new Set(["air-conditioning-installation"]);

/** What a system card's link says: "install" is wrong for a service or a hire. */
const GO: Record<string, string> = {
  "aircon-servicing-repairs": "What the service covers",
  "gas-plumbing/gas-service": "What the service covers",
  "gas-plumbing/temporary-hot-water": "How the hire works",
};

/**
 * The brand chips under the hero use the homepage's own chip line for each
 * maker, except where this page fits the maker for something else: Brivis
 * is here for its evaporative coolers, Kaden on the gas page for gas ducted.
 */
const CHIP_LINE: Record<string, Record<string, string>> = {
  "air-conditioning-installation": { "/brands/brivis": "Evaporative" },
  "aircon-servicing-repairs": { "/brands/brivis": "Evaporative" },
  "gas-plumbing": { "/brands/kaden": "Gas ducted" },
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
/**
 * For a point with no icon field at all (a system page with a plain list of
 * points, like temporary hot water), a drawing from its words, so a row of
 * them isn't the same tick eight times.
 */
const POINT_WORD: [RegExp, IconKey][] = [
  [/same day|hours?|time to/i, "clock"],
  [/priced|price|waived|by the day/i, "rebate"],
  [/taken away|disconnected/i, "truck"],
  [/whole house|whole home/i, "tank"],
  [/rental|tenant|complian/i, "shield"],
];
const iconFor = (b: { t: string; line?: string; icon?: string }): IconKey =>
  BY_WORD.find(([re]) => re.test(`${b.t} ${b.line ?? ""}`))?.[1]
  ?? FROM_FIELD[b.icon ?? ""]
  ?? (b.icon ? undefined : POINT_WORD.find(([re]) => re.test(b.t))?.[1])
  ?? "check";

/* --------------------------------------------------------------- helpers */

/**
 * A heading with its coloured part in a span, the way the homepage sets
 * them ("Everything we do, <span>under one roof.</span>"): the part in braces
 * where the content marks one, else the part after the last comma, else the
 * last word.
 */
function head(h: string): ReactNode {
  if (h.startsWith("=")) return h.slice(1);
  if (/[{}]/.test(h)) return h.split(/[{}]/).map((p, i) => (i % 2 ? <span key={i}>{p}</span> : p));
  const c = h.lastIndexOf(", ");
  if (c > 0 && c < h.length - 4) return <>{h.slice(0, c + 1)} <span>{h.slice(c + 2)}</span></>;
  const m = h.match(/^(.*\s)(\S+?[.?!]?)$/);
  return m ? <>{m[1]}<span>{m[2]}</span></> : h;
}

/** "A split system", "an evaporative cooler", but "gas ducted heating" with no article. */
const howHead = (label: string) => {
  const l = lowerLabel(label);
  return `How ${/^gas /.test(l) ? "" : /^[aeiou]/.test(l) ? "an " : "a "}${l} {works}.`;
};

/** Short figures first: the hero's trust row and the bento's figure tiles are set large. */
function shortFirst(facts: Fact[]) {
  const short = (x: Fact) => x.v.length <= 18;
  return [...facts.filter(short), ...facts.filter((x) => !short(x))];
}

/* ------------------------------------------------------- page sections */

type Tone = "white" | "cream" | "navy" | "sky";
type Sec = { key: string; tone?: Tone; render: (cls: string) => ReactNode };

/**
 * The page's sections in order, toned the way the homepage's are: navy
 * bento, white reviews, sky-blue FAQ fixed; the rest white and cream in turn.
 * The pages are built from optional parts, so the turn is worked out from the
 * fixed sections up, and two of a tone that still meet run on as one band
 * (no gap between them) rather than leaving a doubled gap.
 */
function Sections({ list, above = "white" }: { list: Sec[]; above?: Tone }) {
  const tones: Tone[] = new Array(list.length);
  let next: Tone = "white"; // the closing box under the last section is white
  for (let i = list.length - 1; i >= 0; i--) {
    tones[i] = list[i].tone ?? (next === "white" ? "cream" : "white");
    next = tones[i];
  }
  return (
    <>
      {list.map((s, i) => {
        const prev = i === 0 ? above : tones[i - 1];
        const join = tones[i] === prev && tones[i] !== "navy";
        return <Fragment key={s.key}>{s.render(`svq svq--${tones[i]}${join ? " svq--join" : ""}`)}</Fragment>;
      })}
    </>
  );
}

/** The homepage's "Authorised installer of" chips, for the makers this page fits. */
function BrandStrip({ chips, label }: { chips: { name: string; line: string; href: string }[]; label: string }) {
  if (!chips.length) return null;
  return (
    <section className="hbrands svb">
      <div className="wrap hbrands__in arv">
        <div className="hbrands__top">
          <span>{label}</span>
          <span className="hbrands__rule" aria-hidden="true" />
          <span className="hbrands__reece">Trade partner of <strong>Reece</strong></span>
          <Link href="/brands" className="hbrands__all">All brands →</Link>
        </div>
        <div className="hbrands__grid" style={{ ["--n" as string]: chips.length }}>
          {chips.map((c) => <Link key={c.href} className="chipb" href={c.href}><strong>{c.name}</strong><span>{c.line}</span></Link>)}
        </div>
      </div>
    </section>
  );
}

/** A maker's chip: the homepage's own name and line for it, where the homepage has one. */
function chip(slug: string, href: string, brand: string) {
  const home = HOME_BRANDS.find(([, , h]) => h === href);
  return { name: home?.[0] ?? brand.replace(/\s*\(.*\)$/, ""), line: CHIP_LINE[slug]?.[href] ?? home?.[1] ?? "", href };
}

/**
 * The kinds of job under a service, as the homepage's "Everything we do"
 * cards: one of our photos, the name, and on hover what it is. The card opens
 * the system's own page; where the finder has the same system, the pill in
 * the corner goes straight to its options.
 */
function SystemCards({ slug, systems }: { slug: string; systems: Sys[] }) {
  return (
    <div className="sg svsg" data-n={systems.length}>
      {systems.map((s, i) => {
        const key = `${slug}/${s.id}`;
        const sys = FINDER_FOR[key] ? findSystem(FINDER_FOR[key])?.sys : undefined;
        const go = GO[key] ?? GO[slug] ?? "How we install it";
        return (
          <article key={s.id} className={`sg__card svsg__card arv${s.photo.scene ? "" : " svsg__card--prod"}`} style={{ animationDelay: `${i * 0.07}s` }}>
            <Image src={asset(s.photo.src)} alt={s.photo.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 700px" />
            <span className="sg__shade" aria-hidden="true" />
            <Link href={`/services/${slug}/${s.id}`} className="svsg__hit"><span className="asr">{s.label}: {go}</span></Link>
            {sys && (
              <Link href={systemHref(sys.slug)} className="svsg__opt">
                {sys.tiers.length === 1 ? "The option" : `The ${sys.tiers.length} options`} →
              </Link>
            )}
            <span className="sg__body" aria-hidden="true">
              {s.brands?.length ? <small className="svsg__tag">{s.brands.join(" · ")}</small> : null}
              <strong>{s.label}</strong>
              <span className="sg__more"><span>{s.blurb}</span><em>{go} →</em></span>
            </span>
          </article>
        );
      })}
    </div>
  );
}

/**
 * What you get, as the homepage's navy bento: our team in the big photo
 * tile, two figures in the orange and white tiles, then a tile per point with
 * its drawing. Figure tiles only fill what the points leave of the last row.
 */
function Why({ cls, items, facts, photo }: { cls: string; items: { t: string; line?: string; d: string; icon?: string }[]; facts: Fact[]; photo: string }) {
  // A figure that only repeats a point's own title ("Three brands") gives way to the point, which says more.
  const own = facts.filter((f) => !items.some((b) => b.t.toLowerCase().startsWith(f.v.toLowerCase())));
  const figs = own.slice(0, (4 - (items.length % 4)) % 4);
  // Whatever the figures leave of the last row, the last point stretches
  // across: worked out for the four-column grid and for the two-column one
  // tablets get (the big photo takes two by two in both). A phone's single
  // column needs neither.
  const n = figs.length + items.length;
  const span4 = 1 + (4 - (n % 4)) % 4, span2 = 1 + (n % 2);
  return (
    <section id="why" className={`awhy ${cls}`}>
      <div className="wrap awhy__in">
        <div className="sechead arv">
          <div className="sechead__t">
            <h2 className="h2" style={{ color: "#fff" }}>What you get <span style={{ color: "#FF7A36" }}>from us.</span></h2>
          </div>
          <div className="sechead__btns">
            <Link href="/about" className="abtn abtn--line">Meet the team</Link>
            <a href="#quote" className="abtn abtn--or">Get a free quote →</a>
          </div>
        </div>
        <div className="whygrid svw">
          <div className="whycard whycard--big arv">
            <Image src={photo} alt="" aria-hidden="true" fill sizes="(max-width: 960px) 100vw, 700px" />
            <div className="shade" aria-hidden="true" />
            <div className="body">
              <span className="whycard__lbl" style={{ color: "#FF7A36" }}>Our own installers</span>
              <strong className="disp svw__bigt">The team who quotes it does the work.</strong>
              <span className="svw__bigs">The person who quotes your job is on the same team as the person who installs it.</span>
            </div>
          </div>
          {figs.map((f, i) => (
            <div key={f.k} className={`whycard ${i === 0 ? "whycard--or" : "whycard--sky"} arv`}>
              <strong className={`whycard__big${f.v.length > 8 ? " svw__fig--long" : ""}`}>{f.v}</strong>
              <span className="svw__figk">{f.k}</span>
            </div>
          ))}
          {items.map((b, i) => (
            <div key={b.t} className={`whycard whycard--white svw__item arv${i === items.length - 1 ? " svw__last" : ""}`}
              style={i === items.length - 1 ? { ["--s4" as string]: span4, ["--s2" as string]: span2 } : undefined}>
              <span className="whycard__ico svw__ico"><Icon name={iconFor(b)} /></span>
              <div className="svw__t">
                <strong className="whycard__t">{b.t}</strong>
                {b.line && <span className="svw__line">{b.line}</span>}
                {b.d && <span className="whycard__s">{b.d}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A section's head, as the homepage's: the heading, and a line beside it. */
function SecHead({ h, p, dark = false }: { h: string; p?: ReactNode; dark?: boolean }) {
  return (
    <div className={`svcs__head svhd${dark ? " svhd--dark" : ""} arv`}>
      <div className="sechead__t"><h2 className="h2">{head(h)}</h2></div>
      {p && <p>{p}</p>}
    </div>
  );
}

/** A photo one side, words and figures the other: "how it looks" and "keeping it working". */
function Feature({ cls, id, f, flip = false }: { cls: string; id: string; f: { heading: string; note?: string; body?: string; photo: string; photoAlt: string; photoScene?: boolean; facts: Fact[] }; flip?: boolean }) {
  return (
    <section id={id} className={cls}>
      <div className={`wrap svft${flip ? " svft--flip" : ""}`}>
        {/* A product shot on white (photoScene unset) is shown whole on white, not cropped like a photo */}
        <div className={`svft__img${f.photoScene ? "" : " svft__img--prod"} arv`}><Image src={asset(f.photo)} alt={f.photoAlt} fill sizes="(max-width: 960px) 100vw, 680px" /></div>
        <div className="svft__t arv">
          <h2 className="h2">{head(f.heading)}</h2>
          <p>{f.note ?? f.body}</p>
          <dl className="svft__facts">{f.facts.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}</dl>
        </div>
      </div>
    </section>
  );
}

/** Two lists side by side, the first in navy: what's in the job and what isn't, or who a system suits. */
function TwoLists({ cls, id, h, p, a, b }: { cls: string; id: string; h: string; p?: string; a: { t: string; list: string[] }; b: { t: string; list: string[] } }) {
  return (
    <section id={id} className={cls}>
      <div className="wrap svq__in">
        <SecHead h={h} p={p} />
        <div className="svin">
          {a.list.length > 0 && <div className="svin__col svin__col--in arv"><h3><span aria-hidden="true">+</span> {a.t}</h3><ul>{a.list.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {b.list.length > 0 && <div className="svin__col svin__col--out arv"><h3><span aria-hidden="true">−</span> {b.t}</h3><ul>{b.list.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        </div>
      </div>
    </section>
  );
}

/** The homepage's navy box (Find your system, Tools for you), for the steps, the prices and the options. */
function NavyBox({ cls, id, h, p, aside, children }: { cls: string; id: string; h: string; p?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={cls}>
      <div className="wrap">
        <div className="htools-box svbox">
          <div className="sechead arv">
            <div className="sechead__t">
              <h2 className="h2">{head(h)}</h2>
              {p && <p className="htools-sec__p">{p}</p>}
            </div>
            {aside}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

/** How the job runs, a numbered card per step. */
function Steps({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <ol className="tgrid svst">
      {steps.map((s, i) => (
        <li key={s.title} className="tcard svst__card arv">
          <b aria-hidden="true">{i + 1}</b>
          <strong>{s.title}</strong>
          <span>{s.detail}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Price cards, grouped under their trade so a page covering three trades
 * still reads as three lists, each job with its own photo.
 *
 * With SHOW_PRICES off the figure is gone and said once in the heading
 * ("fixed, in writing") rather than on every card; what each job includes
 * stays, because that is still worth reading.
 */
function Prices({ rows }: { rows: Row[] }) {
  const groups = [...new Set(rows.map((r) => r.group ?? ""))].map((g) => ({ g, list: rows.filter((r) => (r.group ?? "") === g) }));
  return (
    <div className={`svp svp--${Math.min(groups.length, 4)}`}>
      {groups.map(({ g, list }) => (
        <article key={g} className="svp__card arv">
          <h3 className="svp__head">{g || "The jobs"}</h3>
          <ul className="svp__rows">
            {list.map((r) => (
              <li key={r.tier}>
                {r.photo ? (
                  <span className={`svp__img${r.photoScene ? " svp__img--scene" : ""}`}><Image src={asset(r.photo)} alt="" fill sizes="88px" /></span>
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
        </article>
      ))}
    </div>
  );
}

const PRICE_HEAD = SHOW_PRICES
  ? { h: "What it {costs}.", p: "Every price includes GST. Your exact price is confirmed in writing after a free site check." }
  : { h: "What each job {covers}.", p: "Every job is priced after a free site check, on a fixed written quote including GST. It only changes if the job does, and we tell you before it does." };

/** Our own jobs, as photo tiles with their captions. */
function Installs({ cls, h, p, shots }: { cls: string; h: string; p: string; shots: { src: string; alt: string; caption?: string }[] }) {
  return (
    <section id="installs" className={cls}>
      <div className="wrap svq__in">
        <SecHead h={h} p={p} />
        <div className="svgl">
          {shots.map((s, i) => (
            <figure key={s.src} className="svgl__ph arv" style={{ animationDelay: `${(i % 3) * 0.07}s` }}>
              <Image src={asset(s.src)} alt={s.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 470px" />
              {s.caption && <figcaption>{s.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The homepage's scrolling review columns, the ones that mention this job first. */
async function Reviews({ cls, word }: { cls: string; word?: RegExp }) {
  const { reviews, summary } = await getReviews(12);
  const named = word ? reviews.filter((r) => word.test(`${r.txt} ${r.what} ${r.title}`)) : [];
  const list = [...named, ...reviews.filter((r) => !named.includes(r))];
  const cols = [0, 1, 2].map((c) => list.filter((_, i) => i % 3 === c));
  return (
    <section id="reviews" className={`revs ${cls}`}>
      <div className="wrap revs__in">
        <div className="sechead arv" style={{ gap: 24 }}>
          <div className="sechead__t" style={{ gap: 14, maxWidth: 620 }}>
            <h2 className="h2">Reviews from real Pakenham, Berwick &amp; Officer households.</h2>
          </div>
          <div className="revs__score">
            <span className="stars stars--ink" style={{ letterSpacing: 4 }} aria-hidden="true">★★★★★</span>
            <span><strong>{summary.value.toFixed(1)} / 5</strong> from {summary.count} Google reviews</span>
            <Link href="/reviews">Read all reviews →</Link>
          </div>
        </div>
        <div className="revs__cols">
          {cols.map((col, c) => (
            <div key={c} className="arevcol">
              {/* Doubled so the upward scroll loops without a seam. The copy is hidden from screen readers. */}
              <div className={`revtrack revtrack--${c}`}>
                {[...col, ...col].map((r, i) => (
                  <article key={i} className="rev" aria-hidden={i >= col.length ? true : undefined}>
                    <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                    <h3>{r.title}</h3>
                    <p>&ldquo;{r.txt}&rdquo;</p>
                    <div className="rev__who">
                      <span aria-hidden="true">{r.a}</span>
                      <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
          <div className="revs__fade revs__fade--t" aria-hidden="true" />
          <div className="revs__fade revs__fade--b" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

/** The homepage's FAQ block: the heading and a way to a person on the left, the questions on the right. */
function Faq({ cls, h, faqs, links, from }: { cls: string; h: string; faqs: { q: string; a: string }[]; links: [string, string][]; from: string }) {
  return (
    <section id="faq" className={`hfaq ${cls}`}>
      <div className="wrap hfaq__in">
        <div className="hfaq__intro arv">
          <h2 className="h2">{head(h)}</h2>
          <p>Quick honest answers. Still want a human? <a href="tel:+61359478000" data-call-from={from} style={{ color: "#050A30", textUnderlineOffset: 2 }}>Call (03) 5947 8000</a>.</p>
          {links.length > 0 && <div className="hfaq__links">{links.map(([t, href]) => <Link key={href} className="glink" href={href}>{t}</Link>)}</div>}
        </div>
        <div className="afaqs">
          {faqs.map((f, i) => (
            <details key={f.q} className="afaq" open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Link cards in the homepage's tools box. */
function Cards({ items }: { items: { t: string; s: string; href: string; cta?: string }[] }) {
  return (
    <div className="tgrid">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className="tcard arv">
          <strong>{t.t}</strong>
          <span>{t.s}</span>
          <em>{t.cta ?? "Open"} →</em>
        </Link>
      ))}
    </div>
  );
}

const toolsFor = (slug: string) => (TOOLS_FOR[slug] ?? []).map((h) => TOOLS.find((t) => t.href === h)).filter((t): t is (typeof TOOLS)[number] => !!t);

/** The suburbs nearest the workshop, each linked to its page. */
function Areas({ cls, what }: { cls: string; what: string }) {
  return (
    <section id="areas" className={cls}>
      <div className="wrap svq__in svar">
        <SecHead
          h={`${what.charAt(0)}${what.slice(1).toLowerCase()} in Pakenham and {the suburbs around it.}`}
          p="Our own crews, out of the Sierra Circuit workshop in Pakenham, cover everywhere within 50 km. These are the suburbs nearest it; each page has the drive time and the jobs we usually do there."
        />
        <AreaChips />
      </div>
    </section>
  );
}

/** The how-it-works drawing, under its heading. */
function How({ cls, h, p, kind, steps, note }: { cls: string; h: string; p?: string; kind: Parameters<typeof HowItWorks>[0]["kind"]; steps: Parameters<typeof HowItWorks>[0]["steps"]; note?: string }) {
  return (
    <section id="how" className={cls}>
      <div className="wrap svq__in">
        <SecHead h={h} p={p} />
        <HowItWorks kind={kind} steps={steps} />
        {note && <p className="svnote">{note}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ the pages */

/** A service: what we do, the kinds of job under it, what we bring to it, how it runs. */
export function ServiceView({ slug, name, c, choose }: { slug: string; name: string; c: ServiceContent; choose?: { h2: string; lede: string } }) {
  const systems = c.systems ?? [];
  const howSlug = SERVICE_HOW[slug];
  const how = howSlug ? LEARN[howSlug] : undefined;
  const facts = shortFirst(c.heroFacts ?? []);
  const hero = HERO_PHOTO[slug] ?? { src: c.heroPhoto ?? PHOTO.team };
  const prices = NO_PRICE_CARDS.has(slug) ? [] : c.pricing;
  const tools = toolsFor(slug);
  // The install gallery leaves out the photos the page already shows (the
  // system cards, how it looks, servicing), so no job appears twice; three
  // or more to a row, or none.
  const shown = new Set([hero.src, ...systems.map((x) => x.photo.src), c.looks?.photo, c.servicing?.photo].filter(Boolean));
  const fresh = (c.installPhotos?.shots ?? []).filter((x) => !shown.has(x.src));
  const shots = fresh.length >= 3 ? fresh.slice(0, fresh.length - (fresh.length % 3)) : [];
  const i = c.h1.lastIndexOf(", ");
  // The part after the last comma is the coloured second line ("…installation, / Pakenham & SE Melbourne").
  const title = i < 0 ? c.h1 : `${c.h1.slice(0, i + 1)} {${c.h1.slice(i + 2)}}`;

  const list: Sec[] = [
    ...(systems.length ? [{
      key: "systems", tone: "cream" as Tone,
      render: (cls: string) => (
        <section id="systems" className={cls}>
          <div className="wrap svq__in">
            <SecHead h={choose?.h2 ?? "Start with the one that {brought you here}."} p={choose?.lede} />
            <SystemCards slug={slug} systems={systems} />
          </div>
        </section>
      ),
    }] : []),
    ...(how ? [{
      key: "how",
      render: (cls: string) => (
        <How cls={cls} h={c.whyFirst?.heading ?? howHead(findSystem(howSlug)?.sys.label ?? name)} p={c.whyFirst?.blurb}
          kind={how.diagram} steps={how.how} note={c.whyFirst?.caveat} />
      ),
    }] : []),
    { key: "why", tone: "navy", render: (cls) => <Why cls={cls} items={c.benefits} facts={facts.slice(2)} photo={bentoPhoto(hero.src)} /> },
    ...(shots.length ? [{
      key: "installs",
      render: (cls: string) => <Installs cls={cls} h={c.installPhotos!.heading} p={c.installPhotos!.blurb} shots={shots} />,
    }] : []),
    ...(c.looks ? [{ key: "looks", render: (cls: string) => <Feature cls={cls} id="looks" f={c.looks!} /> }] : []),
    ...(prices.length ? [{
      key: "prices",
      render: (cls: string) => <NavyBox cls={cls} id="prices" h={PRICE_HEAD.h} p={PRICE_HEAD.p}><Prices rows={prices} /></NavyBox>,
    }] : []),
    ...(c.included?.length || c.excluded?.length ? [{
      key: "in-price",
      render: (cls: string) => (
        <TwoLists cls={cls} id="in-price" h="What's in the job, {and what isn't.}" p="One fixed price in writing. It only changes if the job does, and we tell you before it does."
          a={{ t: "Included", list: c.included ?? [] }} b={{ t: "Not included", list: c.excluded ?? [] }} />
      ),
    }] : []),
    ...(c.steps?.length ? [{
      key: "process",
      render: (cls: string) => <NavyBox cls={cls} id="process" h="From the first call {to done.}" aside={<a href="#quote" className="abtn abtn--or">Get a free quote →</a>}><Steps steps={c.steps!} /></NavyBox>,
    }] : []),
    ...(c.servicing ? [{ key: "servicing", render: (cls: string) => <Feature cls={cls} id="servicing" f={c.servicing!} flip /> }] : []),
    { key: "reviews", tone: "white", render: (cls) => <Reviews cls={cls} word={REVIEW_WORD[slug]} /> },
    ...(c.faqs.length ? [{ key: "faq", tone: "sky" as Tone, render: (cls: string) => <Faq cls={cls} h="Before you {book.}" faqs={c.faqs} links={READ_MORE[slug] ?? []} from="service-faq" /> }] : []),
    ...(tools.length ? [{
      key: "tools", tone: "white" as Tone,
      render: (cls: string) => (
        <NavyBox cls={cls} id="tools" h="=Tools for you" p="Free calculators to work out what you need and what it costs to run, before you ring anyone."
          aside={<Link href="/tools" className="htools-sec__all">All tools →</Link>}>
          <Cards items={tools} />
        </NavyBox>
      ),
    }] : []),
    { key: "areas", tone: "cream", render: (cls) => <Areas cls={cls} what={name} /> },
  ];

  return (
    <>
    {/* The home page's floating header over the photo, as the suburb pages have
        it (ChromeGate's ownHeader drops the site's flat one here). */}
    <SiteModeStrip tabs={false} />
    <div className="ag svpg" data-no-reveal>
      <PageHero
        crumbs={[{ name: "Services", href: "/services" }, { name }]}
        eye={name} title={title} sub={c.intro} photo={asset(hero.src)} pos={hero.pos}
        from="service-hero" trust={facts.slice(0, 2)} quote={QUOTE_FOR[slug]}
      />
      <BrandStrip label="The brands we fit" chips={(c.brandPods ?? []).filter((p) => p.href).map((p) => chip(slug, p.href!, p.brand))} />
      <Sections list={list} />
      <EndCta title={<>Ready to talk about <span>{name.toLowerCase()}</span>?</>} />
    </div>
    </>
  );
}

/**
 * The thing that sets one system apart from its siblings (lib/systemDetail
 * spotlight), in the layout its argument wants: numbered cards, a photo
 * beside a list, two columns side by side, or steps in order.
 */
function Spotlight({ sp }: { sp: SystemSpotlight }) {
  if (sp.layout === "table" && sp.columns) {
    return (
      <div className="svs__tblwrap arv">
        <table className="svs__tbl">
          <thead><tr><th scope="col"><span className="asr">What</span></th><th scope="col">{sp.columns[0]}</th><th scope="col">{sp.columns[1]}</th></tr></thead>
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
    );
  }
  if (sp.layout === "split" && sp.photo) {
    return (
      <div className="svs__split">
        <span className="svs__img arv"><Image src={asset(sp.photo.src)} alt={sp.photo.alt} fill sizes="(max-width: 960px) 90vw, 520px" /></span>
        <ol className="svs__list">{sp.items.map((x) => <li key={x.t} className="arv"><h3>{x.t}</h3><p>{x.d}</p></li>)}</ol>
      </div>
    );
  }
  return (
    <ol className={sp.layout === "steps" ? "svs__steps" : `svs__cards${sp.items.length % 4 === 0 ? " svs__cards--4" : ""}`}>
      {sp.items.map((x) => <li key={x.t} className="arv"><h3>{x.t}</h3><p>{x.d}</p></li>)}
    </ol>
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
    <Link href={systemHref(sys.slug)} className="svo arv">
      <span className="svo__img">
        {tiers.slice(0, 4).map((t) => <span key={t.slug}><Image src={t.img} alt="" fill sizes="(max-width: 960px) 40vw, 200px" /></span>)}
      </span>
      <span className="svo__txt">
        <small>{sys.sub}</small>
        <strong>{sys.label}</strong>
        <span className="svo__intro">{SYS_INTRO[sys.slug] ?? ""}</span>
        <span className="svo__meta"><b>{one ? "One option" : `${sys.tiers.length} options`}</b> · {brands.join(", ")}</span>
        <span className="svo__go">{one ? `See the ${sys.label}` : `See the ${sys.tiers.length} options`} <i aria-hidden="true">→</i></span>
      </span>
    </Link>
  );
}

/** One system under a service: who it suits, how it works, what sets it apart, how we fit it. */
export function SystemView({ slug, name, s, d, finder }: { slug: string; name: string; s: Sys; d?: SystemDetail; finder?: string }) {
  const key = `${slug}/${s.id}`;
  const label = s.label.toLowerCase();
  const learn = finder ? learnFor(finder, HOW_TIER[key] ?? "") : undefined;
  const finderSys = finder ? findSystem(finder)?.sys : undefined;
  const specs = shortFirst((d?.specs ?? []).map((x) => ({ v: x.value, k: x.label })));
  const parent = HERO_PHOTO[slug];
  // A product shot on white can't stand under the scrim; those pages use their service's photo.
  const photo = s.photo.scene ? { src: s.photo.src, pos: "center 50%" } : parent ?? { src: PHOTO.team };
  const title = s.h1 ? `${s.h1.lead} {${s.h1.accent}}` : s.label;
  const items = s.benefitTiles?.length
    ? s.benefitTiles.map((b) => ({ t: b.t, line: b.line, d: b.detail, icon: b.icon }))
    : s.points.map((p) => ({ t: p, d: "" }));
  const brands = (s.brands ?? [])
    .map((b) => HOME_BRANDS.find(([n]) => b.toLowerCase().startsWith(n.toLowerCase())))
    .filter((b): b is [string, string, string] => !!b)
    .map(([n, line, href]) => ({ name: n, line: CHIP_LINE[slug]?.[href] ?? line, href }));
  const parentTools = toolsFor(slug);
  const next = [
    ...(finder ? [{ t: "The options", s: `Every ${label} we install, side by side`, href: `/find/${finder}`, cta: "See them" }] : []),
    { t: `All ${name.toLowerCase()}`, s: "The other jobs under this service", href: `/services/${slug}`, cta: "Have a look" },
    { t: "What customers say", s: "Reviews from real jobs", href: "/reviews", cta: "Read them" },
    ...parentTools,
  ].slice(0, 6);

  const list: Sec[] = [
    ...(s.bestFor?.length || s.watchOut?.length ? [{
      key: "fit",
      render: (cls: string) => <TwoLists cls={cls} id="fit" h="Who it {suits.}" a={{ t: "A good fit if", list: s.bestFor ?? [] }} b={{ t: "Worth knowing", list: s.watchOut ?? [] }} />,
    }] : []),
    ...(learn ? [{
      key: "how",
      render: (cls: string) => <How cls={cls} h={learn.title ?? howHead(finderSys?.label ?? s.label)} kind={learn.diagram} steps={learn.how} />,
    }] : []),
    ...(d?.spotlight ? [{
      key: "spotlight",
      render: (cls: string) => d.spotlight!.layout === "table"
        ? <NavyBox cls={cls} id="detail" h={d.spotlight!.heading} p={d.spotlight!.blurb}><Spotlight sp={d.spotlight!} />{d.spotlight!.note && <p className="svnote svnote--dark">{d.spotlight!.note}</p>}</NavyBox>
        : (
          <section id="detail" className={cls}>
            <div className="wrap svq__in">
              <SecHead h={d.spotlight!.heading} p={d.spotlight!.blurb} />
              <Spotlight sp={d.spotlight!} />
              {d.spotlight!.note && <p className="svnote">{d.spotlight!.note}</p>}
            </div>
          </section>
        ),
    }] : []),
    { key: "why", tone: "navy", render: (cls) => <Why cls={cls} items={items} facts={specs.slice(2)} photo={bentoPhoto(photo.src)} /> },
    ...(s.looks ? [{ key: "looks", render: (cls: string) => <Feature cls={cls} id="looks" f={s.looks!} /> }] : []),
    ...(finder ? [{
      key: "options",
      render: (cls: string) => (
        <NavyBox cls={cls} id="options" h="The options, {side by side.}" p="Each has its own page: how it works, its pros and cons, which size to choose, the specs and the brand behind it.">
          <Options finder={finder} />
        </NavyBox>
      ),
    }] : d?.pricing?.length ? [{
      key: "prices",
      render: (cls: string) => (
        <NavyBox cls={cls} id="prices" h={PRICE_HEAD.h} p={PRICE_HEAD.p}>
          <Prices rows={d.pricing!} />
          {d.pricingNote && <p className="svnote svnote--dark">{d.pricingNote}</p>}
        </NavyBox>
      ),
    }] : []),
    ...(d?.steps?.length ? [{
      key: "process",
      render: (cls: string) => <NavyBox cls={cls} id="process" h="From the first call {to done.}" aside={<a href="#quote" className="abtn abtn--or">Get a free quote →</a>}><Steps steps={d.steps!} /></NavyBox>,
    }] : []),
    ...(s.servicing ? [{ key: "servicing", render: (cls: string) => <Feature cls={cls} id="servicing" f={s.servicing!} flip /> }] : []),
    { key: "reviews", tone: "white", render: (cls) => <Reviews cls={cls} word={REVIEW_WORD[key] ?? REVIEW_WORD[slug]} /> },
    ...(s.faqs?.length ? [{ key: "faq", tone: "sky" as Tone, render: (cls: string) => <Faq cls={cls} h={`About ${label}, {before you book.}`} faqs={s.faqs!} links={READ_MORE[slug] ?? []} from="system-faq" /> }] : []),
    {
      key: "next", tone: "white",
      render: (cls) => (
        <NavyBox cls={cls} id="next" h="=Keep going" p="The options, the rest of the service, what customers say, and the calculators that go with it.">
          <Cards items={next} />
        </NavyBox>
      ),
    },
    { key: "areas", tone: "cream", render: (cls) => <Areas cls={cls} what={s.label} /> },
  ];

  return (
    <>
    {/* The home page's floating header over the photo, as the suburb pages have
        it (ChromeGate's ownHeader drops the site's flat one here). */}
    <SiteModeStrip tabs={false} />
    <div className="ag svpg" data-no-reveal>
      <PageHero
        crumbs={[{ name: "Services", href: "/services" }, { name, href: `/services/${slug}` }, { name: s.label }]}
        eye={`${name} · ${s.label}`} title={title} sub={s.intro ?? s.blurb} photo={asset(photo.src)} pos={photo.pos}
        ctas={finder ? <><Link href={`/find/${finder}`} className="abtn abtn--or">See the options →</Link><CallButton from="system-hero" /></> : undefined}
        from="system-hero" trust={specs.slice(0, 2)} quote={QUOTE_FOR[key] ?? QUOTE_FOR[slug]}
      />
      <BrandStrip label="The brands we fit" chips={brands} />
      <Sections list={list} above={brands.length ? "white" : "navy"} />
      <EndCta title={<>Ready to talk about <span>{label}</span>?</>} />
    </div>
    </>
  );
}

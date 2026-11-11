"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  findSystem, galleryFor, specRows, answersFrom, answersQuery, bookHref,
  isHeatPump, isNewBuildHeatPump, SPEC_NOTE, SIZE_NOTE, WORKMANSHIP, FINANCE_MONTHS,
  modelForAnswer, roomFor, installTime as installTimeOf, PHOTO, type Answers,
} from "@/lib/homepage/data";
import type { PV, Feature } from "./product/parts";
import { ProductLayout } from "./product/layout";
import { learnFor, BOOKING_STEPS } from "@/lib/homepage/learn";
import type { Review } from "@/lib/reviews";
import type { Badge } from "@/lib/homepage/badges";
import type { Doc } from "@/lib/homepage/docs";

/** A catalogue model behind this option, resolved on the server from lib/brands.ts. */
export type PModel = {
  slug: string; chip: string; name: string; code: string; bestFor?: string; room?: string; href: string;
  specs: { label: string; value: string }[];
  /** Our own two lines on this size, from the catalogue's ourTake. */
  take?: string;
  /** Only the badges this model's record actually states. */
  badges: Badge[];
  /** The figures that change between sizes, for the Model card. */
  keys: { label: string; value: string }[];
  /** The catalogue's own feature and "why we install" lists, where it has them. */
  features?: string[];
  why?: string[];
  /** On the VEU product register, as the catalogue record states it. Absent means unknown, not "no". */
  veu?: boolean;
};
export type PBrand = {
  name: string; page?: string; site?: { label: string; href: string };
  /** For the brand section: a few lines about who makes it, from lib/brands.ts. */
  tagline?: string; sub?: string; origin?: string; photo?: string; photoAlt?: string; photoScene?: boolean;
  features?: string[]; facts?: { v: string; k: string }[];
  /** The brand's warranty line from lib/brands.ts, for the Resources section. */
  warranty?: string;
  /** The brand page's accent, so the product page's bands match it. */
  accent?: string; accentLight?: string;
  /** Product shots of the brand's own kit, for the Key features cards. */
  gallery?: { src: string; alt: string }[];
};

/**
 * One option from the finder, as a page of its own so it can be shared and
 * indexed. The answers ride along in the query string (?size=1&floor=0…);
 * the page renders without them too, for anyone who lands here from search.
 */
export function ProductView({ system, tier: tierSlug, reviews, rating, count, models, brand, tierBadges, docs, preview }: {
  system: string; tier: string; reviews: Review[]; rating: string; count: number; models: PModel[]; brand: PBrand | null;
  /** Badges the option states itself (Wi-Fi in its feature list), for options with no catalogue model. */
  tierBadges: Badge[];
  /** PDFs we host for this option (lib/homepage/docs.ts). */
  docs: Doc[];
  preview: boolean;
}) {
  const ref = findSystem(system)!;
  const { cat, sys } = ref;
  const ti = sys.tiers.findIndex((t) => t.slug === tierSlug);
  const t = sys.tiers[ti];

  const [ans, setAns] = useState<Answers>({});
  // The model they picked here, or arrived with in ?model=. Until then the
  // size they gave in the finder chooses one.
  const [picked, setPicked] = useState<string | null>(null);
  const [term, setTerm] = useState(FINANCE_MONTHS);
  // The bottom "Book this install" bar waits until the hero, which has its
  // own book card, is off the screen; on top of the hero it covered it.
  const heroRef = useRef<HTMLElement>(null);
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setPastHero(true); return; }
    const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Changing the size keeps the URL in step, so a shared link shows what they saw.
  function syncUrl(a: Answers, model: string | null) {
    const qs = answersQuery(sys, a);
    const q = [qs, model ? `model=${model}` : ""].filter(Boolean).join("&");
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }
  function setSize(i: number) {
    const next = { ...ans, size: i };
    setAns(next);
    syncUrl(next, picked);
  }
  function pickModel(slug: string) {
    setPicked(slug);
    syncUrl(ans, slug);
  }

  const gal = galleryFor(sys, t);
  const size = ans.size != null ? sys.sizes[ans.size] : null;
  const feats = t.feats.filter((f) => f !== WORKMANSHIP);

  const mi = Math.max(0, picked ? models.findIndex((m) => m.slug === picked) : modelForAnswer(models, size?.spec));
  const model = models[mi] ?? null;

  // An option line quoting a noise figure is about one size (the smallest);
  // where the page offers sizes, it would sit under a 7.1 kW claiming the
  // 2.5 kW's figure. The model's own spec table carries its real number.
  const optionLines = feats.filter((f) => !(models.length && /dBA/.test(f)));
  const included = [...optionLines, "Free site check and a fixed price in writing", "Installed by our own crew", "Compliance certificate emailed within 24 hours", "6 years on our workmanship"];

  // Which of the system's sizes is showing: the one picked, or the one
  // nearest the chosen model (a 6.0 kW model has no size row of its own).
  const nums = (x?: string) => (x?.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  const unit = (x?: string) => x?.match(/kW|L\/min|m²|L\b|heads?/)?.[0].replace(/s$/, "");
  const sizeOfChip = (chip: string): number | null => {
    const want = nums(chip)[0];
    if (want == null) return null;
    // A 16 kW button against "Up to 150 m²" isn't a match: comparing the
    // bare numbers labelled every ducted size "Usually 3 bedrooms".
    const u = unit(chip), su = unit(sys.sizes[0]?.spec);
    if (u && su && u !== su) return null;
    let best: number | null = null, gap = Infinity;
    sys.sizes.forEach((z, i) => nums(z.spec).forEach((n) => { if (Math.abs(n - want) < gap) { gap = Math.abs(n - want); best = i; } }));
    return best;
  };
  const roomIdx = model ? sizeOfChip(model.chip) : ans.size ?? null;

  const feat = keyFeatures(model, optionLines);
  const ducted = /ducted|zoning/.test(sys.slug);
  const v: PV = {
    cat, sys, t, ti, models, model, mi, size, ans,
    known: typeof t.price === "number", hp: isHeatPump(sys), newBuildHp: isNewBuildHeatPump(sys, ans),
    badges: model ? model.badges : tierBadges,
    // The figures beside the size buttons: the model's own, or the size they picked.
    modelKeys: model ? model.keys : size ? [{ label: "Typical size", value: size.spec ?? size.label }] : [],
    gal, room: roomFor(sys, t, roomIdx), roomIdx,
    roomOf: (chip) => { const i = sizeOfChip(chip); return i == null ? null : sys.sizes[i].sub ?? null; },
    book: bookHref(sys, t, ans, model?.slug),
    others: sys.tiers.map((x, i) => [x, i] as const).filter(([, i]) => i !== ti),
    learn: learnFor(sys.slug, t.slug), steps: BOOKING_STEPS(installTimeOf(sys)),
    optionLines,
    // The features have their own section now, so this list is the why (unless
    // the features had to borrow it), or what's included.
    whyTitle: model?.why?.length && feat.src !== "why" ? "Why we install it" : "What's included",
    whyLines: model?.why?.length && feat.src !== "why" ? model.why : included,
    features: featurePhotos(feat.items, { src: t.img, alt: `${t.brand} ${t.model}` }, 
      // The split pages' gallery has a ducted condenser in it; on a feature card it reads as this unit's.
      gal.filter((x) => ducted || !/ducted/i.test(x.src)).map((x) => ({ src: x.src, alt: x.alt, cover: x.kind === "c" })),
      // Another unit's outdoor half means nothing on an evaporative or gas page, and the brand's ducted kit nothing on a split's.
      /evaporative|gas/.test(sys.slug) ? [] : (brand?.gallery ?? []).filter((x) => (ducted || !/ducted/i.test(`${x.src} ${x.alt}`)) && (sys.slug === "multi-head" || !/multi/i.test(`${x.src} ${x.alt}`)))),
    docs, preview,
    take: model?.take ?? `${sys.sub}. ${optionLines.join(". ")}.`,
    // Figures only: the band sets each one large on a single line, so a value
    // written as a sentence ("16 kW · 18 kW · 20 kW (three larger model steps)")
    // runs into its neighbours. Those stay in the spec table.
    glance: model ? model.specs.filter((x) => !/warranty|refrigerant/i.test(x.label) && x.value.length <= 18).slice(0, 4) : [],
    pickModel, setSize, term, setTerm,
    applyAnswers: (a) => {
      const next = { ...ans, ...a };
      setAns(next);
      // A size from the form picks the model, the same way the finder's answer does.
      if (a.size != null) setPicked(null);
      syncUrl(next, a.size != null ? null : picked);
    },
    // A heat-load check is an aircon and heating thing; hot water is sized off the household.
    sizeNote: cat.id === "hw" ? "A rough guide only. We confirm the right size at the free site check." : SIZE_NOTE,
    specRows: model ? modelRows(model, cat.label, sys.label, installTimeOf(sys), size ? size.label + (size.spec ? ` (${size.spec})` : "") : null) : specRows(cat, sys, t, ans),
    specNote: model ? `${t.brand}'s published figures for the ${model.code}. The full spec sheet and manuals come with your written quote.` : SPEC_NOTE,
    reviews, rating, count, brand, heroRef, pastHero,
  };


  return (
    <div className="pp px" id="product">
      <Suspense fallback={null}>
        <AnswersFromUrl system={system} onAnswers={(a, m) => { setAns(a); if (m && models.some((x) => x.slug === m)) setPicked(m); }} />
      </Suspense>
      <ProductLayout v={v} />
    </div>
  );
}

function AnswersFromUrl({ system, onAnswers }: { system: string; onAnswers: (a: Answers, model: string | null) => void }) {
  const params = useSearchParams();
  const key = params.toString();
  useEffect(() => {
    const ref = findSystem(system);
    if (ref) onAnswers(answersFrom(ref.sys, (k) => params.get(k)), params.get("model"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, system]);
  return null;
}

/** The model's own published specs, then the rows that are about the install rather than the box. */
function modelRows(m: PModel, catLabel: string, sysLabel: string, install: string, yourSize: string | null) {
  const rows = [{ k: "Model", v: m.code }, ...m.specs.map((x) => ({ k: x.label, v: x.value }))];
  const has = (re: RegExp) => rows.some((r) => re.test(r.k));
  rows.push({ k: "System", v: `${catLabel} · ${sysLabel}` });
  if (yourSize) rows.push({ k: "Your answer", v: yourSize });
  rows.push({ k: "Install time", v: install });
  if (!has(/warranty/i)) rows.push({ k: "Warranty", v: "Manufacturer warranty on your quote + 6 years on our workmanship" });
  rows.push({ k: "Compliance certificate", v: "Emailed within 24 hours of install" });
  return rows;
}

/** "Low-profile cabinet, about 30% lower than the Contour" → a title, and the rest as its line. */
function splitFeature(f: string): Feature {
  const m = f.match(/^(.{6,60}?)(?::\s+|\s+[–—-]\s+|,\s+)(.+)$/);
  return m ? { h: m[1], p: m[2].charAt(0).toUpperCase() + m[2].slice(1) } : { h: f };
}

/**
 * The Key features cards. The catalogue's own feature list where it has
 * three or more, then its "why we install it", then cards written from the
 * model's published specs, so a model with no feature list (the MSZ-AP
 * range) still says only what its record states.
 */
function keyFeatures(m: PModel | null, optionLines: string[]): { src: "features" | "why" | "specs" | "option"; items: Feature[] } {
  if (m?.features && m.features.length >= 3) return { src: "features", items: m.features.map(splitFeature) };
  if (m?.why && m.why.length >= 3) return { src: "why", items: m.why.map(splitFeature) };
  if (m) {
    const get = (re: RegExp) => m.specs.find((x) => re.test(x.label))?.value;
    const items: Feature[] = [];
    const cool = get(/^cooling capacity/i), heat = get(/^heating capacity/i);
    if (cool && heat) items.push({ v: cool, h: `Cooling, ${heat} heating`, p: m.room ? `Sized for rooms ${m.room}.` : undefined });
    const quiet = get(/sound|noise/i);
    if (quiet) items.push({ v: quiet, h: "On its quietest setting", p: "The indoor unit's published sound level on its lowest fan speed." });
    const star = get(/star rating/i);
    const n = star?.match(/\d+(?:\.\d+)?/)?.[0];
    if (n) items.push({ v: `${n}-star`, h: "Energy rating", p: `Rated ${star}.` });
    const wifi = get(/wi-?fi/i);
    if (wifi) items.push({ v: "Wi-Fi", h: "Phone control", p: wifi });
    const gas = get(/^refrigerant/i);
    if (gas) items.push({ v: gas.split(/\s/)[0], h: "Refrigerant", p: "The refrigerant the system runs on." });
    const yrs = get(/^warranty/i)?.match(/(\d+)[\s-]*year/i)?.[1];
    if (yrs) items.push({ v: `${yrs} yrs`, h: "Manufacturer warranty", p: "Plus 6 years on our workmanship." });
    if (items.length >= 3) return { src: "specs", items };
  }
  return { src: "option", items: optionLines.map(splitFeature) };
}

type Photo = { src: string; alt: string; cover?: boolean };
/** What a feature is about → the photo that shows it, matched on the photo's description. */
const FEATURE_PHOTO: [RegExp, RegExp | "product" | "team"][] = [
  // Only the parts that are us: "install" alone also turns up in product lines ("every ducted install").
  [/workmanship|our crew|installed by/i, "team"],
  [/wi-?fi|\bapp\b|phone|controller|zone control|zoning|thermostat|schedul|tablet|touch/i, /control|\bapp\b|phone|tablet|touch/i],
  [/outdoor|refrigerant|R32|R410|R744|CO₂|star|energy|efficien|COP|inverter|compressor|cold|frost|-\d+\s*°/i, /outdoor|condenser|heat pump/i],
  [/cooling|heating|room|m²|bedroom|living|sized/i, /installed|install\b|bedroom|room/i],
  [/quiet|dBA|sound|sleep|indoor|wall|slim|design|filter|air/i, "product"],
];

/**
 * A photo for each Key features card, from pictures we already have of this
 * option: its own product shot and our installs of that kind of system. The
 * brand's own kit is borrowed for an outdoor unit, or when this option's own
 * photos have run out and one of the brand's shows the same thing (the
 * Milieu app for an app line); never as a stand-in otherwise, because its
 * other shots are other products (a ducted unit on a wall split's page would
 * be wrong). The warranty card gets the team, because that part is us.
 */
function featurePhotos(items: Feature[], product: Photo, local: Photo[], brandKit: Photo[]): Feature[] {
  const team: Photo = { src: PHOTO.team, alt: "The Advanced Gas & Aircon team with their vans", cover: true };
  const outdoor = brandKit.filter((x) => /outdoor|condenser/i.test(x.alt));
  const all = [product, ...local, ...outdoor].filter((x, i, a) => a.findIndex((y) => y.src === x.src) === i);
  const used = new Set<string>();
  return items.map((f) => {
    const text = `${f.v ?? ""} ${f.h} ${f.p ?? ""}`;
    const want = FEATURE_PHOTO.find(([re]) => re.test(text))?.[1];
    const fresh = all.filter((x) => !used.has(x.src));
    const pick = want === "team" ? (used.has(team.src) ? undefined : team)
      : want === "product" ? fresh.find((x) => x.src === product.src)
        : want ? fresh.find((x) => want.test(x.alt)) : undefined;
    // No match: the next photo of this option itself, before any borrowed outdoor shot.
    const kit = want instanceof RegExp ? brandKit.find((x) => !used.has(x.src) && want.test(x.alt)) : undefined;
    // A borrowed outdoor shot only where the line is about the outdoor unit; otherwise the product again.
    const ph = pick ?? fresh.find((x) => !outdoor.includes(x)) ?? kit ?? product;
    used.add(ph.src);
    return { ...f, img: ph.src, alt: ph.alt, cover: ph.cover };
  });
}

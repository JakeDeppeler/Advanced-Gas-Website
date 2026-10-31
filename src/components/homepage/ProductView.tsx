"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  findSystem, galleryFor, specRows, answersFrom, answersQuery, bookHref,
  isHeatPump, isNewBuildHeatPump, SPEC_NOTE, SIZE_NOTE, WORKMANSHIP,
  modelForAnswer, roomFor, installTime as installTimeOf, type Answers,
} from "@/lib/homepage/data";
import type { PV } from "./product/parts";
import { ProductLayout } from "./product/layout";
import { LEARN, BOOKING_STEPS } from "@/lib/homepage/learn";
import type { Review } from "@/lib/reviews";
import type { Badge } from "@/lib/homepage/badges";

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
};
export type PBrand = { name: string; page?: string; site?: { label: string; href: string } };

/**
 * One option from the finder, as a page of its own so it can be shared and
 * indexed. The answers ride along in the query string (?size=1&floor=0…);
 * the page renders without them too, for anyone who lands here from search.
 */
export function ProductView({ system, tier: tierSlug, reviews, rating, count, models, brand, tierBadges }: {
  system: string; tier: string; reviews: Review[]; rating: string; count: number; models: PModel[]; brand: PBrand | null;
  /** Badges the option states itself (Wi-Fi in its feature list), for options with no catalogue model. */
  tierBadges: Badge[];
}) {
  const ref = findSystem(system)!;
  const { cat, sys } = ref;
  const ti = sys.tiers.findIndex((t) => t.slug === tierSlug);
  const t = sys.tiers[ti];

  const [ans, setAns] = useState<Answers>({});
  // The model they picked here, or arrived with in ?model=. Until then the
  // size they gave in the finder chooses one.
  const [picked, setPicked] = useState<string | null>(null);
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
  function pickSize(i: number) {
    // A row in the size guide picks the model that fits it, the same way the finder's answer does.
    setSize(i);
    if (models.length) { setPicked(null); syncUrl({ ...ans, size: i }, null); }
  }

  const gal = galleryFor(sys, t);
  const size = ans.size != null ? sys.sizes[ans.size] : null;
  const feats = t.feats.filter((f) => f !== WORKMANSHIP);

  const mi = Math.max(0, picked ? models.findIndex((m) => m.slug === picked) : modelForAnswer(models, size?.spec));
  const model = models[mi] ?? null;

  // A model's own record beats the option's feature list: where the model
  // states its noise, an option line quoting a different dBA figure goes, so
  // the page never shows two numbers for the same thing.
  const statesSound = !!model?.specs.some((x) => /sound/i.test(x.label));
  const optionLines = feats.filter((f) => !(statesSound && /dBA/.test(f)));
  const included = [...optionLines, "Free site check and a fixed price in writing", "Installed by our own crew", "Compliance certificate emailed within 24 hours", "6 years on our workmanship"];

  // Which of the system's sizes is showing: the one picked, or the one
  // nearest the chosen model (a 6.0 kW model has no size row of its own).
  const nums = (x?: string) => (x?.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  const sizeOfChip = (chip: string): number | null => {
    const want = nums(chip)[0];
    if (want == null) return null;
    let best: number | null = null, gap = Infinity;
    sys.sizes.forEach((z, i) => nums(z.spec).forEach((n) => { if (Math.abs(n - want) < gap) { gap = Math.abs(n - want); best = i; } }));
    return best;
  };
  const roomIdx = model ? sizeOfChip(model.chip) : ans.size ?? null;

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
    learn: LEARN[sys.slug], steps: BOOKING_STEPS(installTimeOf(sys)),
    optionLines,
    whyTitle: model?.why?.length ? "Why we install it" : model?.features?.length ? "Features" : "What's included",
    whyLines: model?.why?.length ? model.why : model?.features?.length ? model.features : included,
    take: model?.take ?? `${sys.sub}. ${optionLines.join(". ")}.`,
    glance: model ? model.specs.filter((x) => !/warranty|refrigerant/i.test(x.label)).slice(0, 4) : [],
    sizeOn: (i) => (models.length ? modelForAnswer(models, sys.sizes[i].spec) === mi && !!sys.sizes[i].spec : ans.size === i),
    pickSize, pickModel, setSize,
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

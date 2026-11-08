import { site, services } from "@/lib/site";
import { FAULT_CODES, faultSlug, type FaultCode } from "@/lib/faultCodes";
import { suburbs } from "@/lib/suburbs";
import { RADIUS_KM } from "@/lib/suburbCoords";
import { CATS, HOME_FAQS, systemHref } from "@/lib/homepage/data";
import { SYS_INTRO } from "@/lib/homepage/learn";
import { entries, ourBrands, type Entry } from "./knowledge";
import { codeKey, lead, normalise, words } from "./text";
import type { AskReply, AskTurn } from "./types";

/**
 * The instant answers without a language model: the visitor's question
 * matched against the site's own questions and answers.
 *
 * This is what runs until ANTHROPIC_API_KEY is set, and what the model path
 * falls back to when the API fails or says something it mustn't, so it has to
 * hold up by itself. A handful of questions are recognised outright because a
 * word-overlap score gets them wrong or dangerous: a gas smell (safety lines,
 * never a matched FAQ), a price (the site hides them, so the honest answer is
 * the same every time), a fault code, a suburb and a brand. Everything else is
 * scored by shared words, weighted by how rare each word is across the site's
 * answers, with the question text counting more than the answer text. Below a
 * confidence floor it says it isn't sure rather than offer the nearest miss.
 */

/** "Indoor PCB fault" reads "indoor PCB fault" mid-sentence, not "indoor pcb fault". */
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

const reply = (text: string, link?: AskReply["link"], kind: AskReply["kind"] = "answer"): AskReply => ({ text, link, kind, by: "site" });

/* ------------------------------------------------------------ emergencies */

const EMERGENCY = /\b(?:smell(?:s|ing)?(?: of)? gas|gas (?:leak|smell)|leak(?:ing)? gas|gas is leaking|smells? like gas|co alarm|co detector|gas alarm|carbon monoxide (?:alarm|detector|poisoning)?)\b/;

/**
 * The gas safety steps, from the quote form's own "Can you smell gas right
 * now?" answer and the office's drafting rules. A safety message is never
 * left to a word-overlap match.
 */
export const GAS_SAFETY = `If you can smell gas: turn it off at the meter, don't use light switches or flames, open the doors and windows and get everyone outside. Then call us on ${site.phone}, 24/7. If anyone feels unwell or is in danger, call 000.`;

export const isEmergency = (q: string) => EMERGENCY.test(normalise(q));

/* ------------------------------------------------------------ prices */

// "How much hot water do we need" is a sizing question, not a price one.
const PRICE = /\b(?:how much(?!\s+(?:hotwater|water|space|room|roof|power|noise|time|heating|cooling|kw|litres?|people|longer)\b)|cost|costs|costing|price|prices|pricing|priced|quote me|ballpark|rough (?:figure|idea|price)|expensive|cheapest|afford|finance|pay (?:it )?off|payment plan|per week|weekly|deposit|fee|fees|charge|charges|hourly rate|call[- ]?out rate)\b|\$/;
const RUNNING = /\b(?:to run|running cost|run cost|cheaper to run|cheap to run|power bill|energy bill|gas bill|electricity)\b/;
const REBATE_Q = /\b(?:rebate|rebates|veu|veec|veecs|stc|stcs|solar victoria|victorian energy upgrades?)\b/;

const quoteFixed = HOME_FAQS.find((f) => /fixed/i.test(f.q))?.a ?? "";

export function priceAnswer(): AskReply {
  return reply(
    `We don't put prices on the website: every home is different, so every job is priced at a free site check and you get a fixed written price. ${quoteFixed.split(/(?<=[.!?])\s+/)[0]}`.trim(),
    { href: "/quote", label: "Get a free quote" },
  );
}

/* ------------------------------------------------------------ fault codes */

const ALIASES: Record<string, string> = { mitsubishi: "Mitsubishi Electric", mitsi: "Mitsubishi Electric", mitsu: "Mitsubishi Electric" };
const faultBrands = [...new Set(FAULT_CODES.map((f) => f.brand))];

function brandIn(text: string): string | null {
  const t = normalise(text);
  for (const b of faultBrands) if (new RegExp(`\\b${b.toLowerCase()}\\b`).test(t)) return b;
  for (const b of faultBrands) if (new RegExp(`\\b${b.split(" ")[0].toLowerCase()}\\b`).test(t)) return b;
  for (const [alias, b] of Object.entries(ALIASES)) if (new RegExp(`\\b${alias}\\b`).test(t)) return b;
  return null;
}

const CODE_WORDS = /\b(?:code|error|fault|flash(?:ing|es)?|blink(?:ing|s)?|show(?:s|ing)?|display(?:s|ing)?|says|screen|controller)\b/;
const byCode = new Map<string, FaultCode[]>();
for (const f of FAULT_CODES) byCode.set(codeKey(f.code), [...(byCode.get(codeKey(f.code)) ?? []), f]);

function faultAnswer(q: string): AskReply | null {
  const t = q.toLowerCase();
  // Single tokens and pairs, so "H01 40" and "E 6" find their row too.
  const toks = t.split(/[^a-z0-9]+/).filter(Boolean);
  const cands = new Set<string>();
  toks.forEach((w, i) => {
    cands.add(w);
    // Pairs only when the question says it's a code: "a 6 star heater" is not Daikin A6.
    if (toks[i + 1] && CODE_WORDS.test(t)) cands.add(w + toks[i + 1]);
  });
  const wordy = CODE_WORDS.test(t);
  let hits: FaultCode[] = [];
  for (const c of cands) {
    const rows = byCode.get(c);
    if (!rows) continue;
    // A bare number ("3 bedrooms") is only a code when the question says it's one.
    if (!/[a-z]/.test(c) && !wordy) continue;
    // A word that happens to be a code ("lc", "on") needs the same.
    if (/^[a-z]+$/.test(c) && !wordy) continue;
    hits = rows;
    if (c.length > 2) break;
  }
  if (!hits.length) return null;

  const brand = brandIn(q);
  const mine = brand ? hits.filter((f) => f.brand === brand) : hits;
  const page = (f: FaultCode) => (f.detail ? `/tools/fault-codes/${faultSlug(f.brand)}/${faultSlug(f.code)}` : "/tools/fault-codes");

  if (brand && !mine.length) {
    return reply(
      `${hits[0].code} isn't in our ${brand} fault table. The team can tell you what it means on your unit; it helps to have the model number from the label handy.`,
      { href: "/tools/fault-codes", label: "Fault code lookup" },
      "unsure",
    );
  }
  if (mine.length === 1 || (brand && mine.length)) {
    const f = mine[0];
    const serious = f.severity === "critical" ? " That one is serious: turn the unit off and call us." : "";
    return reply(`On a ${f.brand}, ${f.code} means: ${lower(f.meaning)}. ${f.firstCheck}${serious}`, { href: page(f), label: `${f.brand} ${f.code}` });
  }
  const list = mine.slice(0, 3).map((f) => `on a ${f.brand} it's ${lower(f.meaning)}`).join("; ");
  return reply(`${mine[0].code} means different things on different brands: ${list}. Which brand is yours?`, { href: "/tools/fault-codes", label: "Fault code lookup" });
}

/* ------------------------------------------------------------ suburbs */

const AREA_Q = /\b(?:do you (?:service|cover|come|go|travel|work|do)|service area|areas?|suburbs?|come out|travel|near|far|distance|out to|located in|live in|based in)\b/;
// Longest first, so "Narre Warren South" wins over "Narre Warren".
const byName = [...suburbs].sort((a, b) => b.name.length - a.name.length);

function suburbAnswer(q: string): AskReply | null {
  const t = normalise(q);
  const s =
    byName.find((x) => new RegExp(`\\b${x.name.toLowerCase().replace(/[^a-z0-9]+/g, "[\\s-]+")}\\b`).test(t)) ??
    suburbs.find((x) => new RegExp(`\\b${x.postcode}\\b`).test(t));
  if (s) {
    // A suburb named in a question about something else ("how long does a heat pump take in Berwick") is a detail, not the question.
    const rest = words(q).filter((w) => !s.name.toLowerCase().split(/\s+/).includes(w) && w !== s.postcode);
    if (!AREA_Q.test(t) && rest.length > 1) return null;
    const far = s.distanceKm > 0 ? `, about ${s.distanceKm} km from our Pakenham workshop` : "";
    const where = s.distanceKm === 0 ? `Yes, ${s.name} is home: our workshop is there.` : `Yes, ${s.name} ${s.postcode} is in our service area${far}.`;
    return reply(where, s.published ? { href: `/areas/${s.slug}`, label: `${s.name}` } : { href: "/service-areas", label: "Areas we cover" });
  }
  if (/\b(?:do you (?:service|cover|come|go|travel|work)|service area|come out to|travel to)\b/.test(t)) {
    return reply(
      `We cover Pakenham and about ${RADIUS_KM} km around it, across ${site.primaryRegion}. I couldn't find that suburb on our list, so the team can tell you for sure.`,
      { href: "/service-areas", label: "Areas we cover" },
      "unsure",
    );
  }
  return null;
}

/* ------------------------------------------------------------ brands */

const GENERIC = new Set(["install", "service", "repair", "sell", "supply", "stock", "brand", "work", "carry", "offer", "use", "aircon", "hotwater", "heatpump", "unit", "system", "product", "range", "installer"]);
const fitNames = () => {
  const n = ourBrands().map((b) => b.name);
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
};

function brandAnswer(q: string): AskReply | null {
  const t = normalise(q);
  const ours = ourBrands().find((b) => b.names.some((n) => new RegExp(`\\b${n}\\b`).test(t)));
  const other = ours ? null : faultBrands.find((b) => new RegExp(`\\b${b.split(" ")[0].toLowerCase()}\\b`).test(t));
  const name = ours?.name ?? other;
  if (!name) return null;
  // Only "do you do X?" questions. "How long does a Brivis swap take" is a question about the job.
  const brandWords = new Set(name.toLowerCase().split(/\s+/).concat(ours?.names ?? []));
  const rest = words(q).filter((w) => !brandWords.has(w) && !GENERIC.has(w));
  if (rest.length) return null;
  if (ours) return reply(`Yes, we install ${ours.name}: ${ours.range}. ${lead(ours.intro)}`, { href: `/brands/${ours.slug}`, label: ours.name });
  // Somebody else's brand. Servicing is only promised where the site promises it: the aircon service page says all major brands.
  const aircon = FAULT_CODES.some((f) => f.brand === other && f.system === "aircon");
  const svc = services.find((s) => s.slug === "aircon-servicing-repairs");
  const servicing =
    aircon && svc && /all major brands/i.test(svc.blurb)
      ? " We do service and repair all major aircon brands, though, so we can still look after yours."
      : " For a service or repair on one, ask the team and they'll tell you if we can help.";
  return reply(`We don't install ${other}. The brands we fit are ${fitNames()}.${servicing}`, { href: "/brands", label: "Brands we install" });
}

/* ------------------------------------------------------------ comparisons */

/**
 * "Split or ducted?" names two systems, and a word-overlap score picks
 * whichever single FAQ mentions both, which is never the answer. Each
 * system's own opening paragraph, side by side, is. Most specific first, and
 * each match is cut out of the text so "ducted split" isn't also a split.
 */
const SYSTEM_WORDS: [string, RegExp][] = [
  ["gas-ducted-heating", /\bgas ducted(?: heating)?\b|\bducted (?:gas|heating)\b/],
  ["reverse-cycle-split", /\breversecycle(?: split)?\b/],
  ["ducted", /\bducted(?: split| aircon)?\b/],
  ["multi-head", /\bmultihead\b/],
  ["split-system", /\bsplit\b/],
  ["evaporative", /\bevap\w*\b/],
  ["zoning", /\bzon(?:e|es|ing)\b/],
  ["heat-pump", /\bheatpump\b/],
  ["gas-continuous-flow", /\bcontinuousflow\b/],
  ["gas-storage", /\b(?:gas )?storage(?: tank)?\b|\btank\b/],
];
const COMPARE = /\b(?:difference|differ|vs|versus|compare|comparison|better|or|which)\b/;
const systemsBySlug = new Map(CATS.flatMap((c) => c.systems).map((s) => [s.slug, s]));

function compareAnswer(q: string): AskReply | null {
  let t = normalise(q);
  if (!COMPARE.test(t)) return null;
  const found: string[] = [];
  for (const [slug, re] of SYSTEM_WORDS) {
    if (re.test(t)) {
      found.push(slug);
      t = t.replace(re, " ");
    }
  }
  if (found.length < 2) return null;
  const parts = found.slice(0, 3).flatMap((slug) => {
    const s = systemsBySlug.get(slug);
    return s && SYS_INTRO[slug] ? [`${s.label}: ${lead(SYS_INTRO[slug], 220)}`] : [];
  });
  if (parts.length < 2) return null;
  return reply(`${parts.join("\n\n")}\n\nWhich suits your home comes down to the house itself, and we'll tell you straight at the free site check.`, {
    href: systemHref(found[0]),
    label: systemsBySlug.get(found[0])!.label,
  });
}

/* ------------------------------------------------------------ the rest */

type Indexed = { e: Entry; q: Set<string>; tags: Set<string>; a: Set<string> };
let index: { rows: Indexed[]; idf: Map<string, number> } | null = null;

function build() {
  if (index) return index;
  const rows = entries().map((e) => ({ e, q: new Set(words(e.q)), tags: new Set(words(e.tags ?? "")), a: new Set(words(e.a)) }));
  const df = new Map<string, number>();
  for (const r of rows) for (const w of new Set([...r.q, ...r.tags, ...r.a])) df.set(w, (df.get(w) ?? 0) + 1);
  const n = rows.length;
  const idf = new Map([...df].map(([w, d]) => [w, Math.log(1 + n / d)]));
  return (index = { rows, idf });
}

/** Unknown words are rare words: a question full of them is probably off-topic, and the score should say so. */
const weight = (idf: Map<string, number>, w: string) => idf.get(w) ?? Math.log(1 + build().rows.length);

export type Match = { entry: Entry; score: number; coverage: number };

/** The site's answers ranked against a question. `context` words (the previous question) count for half. */
export function rank(question: string, context = ""): Match[] {
  const { rows, idf } = build();
  const qw = words(question);
  const cw = words(context).filter((w) => !qw.includes(w));
  const total = qw.reduce((s, w) => s + weight(idf, w), 0) || 1;
  const nq = normalise(question);
  const general = !SYSTEM_WORDS.some(([, re]) => re.test(nq));
  const out: Match[] = [];
  for (const r of rows) {
    let got = 0;
    let score = 0;
    for (const w of qw) {
      const k = weight(idf, w);
      const hit = r.q.has(w) ? 1 : r.tags.has(w) ? 0.8 : r.a.has(w) ? 0.55 : 0;
      if (hit) got += k;
      score += k * hit;
    }
    for (const w of cw) score += 0.4 * weight(idf, w) * (r.q.has(w) || r.tags.has(w) ? 1 : r.a.has(w) ? 0.5 : 0);
    if (score > 0) {
      // Long answers match more words by accident; a short, on-point one should win a tie.
      score /= 1 + Math.log(1 + (r.q.size + r.a.size) / 40);
      // The homepage FAQ is the general version of questions every system's
      // FAQ also asks (the warranty, how long an install takes). A question
      // naming a system gets that system's answer through its tags anyway.
      // The homepage FAQ is the general version of questions every system's
      // FAQ also asks (the warranty, how long an install takes), so it wins
      // a question that names no system.
      if (general && r.e.id.startsWith("home.")) score *= 1.25;
      out.push({ entry: r.e, score, coverage: got / total });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** How sure the matcher has to be before it answers instead of handing over. */
// Coverage does most of the work: an off-topic question is mostly words the
// site never uses, so it covers little. The score floor only stops a single
// common word ("gas") from answering on its own.
const FLOOR = { coverage: 0.5, score: 0.9 };

export function unsure(): AskReply {
  return reply(
    `I'm not sure about that one from what's on our site, and I'd rather not guess. The team can answer it: tap "Talk to the team", or call ${site.phone}.`,
    undefined,
    "unsure",
  );
}

/**
 * "How soon can you come?" The chat can't see the booking diary, and a
 * matched FAQ that happens to say "same day" would read as a promise.
 */
const WHEN = /\b(?:how soon|how quickly|when can (?:you|someone|somebody)|soonest|available|availability|today|tomorrow|this week|next week|book (?:in|a|me)|booking|appointment)\b/;

export function whenAnswer(): AskReply {
  return reply(
    `I can't see the booking diary from here, so I won't guess a day. The team books jobs: tap "Talk to the team" or call ${site.phone}. If it's an emergency (gas leak, no hot water), call now: it's answered 24/7.`,
    { href: "/quote", label: "Request a quote or booking" },
    "unsure",
  );
}

const GREETING = /^\s*(?:hi|hello|hey|hiya|g'?day|good (?:morning|afternoon|evening)|yo)\b[\s!.,]*(?:there|team|guys|mate)?[\s!.,]*$/i;
const THANKS = /^\s*(?:thanks|thank you|cheers|ta|great|awesome|perfect|ok|okay|no worries)\b[\s\w!.,]{0,20}$/i;

export function localAnswer(question: string, history: AskTurn[] = []): AskReply {
  const q = question.trim();
  const t = normalise(q);
  if (GREETING.test(q)) return reply("Hi! Ask me about air con, heating, hot water, gas, rebates or the areas we cover, and I'll answer from what's on our site.");
  if (THANKS.test(q)) return reply("No worries. If you'd like a price, the free quote is the next step, or the team can take it from here.");
  if (isEmergency(q)) return { ...reply(GAS_SAFETY, { href: `tel:${site.phoneE164}`, label: `Call ${site.phone}` }, "emergency") };

  const fault = faultAnswer(q);
  if (fault) return fault;

  // Rebates before prices: "how much is the VEU rebate" is a rebate question.
  const rebate = REBATE_Q.test(t);
  if (PRICE.test(t) && !rebate && !RUNNING.test(t)) return priceAnswer();

  if (WHEN.test(t)) return whenAnswer();

  const area = suburbAnswer(q);
  if (area) return area;
  const brand = brandAnswer(q);
  if (brand) return brand;

  const compare = compareAnswer(q);
  if (compare) return compare;

  const prev = history.length ? history[history.length - 1].q : "";
  const ranked = rank(q, prev);
  let best = ranked[0];
  // A question about the rebate is best answered with the amount the site
  // states, when an answer nearly as close carries it.
  if (rebate && best && !/\$\d/.test(best.entry.a)) {
    best = ranked.find((m) => m.coverage >= FLOOR.coverage && /rebate/i.test(m.entry.q) && /\$\d/.test(m.entry.a)) ?? best;
  }
  if (!best || best.coverage < FLOOR.coverage || best.score < FLOOR.score) return unsure();
  const e = best.entry;
  // The site question it matched goes with it, so a visitor can see at a
  // glance whether it answers what they asked, and an answer that opens
  // "Yes, on common models" has the question it says yes to.
  return { ...reply(e.a, e.href ? { href: e.href, label: e.label ?? "Read more" } : undefined), about: e.q };
}

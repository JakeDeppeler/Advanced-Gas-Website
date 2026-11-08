/**
 * Turning a visitor's question and the site's answers into comparable words,
 * and keeping prices out of anything the chat says.
 */

/**
 * Phrases people write several ways, folded to one token before splitting, so
 * "air con", "a/c" and "aircon" all meet the FAQ that says "air conditioning".
 * Order matters: longer phrases first.
 */
const PHRASES: [RegExp, string][] = [
  [/\bair[\s-]?con(?:ditioner|ditioning|ditioners)?s?\b|\ba\/c\b|\bac\b/g, " aircon "],
  [/\bhot[\s-]?water(?:\s+(?:system|service|unit))?s?\b|\bhws\b/g, " hotwater "],
  [/\bheat[\s-]?pumps?\b/g, " heatpump "],
  [/\breverse[\s-]?cycle\b/g, " reversecycle "],
  [/\bmulti[\s-]?(?:head|split)s?\b/g, " multihead "],
  [/\bcontinuous[\s-]?flow\b|\binstantaneous\b|\btankless\b/g, " continuousflow "],
  [/\bcarbon[\s-]?monoxide\b/g, " co "],
  [/\bhow long\b/g, " duration "],
  [/\bput in\b|\bput one in\b/g, " install "],
  [/\bnot working\b|\bstopped working\b|\bwon'?t (?:start|turn on|work)\b/g, " repair "],
  [/\bmitsi\b|\bmitsu\b/g, " mitsubishi "],
  [/\bsplit[\s-]?systems?\b/g, " split "],
];

/** One spelling per idea. Applied to single words after the phrases. */
const SAME: Record<string, string> = {
  installation: "install", installed: "install", installing: "install", installer: "install", fit: "install", fitted: "install", fitting: "install", replace: "install", replacement: "install", swap: "install",
  servicing: "service", serviced: "service", maintenance: "service", maintain: "service",
  fix: "repair", broken: "repair", repairs: "repair", fault: "repair", faulty: "repair",
  rebates: "rebate", veec: "rebate", veecs: "rebate", subsidy: "rebate", incentive: "rebate", veu: "rebate",
  guarantee: "warranty", guaranteed: "warranty",
  // Not "hours": "what are your hours" is about opening times, not install length.
  take: "duration", takes: "duration", quick: "duration",
  zones: "zone", zoning: "zone", zoned: "zone",
  evaporative: "evap", evaporator: "evap",
  heater: "heating", heaters: "heating", heat: "heating",
  cooler: "cooling", cool: "cooling", cooling: "cooling",
  costs: "cost", price: "cost", prices: "cost", pricing: "cost", expensive: "cost",
  open: "hours", opening: "hours",
  suburbs: "suburb", areas: "area",
  splits: "split",
  units: "unit",
  solar: "solar", panels: "solar", pv: "solar",
  rental: "rent", renting: "rent", renter: "rent", landlord: "rent", tenant: "rent",
  ducts: "ducted", duct: "ducted", ductwork: "ducted",
};

/** Words that carry no meaning for matching. */
const STOP = new Set(
  ("a an the and or but if of to in on at for with from by about as is are was were be been being am do does did done doing can could would should will " +
    "shall may might must i me my mine we us our ours you your yours he she it its they them their this that these those there here what which who whom " +
    "whose when where why how any some much many more most very really just also too so than then get got have has had having want wanted need needs " +
    "know tell please hi hello hey thanks thank cheers mate g'day im i'm id i'd ive i've dont don't doesnt isn't isnt whats what's one ones thing things " +
    "like lot bit sort kind actually still ever yet own new go going way give gives offer offers provide provides come comes include includes " +
    "my our anyone someone guys").split(" "),
);

/** "e6", "h01 40" and "U4" as one token each, the way the fault table writes them. */
export const codeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function normalise(text: string): string {
  let s = ` ${text.toLowerCase().replace(/[’‘]/g, "'")} `;
  for (const [re, to] of PHRASES) s = s.replace(re, to);
  return s;
}

const stem = (w: string) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/** The meaningful words of a text, folded. Repeats kept out. */
export function words(text: string): string[] {
  const out = new Set<string>();
  for (const raw of normalise(text).split(/[^a-z0-9']+/)) {
    const w = raw.replace(/'/g, "");
    if (!w || STOP.has(raw) || STOP.has(w)) continue;
    const folded = SAME[w] ?? SAME[stem(w)] ?? stem(w);
    if (folded.length < 2 && !/\d/.test(folded)) continue;
    out.add(folded);
  }
  return [...out];
}

/* ------------------------------------------------------------ prices */

/**
 * A sentence that names money or finance. Prices are hidden across the site
 * on purpose (SHOW_PRICES and SHOW_FINANCE in homepage/data.ts are off), so
 * nothing the chat says may carry one. The site's own FAQ text was written
 * when they showed, so it is filtered here rather than trusted.
 */
const MONEY = /\$\s?\d|\b\d[\d,.]*\s?(?:dollars|bucks|aud)\b|\bper (?:week|month|hour)\b|\/(?:wk|week|mth|hr)\b|\+\s?gst\b|\bfinance\b|\binterest[- ]free\b|\brepayments?\b|\bcall[- ]?out fee\b/i;
/** A rebate amount is the one figure the chat may repeat, and only as the site states it. */
const REBATE = /\brebates?\b|\bveu\b|\bveecs?\b|\bstcs?\b|\bcertificates?\b|solar victoria/i;
/** …but not a sentence that slips a service fee or install cost in beside the rebate. */
const NOT_REBATE = /\+\s?gst|servic|call[- ]?out|per hour|\/hr|install(?:ed)? (?:price|cost)|out[- ]of[- ]pocket|finance|repayment/i;

export const mentionsMoney = (s: string) => MONEY.test(s);
const rebateSentence = (s: string) => REBATE.test(s) && !NOT_REBATE.test(s);

/**
 * The text with every sentence that names a price or finance taken out.
 * Null when what's left is too thin to stand as an answer.
 */
export function withoutPrices(text: string): string | null {
  const parts = text.split(/(?<=[.!?])\s+/);
  const keep = parts.map((s) => !MONEY.test(s) || rebateSentence(s));
  // When the opening sentence was the price, what follows was written to
  // qualify it ("Fee waived if you accept the repair the same day") and
  // reads as nonsense, or worse as a promise, on its own.
  if (!keep[0]) return null;
  const kept = parts.filter((_, i) => keep[i]).join(" ").trim();
  return kept.length >= 30 ? kept : null;
}

/** Every dollar figure in the text, as written ("$2,700"). */
export const dollarFigures = (text: string): string[] => text.match(/\$\s?\d[\d,]*(?:\.\d+)?/g)?.map((f) => f.replace(/\s/g, "")) ?? [];

/** The first sentence, or two when the first is short. */
export function lead(text: string, max = 260): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  let out = parts[0] ?? text;
  if (out.length < 90 && parts[1]) out += ` ${parts[1]}`;
  return out.length > max ? `${out.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : out;
}

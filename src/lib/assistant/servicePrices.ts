import { serviceContent } from "@/lib/serviceContent";
import { SYSTEM_DETAIL } from "@/lib/systemDetail";
import { dollarFigures } from "./text";

/**
 * The prices the chat may give: call-out fees and service prices, and
 * nothing else (Jake, Nov 2026: "no price, apart from call-out fees and
 * services"). An install is priced at a site check because every house is
 * different; a service or a call-out costs the same wherever it is, so saying
 * it up front is just answering the question.
 *
 * Read from the price tables the service pages already hold, not typed out
 * again here, so a change to a fee on the page is the chat's answer too. A
 * row qualifies by what it is (a service or a call-out), never by its figure,
 * so an install row can't slip in because it happens to be cheap.
 */

export type ServicePrice = { what: string; price: string; note?: string; topic: "aircon" | "gas" | "heating" | "evap" | "callout" };

const IS_SERVICE = /\bservic(?:e|ing)\b|\bcall[- ]?out\b|\bleak detection\b/i;
const IS_INSTALL = /\binstall|\bsupply\b|\breplacement\b|\bnew\b/i;

/** The line from the row's "includes" that changes what the fee means, when there is one. */
const NOTE = /waived|parts|per (?:extra )?unit|charged per/i;

function topicOf(tier: string, group = ""): ServicePrice["topic"] {
  const t = `${tier} ${group}`;
  if (/call[- ]?out/i.test(t)) return "callout";
  if (/evap/i.test(t)) return "evap";
  if (/gas ducted|heater/i.test(t)) return "heating";
  if (/gas|leak/i.test(t)) return "gas";
  return "aircon";
}

let cache: ServicePrice[] | null = null;

export function servicePrices(): ServicePrice[] {
  if (cache) return cache;
  const rows = [
    ...Object.values(serviceContent).flatMap((c) => c.pricing ?? []),
    ...Object.values(SYSTEM_DETAIL).flatMap((d) => d.pricing ?? []),
  ];
  const out: ServicePrice[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!IS_SERVICE.test(r.tier) || IS_INSTALL.test(r.tier)) continue;
    // The same call-out sits on more than one page, worded a little
    // differently each time: one call-out per price is enough.
    const topic = topicOf(r.tier, (r as { group?: string }).group);
    const key = topic === "callout" ? `callout|${r.price}` : `${r.tier.toLowerCase()}|${r.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const note = r.includes.split(/,\s*/).find((x) => NOTE.test(x));
    out.push({ what: r.tier.replace(/\s*·\s*/g, ", "), price: r.price, note, topic });
  }
  return (cache = out);
}

/** Every dollar figure in those prices, as written ("$220"). */
export const serviceFigures = (): Set<string> => new Set(servicePrices().flatMap((p) => dollarFigures(p.price)));

/** One line per price, for the model's knowledge and the site-only answer. */
export const priceLine = (p: ServicePrice) => `${p.what}: ${p.price}${p.note ? ` (${p.note.charAt(0).toLowerCase()}${p.note.slice(1)})` : ""}`;

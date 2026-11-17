import { plainText } from "./wording";

/**
 * When a piece of quote wording may be written: a template's summary, the
 * description on one of its lines, or a pricebook item's description.
 * Pure, for scripts/check-quote-templates.ts; quoteWording.ts does the writing.
 *
 * The first pass (Jake, 17 Nov: "go through and fix the equipment wording and
 * the job summary") writes over whatever is there; the old words are kept in
 * portal_settings.quote_wording_backup first. After that it only writes over
 * words it put there itself: anything the office has typed since, on a
 * template or item it has already done, or on one made after the first pass,
 * is left as it is. An empty description is always filled.
 */

/** A text as compared: one line per paragraph, as plainText reads ServiceTitan's <p>s. */
export const flatText = (text: string) => text.trim().split(/\n\n+/).map((p) => p.trim()).join("\n");

/** Short and stable, to remember what was written without keeping every word of it. */
export function textHash(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return `${h.toString(36)}.${s.length}`;
}

export type WordingAction = "same" | "write" | "leave";

/**
 * @param recorded the hash of what was last written here, if anything was
 * @param firstPass true until every template and item has been through once
 */
export function wordingAction(liveHtml: string | null | undefined, desired: string, recorded: string | undefined, firstPass: boolean): WordingAction {
  const live = plainText(liveHtml);
  if (live === flatText(desired)) return "same";
  if (!live) return "write";
  if (recorded == null) return firstPass ? "write" : "leave";
  return textHash(live) === recorded ? "write" : "leave";
}

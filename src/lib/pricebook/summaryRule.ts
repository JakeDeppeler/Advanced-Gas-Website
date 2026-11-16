import { plainText } from "./wording";

/**
 * When a quote template's summary may be rewritten from quoteTemplateSpecs.ts:
 * only over words this code put there, either as the template was made (the
 * spec's `was`) or as it last wrote them. Anything else on it means someone in
 * the office has edited it, and that edit is left alone. Pure, for
 * scripts/check-quote-templates.ts; templateSummaries.ts does the writing.
 */

/** A summary as compared: one line per paragraph, as plainText reads ServiceTitan's <p>s. */
export const flatText = (text: string) => text.trim().split(/\n\n+/).map((p) => p.trim()).join("\n");

/** Short and stable, to remember what was written without keeping every word of it. */
export function textHash(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return `${h.toString(36)}.${s.length}`;
}

export type SummaryAction = "same" | "write" | "edited";

export function summaryAction(liveHtml: string | null | undefined, spec: { summary: string; was?: string[] }, lastWritten?: string): SummaryAction {
  const live = plainText(liveHtml);
  if (live === flatText(spec.summary)) return "same";
  const ours = (lastWritten != null && textHash(live) === lastWritten) || (spec.was ?? []).some((w) => flatText(w) === live);
  return ours ? "write" : "edited";
}

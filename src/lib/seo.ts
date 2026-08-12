/**
 * Title and description length discipline.
 *
 * Google renders roughly 600px of title, which is about 60 characters,
 * and about 160 characters of description. Past that it truncates, and
 * a truncated title is a title whose last few words never got read.
 *
 * Two things had gone wrong and this fixes both:
 *
 *  1. Every page template appended "| Advanced Gas & Aircon" by hand,
 *     AND the root layout appended it again through the metadata
 *     `template`. Search results were showing the company name twice
 *     and losing the end of the actual title to do it. Page titles now
 *     never carry the suffix; the layout template owns it.
 *
 *  2. Suburb and brand descriptions were built by concatenation, so a
 *     suburb with a long `commonInstall` sentence produced a 390
 *     character description. They now get clamped at a word boundary.
 *
 * The suffix is deliberately "Advanced Gas" rather than the full
 * "Advanced Gas & Aircon": nine characters back is a meaningful part of
 * a 60 character budget, and nobody searching for us types the "&".
 */

/** What the root layout appends. Kept here so the budget maths below
 *  can't drift away from what actually gets rendered. */
export const TITLE_SUFFIX = " | Advanced Gas";

/** Characters available to a page's own title before the suffix. */
export const TITLE_BUDGET = 60 - TITLE_SUFFIX.length;

/** Google's description cut-off, with a couple of characters spare. */
export const DESCRIPTION_BUDGET = 155;

/**
 * Trims to `max` at a word boundary. Returns the input untouched when it
 * already fits, so short titles never pick up an ellipsis they don't
 * need.
 *
 * Trailing punctuation left over from the cut is stripped, because
 * "Heat Pump Installation Pakenham," reads like a mistake in a search
 * result and "Heat Pump Installation Pakenham" doesn't.
 */
function clamp(input: string, max: number): string {
  const s = input.trim().replace(/\s+/g, " ");
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // A single word longer than the budget is a pathological case; take
  // the hard cut rather than returning an empty string.
  const trimmed = lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut;
  return trimmed.replace(/[\s,·|\-–—:;.]+$/, "");
}

/**
 * A page title, without the site suffix. Pass the whole thing you'd
 * like to say; this keeps as much of it as will actually be displayed.
 */
export function pageTitle(main: string, budget = TITLE_BUDGET): string {
  return clamp(main, budget);
}

/**
 * A meta description, clamped to what Google shows. Prefers to end on a
 * sentence: if there's a full stop in the last third of the allowance,
 * the description ends there rather than mid-clause.
 */
export function metaDescription(text: string, budget = DESCRIPTION_BUDGET): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (s.length <= budget) return s;
  const cut = s.slice(0, budget);
  const lastStop = cut.lastIndexOf(". ");
  if (lastStop > budget * 0.66) return cut.slice(0, lastStop + 1);
  return clamp(cut, budget);
}

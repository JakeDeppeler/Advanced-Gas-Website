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

/**
 * Title for a page whose distinguishing detail sits at the END of the
 * string, which is exactly where a length clamp does its damage.
 *
 * The Panasonic products are the case that proved it. Their names run
 * "Panasonic CO₂ Split · Glass-Lined · 4 kW · 250L", and the only thing
 * separating one from the next is the last six characters. Clamping to
 * fit the site suffix removed the capacity and produced four pairs of
 * identical titles, which an audit correctly reports as duplicate
 * pages.
 *
 * So the suffix is what gives way, not the content. If the whole thing
 * fits in 60 characters it keeps the suffix; if it doesn't, the page
 * gets its name and no suffix at all. A title without the company name
 * is a small loss. Two pages sharing a title is a real one.
 *
 * Returns a Metadata `title` object because `absolute` is what stops
 * the root layout appending the suffix a second time.
 */
export function absoluteTitle(main: string): { absolute: string } {
  const s = main.trim().replace(/\s+/g, " ");
  const withSuffix = `${s}${TITLE_SUFFIX}`;
  return { absolute: withSuffix.length <= 60 ? withSuffix : clamp(s, 60) };
}

import type { Metadata } from "next";

/**
 * The whole metadata object for a page, built from one title and one
 * description.
 *
 * This exists because of WEB-004. In the App Router, a page that sets
 * `title` but not `openGraph.title` does NOT get its own title in the
 * OG tag — it inherits the root layout's hardcoded `openGraph.title`,
 * which is the homepage title. So every blog post and every area page
 * was sharing to Facebook as "Aircon & Heat Pump Installation |
 * Advanced Gas, Pakenham". The title tag was right; the share preview
 * was the homepage.
 *
 * Routing every `generateMetadata` through here means the OG and
 * Twitter title/description can never drift from the page title again —
 * they're the same two strings. `title` is passed absolute so the
 * layout template doesn't append the suffix a second time; the OG title
 * carries the suffix itself so a share card still reads as ours.
 *
 * `image` defaults to the team photo. Pass a page-specific one where
 * there is one worth showing.
 */
export function seoMeta(opts: {
  /** The page's own title, without the site suffix. Clamped for you. */
  title: string;
  description: string;
  /** Path, e.g. `/areas/officer`. Becomes the canonical and the OG url. */
  canonical: string;
  /** OG/Twitter image path. Defaults to the team photo. */
  image?: string;
  /** For blog posts: renders as an `article` OG type with these dates. */
  article?: { publishedTime?: string; modifiedTime?: string; authors?: string[] };
  /** True for pages whose distinguishing detail sits at the END of the
   *  title — product capacities, fault codes. The site suffix gives way
   *  before the content does. See absoluteTitle. */
  absolute?: boolean;
}): Metadata {
  const description = metaDescription(opts.description);
  const img = opts.image ?? "/team-photo.webp";

  // `title` is what the layout template consumes; `ogTitle` is the plain
  // string for the share card, which always wants the company name in
  // it. In absolute mode the two converge on absoluteTitle's output.
  const titleField = opts.absolute ? absoluteTitle(opts.title) : pageTitle(opts.title);
  const ogTitle = opts.absolute
    ? absoluteTitle(opts.title).absolute
    : `${pageTitle(opts.title)}${TITLE_SUFFIX}`;

  return {
    title: titleField,
    description,
    alternates: { canonical: opts.canonical },
    openGraph: {
      type: opts.article ? "article" : "website",
      locale: "en_AU",
      url: opts.canonical,
      siteName: "Advanced Gas & Aircon",
      title: ogTitle,
      description,
      images: [{ url: img }],
      ...(opts.article ?? {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [img],
    },
  };
}

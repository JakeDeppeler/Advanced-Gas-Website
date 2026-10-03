/**
 * The blog's text helpers — the parts the editor needs in the browser.
 *
 * Kept apart from blogMerge.ts because that module imports every article in
 * blog.ts, and the editor has no reason to ship a dozen articles' worth of
 * text to the browser to turn a title into a web address.
 *
 * Pure: no database, no React.
 */

import type { Section } from "@/lib/blog";
import { parseProse } from "@/lib/portal/prose";

/** The blog index's filter chips: the topics before the built-in articles add their own. */
export const BASE_CATS = [
  "VEU rebates", "Heat pumps", "Aircon", "Gas safety", "Hot water", "Costs & savings",
];

/**
 * A post with no cover photo still has to render inside a fixed-ratio image
 * box on the index, so it gets the one the site already ships rather than a
 * broken image or a hole in the grid.
 */
export const FALLBACK_PHOTO = "/270L-istore-heatpump.webp";

/**
 * Lower-case, hyphenated, no leading or trailing hyphen. It is a URL.
 *
 * Here rather than beside the save action: that file is "use server", and a
 * sync helper exported from one becomes a server call. The editor calls this
 * on every keystroke to show the address under the title, which as a server
 * call threw "Server Functions cannot be called during initial render".
 */
export const toSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

/** The markdown-lite body, as the Section[] the public post page renders. */
export function bodySections(body: string): Section[] {
  return parseProse(body).map((b): Section =>
    b.kind === "h" ? { type: "h2", text: b.text }
      : b.kind === "ul" ? { type: "ul", items: b.items }
        : { type: "p", text: b.text },
  );
}

/**
 * A post's Section[] as the markdown-lite the editor writes.
 *
 * The inverse of `bodySections`, so an article written in blog.ts can be
 * opened in the editor. The three block types are exactly the three the
 * markdown-lite has, which is what makes the round trip lossless — and
 * `roundTrips` below is how the editor checks that before it offers one.
 */
export function sectionsToBody(content: Section[]): string {
  return content
    .map((b) => (b.type === "h2" ? `## ${b.text}` : b.type === "ul" ? b.items.map((i) => `- ${i}`).join("\n") : b.text))
    .join("\n\n");
}

/* ------------------------------------------------------- Google checks */

export type PostCheck = {
  k: string;
  /** What passing means, said as the goal. */
  label: string;
  ok: boolean;
  /** The detail: the count, and what it should be. */
  hint: string;
  /** What's wrong, in two or three words, for a column. */
  fix: string;
};

/** Words in a post, counted the way reading time is. */
export function wordCount(content: Section[]): number {
  const text = content.map((b) => (b.type === "ul" ? b.items.join(" ") : b.text)).join(" ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Five things that decide how a post shows up on Google, checked.
 *
 * Each is something Google's own guidance names and somebody in the office can
 * fix in the editor in a minute. Not a ranking prediction — nothing here knows
 * what anyone is searching for — which is why it is a count of checks passed
 * and never called a score out of a hundred.
 */
export function postChecks(p: {
  title: string; seoTitle?: string | null; blurb: string; photo?: string | null; photoAlt?: string | null; content: Section[];
}): PostCheck[] {
  const headline = (p.seoTitle || p.title || "").trim();
  const words = wordCount(p.content);
  const heads = p.content.filter((b) => b.type === "h2").length;
  const desc = p.blurb.trim().length;
  const hasPhoto = Boolean(p.photo) && p.photo !== FALLBACK_PHOTO;
  return [
    { k: "headline", label: "Headline fits on Google", ok: headline.length > 0 && headline.length <= 60,
      hint: headline.length > 60 ? `${headline.length} characters — Google cuts it at about 60` : "Give it a headline",
      fix: headline.length > 60 ? "headline too long" : "no headline" },
    { k: "desc", label: "Description is the right length", ok: desc >= 70 && desc <= 160,
      hint: desc < 70 ? `${desc} characters — say more, 70 to 160 reads best` : `${desc} characters — Google cuts it at about 160`,
      fix: desc === 0 ? "no description" : desc < 70 ? "description too short" : "description too long" },
    { k: "photo", label: "Cover photo, described", ok: hasPhoto && Boolean(p.photoAlt?.trim()),
      hint: hasPhoto ? "Describe what the photo shows" : "It's using the stock photo",
      fix: hasPhoto ? "photo not described" : "no cover photo" },
    { k: "length", label: "Long enough to answer the question", ok: words >= 600,
      hint: `${words} words — 600 or more`,
      fix: `${words} words, under 600` },
    { k: "heads", label: "Broken up with headings", ok: heads >= 2,
      hint: `${heads} heading${heads === 1 ? "" : "s"} — two or more`,
      fix: heads === 0 ? "no headings" : "one heading" },
  ];
}

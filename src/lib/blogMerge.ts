/**
 * Posts written in the portal, over the ones in `blog.ts`.
 *
 * The constant keeps the posts that are already written, indexed and ranking.
 * A stored row is a new post, or an override of one by its slug.
 *
 * Pure — no database, no React — because the public blog, the sitemap, the
 * home page and the site search all read through it and must all agree. If
 * this ever disagreed with itself, Google would see one thing and a reader
 * another.
 */

import { posts as BUILT_IN, type BlogPost, type Section } from "@/lib/blog";
import { parseProse, readingMinutes } from "@/lib/portal/prose";

export type StoredPost = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  blurb: string;
  cat: string;
  author: string;
  photo: string | null;
  photoAlt: string;
  body: string;
  featured: boolean;
  onHome: boolean;
  publishedOn: string | null;
  updatedOn: string | null;
  status: "draft" | "published";
  updatedBy: string | null;
  updatedAt: string;
};

/** The categories the blog index filters by. */
export const POST_CATS = [
  "VEU rebates", "Heat pumps", "Aircon", "Gas safety", "Hot water", "Costs & savings",
] as const;

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

export function toBlogPost(row: StoredPost): BlogPost {
  return {
    slug: row.slug,
    cat: row.cat,
    read: `${readingMinutes(row.body)} min read`,
    title: row.title,
    publishedOn: undefined,
    publishedISO: row.publishedOn ?? row.updatedAt.slice(0, 10),
    updatedISO: row.updatedOn ?? undefined,
    author: row.author,
    seoTitle: row.seoTitle ?? undefined,
    blurb: row.blurb,
    photo: row.photo || FALLBACK_PHOTO,
    photoAlt: row.photoAlt || row.title,
    featured: row.featured || undefined,
    content: bodySections(row.body),
  } as BlogPost;
}

/**
 * Is this post live yet?
 *
 * A date in the future means scheduled, and scheduled means not on the site.
 * Compared in Melbourne, because "today" on a date field is a local idea and
 * the server's UTC clock is a day ahead for ten hours of every day.
 */
export function isLive(row: StoredPost, now = new Date()): boolean {
  if (row.status !== "published") return false;
  if (!row.publishedOn) return true;
  const today = now.toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  return row.publishedOn <= today;
}

/**
 * Every post the public site should show, newest first.
 *
 * `preview` is for the portal, where somebody editing needs to see drafts and
 * scheduled posts in the list. It is never true on a public page.
 */
export function mergePosts(stored: StoredPost[], preview = false): BlogPost[] {
  const live = stored.filter((r) => preview || isLive(r));
  const bySlug = new Map(live.map((r) => [r.slug, r]));

  const overridden = BUILT_IN.map((p) => {
    const row = bySlug.get(p.slug);
    return row ? toBlogPost(row) : p;
  });
  const fresh = live.filter((r) => !BUILT_IN.some((p) => p.slug === r.slug)).map(toBlogPost);

  // Newest first, which is the order the index and the home page both want.
  // Featured still sorts to the top on the index itself; that is its job.
  return [...fresh, ...overridden].sort((a, b) => b.publishedISO.localeCompare(a.publishedISO));
}

export function findMerged(all: BlogPost[], slug: string): BlogPost | undefined {
  return all.find((p) => p.slug === slug);
}

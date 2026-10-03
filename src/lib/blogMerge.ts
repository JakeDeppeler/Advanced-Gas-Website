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
import { readingMinutes } from "@/lib/portal/prose";
import { BASE_CATS, FALLBACK_PHOTO, bodySections, sectionsToBody, toSlug, postChecks, wordCount, type PostCheck } from "@/lib/blogText";

export { BASE_CATS, FALLBACK_PHOTO, bodySections, sectionsToBody, toSlug, postChecks, wordCount };
export type { PostCheck };

/**
 * Every topic a post can carry: the blog index's chips, and whatever the
 * articles written in blog.ts already use. Without the second half, opening
 * one of those in the editor showed the wrong topic in the box and saving it
 * failed with "Pick a topic".
 */
export const POST_CATS: string[] = [...new Set([...BASE_CATS, ...BUILT_IN.map((p) => p.cat)])];

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

/**
 * Would saving this article's text give back exactly the article?
 *
 * A paragraph that happens to begin "- " or "## ", or one carrying a line
 * break, would come back as something else — a bullet, a heading, two
 * paragraphs. The live article would change on its first save without anyone
 * having touched that part of it, so a post that doesn't survive the trip is
 * not offered for editing.
 */
export function roundTrips(content: Section[]): boolean {
  return JSON.stringify(bodySections(sectionsToBody(content))) === JSON.stringify(content);
}

/** Is this one of the articles written in blog.ts? */
export const isBuiltIn = (slug: string) => BUILT_IN.some((p) => p.slug === slug);
export const builtInPost = (slug: string) => BUILT_IN.find((p) => p.slug === slug);

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
    onHome: row.onHome || undefined,
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

  // An edit to a built-in article keeps whatever the row doesn't carry — the
  // layout flag the index alternates cards on — rather than dropping it.
  const overridden = BUILT_IN.map((p) => {
    const row = bySlug.get(p.slug);
    return row ? { ...p, ...toBlogPost(row) } : p;
  });
  const fresh = live.filter((r) => !BUILT_IN.some((p) => p.slug === r.slug)).map(toBlogPost);

  // Newest first, which is the order the index and the home page both want.
  // Featured still sorts to the top on the index itself; that is its job.
  return [...fresh, ...overridden].sort((a, b) => b.publishedISO.localeCompare(a.publishedISO));
}

export function findMerged(all: BlogPost[], slug: string): BlogPost | undefined {
  return all.find((p) => p.slug === slug);
}

/**
 * The home page's three: anything pinned there first, then the newest.
 *
 * The "Show on the home page" switch in the editor sets the pin. Before this
 * the switch saved and nothing read it, so the home page went on showing the
 * three newest whatever it said.
 */
export function homePosts(all: BlogPost[], n = 3): BlogPost[] {
  const pinned = all.filter((p) => p.onHome);
  return [...pinned, ...all.filter((p) => !p.onHome)].slice(0, n);
}


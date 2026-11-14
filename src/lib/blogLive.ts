import "server-only";
import { posts as BUILT_IN, type BlogPost } from "@/lib/blog";
import { mergePosts } from "@/lib/blogMerge";
import { dbConfigured, listStoredPosts } from "@/lib/portal/db";

/**
 * Every post the public site actually shows.
 *
 * The one place /blog, /blog/[slug], the home page, the sitemap and the site
 * search all read, so they cannot disagree about what has been published.
 *
 * Note the file next door, `blogPosts.ts`: a second, older store with its own
 * BlogPost type that nothing on the public site reads. This is the live one —
 * `blog.ts` plus whatever has been written in the portal.
 *
 * Falls back to the posts in `blog.ts` whenever the database is not
 * configured or does not answer. The blog is a marketing page that has to
 * build and render whatever Supabase is doing: eight posts that are slightly
 * stale beat a failed build or an archive that is suddenly empty.
 *
 * "Does not answer" includes answering too slowly. The live project builds
 * in Washington against the database in Tokyo, and a read that hung there
 * held /blog/[slug] past Next's 60-second limit for collecting page data,
 * twice, which fails the whole build (Nov 2026: about half the live
 * project's builds that week). An error fell back; a hang never did. Fifteen
 * seconds is several times a normal read from there and well inside 60.
 */
const READ_LIMIT_MS = 15_000;

export async function publishedPosts(): Promise<BlogPost[]> {
  if (!dbConfigured()) return BUILT_IN;
  try {
    return mergePosts(await listStoredPosts({ timeoutMs: READ_LIMIT_MS }));
  } catch {
    return BUILT_IN;
  }
}

export async function publishedPost(slug: string): Promise<BlogPost | undefined> {
  return (await publishedPosts()).find((p) => p.slug === slug);
}

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { BLOG_TAG, deleteStoredPost, saveStoredPost } from "@/lib/portal/db";
import { uploadCover } from "@/lib/portal/blogPhotos";
import { POST_CATS, isBuiltIn, toSlug } from "@/lib/blogMerge";
import { AUTHORS, posts as BUILT_IN } from "@/lib/blog";

export type ActionResult = { ok: boolean; error?: string; slug?: string };

async function requireEditor() {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return null;
  return me;
}

/**
 * Every page on the site whose address a post must not take.
 *
 * A post slugged "pricing" would not collide — posts live under /blog — but
 * one slugged the same as an existing post would quietly replace it, and one
 * slugged the same as a post in blog.ts would override that post rather than
 * being a new one. Both are worth saying out loud.
 */
function slugClash(slug: string, original: string | null): string | null {
  if (slug === original) return null;
  // Moving a built-in article would leave the original standing at its old
  // address beside a copy at the new one: there is no row there to take away.
  if (original && isBuiltIn(original)) {
    return "That article's address is fixed — Google and every link to it already use it.";
  }
  if (BUILT_IN.some((p) => p.slug === slug)) {
    return "A post written in the code already has that address. Pick another, or you'd be replacing it.";
  }
  return null;
}

export async function savePost(input: {
  /** The slug this post had before the edit, or null for a new one. */
  original: string | null;
  slug: string;
  title: string;
  seoTitle: string;
  blurb: string;
  cat: string;
  author: string;
  photo: string;
  photoAlt: string;
  body: string;
  featured: boolean;
  onHome: boolean;
  publishedOn: string;
  publish: boolean;
}): Promise<ActionResult> {
  const me = await requireEditor();
  if (!me) return { ok: false, error: "Not allowed." };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Give it a title." };
  const slug = toSlug(input.slug || title);
  if (!slug) return { ok: false, error: "That title doesn't make a usable web address — set one yourself." };
  const clash = slugClash(slug, input.original);
  if (clash) return { ok: false, error: clash };
  if (!POST_CATS.includes(input.cat)) return { ok: false, error: "Pick a topic." };
  if (!AUTHORS[input.author]) return { ok: false, error: "Pick an author." };

  // Publishing is the point at which this becomes a page on the public web,
  // so the things Google and a reader both need are required then and not
  // before. A draft can be as half-finished as it likes.
  if (input.publish) {
    if (!input.body.trim()) return { ok: false, error: "There's nothing in the post yet." };
    if (!input.blurb.trim()) return { ok: false, error: "Write the description — it's what shows under the title on Google." };
    if (input.photo && !input.photoAlt.trim()) {
      return { ok: false, error: "Describe the cover photo. A reader on a screen reader gets that line and nothing else." };
    }
  }

  const res = await saveStoredPost({
    slug,
    title,
    seoTitle: input.seoTitle.trim() || null,
    blurb: input.blurb.trim(),
    cat: input.cat,
    author: input.author,
    photo: input.photo.trim() || null,
    photoAlt: input.photoAlt.trim(),
    body: input.body,
    featured: input.featured,
    onHome: input.onHome,
    publishedOn: input.publishedOn || new Date().toISOString().slice(0, 10),
    // An edit to something already on the site is an update, and the page
    // says "Updated …" rather than pretending it is new.
    updatedOn: input.original && input.publish ? new Date().toISOString().slice(0, 10) : null,
    status: input.publish ? "published" : "draft",
    updatedBy: me.name || me.email,
  });
  if (!res.ok) {
    if (res.error === "not-configured") return { ok: false, error: "The database isn't connected yet." };
    return { ok: false, error: "Couldn't save. Try again." };
  }

  // The address changed, so the old one is now an empty page. Say so rather
  // than leaving a 404 somebody finds from Google in three weeks.
  if (input.original && input.original !== slug) await deleteStoredPost(input.original).catch(() => undefined);

  revalidateBlog(slug, input.original);
  return { ok: true, slug };
}

export async function unpublishPost(slug: string): Promise<ActionResult> {
  const me = await requireEditor();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await deleteStoredPost(slug);
  if (!res.ok) return { ok: false, error: "Couldn't remove it. Try again." };
  revalidateBlog(slug, null);
  return { ok: true };
}

/**
 * Everywhere a post appears, told to rebuild.
 *
 * The blog pages are prerendered, so without this a published post would not
 * show until the next deploy — which is the whole thing this editor exists to
 * avoid. The home page carries the three latest, the sitemap tells Google,
 * and the site search has to find it.
 */
function revalidateBlog(slug: string, original: string | null) {
  // The read itself first: the pages below are prerendered from a cached
  // fetch, so rebuilding them against a stale cache would change nothing.
  revalidateTag(BLOG_TAG);
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  if (original && original !== slug) revalidatePath(`/blog/${original}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/portal/blog");
}

/**
 * Put a cover photo in the bucket and hand back its address.
 *
 * Taken as a FormData action rather than a JSON one because the file never
 * has to become a base64 string in the browser's memory on the way.
 */
export async function uploadCoverPhoto(form: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const me = await requireEditor();
  if (!me) return { ok: false, error: "Not allowed." };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick an image." };
  const slug = toSlug(String(form.get("slug") ?? "")) || "post";
  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  // Stamped, so replacing a cover doesn't leave the old one cached in front
  // of the new one on a CDN that has already seen that address.
  const path = `${slug}/${Date.now()}.${ext}`;

  const res = await uploadCover(path, await file.arrayBuffer(), file.type);
  return res.ok ? { ok: true, url: res.url } : { ok: false, error: res.error };
}

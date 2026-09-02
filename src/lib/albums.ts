/**
 * Job albums — our own photos and videos, grouped per job.
 *
 * WHY THIS EXISTS
 * Instagram only ever showed part of the picture: the feed misses older
 * work, drops anything we never posted, and we don't control how it's
 * ordered. This is the gallery we own. Instagram still appears alongside
 * it, but it is no longer the only source.
 *
 * ⚠️ OUR WORK ONLY
 * Same rule as gallery.ts and brandGallery.ts — every file referenced
 * here must be a photo or video of a job we actually did. Manufacturer
 * renders live in brands.ts and are labelled as such on the pages that
 * use them. Keeping them apart is what lets the gallery say "our
 * installs" and mean it.
 *
 * ── HOW TO ADD AN ALBUM ────────────────────────────────────────────
 *
 *   1. Make a folder:  public/jobs/<album-slug>/
 *   2. Drop the photos and videos in. Any order, any filename.
 *   3. Run:  node scripts/build-albums.mjs
 *      It prints a ready-made block for this file, with the items listed
 *      and the first photo picked as the cover.
 *   4. Paste it in and write the alt text and captions.
 *
 * A one-photo job is just an album with one item — it renders as a
 * single tile rather than a stack, so there's no reason to treat the two
 * differently.
 *
 * ── VIDEO ──────────────────────────────────────────────────────────
 * Use MP4 (H.264). Give every video a `poster` frame, otherwise the grid
 * shows a black rectangle until someone clicks it. The build script
 * warns when a poster is missing.
 *
 * ── ALT TEXT ───────────────────────────────────────────────────────
 * Describe what's in the shot, not the brand name again. "Reclaim CO₂
 * split heat pump on a brick wall with the tank beside it" beats
 * "Reclaim heat pump". It's read aloud by screen readers and it's most
 * of what Google Images has to work with.
 */

export type AlbumItem = {
  type: "image" | "video";
  src: string;
  /** Required on images. On video it describes the poster frame. */
  alt: string;
  caption?: string;
  /** Video only — the still shown before playback. */
  poster?: string;
};

export type Album = {
  slug: string;
  title: string;
  /** Brand slug, so brand pages can pull their own jobs. */
  brand?: string;
  /** Service slug, so service pages can do the same. */
  service?: string;
  suburb?: string;
  /** ISO date — sorts the grid newest first. */
  date?: string;
  blurb?: string;
  items: AlbumItem[];
};

/**
 * Albums, newest first.
 *
 * Empty for now — the gallery falls back to the curated single-photo set
 * in gallery.ts until Jake drops the first folder in. Shipping an empty
 * array beats shipping placeholders that look like real work.
 */
export const ALBUMS: Album[] = [];

/** Cover image for an album — first image, or the first video's poster. */
export function albumCover(album: Album): AlbumItem | undefined {
  return (
    album.items.find((i) => i.type === "image") ??
    album.items.find((i) => i.poster)
  );
}

export function albumsForBrand(brand: string): Album[] {
  return ALBUMS.filter((a) => a.brand === brand);
}

export function albumsForService(service: string): Album[] {
  return ALBUMS.filter((a) => a.service === service);
}

/** Brands that actually have albums, for the filter row. */
export function albumBrands(): string[] {
  return [...new Set(ALBUMS.map((a) => a.brand).filter(Boolean) as string[])].sort();
}

export function countItems(albums: Album[]): { photos: number; videos: number } {
  let photos = 0;
  let videos = 0;
  for (const a of albums) {
    for (const i of a.items) i.type === "video" ? videos++ : photos++;
  }
  return { photos, videos };
}

/**
 * Real install photos, per brand.
 *
 * ⚠️ OUR PHOTOGRAPHY ONLY
 * Everything referenced here must be a photo of a job we actually did.
 * Manufacturer product renders live at the top level of /public and are
 * referenced from brands.ts — they're labelled as manufacturer imagery on
 * the pages that use them. Keeping the two apart is what lets a brand page
 * claim "our installs" and mean it.
 *
 * HOW TO ADD PHOTOS
 *   1. Drop them into public/brand-installs/ (filename starting with the
 *      brand, e.g. reclaim-berwick-split.jpg)
 *   2. node scripts/sort-brand-photos.mjs --write
 *   3. Paste the generated block below and write the alt text
 *
 * ALT TEXT MATTERS — it's read aloud by screen readers and it's most of
 * what Google Images has to go on. Describe what's in the shot, not the
 * brand name again: "Reclaim CO₂ split heat pump mounted on a brick wall
 * with the tank beside it" beats "Reclaim heat pump".
 *
 * Anything left empty just means that brand's page falls back to the
 * manufacturer gallery in brands.ts — no breakage, so it's safe to fill
 * these in one brand at a time.
 */

export type InstallShot = {
  src: string;
  alt: string;
  /** Optional — shown as a small caption under the photo. */
  caption?: string;
  /** Optional — suburb the job was in. */
  suburb?: string;
};

export const BRAND_INSTALLS: Record<string, InstallShot[]> = {
  // ── Reclaim Energy ──────────────────────────────────────────────
  reclaim: [],

  // ── Brivis ──────────────────────────────────────────────────────
  brivis: [],

  // ── Kaden ───────────────────────────────────────────────────────
  kaden: [],

  // ── Mitsubishi Electric ─────────────────────────────────────────
  "mitsubishi-electric": [],

  // ── Thermann ────────────────────────────────────────────────────
  thermann: [],

  // ── iStore ──────────────────────────────────────────────────────
  istore: [],

  // ── Zonemate ────────────────────────────────────────────────────
  zonemate: [],
};

/** Install shots for a brand, or an empty array if none are wired yet. */
export function installsFor(brandSlug: string): InstallShot[] {
  return BRAND_INSTALLS[brandSlug] ?? [];
}

/** Every install shot across all brands — used by the /gallery page. */
export function allInstalls(): (InstallShot & { brand: string })[] {
  return Object.entries(BRAND_INSTALLS).flatMap(([brand, shots]) =>
    shots.map((s) => ({ ...s, brand })),
  );
}

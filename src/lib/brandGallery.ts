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
  reclaim: [
    { src: "/reclaim-split-stand-back-shot.webp", alt: "A Reclaim CO₂ split heat pump and its tank side by side against a brick wall", caption: "CO₂ split" },
    { src: "/reclaim-split-back-2.jpg", alt: "A Reclaim tank on its slab with the heat pump beside it, set among garden beds", caption: "CO₂ split" },
    { src: "/ba-hw-after.webp", alt: "A Reclaim ECO all-in-one heat pump on a new concrete pad", caption: "ECO R290 all-in-one" },
    { src: "/reclaim-spit-close-up.webp", alt: "The base of a Reclaim tank on a gravel bed, with its insulated pipework", caption: "Set on its slab" },
    { src: "/reclaim-split-close-1.jpg", alt: "The base of a Reclaim tank on its slab, with insulated pipework", caption: "Insulated pipework" },
    { src: "/reclaim-and-mitsubishi.jpg", alt: "A Reclaim tank and heat pump beside two Mitsubishi Electric outdoor units", caption: "Beside the aircon" },
  ],

  // ── Brivis ──────────────────────────────────────────────────────
  brivis: [],

  // ── Kaden ───────────────────────────────────────────────────────
  kaden: [
    // The rating plates on these say Kaden.
    { src: "/ducted-condenser.webp", alt: "A Kaden outdoor unit on a stand against a brick wall", caption: "Outdoor unit" },
    { src: "/ducted-split.webp", alt: "A Kaden ducted indoor unit in a roof space, with the ducts running off it", caption: "Ducted, in the roof" },
    { src: "/4 kadens with chaz.jpg", alt: "One of our installers beside four boxed Kaden systems, ready for a whole-house job", caption: "A whole house in one go" },
  ],

  // ── Mitsubishi Electric ─────────────────────────────────────────
  "mitsubishi-electric": [
    // Our job (the Reclaim beside them is ours too). More to come from Jake.
    { src: "/reclaim-and-mitsubishi.jpg", alt: "Two Mitsubishi Electric outdoor units mounted on a brick wall beside a Reclaim heat pump tank", caption: "Outdoor units" },
  ],

  // ── Thermann ────────────────────────────────────────────────────
  thermann: [
    { src: "/thermann-contineues-flow-standing-back.webp", alt: "A Thermann continuous flow gas unit on a brick wall, with its pipework run neatly below", caption: "Continuous flow" },
    { src: "/thermann-continues-flow-close-up.webp", alt: "Close-up of a Thermann continuous flow unit mounted on brick", caption: "Continuous flow" },
    { src: "/thermann-heat-pump.webp", alt: "A Thermann all-in-one heat pump on a slab beside a brick wall", caption: "Heat pump" },
  ],

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

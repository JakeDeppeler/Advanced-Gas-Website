/**
 * Real install gallery.
 *
 * IMPORTANT: everything in here is OUR photography from real jobs — no
 * manufacturer catalogue renders. Product shots live in brands.ts and are
 * clearly labelled as manufacturer imagery on the pages that use them.
 * If a photo isn't ours, it doesn't belong in this file.
 *
 * The full, always-growing set lives on Instagram; this is the curated
 * on-site selection.
 */

export type GalleryCategory =
  | "heat-pump"
  | "aircon"
  | "gas"
  | "ducted"
  | "evap"
  | "team";

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  "heat-pump": "Heat pump hot water",
  "aircon": "Split & multi-head aircon",
  "ducted": "Ducted systems",
  "gas": "Gas & hot water",
  "evap": "Evaporative cooling",
  "team": "The team",
};

export type GalleryShot = {
  src: string;
  alt: string;
  caption: string;
  category: GalleryCategory;
  /** Suburb the job was in, where we know it. */
  suburb?: string;
};

export const GALLERY: GalleryShot[] = [
  // ---- Heat pump hot water ----
  {
    src: "/reclaim-spit-close-up.webp",
    alt: "Reclaim CO₂ split heat pump outdoor unit close up on a finished install",
    caption: "Reclaim CO₂ split, outdoor unit mounted and commissioned",
    category: "heat-pump",
  },
  {
    src: "/reclaim-split-stand-back-shot.webp",
    alt: "Reclaim CO₂ split heat pump and tank installed against a house wall",
    caption: "Reclaim CO₂ split with tank, full install, stand-back shot",
    category: "heat-pump",
  },
  {
    src: "/reclaim-split-stand-back-shot-left-side.webp",
    alt: "Reclaim heat pump install viewed from the left side of the property",
    caption: "Same job from the other side, clean pipe run down the wall",
    category: "heat-pump",
  },
  {
    src: "/thermann-heat-pump.webp",
    alt: "Thermann heat pump hot water system installed at a Pakenham home",
    caption: "Thermann heat pump, like-for-like swap on the old tank pad",
    category: "heat-pump",
  },
  {
    src: "/reclaim-mitsubishi.webp",
    alt: "Reclaim heat pump and Mitsubishi Electric outdoor unit side by side",
    caption: "Reclaim heat pump + Mitsubishi condenser on the one wall",
    category: "heat-pump",
  },

  // ---- Split & multi-head aircon ----
  {
    src: "/kaden-indoor.webp",
    alt: "Kaden wall split indoor head installed in a living room",
    caption: "Kaden wall split, indoor head, brackets level, no wall damage",
    category: "aircon",
  },
  {
    src: "/Kaden Condesnser.jpg",
    alt: "Kaden outdoor condenser mounted on a bracket outside a home",
    caption: "Kaden condenser on a wall bracket, off the ground",
    category: "aircon",
  },
  {
    src: "/4 kadens with chaz.jpg",
    alt: "Four Kaden outdoor units installed at one property with Chaz",
    caption: "Four Kaden units, one property, multi-room job done in a day",
    category: "aircon",
  },

  // ---- Ducted ----
  {
    src: "/duct-work.webp",
    alt: "Flexible ductwork run through a roof cavity for a ducted system",
    caption: "Ductwork run through the roof cavity, supported, not sagging",
    category: "ducted",
  },
  {
    src: "/ducted-condenser.webp",
    alt: "Ducted system outdoor condenser installed beside a house",
    caption: "Ducted outdoor condenser on a level slab",
    category: "ducted",
  },
  {
    src: "/ducted-split.webp",
    alt: "Ducted split system indoor unit installed in a ceiling cavity",
    caption: "Ducted indoor unit craned into the ceiling cavity",
    category: "ducted",
  },

  // ---- Gas & hot water ----
  {
    src: "/gas-ducted-install.webp",
    alt: "Gas ducted heater installed in an internal cupboard",
    caption: "Gas ducted heater, in-cupboard retrofit, existing ducts reused",
    category: "gas",
  },
  {
    src: "/thermann-contineues-flow-standing-back.webp",
    alt: "Thermann continuous flow gas hot water unit mounted on an external wall",
    caption: "Thermann G-series continuous flow, external wall mount",
    category: "gas",
  },
  {
    src: "/thermann-continues-flow-close-up.webp",
    alt: "Close up of Thermann continuous flow gas hot water pipework",
    caption: "Close-up of the same job, tidy gas and water connections",
    category: "gas",
  },
  {
    src: "/gas-hot-water-changeover.webp",
    alt: "Gas hot water changeover completed the same day",
    caption: "Same-day hot water changeover, old unit out, new one running",
    category: "gas",
  },
  {
    src: "/gas-line-safe.webp",
    alt: "Excavator trenching for a new gas line",
    caption: "Trenching a new gas main in to the house",
    category: "gas",
  },

  // ---- Evap ----
  {
    src: "/evap-cooler-service.webp",
    alt: "Roof-mounted evaporative cooler being serviced",
    caption: "Pre-summer evap service, pump, pads and water lines",
    category: "evap",
  },

  // ---- Team ----
  {
    src: "/team-photo.webp",
    alt: "The Advanced Gas and Aircon team in front of the Pakenham workshop with sign-written vans",
    caption: "The team outside the Pakenham workshop",
    category: "team",
  },
];

/**
 * Before / after pairs for the swipe comparison slider.
 * Both images in a pair must be the same aspect ratio or the wipe
 * will misalign — check before adding.
 */
export type BeforeAfter = {
  slug: string;
  title: string;
  blurb: string;
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  suburb?: string;
  meta?: string[];
};

export const BEFORE_AFTER: BeforeAfter[] = [
  {
    slug: "electric-storage-to-heat-pump",
    title: "Old electric storage tank → Reclaim heat pump",
    blurb:
      "Aging electric storage tank sitting on bare dirt, pipework exposed and rusting at the base. Out it came, new concrete pad poured, Reclaim heat pump set on top, all pipework re-run and lagged. Same corner of the house, completely different result. Running cost drops by roughly three quarters on the changeover.",
    before: { src: "/ba-hw-before.webp", alt: "Old electric storage hot water tank on bare ground beside a house" },
    after: { src: "/ba-hw-after.webp", alt: "New Reclaim heat pump hot water system on a fresh concrete pad in the same position" },
    meta: ["Same-day changeover", "VEU rebate applied at quote", "New slab + re-run pipework"],
  },
];

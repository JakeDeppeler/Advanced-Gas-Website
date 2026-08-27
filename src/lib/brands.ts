/**
 * Brand + product catalogue for /brands/[brand] and /brands/[brand]/[product]
 * pages. Each product page targets exact-model long-tail search intent
 * ("Reclaim R290 315L installer Melbourne", "MSZ-AP25 installed price"), where
 * the manufacturer's own store-locator page currently ranks and we don't.
 *
 * Same data-driven approach as the suburbs file: unique per-model copy,
 * verifiable specs, a stated "why we like it" so no two pages read the same.
 */

export type ProductCategory =
  | "split-system"
  | "multi-head"
  | "ducted"
  | "cassette"
  | "floor-console"
  | "heat-pump"
  | "gas-continuous-flow"
  | "gas-storage"
  | "electric-storage"
  | "solar-hot-water"
  | "controller"
  | "zoning"
  | "damper"
  | "accessory";

/**
 * The filter groups on /range.
 *
 * `categoryLabel` is written per product and is deliberately specific —
 * "Panasonic CO₂ split heat pump · stainless tank" tells you exactly
 * what that model is, which is right on a product card and useless as a
 * filter with one item behind it. This maps the 24 labels down to the
 * dozen groups a customer would actually pick from.
 *
 * Keyed on `category` first, then narrowed by what the label says, so a
 * new product inherits a sensible group without anybody adding a line.
 */
export function rangeFilterType(category: ProductCategory, categoryLabel: string): string {
  const l = categoryLabel.toLowerCase();
  switch (category) {
    case "split-system":
      return "Split system";
    case "multi-head":
      return "Multi-head";
    case "ducted":
      return l.includes("evaporative")
        ? "Evaporative cooling"
        : l.includes("gas ducted")
        ? "Gas ducted heating"
        : "Ducted air conditioning";
    case "floor-console":
      return "Floor console";
    case "heat-pump":
      // The split ones have the compressor outside and the tank against
      // the wall; the all-in-ones are a single shell. It is the first
      // question anybody asks, so it is the filter.
      return l.includes("split") ? "Split heat pump" : "Heat pump, all-in-one";
    case "gas-continuous-flow":
      return "Gas continuous flow";
    case "gas-storage":
      return "Gas storage";
    case "electric-storage":
      return "Electric storage";
    case "controller":
    case "zoning":
    case "damper":
      return "Zoning & controls";
    default:
      return "Accessories";
  }
}

export type Product = {
  slug: string;
  name: string;
  model: string;
  category: ProductCategory;
  categoryLabel: string;
  capacity?: string;
  refrigerant?: string;
  starRating?: string;
  veuEligible: boolean;
  installedPriceFrom?: string;
  bestFor: string;
  ourTake: string;
  specs: { label: string; value: string }[];
  /** Bullet list of product features (rendered in the Features tab).
   *  When absent, the product page falls back to brand.keyFeatures. */
  features?: string[];
  /** Bullet list of reasons we install this specific model (rendered in
   *  the "Why we install" tab). When absent, falls back to the ourTake
   *  paragraph + brand-level context. */
  whyWeInstall?: string[];
  related?: string[];
  /** Product-specific photo override. Falls back to categoryPhoto[category]
   *  when absent. Path is relative to /public. Use for real product shots
   *  (manufacturer or our own install photos). */
  photo?: string;
  photoAlt?: string;
  /** Heat OUTPUT of the compressor in kW, on heat pump products.
   *  This is what drives recovery rate and therefore what tank size a
   *  household needs, so it belongs next to tankLitres rather than being
   *  guessed at by the sizing tool. */
  compressorKw?: number;
  /** Stored hot water capacity in litres.
   *  Set ONLY on storage products — never on continuous-flow units (they
   *  have no tank) or controllers. Drives the shower-delivery panel and
   *  the sizing calculator's product links. Explicit data rather than
   *  parsing `capacity` at render time, because that regex happily
   *  matched a wall controller sitting next to a tank.  */
  tankLitres?: number;
};

export type Brand = {
  slug: string;
  name: string;
  tagline: string;
  origin: string;
  intro: string;
  ourTake: string;
  accreditation?: string;
  productLabel: string;
  /** Hero photo for the brand hub + brand card. WebP only. */
  photo: string;
  photoAlt: string;
  /**
   * True where `photo` is a real photograph rather than a manufacturer
   * cut-out on white or on transparency. Only a scene goes full bleed
   * behind the header: six of the seven brand photos are renders, and
   * stretched across a hero at 40% opacity a render reads as a blurry
   * grey shape nobody can identify. Cut-outs get a panel instead.
   */
  photoScene?: boolean;
  /** Working existing image used as the visual fallback while the
   *  manufacturer `photo` hasn't been saved to /public yet. */
  photoFallback?: string;
  /** Accent hex for the brand's card treatment (subtle top border etc). */
  accent: string;
  /** Year established / brand founded (used in "about this brand" strip). */
  established?: string;
  /** Standard warranty on the brand's products, brand-wide. Individual
   *  products may extend this in their own specs table. */
  warranty?: string;
  /** 3-6 short bullet points on why this brand is worth choosing.
   *  Rendered as a checklist on the brand hub. */
  keyFeatures?: string[];
  /** One paragraph on how the brand shows up specifically in Melbourne's
   *  south-east · housing stock it suits, suburbs we install a lot in. */
  commonInMelbourne?: string;
  /** Parts + service context (how quickly we can get replacement parts,
   *  service turnaround, etc). */
  support?: string;
  /** Optional links to spec sheets / brochures on the manufacturer's site. */
  resources?: { label: string; href: string }[];
  products: Product[];

  /* ---------------------------------------------------------------
   * The whole-home-filtration treatment.
   *
   * The brand pages were a hero, a facts strip, a wall of key-feature
   * bullets and a grid of every model in the catalogue — which for
   * Mitsubishi is sixteen cards with no shape to them. The filtration
   * pages solved the same problem: meet the shapes first, then the
   * models inside the shape you picked.
   *
   * Every field below is optional and every section hides itself when
   * its field is absent, so brands convert one at a time rather than
   * all sixteen having to be rewritten before any of them can ship.
   * ------------------------------------------------------------- */

  /** Header sub-paragraph. Shorter than `intro`, which is a full
   *  argument and reads long under an h1. */
  heroSub?: string;
  /** "Where it goes" — the one line that says what kind of house and
   *  what part of it this brand ends up in. */
  fitsWhere?: string;
  /** The four figures along the bottom of the header. Authored rather
   *  than counted, because "16 models" is a fact and "5 system types"
   *  is arithmetic nobody asked for. */
  heroFacts?: { v: string; k: string }[];

  /** "Why this brand" as tabs. Written, not derived: `keyFeatures` are
   *  single statements, and splitting one into a tile face and a body
   *  truncates it mid-thought — the panel then just repeats the tile. */
  benefitsHeading?: string;
  benefitTiles?: { t: string; line: string; detail: string; icon?: string }[];

  /** "Choose your system" — the range grouped into the shapes somebody
   *  actually chooses between, each one linking down to its models. */
  systemsHeading?: string;
  systemsLede?: string;
  systems?: {
    id: string;
    label: string;
    blurb: string;
    photo: string;
    photoAlt: string;
    /** A real scene fills the card's photo panel; a studio cut-out sits
     *  inside it with padding. */
    photoScene?: boolean;
    priceFrom?: string;
    facts: { lead: string; note?: string }[];
    /** Product slugs in this group, in the order they should be listed. */
    models: string[];
  }[];

  /** "Keeping it working" — parts, service and what happens in year ten.
   *  The half of a brand argument that only matters after the sale, and
   *  therefore the half worth putting on the page before it. */
  servicing?: {
    heading: string;
    photo: string;
    photoAlt: string;
    body: string;
    facts: string[];
  };

  /** "How the job runs" — the numbered steps, brand-specific. */
  steps?: { title: string; detail: string }[];

  /** Brand-level FAQs. One open at a time, same as everywhere else. */
  faqs?: { q: string; a: string }[];
};

/** Category → photo map. Products fall through to this when they don't
 *  set a per-product `photo` override. All paths live in /public as WebP.
 *
 *  When real manufacturer shots are dropped into /public (see filename
 *  list below), swap the src to point at them here.
 *
 *  Filenames to save real photos as (Wave 3 of the photo-swap plan):
 *    /mitsubishi-msz-ap.webp          · Mitsubishi MSZ-AP wall split
 *    /mitsubishi-pead-ducted.webp     · Mitsubishi PEAD-M ducted indoor
 *    /mitsubishi-outdoor-large.webp   · Mitsubishi twin-fan outdoor
 *    /kaden-bold-split.webp           · Kaden wall split + outdoor
 *    /kaden-ducted-small.webp         · Kaden ducted small
 *    /kaden-ducted-large.webp         · Kaden ducted twin-fan outdoor
 *    /kaden-multi-diagram.webp        · Kaden multi-head system diagram
 *    /kaden-gas-ducted.webp           · Kaden gas ducted heater
 *    /kaden-evaporative.webp          · Kaden evaporative roof cooler
 *    /reclaim-co2-split.webp          · Reclaim CO2 split system
 *    /reclaim-r290-range.webp         · Reclaim R290 tank range
 *    /thermann-integrated-heat-pump.webp · Thermann integrated HP
 *    /thermann-continuous-flow.webp   · Thermann G-series CF
 *    /thermann-electric-storage.webp  · Thermann electric storage tank
 *    /zonemate-touch-controller.webp  · Zonemate wall tablet
 *    /zonemate-app.webp               · Zonemate app on phone
 */
export const categoryPhoto: Record<ProductCategory, { src: string; fallback: string; alt: string }> = {
  "split-system":       { src: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",                 fallback: "/kaden-indoor.webp",              alt: "Mitsubishi MSZ-AP wall split system" },
  "multi-head":         { src: "/mac_slide0.jpg",                                    fallback: "/reclaim-split-back.webp",        alt: "Multi-head split system with outdoor condenser" },
  "ducted":             { src: "/kdi-v2-image_01.webp",                               fallback: "/duct-work.webp",                 alt: "Ducted air conditioning indoor unit" },
  "cassette":           { src: "/ducted-condenser.webp",                             fallback: "/ducted-condenser.webp",          alt: "Cassette air conditioning unit" },
  "floor-console":      { src: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",                 fallback: "/kaden-indoor.webp",              alt: "Floor console air conditioner" },
  "heat-pump":          { src: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", fallback: "/reclaim-spit-close-up.webp",  alt: "Reclaim heat pump hot water system" },
  "gas-continuous-flow":{ src: "/G-Series_Front_On_View_1200x900.jpg",              fallback: "/gas-hot-water-changeover.webp",  alt: "Thermann G-series continuous flow gas hot water unit" },
  "gas-storage":        { src: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg", fallback: "/gas-hot-water-changeover.webp", alt: "Thermann gas storage hot water tank" },
  "electric-storage":   { src: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg", fallback: "/gas-hot-water-changeover.webp", alt: "Thermann electric storage hot water tank" },
  "solar-hot-water":    { src: "/reclaim-mitsubishi.webp",                          fallback: "/reclaim-spit-close-up.webp",     alt: "Heat pump hot water system on a brick wall" },
  "controller":         { src: "/Individual-Temps-Family_Mobile.webp",               fallback: "/Milieu Zonemate tablet.jpg",     alt: "Zonemate Wi-Fi controller app on phone" },
  "zoning":             { src: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",         fallback: "/duct-work.webp",                 alt: "Zonemate touch controller for ducted zoning" },
  "damper":             { src: "/ZoneMate-Smart-Sensor-Residential_8-1.jpg",        fallback: "/duct-work.webp",                 alt: "Zonemate smart sensor" },
  "accessory":          { src: "/duct-work.webp",                                   fallback: "/duct-work.webp",                 alt: "Ductwork and fittings in a roof space" },
};

/** Returns { src, fallback, alt } for a product's photo. When the brand is
 *  passed, the fallback prefers the brand's own working image so a
 *  Mitsubishi product doesn't fall back to a Kaden category shot. */
export function productPhoto(p: Product, brand?: Brand): { src: string; fallback: string; alt: string } {
  const cat = categoryPhoto[p.category] ?? categoryPhoto["accessory"];
  const brandFallback = brand?.photoFallback ?? brand?.photo ?? cat.fallback;
  if (p.photo) return { src: p.photo, fallback: brandFallback, alt: p.photoAlt ?? p.name };
  // No product-specific photo → the "primary" is the category real-manufacturer
  // shot, and the fallback is the brand-specific working image.
  return { src: cat.src, fallback: brandFallback, alt: cat.alt };
}

/** Display order for the brand hub, the nav and every "our brands" strip.
 *  Air conditioning first because it is the bigger half of the business,
 *  then zoning, then hot water. The array below stays grouped the way it
 *  was written; this is what decides what the customer sees. */
const BRAND_ORDER = [
  "mitsubishi-electric",
  "kaden",
  "brivis",
  "zonemate",
  "reclaim",
  "thermann",
  "istore",
];

const brandCatalogue: Brand[] = [

  // ================== BRIVIS ==================
  {
    slug: "brivis",
    name: "Brivis",
    tagline: "The gas ducted heater most of these houses were built with.",
    origin: "Melbourne, Australia (Rinnai Group)",
    intro:
      "Brivis is the gas ducted heater we replace, service and re-install more than any other in the south-east, and that is not an accident. Most homes in Pakenham, Berwick, Officer and Cranbourne built between 1990 and 2015 shipped with a Brivis in the roof or under the floor, so we have been inside more of them than anything else on this list.",
    ourTake:
      "Brivis is the answer when a gas ducted heater comes out and a gas ducted heater goes back in. Same footprint, same ducts, same controller wiring, so the house is warm again the day we start. If the old unit is past 12 to 15 years we'll put a reverse-cycle price next to it as well, not to talk you out of gas, but so you're deciding with both running costs in front of you.",
    accreditation: "Brivis-Rinnai approved installer",
    productLabel: "3 models · Wombat + Buffalo internal ducted, evaporative",
    photo: "/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg",
    photoFallback: "/gas-ducted-install.webp",
    photoAlt: "Brivis gas ducted heater installed in a Melbourne home",
    accent: "#0B3C7A",
    established: "Founded 1971 · Melbourne · part of Rinnai Australia since 2004",
    warranty: "5-year manufacturer warranty on heat exchanger + 6-year on our workmanship",
    keyFeatures: [
      "The gas ducted brand more Melbourne homes were built with than any other",
      "Same-footprint retrofit into most existing ducted heater cavities",
      "Full internal range: Wombat + Buffalo, 3 to 6 star at 15 / 20 / 26 / 30 kW",
      "Rinnai-backed parts pipeline, so even a 15-year-old unit is still serviceable",
    ],
    commonInMelbourne:
      "The gas ducted heater in most Pakenham, Berwick, Cranbourne, Officer and Endeavour Hills homes built between 1990 and 2015. When the ductwork is sound and only the heater has failed, staying on Brivis is the least disruptive path: the ducts, the controller wiring and the cupboard footprint all get reused, and the house is warm again the same day.",
    support:
      "Rinnai's Melbourne warehouse holds Brivis parts for every unit still in the field, discontinued models included. We carry controllers, ignition units and burners on the truck, so most Brivis service jobs are fixed in one visit rather than booked in twice.",
    resources: [
      { label: "Brivis · manufacturer website", href: "https://www.brivis.com.au/" },
      { label: "Rinnai Australia (parent)", href: "https://www.rinnai.com.au/" },
    ],
    products: [
      {
        slug: "brivis-internal-wombat-3",
        name: "Brivis Classic Wombat · 3-Star Internal",
        model: "Compact Classic Wombat 3★",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output",
        starRating: "3-star",
        veuEligible: false,
        photo: "/Brivis Wombat Indoor 3 star.jpg",
        photoAlt: "Brivis Classic Wombat 3-star internal gas ducted heater",
        bestFor: "Like-for-like retrofit into an existing cupboard cavity, done in a day",
        ourTake:
          "The Wombat is the straight swap. It shares its footprint with the older Brivis and Braemar units, so the existing ducts, controller wiring and return-air grille all stay where they are and the job is usually done in a day. It's a 3-star heater, which is the right call for a house that's being sold, rented out, or heated a few weeks a year. If you're staying and running it all winter, a Starpro burns less gas doing the same work, and we'll show you both numbers.",
        specs: [
          { label: "Star rating", value: "3-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard (under-floor or roof-space)" },
          { label: "Configuration", value: "Down-flow / up-flow / horizontal" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-internal-compact-classic", "brivis-internal-starpro-45", "brivis-external-buffalo"],
      },
      {
        slug: "brivis-internal-compact-classic",
        name: "Brivis Compact Classic · Internal",
        model: "Compact Classic (higher-spec internal)",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · higher-spec internal",
        veuEligible: false,
        photo: "/Brivis Compact Classic Indoor Gas Heater.jpg",
        photoAlt: "Brivis Compact Classic internal gas ducted heater",
        bestFor: "In-cupboard retrofit where the heater cupboard backs onto a bedroom",
        ourTake:
          "Same in-cupboard footprint as the Wombat, with a better fan and a longer service life behind it. What usually decides it is noise: when the heater cupboard backs onto a bedroom or the hallway you walk down at 6am, that's the difference you actually notice. Fit it and forget about it for 15 years.",
        specs: [
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-internal-wombat-3", "brivis-internal-starpro-45", "brivis-external-buffalo"],
      },
      {
        slug: "brivis-internal-starpro-45",
        name: "Brivis Starpro · 4 & 5-Star Internal",
        model: "Starpro 4★ / 5★ Internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 4-star or 5-star",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/Brivis Starpro 4 and 4 & 5 star indoor verison and external verson .jpg",
        photoAlt: "Brivis Starpro 4/5-star internal gas ducted heater",
        bestFor: "In-cupboard retrofit for a household staying put and running the heater all winter",
        ourTake:
          "Starpro 4/5-star is where the gas bill starts to move. Same in-cupboard footprint as the Wombat so the retrofit stays clean, and enough of an efficiency gain that a family running the heater every day through a Melbourne winter feels it on the bill. The 6-star adds a modulating burner on top of that, which is worth having in some houses and not in others, and we'll tell you which yours is.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-internal-starpro-6", "brivis-internal-wombat-3", "brivis-external-starpro-45"],
      },
      {
        slug: "brivis-internal-starpro-6",
        name: "Brivis Starpro · 6-Star Internal",
        model: "Starpro 6★ Internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 6-star premium",
        starRating: "6-star",
        veuEligible: false,
        photo: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg",
        photoAlt: "Brivis Starpro 6-star internal gas ducted heater",
        bestFor: "Homes staying on gas for the long haul that run the heater hard",
        ourTake:
          "The modulating burner is what you're buying here. Instead of firing flat out and shutting off, it varies its output to match what the rooms are asking for, so there's less temperature swing and less gas burnt getting there. It earns its money in a house that heats a lot of hours, and it's the most efficient gas ducted heater Brivis builds.",
        specs: [
          { label: "Star rating", value: "6-star (premium efficiency)" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Burner", value: "Modulating (varies output to match room demand)" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-internal-starpro-45", "brivis-external-starpro-6"],
      },
      {
        slug: "brivis-external-buffalo",
        name: "Brivis Buffalo · External",
        model: "Buffalo (external weatherproof cabinet)",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · external cabinet",
        veuEligible: false,
        photo: "/Brivis Buffalo Outdorr.jpg",
        photoAlt: "Brivis Buffalo external gas ducted heater cabinet",
        bestFor: "Homes built with the ducted heater outside on a pad rather than in an internal cupboard",
        ourTake:
          "The outdoor-cabinet build, weatherproofed, with the quieter fan and longer service life of the internal Compact Classic. Common on the older Berwick, Endeavour Hills and Cranbourne weatherboards where the heater has always sat on a slab down the side of the house, and where the existing pad and gas line come straight across.",
        specs: [
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on ground pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-external-starpro-45", "brivis-internal-compact-classic"],
      },
      {
        slug: "brivis-external-starpro-45",
        name: "Brivis Starpro · 4 & 5-Star External",
        model: "Starpro 4★ / 5★ External",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 4-star or 5-star · external cabinet",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/Brivis Starpro 4 and 4 & 5 star indoor verison and external verson .jpg",
        photoAlt: "Brivis Starpro 4/5-star external gas ducted heater cabinet",
        bestFor: "External-cabinet retrofit where the heater runs most of the winter",
        ourTake:
          "Starpro External in 4-star or 5-star, for the house with the heater outdoors that runs it hard enough to care what the gas costs. Same weatherproof cabinet footprint as the Buffalo External, so the existing pad and gas line get reused and nothing new gets poured.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on ground pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-external-starpro-6", "brivis-external-buffalo", "brivis-internal-starpro-45"],
      },
      {
        slug: "brivis-external-starpro-6",
        name: "Brivis Starpro · 6-Star External",
        model: "Starpro 6★ External",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 6-star premium · external cabinet",
        starRating: "6-star",
        veuEligible: false,
        photo: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg",
        photoAlt: "Brivis Starpro 6-star external gas ducted heater cabinet",
        bestFor: "Outdoor-cabinet homes staying on gas for the long haul",
        ourTake:
          "The modulating burner, in the weatherproof cabinet. Output varies to match what the house is asking for rather than cycling hard on and off, which is the difference you feel in a home that heats a lot of hours. The most efficient outdoor-cabinet heater Brivis makes.",
        specs: [
          { label: "Star rating", value: "6-star (premium efficiency)" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on ground pad" },
          { label: "Burner", value: "Modulating (varies output to match room demand)" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Controller", value: "Brivis Networker + Touch wall controller" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        related: ["brivis-external-starpro-45", "brivis-internal-starpro-6"],
      },
      {
        slug: "brivis-evap-contour",
        name: "Brivis Contour Evaporative Cooler (Classic profile)",
        model: "Contour · Classic roof profile",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling",
        capacity: "15 · 20 · 26 · 30 kW · Classic (taller) roof silhouette",
        veuEligible: false,
        photo: "/classic_evap_product_image.jpg",
        photoAlt: "Brivis Contour Classic evaporative cooler on the roof",
        bestFor: "Standard roof pitches where the Classic silhouette isn't a street-view concern",
        ourTake:
          "The Contour is the Classic profile, the taller cabinet. It's what goes on when the roof pitch carries it and nobody minds how it reads from the footpath, which covers most houses. Cools a whole home for a fraction of what refrigerated ducted costs to run, as long as the day is dry, and most Melbourne days are.",
        specs: [
          { label: "Silhouette", value: "Classic (taller) roof profile" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "Roof-mounted" },
          { label: "Refrigerant", value: "None, evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Classic (taller) silhouette, Brivis's default evap profile",
          "Four output sizes (15 / 20 / 26 / 30 kW), matched to home cooling load",
          "Roof-mounted install pushes cooled air through ceiling vents",
          "Running cost ~25% of refrigerated ducted, genuinely cheap to run in dry heatwaves",
          "No refrigerant, no ARC ticket needed for service, straightforward annual clean",
        ],
        whyWeInstall: [
          "Default evap pick for the dry-summer suburbs (Cranbourne, Clyde, Officer)",
          "Rinnai-backed parts pipeline, Brivis evap parts are same-day from Melbourne",
          "Backed by our 6-year workmanship warranty + Brivis's 5-year cover",
        ],
        related: ["brivis-evap-advance", "brivis-internal-wombat-3", "kaden-evaporative-classic"],
      },
      {
        slug: "brivis-evap-advance",
        name: "Brivis Advance Evaporative Cooler (Low-Profile)",
        model: "Advance · Low-Profile roof silhouette",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling",
        capacity: "15 · 20 · 26 · 30 kW · Low-Profile (flatter) roof silhouette",
        veuEligible: false,
        photo: "/Kaden low_evap cooler.jpg",
        photoAlt: "Low-profile roof-mounted evaporative cooler",
        bestFor: "Street-view sensitive homes and low-pitch roofs where the Classic silhouette is too tall",
        ourTake:
          "Same cooling as the Contour, in a flatter cabinet. It goes on when the roofline is the thing that matters: a character street in Berwick, an Officer estate with covenants, or a low-pitch roof where the taller cabinet sits awkwardly. You're buying the silhouette rather than the cooling, and that's a fair reason to buy it.",
        specs: [
          { label: "Silhouette", value: "Low-Profile (flatter) roof silhouette" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "Roof-mounted (suits low-pitch roofs)" },
          { label: "Refrigerant", value: "None, evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Low-Profile silhouette, clean street-view roofline, ~30% lower than the Contour",
          "Same four output sizes as the Contour (15 / 20 / 26 / 30 kW)",
          "Same cooling capability as the Classic, just a flatter cabinet",
          "Suits low-pitch roofs where the Contour would sit awkwardly",
          "Standard Brivis evap service pipeline, no new parts to learn",
        ],
        whyWeInstall: [
          "The right pick for heritage streets and covenanted estates that don't want a tall evap silhouette",
          "Character-street cases in Berwick and older Pakenham weatherboards benefit from the cleaner roofline",
          "Same parts + service pipeline as the Contour, no extra warranty complexity",
        ],
        related: ["brivis-evap-contour", "brivis-internal-wombat-3", "kaden-evaporative-low"],
      },
    ],
  },

  // ================== MITSUBISHI ELECTRIC ==================
  {
    slug: "mitsubishi-electric",
    name: "Mitsubishi Electric",
    tagline: "The default air conditioning brand in our workshop.",
    origin: "Japan",
    intro:
      "Mitsubishi Electric is the brand we quote first on any air conditioning job, and the reason is the reliability record across our own install base. A decade-old MSZ-AP still runs to spec, and the parts pipeline for units that age is still open, which is what decides whether a system gets fixed or replaced in year twelve.",
    ourTake:
      "Mitsubishi Electric runs a failure rate under 1% across the whole range. That is the number that decides what we put in a customer's wall. A unit that never needs us back is worth more to both of us than a cheaper one that does.",
    productLabel: "22 models · splits, multi-head, ducted, cassette, controllers",
    photo: "/mitsubishi-puz-outdoor-white.webp",
    photoFallback: "/reclaim-mitsubishi.webp",
    photoAlt: "Mitsubishi Electric PUZ R32 outdoor condenser",
    accent: "#DA1A32",
    established: "Australian sales since 1978 · manufacturing in Thailand",
    warranty: "5-year manufacturer parts + labour, plus 6 years on our workmanship.",
    keyFeatures: [
      "Under 1% failure rate across the entire range, the lowest of anything we install",
      "A decade-old MSZ-AP still runs to spec, we service units we put in over 10 years ago",
      "Parts pipeline is genuinely never a worry, whatever the age of the unit",
      "MSZ-AP wall splits are our default for bedrooms and living rooms",
      "PEAD-M ducted for family homes, sized off a proper room-by-room heat load",
      "MXZ multi-head runs 2-6 indoor units off one outdoor, one set of penetrations",
      "R32 refrigerant across the range, modern and low-GWP",
      "MELCloud Wi-Fi module adds phone control to any indoor unit",
    ],
    commonInMelbourne:
      "In every suburb we work in, and specified for different reasons in each. Berwick, Officer, Clyde North and Cranbourne new-builds go PEAD-M ducted almost by default. Berwick and Pakenham weatherboards, where there is no roof space to run ducts through, get MSZ-AP wall splits. Hills suburbs like Emerald, Gembrook and Cockatoo get the Hyper Heating variant, because it still makes its rated heat on the mornings the others start to fade.",
    support:
      "Mitsubishi's Melbourne parts warehouse is same-day for common indoor/outdoor parts. Manufacturer tech support is genuinely responsive. We rarely wait on a part.",
    resources: [
      { label: "Mitsubishi Electric · manufacturer website", href: "https://www.mitsubishielectric.com.au/" },
    ],

    /* --- The filtration treatment. Mitsubishi first, because it's the
       brand with sixteen models and therefore the one the old grid
       served worst. --- */
    heroSub:
      "The brand we quote first on any air conditioning job, and the one we still get parts for in year twelve. Sixteen models across five shapes \u2014 start with the shape.",
    fitsWhere:
      "Wall splits in weatherboards with no roof space, ducted in the Clyde North and Officer new-builds, Hyper Heating in the hills where the cold mornings are real.",
    heroFacts: [
      { v: "Under 1%", k: "Failure rate across our install base" },
      { v: "16", k: "Models we install and support" },
      { v: "Since 1978", k: "Selling in Australia" },
      { v: "5 + 6 yr", k: "Manufacturer, then our workmanship" },
    ],

    benefitsHeading: "Why it's the one we quote first.",
    benefitTiles: [
      {
        t: "It doesn't break",
        line: "Under 1% failure rate across everything we've put in",
        detail:
          "That number is ours, not a brochure's \u2014 it's what our own call-back book says across the units we've installed. It's the whole argument. A unit that never brings us back is worth more to you and to us than a cheaper one that does, and it is the reason Mitsubishi gets quoted before anything else.",
        icon: "shield",
      },
      {
        t: "Year twelve still has parts",
        line: "A decade-old MSZ-AP runs to spec and we can still fix it",
        detail:
          "We service MSZ-APs we installed more than ten years ago and they still hold their rated output. More to the point, the parts are still on the shelf. Whether a system gets repaired or replaced in year twelve is decided by the parts pipeline, and Mitsubishi's is open in a way most brands' is not.",
        icon: "clock",
      },
      {
        t: "Parts the same day",
        line: "Melbourne warehouse, common parts off the shelf",
        detail:
          "Mitsubishi's Melbourne parts warehouse is same-day on common indoor and outdoor components, and their tech line actually answers. In practice that means a breakdown is a visit, not a fortnight of waiting on a fan motor from overseas.",
        icon: "truck",
      },
      {
        t: "R32 across the range",
        line: "Modern refrigerant, low global-warming potential",
        detail:
          "The whole current range runs R32. It's more efficient per kilogram than the R410A it replaced, so a system holds less gas to do the same work, and its global-warming potential is about a third. It also keeps the units on the right side of the phase-down, which matters for a machine you're keeping fifteen years.",
        icon: "snowflake",
      },
      {
        t: "Hyper Heating for the hills",
        line: "Rated output held at -15\u00b0 ambient",
        detail:
          "Standard splits start to fade on the coldest mornings, right when you want them. The Hyper Heating variant holds its rated heating capacity down to -15\u00b0, which is why we specify it in Emerald, Gembrook and Cockatoo rather than in Cranbourne.",
        icon: "flame",
      },
      {
        t: "Run it from your phone",
        line: "MELCloud Wi-Fi on any indoor unit in the range",
        detail:
          "A MELCloud module clips into any indoor unit, so scheduling, geofencing and turning the living room on from the car all work without paying for a higher model. It also gives you a usage history, which is the honest way to answer \u201cis it costing me a fortune\u201d.",
        icon: "phone",
      },
      {
        t: "Quiet enough for a bedroom",
        line: "From 19 dBA on the smaller wall splits",
        detail:
          "The MSZ-AP25 runs at 19 dBA on low \u2014 quieter than a library, and quiet enough that it isn't the thing that wakes you. Worth knowing before somebody talks you into an oversized unit that will short-cycle all night.",
        icon: "people",
      },
      {
        t: "One brand, five shapes",
        line: "Wall, multi-head, ducted, console and the controllers",
        detail:
          "Because the whole range is one manufacturer, the controller, the app and the service story are the same whichever shape your house needs. Mixed-brand houses are where warranty arguments come from, and this is how you avoid having one.",
        icon: "wrench",
      },
    ],

    systemsHeading: "Five shapes. Start here, not with a model number.",
    systemsLede:
      "Sixteen models is a lot to read through, and nobody chooses between an MSZ-AP50 and an MSZ-AP60 first. You choose a shape \u2014 one room or the whole house, on the wall or in the roof \u2014 and the model follows from the heat load.",
    systems: [
      {
        id: "wall-split",
        label: "MSZ-AP wall splits",
        blurb:
          "One outdoor unit, one indoor head on the wall. Our default for a bedroom, a living room or a granny flat, and the quickest thing we fit \u2014 most go in back-to-back in a single morning.",
        photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
        photoAlt: "Mitsubishi Electric MSZ-AP wall-mounted split system",
        priceFrom: "from $2,199 installed",
        facts: [
          { lead: "Six sizes", note: "2.5 kW for a bedroom up to 8.0 kW for large open-plan" },
          { lead: "19 dBA on low", note: "On the AP25 \u2014 quiet enough to sleep next to" },
          { lead: "One morning", note: "Back-to-back install in three to four hours" },
          { lead: "Hyper Heating option", note: "Full rated heat down to -15\u00b0 for hills postcodes" },
        ],
        models: ["msz-ap25", "msz-ap35", "msz-ap50", "msz-ap60", "msz-ap71", "msz-ap80"],
      },
      {
        id: "multi-head",
        label: "MXZ multi-head",
        blurb:
          "One outdoor unit running two to six indoor heads. The answer when you want three bedrooms done but there is only room \u2014 or only body-corporate permission \u2014 for a single condenser outside.",
        photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
        photoAlt: "Mitsubishi MXZ multi-head outdoor condenser",
        priceFrom: "from $6,500 installed",
        facts: [
          { lead: "Two to six heads", note: "Off one outdoor unit, 4.2 kW up to 12.0 kW combined" },
          { lead: "One set of penetrations", note: "Not four holes in four walls and four condensers" },
          { lead: "Mix the head types", note: "Wall, floor console or bulkhead on the same system" },
          { lead: "Each room its own control", note: "Own remote, own set temperature" },
        ],
        models: ["mxz-2f", "mxz-3f", "mxz-4f", "mxz-5f", "mxz-6c"],
      },
      {
        id: "ducted",
        label: "PEAD-M ducted",
        blurb:
          "The indoor unit lives in the roof and vents into every room, zoned so you are not paying to condition the bedrooms at seven at night. New builds and retrofits both, sized off a room-by-room heat load rather than a guess.",
        photo: "/mitsubishi-pea-m-ducted-v2-v3.webp",
        photoAlt: "Mitsubishi PEAD-M ducted indoor unit",
        priceFrom: "from $12,500 installed",
        facts: [
          { lead: "10 kW to 20 kW", note: "PEAD-M for most homes, PEA-M where the load is bigger" },
          { lead: "Heating parity", note: "Rated heat output matches the cooling figure" },
          { lead: "Zoned as standard", note: "Four, six or eight zones, fitted by default" },
          { lead: "The duct design first", note: "We size the trunk and the branches, not just the unit" },
        ],
        models: ["pead-m", "pead-large"],
      },
      {
        id: "console",
        label: "MFZ-KW floor console",
        blurb:
          "A wall split that sits at floor level instead of up near the ceiling. For rooms where there is nothing to mount high on \u2014 full-height glass, a heritage cornice, a wall of joinery \u2014 and for anyone who wants the heat coming out at ankle height in winter.",
        photo: "/mitsubishi-mfz-kw-floor-console-v2.webp",
        photoAlt: "Mitsubishi MFZ-KW floor-standing console unit",
        priceFrom: "Priced at quote",
        facts: [
          { lead: "Three sizes", note: "2.5, 3.5 and 5.0 kW cooling" },
          { lead: "Heat at floor level", note: "Where it belongs in a Melbourne winter" },
          { lead: "Nothing mounted high", note: "Suits full-height glass and heritage rooms" },
          { lead: "Runs on multi-head too", note: "Can be one of the heads on an MXZ system" },
        ],
        models: ["mfz-kw"],
      },
      {
        id: "controls",
        label: "Controllers and zoning",
        blurb:
          "The wired wall controller and the native ducted zone controller. Not an upsell \u2014 on a ducted job the zoning is what decides whether the system costs sense to run, and it goes in as part of the install.",
        photo: "/mitsubishi-par-41maa-controller-v2.webp",
        photoAlt: "Mitsubishi PAR-41MAA wired wall controller",
        priceFrom: "Included in the install",
        facts: [
          { lead: "PAR-41MAA wall controller", note: "Backlit, weekly schedule, no phone required" },
          { lead: "Native zone control", note: "Mitsubishi's own, not a third-party box bolted on" },
          { lead: "MELCloud on top", note: "Wi-Fi module adds phone control to either" },
          { lead: "One system to service", note: "Same manufacturer end to end, so no warranty argument" },
        ],
        models: ["par-41maa", "me-zone-controller"],
      },
    ],

    servicing: {
      heading: "What happens in year ten.",
      photo: "/ducted-split.webp",
      photoAlt: "A ducted indoor unit sitting on a platform in a roof space",
      body:
        "Anyone can sell you a system. The part that decides whether it was a good decision is what the next fifteen years look like \u2014 whether it holds its output, whether the parts still exist, and whether somebody can get to it. That last one is a decision made on install day, not on service day.",
      facts: [
        "A decade-old MSZ-AP still makes its rated output \u2014 we measure them on annual services and they hold",
        "Common indoor and outdoor parts come out of the Melbourne warehouse same-day",
        "Annual service is $220 on a split, $390 on a ducted, and we text you eleven months later so it gets booked",
        "We lodge the service report with Mitsubishi, so the warranty record stays clean for any future claim",
        "Ducted indoors go on a platform with a clear path to them, because a unit walled in behind cabinetry is a quote, not a service",
      ],
    },

    steps: [
      { title: "Room-by-room heat load", detail: "We walk the house, measure ceiling height, window aspect and insulation, then compute the actual kW. A 5 kW room gets a 5 kW unit, not a 7 kW one somebody had on the truck." },
      { title: "Written fixed-price quote in 2 hours", detail: "Model number, capacity, line-set length, controller spec, warranty position and the total installed price. No \u2018from $X\u2019, and no allowance that turns into a variation later." },
      { title: "Stock ordered, day booked", detail: "Mitsubishi's Melbourne warehouse is same-day on common stock. We confirm your install day the moment the unit lands with us rather than pencilling one in and hoping." },
      { title: "Install day", detail: "Single split back-to-back is three to four hours. Multi-head or ducted is a full day. Drop sheets down, dust extraction on the wall cut, conduit colour-matched outside, fresh copper every time." },
      { title: "Commission and walk through", detail: "We run it up, check refrigerant pressures against spec, and set up the remote and MELCloud with you. You sign the job card when you're happy with it, not before." },
      { title: "Compliance and warranty inside 24 hours", detail: "Electrical and refrigeration compliance certificates emailed by end of business the next day, and the manufacturer warranty registered in your name at the same time." },
    ],

    faqs: [
      {
        q: "Is Mitsubishi Electric actually worth the extra over a budget brand?",
        a: "On a bedroom split the gap is a few hundred dollars, and the honest answer is that it usually pays for itself the first time something goes wrong \u2014 or rather, the first time it doesn't. Under 1% of the ones we've installed have come back to us. Where it clearly matters is year eight onwards: a budget unit with no parts left is a whole new system, and that is a five-figure difference on a ducted job.",
      },
      {
        q: "What's the difference between MSZ-AP and Hyper Heating?",
        a: "Same wall split, different outdoor unit. A standard AP loses heating capacity as the ambient temperature drops. Hyper Heating holds its full rated output down to -15\u00b0. In Pakenham or Cranbourne that difference rarely shows up. In Emerald, Gembrook or Cockatoo it shows up most mornings in July, which is why we quote it there.",
      },
      {
        q: "Do I need the ducted zoning, or is it an upsell?",
        a: "You need it. An unzoned ducted system conditions the whole house every time it runs, including four bedrooms nobody is in at seven at night. Four to eight zones is what makes the running cost sensible, and we fit it by default rather than quoting it as an extra to make the headline number look better.",
      },
      {
        q: "Can I control it from my phone?",
        a: "Yes \u2014 a MELCloud Wi-Fi module clips into any indoor unit in the range, including the cheapest one. You get scheduling, geofencing and a usage history. It's a module rather than a model tier, so you don't have to buy up to get it.",
      },
      {
        q: "How long does a Mitsubishi install take?",
        a: "A single split back-to-back is three to four hours, done in one visit. A multi-head is usually a full day. Ducted is one to two days depending on how many zones and how kind the roof space is. We tell you which of those you're in before you accept the quote.",
      },
      {
        q: "What warranty do I get?",
        a: "Five years manufacturer parts and labour on the unit, registered in your name the day after we install it. On top of that we carry six years on our own workmanship, which covers the install rather than the box \u2014 brackets, line-set, drainage, penetrations, the things that are our fault if they go wrong.",
      },
      {
        q: "Can you service a Mitsubishi you didn't install?",
        a: "Yes, and we do a lot of them. $220 for a split, $390 for a ducted, and the service report goes to Mitsubishi so your warranty record stays clean. If we find something we'd have done differently on the install we'll tell you what it is and whether it's worth fixing.",
      },
      {
        q: "Do you install Mitsubishi in the eastern suburbs, or just the south-east?",
        a: "Both. Pakenham, Officer, Berwick and Cranbourne are our home ground and we're same-day there. Ringwood, Croydon, Glen Waverley and the rest of the eastern ring are booked installs rather than same-day call-outs, which the suburb pages say plainly.",
      },
    ],

    products: [
      {
        slug: "msz-ap25",
        name: "MSZ-AP25 Classic Wall Split",
        model: "MSZ-AP25VGD",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "2.5 kW cooling / 3.2 kW heating",
        refrigerant: "R32",
        starRating: "4.5-star cooling / 4.5-star heating",
        veuEligible: false,
        bestFor: "Single bedroom or small home office up to 25 m²",
        ourTake:
          "The 2.5 kW MSZ-AP is the bedroom unit. Quiet at 21 dBA on low fan, barely draws anything on standby, and the parts pipeline is never a worry. If it's going in a kid's room and it has to run all night without waking anyone, this is the one.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.2 kW" },
          { label: "Room size", value: "up to 25 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Indoor sound (min)", value: "21 dBA" },
          { label: "Star rating", value: "4.5 cool / 4.5 heat (zoned)" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        related: ["msz-ap35", "msz-ap50", "mxz-3f"],
      },
      {
        slug: "msz-ap35",
        name: "MSZ-AP35 Classic Wall Split",
        model: "MSZ-AP35VGD",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "3.5 kW cooling / 4.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Master bedroom or medium living zone up to 35 m²",
        ourTake:
          "The 3.5 kW is the sweet spot for a big master bedroom or a smaller open-plan. Same reliability as the 2.5, same low-noise profile, just enough extra capacity to handle the doors-open scenario without running at 100% all summer.",
        specs: [
          { label: "Cooling capacity", value: "3.5 kW" },
          { label: "Heating capacity", value: "4.0 kW" },
          { label: "Room size", value: "up to 35 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Indoor sound (min)", value: "22 dBA" },
        ],
        related: ["msz-ap25", "msz-ap50", "mxz-3f"],
      },
      {
        slug: "msz-ap50",
        name: "MSZ-AP50 Classic Wall Split",
        model: "MSZ-AP50VGD",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "5.0 kW cooling / 6.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Open-plan living / dining up to 50 m²",
        ourTake:
          "The 5.0 kW MSZ-AP is our default recommendation for an open-plan living zone in a modern brick-veneer family home. Big enough to handle a Melbourne heatwave with the doors open, small enough that it doesn't cycle constantly on a mild day.",
        specs: [
          { label: "Cooling capacity", value: "5.0 kW" },
          { label: "Heating capacity", value: "6.0 kW" },
          { label: "Room size", value: "up to 50 m²" },
          { label: "Refrigerant", value: "R32" },
        ],
        related: ["msz-ap35", "msz-ap60", "msz-ap71"],
      },
      {
        slug: "msz-ap60",
        name: "MSZ-AP60 Classic Wall Split",
        model: "MSZ-AP60VGD",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "6.0 kW cooling / 6.8 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Large open-plan or living zone with cathedral ceilings",
        ourTake:
          "The 6.0 is for the room that falls between the two obvious sizes. Cathedral ceilings, or a big north-facing glass wall, add load that a floor-area calculation misses, and that's usually what pushes a room off the 5.0 and onto this one.",
        specs: [
          { label: "Cooling capacity", value: "6.0 kW" },
          { label: "Heating capacity", value: "6.8 kW" },
          { label: "Room size", value: "up to 60 m²" },
        ],
        related: ["msz-ap50", "msz-ap71", "mxz-3f"],
      },
      {
        slug: "msz-ap71",
        name: "MSZ-AP71 Classic Wall Split",
        model: "MSZ-AP71VGD",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "7.1 kW cooling / 8.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Large great-room, warehouse-style living, or open double-height space",
        ourTake:
          "The 7.1 is about as far as a wall unit sensibly goes. Past this, ducted or multi-head moves air around a room better than one head can. For a big north-facing living zone in Berwick or Officer, this is usually the answer.",
        specs: [
          { label: "Cooling capacity", value: "7.1 kW" },
          { label: "Heating capacity", value: "8.0 kW" },
          { label: "Room size", value: "up to 75 m²" },
        ],
        related: ["msz-ap60", "msz-ap80", "pead-m"],
      },
      {
        slug: "msz-ap80",
        name: "MSZ-AP80 Classic Wall Split",
        model: "MSZ-AP80VGD",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "8.0 kW cooling / 9.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Warehouse conversions, large open-plan double-height spaces",
        ourTake:
          "The biggest wall split Mitsubishi makes. In most rooms this size, ducting moves the air better. Where this one wins is the single large space you don't want to duct: a warehouse conversion, a double-height room, anywhere the ceiling turns ductwork into a project of its own.",
        specs: [
          { label: "Cooling capacity", value: "8.0 kW" },
          { label: "Heating capacity", value: "9.0 kW" },
          { label: "Room size", value: "up to 85 m²" },
        ],
        related: ["msz-ap71", "pead-m"],
      },
      {
        slug: "mxz-2f",
        name: "MXZ-2F Multi-Head · 2 Heads",
        model: "MXZ-2F42VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
        photoAlt: "Mitsubishi Electric MXZ multi-head outdoor condenser",
        capacity: "4.2 kW combined · 2 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Two-bedroom apartment or townhouse with only one balcony spot for the outdoor unit",
        ourTake:
          "One outdoor condenser, two indoor heads. This is the answer when there's exactly one place the outdoor unit can go, a balcony or a narrow side path, and you still want the two rooms controlled separately.",
        specs: [
          { label: "Combined cooling", value: "4.2 kW" },
          { label: "Combined heating", value: "5.2 kW" },
          { label: "Indoor heads", value: "2" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Indoor compatibility", value: "MSZ-AP wall splits · MFZ-KW floor console" },
          { label: "Warranty", value: "5-year Mitsubishi manufacturer + 6-year workmanship" },
        ],
        related: ["mxz-3f", "mxz-4f", "msz-ap25"],
      },
      {
        slug: "mxz-3f",
        name: "MXZ-3F Multi-Head · 3 Heads",
        model: "MXZ-3F54VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
        photoAlt: "Mitsubishi Electric MXZ multi-head outdoor condenser",
        capacity: "5.4 kW combined · 3 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Three-bedroom home where three heads share one outdoor condenser",
        ourTake:
          "The 3F is our most-installed multi-head. One outdoor unit, three bedrooms, which is a lot tidier on the wall than three separate condensers, and each room gets its own controller rather than sharing a ducted zone with the room next door.",
        specs: [
          { label: "Combined cooling", value: "5.4 kW" },
          { label: "Combined heating", value: "6.8 kW" },
          { label: "Indoor heads", value: "3" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Indoor compatibility", value: "MSZ-AP wall splits · MFZ-KW floor console" },
          { label: "Warranty", value: "5-year Mitsubishi manufacturer + 6-year workmanship" },
        ],
        related: ["mxz-2f", "mxz-4f", "mxz-5f"],
      },
      {
        slug: "mxz-4f",
        name: "MXZ-4F Multi-Head · 4 Heads",
        model: "MXZ-4F80VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
        photoAlt: "Mitsubishi Electric MXZ multi-head outdoor condenser",
        capacity: "8.0 kW combined · 4 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Four-bedroom family home wanting per-room zone control",
        ourTake:
          "The 4F is our recommendation for a family home that wants individual per-room setpoints rather than shared ducted zones. One outdoor unit, four indoor heads, one refrigerant loop to service.",
        specs: [
          { label: "Combined cooling", value: "8.0 kW" },
          { label: "Combined heating", value: "9.6 kW" },
          { label: "Indoor heads", value: "4" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Indoor compatibility", value: "MSZ-AP wall splits · MFZ-KW floor console" },
          { label: "Warranty", value: "5-year Mitsubishi manufacturer + 6-year workmanship" },
        ],
        related: ["mxz-3f", "mxz-5f", "pead-m"],
      },
      {
        slug: "mxz-5f",
        name: "MXZ-5F Multi-Head · 5 Heads",
        model: "MXZ-5F100VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
        photoAlt: "Mitsubishi Electric MXZ multi-head outdoor condenser",
        capacity: "10.0 kW combined · 5 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Larger single-storey family homes with 4 bed + 1 living zone",
        ourTake:
          "The 5F handles five indoor heads off one outdoor unit, 4 bedrooms plus a living zone. Beyond this we move to the 6-port MXZ-6C or to ducted.",
        specs: [
          { label: "Combined cooling", value: "10.0 kW" },
          { label: "Combined heating", value: "12.0 kW" },
          { label: "Indoor heads", value: "5" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Indoor compatibility", value: "MSZ-AP wall splits · MFZ-KW floor console" },
          { label: "Warranty", value: "5-year Mitsubishi manufacturer + 6-year workmanship" },
        ],
        related: ["mxz-4f", "mxz-6c", "pead-m"],
      },
      {
        slug: "mxz-6c",
        name: "MXZ-6C Multi-Head · 6 Heads · 12 kW",
        model: "MXZ-6C120VA (6-port multi-split condenser)",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
        photoAlt: "Mitsubishi Electric 6-port MXZ multi-head outdoor condenser",
        capacity: "12.0 kW combined · 6 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "5-6 bed family homes wanting per-room control from a single outdoor unit",
        ourTake:
          "The MXZ-6C is Mitsubishi's biggest multi-head, 12 kW across 6 indoor heads off one outdoor unit. Genuinely rare in the market (most brands cap at 5 heads). What we quote for a 5-6 bed home that wants proper per-room control without committing to ducted.",
        specs: [
          { label: "Combined cooling", value: "12.0 kW" },
          { label: "Combined heating", value: "14.0 kW" },
          { label: "Indoor heads", value: "6 (mixed indoor types supported)" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "Power supply", value: "1-phase 230 V, no 3-phase upgrade required" },
          { label: "Indoor compatibility", value: "MSZ-AP wall splits · MFZ-KW floor console · cassette" },
          { label: "Warranty", value: "5-year Mitsubishi manufacturer + 6-year workmanship" },
        ],
        features: [
          "12 kW combined capacity from a single condenser, one outdoor unit for the whole home",
          "6 indoor heads, mix wall splits, floor consoles and cassettes on one refrigerant loop",
          "R32 refrigerant + inverter compressor, modern efficiency at large capacity",
          "1-phase power supply, no 3-phase upgrade required at the meter box",
          "One condenser to service instead of six separate outdoor units",
        ],
        whyWeInstall: [
          "The pick when a family wants per-room control across 5-6 rooms without going ducted",
          "One outdoor unit instead of six splits, cleaner externally, quieter for neighbours",
          "Same MSZ-AP indoor units as our single-split installs, so interior finish stays consistent",
          "Backed by 5-year Mitsubishi manufacturer + our 6-year workmanship",
        ],
        related: ["mxz-5f", "msz-ap50", "pead-m"],
      },
      {
        slug: "pead-m",
        name: "PEA-M100 / M125 / M140 Ducted",
        model: "PEA-M100/125/140HAA (HAA-VKA Hyper Heating)",
        category: "ducted",
        categoryLabel: "Ducted",
        capacity: "10 kW / 12.5 kW / 14 kW cooling · heating parity",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/mitsubishi-pea-m-ducted-v2-v3.webp",
        photoAlt: "Mitsubishi Electric PEA-M ducted indoor unit",
        bestFor: "3-4 bed single-storey ducted retrofit or new-build, 4-6 zones",
        ourTake:
          "The PEA-M is Mitsubishi's default ducted system for a typical Melbourne family home. Three capacity steps (10 / 12.5 / 14 kW) cover most single-storey retrofits, and the HAA-VKA Hyper Heating variant holds capacity down to −15 °C, worth specifying for hills postcodes like Emerald and Gembrook. Pairs with the PUZ outdoor and any Zonemate zone controller.",
        specs: [
          { label: "Cool / heat capacity", value: "10 kW · 12.5 kW · 14 kW (three model steps)" },
          { label: "Model codes", value: "PEA-M100HAA · PEA-M125HAA · PEA-M140HAA" },
          { label: "Hyper Heating option", value: "PUZ-M100VKA / VKA2 outdoor (holds capacity to −15 °C)" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "External static pressure", value: "Adjustable 50–150 Pa" },
          { label: "Air flow", value: "1,320–2,340 L/s across the three sizes" },
          { label: "Indoor sound (min)", value: "34–41 dBA depending on fan speed" },
          { label: "Power supply", value: "1-phase 230 V (M100) · 3-phase 400 V option (M125/M140)" },
          { label: "Zoning", value: "Zonemate 4 / 6 / 8-zone with damper motors" },
          { label: "Controller", value: "PAR-40 wired / MA-remote / MELCloud Wi-Fi module" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Three capacity steps (10 / 12.5 / 14 kW), right-size to the actual heat load, not oversized as a habit",
          "Adjustable external static pressure 50–150 Pa suits typical 3-4 zone Melbourne retrofits",
          "Hyper Heating outdoor option (VKA) holds full heating capacity down to −15 °C for cold-morning hills postcodes",
          "R32 refrigerant across all three sizes, low-GWP, no HFC phase-down risk",
          "MELCloud Wi-Fi module adds phone control to the wired PAR-40 controller",
          "Zonemate zoning compatible out of the box, no interface adapter required",
          "Inverter compressor + DC fan motor for quiet, efficient part-load running",
          "Made in Thailand at Mitsubishi's dedicated air-conditioning plant",
        ],
        whyWeInstall: [
          "The most reliable ducted platform in our install base, decade-old PEA-M / PEAD-M units still run to spec",
          "Mitsubishi's Melbourne parts warehouse is same-day on virtually every PEA-M part we've ever needed",
          "Under 1% failure rate across the range. It is the unit we are least likely to have to come back to",
          "Hyper Heating (VKA) holds rated heating output to -15 degrees, which is what a Gembrook or Emerald winter morning actually asks of a ducted system",
          "Right-sizing across three capacity steps means we don't oversize you into a bigger unit that short-cycles and wastes power",
          "Direct Zonemate integration handles per-room zoning without a third-party control adaptor",
        ],
        related: ["pead-large", "mfz-kw", "par-41maa", "zonemate-touch"],
      },
      {
        slug: "pead-large",
        name: "PEA-M160 / M180 / M200 Ducted (Large Homes)",
        model: "PEA-M160HAA · PEA-M180HAA · PEA-M200HAA (1-phase + 3-phase)",
        category: "ducted",
        categoryLabel: "Ducted",
        capacity: "16 kW / 18 kW / 20 kW cooling · heating parity",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/mitsubishi-pea-m-ducted-v2-v3.webp",
        photoAlt: "Mitsubishi Electric PEA-M large-capacity ducted indoor unit",
        bestFor: "Larger single-storey, double-storey or long duct-run family homes needing 16-20 kW output",
        ourTake:
          "The PEA-M160/180/200 is the large-capacity extension of the PEA-M range, same indoor platform as the M100/125/140, sized up for double-storey homes, 6+ zones, or long ceiling-cavity duct runs. The 20 kW step is offered in both single-phase and three-phase to suit whatever supply the property has. Pairs with the PUZ-M outdoor and the HAA-VKA Hyper Heating variant is available up to M140 for hills postcodes; larger capacities use the standard PUZ.",
        specs: [
          { label: "Cool / heat capacity", value: "16 kW · 18 kW · 20 kW (three larger model steps)" },
          { label: "Model codes", value: "PEA-M160HAA · PEA-M180HAA · PEA-M200HAA" },
          { label: "Power supply · 16 kW / 18 kW", value: "3-phase 400 V standard" },
          { label: "Power supply · 20 kW", value: "1-phase 230 V OR 3-phase 400 V, spec to suit property supply" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "External static pressure", value: "Adjustable 100–200 Pa (higher-static than M100-M140)" },
          { label: "Zoning", value: "Zonemate 6 / 8-zone with damper motors" },
          { label: "Controller", value: "PAR-42MAA wired / MA-remote" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Three larger capacity steps (16 / 18 / 20 kW) extend the PEA-M range for double-storey + long-run installs",
          "20 kW available in both 1-phase and 3-phase, spec to match whatever supply is at the meter box",
          "Higher external static pressure (100–200 Pa) delivers rated flow through longer flex-duct runs",
          "Same R32 refrigerant + inverter platform as the M100-M140, so parts + service story is unchanged",
          "Zonemate 8-zone compatible so bigger homes get proper per-room control",
        ],
        whyWeInstall: [
          "The pick for a two-storey Berwick / Officer / Clyde home where a single M140 would short-cycle in shoulder seasons",
          "20 kW 1-phase option means we can quote a large-capacity system into a property without paying for a 3-phase upgrade",
          "Same Mitsubishi parts + support platform as the smaller M-series, no separate stocking to worry about",
          "Zonemate 8-zone + PAR-42MAA gives full per-room control on a home big enough to need it",
        ],
        related: ["pead-m", "zonemate-touch", "par-41maa"],
      },
      {
        slug: "mfz-kw",
        name: "MFZ-KW Floor Console",
        model: "MFZ-KW25 / KW35 / KW50 VGK Series",
        category: "floor-console",
        categoryLabel: "Floor-standing console",
        capacity: "2.5 · 3.5 · 5.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/mitsubishi-mfz-kw-floor-console-v2.webp",
        photoAlt: "Mitsubishi Electric MFZ-KW-VGK floor console",
        bestFor: "Rooms with no free wall space at head height, under-window retrofits into old radiator locations",
        ourTake:
          "The MFZ-KW sits on the floor where an old radiator sat. It's the answer when there's no wall free at head height, when warmth coming off the floor suits the room better than warmth coming off the ceiling, or when you're dropping into an old hydronic radiator's footprint and don't want walls patched up high. Same reliability as the wall splits underneath the different shape.",
        specs: [
          { label: "Cooling capacity", value: "2.5 · 3.5 · 5.0 kW (three model steps)" },
          { label: "Heating capacity", value: "3.4 · 4.5 · 6.3 kW" },
          { label: "Install position", value: "Floor-standing, under-window compatible" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "Indoor sound (min)", value: "27 dBA on low fan" },
          { label: "Air-flow pattern", value: "Warm air low-and-out (matches convection radiator behaviour)" },
          { label: "Controller", value: "Handheld remote + optional PAR-42 wired wall controller" },
          { label: "Warranty", value: "5-year parts + labour + 6-year workmanship" },
        ],
        features: [
          "Floor-level warm-air pattern, heats a room the way a radiator does, not from the ceiling down",
          "Under-window compatible, clears window frames without needing head-height wall space",
          "R32 refrigerant, DC inverter compressor, modern efficiency in a floor-console form",
          "3 capacity steps (2.5 / 3.5 / 5.0 kW), right-sized to bedroom, master or small living zone",
          "27 dBA on low fan, safe next to a bedroom wall for overnight running",
        ],
        whyWeInstall: [
          "Only floor console we quote, reliability record is identical to the wall-mount MSZ-AP range",
          "Common ask in Berwick and Officer character homes retrofitted off hydronic radiators",
          "The pick for elderly-owner cottages where floor-level warmth reads more like a real heater",
          "Backed by our 6-year workmanship + Mitsubishi's 5-year parts warranty",
        ],
        related: ["msz-ap35", "pead-m"],
      },
      {
        slug: "par-41maa",
        name: "PAR-41MAA Standard Wired Wall Controller",
        model: "PAR-41MAA",
        category: "controller",
        categoryLabel: "Standard wired wall controller",
        veuEligible: false,
        photo: "/mitsubishi-par-41maa-controller-v2.webp",
        photoAlt: "Mitsubishi PAR-41MAA standard wired wall controller",
        bestFor: "Ducted or floor-console systems where a physical wall controller is preferred over the handheld remote",
        ourTake:
          "The PAR-41MAA is Mitsubishi's current-generation standard wired wall controller, the model we fit as standard on every PEA-M and MFZ-KW install. Physical wall control for anyone who'd rather not reach for a phone or handheld remote. Direct interface into Zonemate zoning so one controller drives both temp and zones.",
        specs: [
          { label: "Model code", value: "PAR-41MAA (current-generation Standard)" },
          { label: "Compatibility", value: "PEA-M / PEAD-M ducted + MFZ-KW floor console" },
          { label: "Display", value: "Backlit LCD with icon menu" },
          { label: "Schedule", value: "7-day, up to 8 events per day" },
          { label: "Sensor", value: "Built-in room temperature sensor at the controller position" },
          { label: "Warranty", value: "5-year parts + labour + 6-year workmanship" },
        ],
        features: [
          "Current-generation replacement for the PAR-40, same wiring, same footprint, sharper display",
          "7-day schedule with 8 events per day for occupancy-driven control",
          "Built-in room sensor targets the temp at the controller position, not at the return-air grille",
          "Direct interface for Zonemate 4/6/8-zone systems without third-party adaptor",
        ],
        whyWeInstall: [
          "The controller we fit as standard on every ducted install",
          "Physical wall control ages better than app-based control, no login drift, no OS upgrades to chase",
          "Direct Zonemate integration means one screen for temp + zones, not two apps",
        ],
        related: ["me-zone-controller", "pead-m", "zonemate-touch"],
      },
      {
        slug: "me-zone-controller",
        name: "Mitsubishi Electric Zone Controller · PAR-ZC01M-E",
        model: "PAR-ZC01M-E wall controller + PAC-ZC40/ZC80 zone interface",
        category: "zoning",
        categoryLabel: "Ducted zone controller (Mitsubishi native)",
        veuEligible: false,
        // TODO(jake): save the PAR-ZC01M-E shot as
        // /public/mitsubishi-par-zc01m-e-zone-controller.webp and swap this
        // over. Until then this is the older controller image.
        photo: "/mitsubishi-zone-controller-v2.webp",
        photoAlt: "Mitsubishi Electric PAR-ZC01M-E zone controller, white glass touch screen with occupancy sensor",
        bestFor: "PEA-M and PEAD-M ducted installs where you want the whole system, zoning included, on one badge",
        ourTake:
          "The PAR-ZC01M-E is the glass touch controller on the wall, and behind it sits a PAC-ZC interface board driving the dampers: PAC-ZC40 for four zones, PAC-ZC80 for eight, in an L version for 24 V damper motors and an H version for 240 V. The part people notice is the occupancy sensor built into the controller itself. It watches the room it is in, and when nobody has been there for a while the system can drop that zone back rather than keep conditioning an empty study. Everything is Mitsubishi end to end, which means one warranty channel and one support number for the indoor unit, the outdoor unit and the zoning. Zonemate goes on instead when a job wants more than eight zones, or more than one indoor unit driven from a single tablet. Both are on the van.",
        specs: [
          { label: "Wall controller", value: "PAR-ZC01M-E, backlit touch screen, built-in temp sensor" },
          { label: "Occupancy sensing", value: "PIR sensor built into the controller, four user-set energy-save responses" },
          { label: "Remote sensors", value: "Up to 2 additional room temperature sensors per controller" },
          { label: "Zone interface", value: "PAC-ZC40L-E / ZC40H-E (4 zones) · PAC-ZC80L-E / ZC80H-E (8 zones)" },
          { label: "Damper motors", value: "L models drive 24 V AC, H models drive 240 V AC" },
          { label: "Compatibility", value: "PEA-M100/125/140HAA + PEAD-M SG series + PEA-M160/180/200 large-capacity" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Backlit glass touch screen with a built-in room temperature sensor",
          "PIR occupancy sensor in the controller, so an empty room can stop being conditioned",
          "Up to two extra remote temperature sensors, so the target is the bedroom, not the hallway",
          "PAC-ZC40 drives four zones, PAC-ZC80 drives eight, L for 24 V dampers and H for 240 V",
          "Native Mitsubishi throughout, no third-party bridge between the indoor unit and the zoning",
          "PAR-ZC01M-E sub-controllers can be added where a second screen is wanted",
        ],
        whyWeInstall: [
          "The pick when you want indoor, outdoor and zoning all on one badge and one support line",
          "The occupancy sensor is the feature that actually saves money, because the zone nobody remembered to shut gets shut anyway",
          "Native integration means fewer wiring points between the indoor unit and the dampers",
          "Zonemate goes on instead when a job wants more than eight zones, or more than one indoor unit on a single tablet. Both are on the van",
          "Backed by our 6-year workmanship + Mitsubishi's 5-year manufacturer cover",
        ],
        related: ["pead-m", "par-41maa", "pead-large"],
      },
    ],
  },

  // ================== RECLAIM ENERGY ==================
  {
    slug: "reclaim",
    name: "Reclaim Energy",
    tagline: "Australian-designed CO₂ (R744) heat pumps.",
    origin: "Sydney, Australia",
    intro:
      "Reclaim runs CO₂ (R744) where almost everyone else runs R290 or R134a. It is a natural refrigerant with zero global-warming potential, and the reason it matters here rather than on a spec sheet is that CO₂ keeps pulling heat out of the air on a cold Pakenham morning, when other heat pumps are working hardest for the least.",
    ourTake:
      "Reclaim is the one to pick when you're staying in the house and want to stop thinking about hot water. CO₂ pulls heat out of cold air in a way most refrigerants can't, which matters in a Pakenham winter, and the tanks are built to outlast the compressor in front of them. Two designs: the CO₂ SPLIT, an outdoor heat pump plumbed to a separate tank, in glass-lined, stainless, 316 stainless and Earthworks finishes; and the ECO R290 ALL-IN-ONE, everything in one shell, at 200 L and 285 L. It costs more on day one and it's built to still be there in fifteen years.",
    accreditation: "Reclaim accredited installer · listed on the Reclaim installer locator",
    productLabel: "13 models · CO₂ split heat pumps + ECO R290 all-in-one",
    photo: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png",
    photoFallback: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump hot water system with controller",
    accent: "#6B3FA0",
    established: "Designed and assembled in Sydney, Australia · trading since 2007",
    // Warranty terms taken from Reclaim's residential component warranty
    // table. The split between the Reclaim heat pump and the
    // Reclaim/Panasonic one is real and it is 3 years, so it belongs on
    // the page rather than buried in a PDF.
    warranty:
      "Tank: 10-year parts + 5-year labour (glass-lined) or 15-year parts + 5-year labour (stainless). Heat pump: 10-year parts + labour on the Reclaim EHPE-4550P-A, 7-year parts + labour on the Reclaim/Panasonic HE-UM60AR. Controller: 10-year parts + labour on the Reclaim controller and sensor lead, 7-year on the Reclaim/Panasonic non-Wi-Fi controller. ECO R290 all-in-one: 8-year tank, parts and labour. PTRV and Quickie Kit: 5-year parts + labour. Plus 6-year workmanship from us.",
    keyFeatures: [
      "CO₂ (R744) natural refrigerant, zero global-warming potential",
      "Holds heating capacity down to -10°C ambient, which is what Emerald and Gembrook mornings ask for",
      "Stainless tanks have no anode to swap and nothing to rust, and the duplex tank steps up to 2205 duplex / 316-grade for the hardest water",
      "Quiet enough (37 dBA at 1m) to sit next to a bedroom wall",
      "Australian-designed for Australian conditions",
      "PV-diverter kit fires the compressor on solar surplus, so a home with rooftop panels heats its water on power it was exporting anyway",
      "Glass-lined and stainless tanks in 160 / 250 / 315 / 400 L, the range covers a unit up to a full house",
      "Reclaim's own CO₂ heat pump is a 5 kW, and the Panasonic Aquarea pairing comes in 4 kW and 6 kW where recovery speed is the deciding factor",
    ],
    commonInMelbourne:
      "The one we recommend first to anyone planning to still be in the house in ten years. Common through the Pakenham Cameron Park estates, in Berwick weatherboards coming off gas storage, and on Cranbourne and Officer jobs where the tank sits somewhere you walk past every day and the stainless finish earns its keep.",
    support:
      "Reclaim's Sydney factory holds parts for every unit currently in the field. Compressor swap-out is straightforward within warranty. We stock the common seals, O-rings and PV-diverter controllers on the truck.",
    resources: [
      { label: "Reclaim Energy · manufacturer website", href: "https://reclaimenergy.com.au/" },
    ],
    products: [
      // ---- CO₂ SPLIT SYSTEM (outdoor heat pump + separate tank) ----
      {
        slug: "co2-split-160-glass",
        name: "Reclaim CO₂ Split · 160L Glass-Lined",
        compressorKw: 5.0,
        tankLitres: 160,
        model: "REHP-CO2-160GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "160 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim 160L CO₂ split heat pump, glass-lined tank",
        bestFor: "One or two people, a unit, or a granny flat where floor space is the constraint",
        ourTake: "The smallest tank Reclaim make, on the same CO₂ compressor as every other system in the range. It suits one or two people, and the reason to pick it over a 250 is almost always space rather than money: a narrow side path, a unit courtyard, a laundry corner that a bigger tank simply will not go into. Two people showering back to back will get through it, so if there is a third in the house we will say so at the quote.",
        specs: [
          { label: "Tank capacity", value: "160 L" },
          { label: "Tank material", value: "Glass-lined + sacrificial anode" },
          { label: "Refrigerant", value: "R744 (CO₂, natural)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-160-stainless", "co2-split-250-glass", "eco-r290-200"],
      },
      {
        slug: "co2-split-160-stainless",
        name: "Reclaim CO₂ Split · 160L Stainless",
        compressorKw: 5.0,
        tankLitres: 160,
        model: "REHP-CO2-160SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "160 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim 160L CO₂ split heat pump, stainless steel tank",
        bestFor: "One or two people in a tight spot, where the tank has to outlast the owner's patience for servicing",
        ourTake: "160 L in stainless. Same footprint and same compressor as the glass-lined 160, with no anode to swap and a 15-year tank warranty instead of 10. On a unit or an investment property, where nobody is going to remember an anode in year six, that difference is the whole argument.",
        specs: [
          { label: "Tank capacity", value: "160 L" },
          { label: "Tank material", value: "Stainless steel, no anode" },
          { label: "Refrigerant", value: "R744 (CO₂, natural)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-160-glass", "co2-split-250-stainless", "eco-r290-200"],
      },
      {
        slug: "co2-split-250-glass",
        name: "Reclaim CO₂ Split · 250L Glass-Lined",
        compressorKw: 5.0,
        tankLitres: 250,
        model: "REHP-CO2-250GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "250 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim CO₂ split heat pump outdoor unit + tank",
        bestFor: "Couples and families of three, on town water where an anode does the job",
        ourTake: "The smallest tank in the split range that still makes sense for a family, running the same CO₂ compressor as the 315. Glass-lined means a sacrificial anode, a part we swap every five to seven years, and it does an honest job in normal town water.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Glass-lined + sacrificial anode" },
          { label: "Refrigerant", value: "R744 (CO₂, natural)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour (Reclaim EHPE-4550P-A)" },
        ],
        related: ["co2-split-250-stainless", "co2-split-315-glass", "eco-r290-300"],
      },
      {
        slug: "co2-split-250-stainless",
        name: "Reclaim CO₂ Split · 250L Stainless",
        compressorKw: 5.0,
        tankLitres: 250,
        model: "REHP-CO2-250SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "250 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim CO₂ split heat pump stainless tank",
        bestFor: "Couples / family of 3 wanting a no-anode long-life tank",
        ourTake: "Same volume and same footprint as the glass-lined 250, in stainless. There's no anode to swap and the tank warranty runs 15 years rather than 10. The question it answers is how long you plan to be in the house.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Stainless steel" },
          { label: "Refrigerant", value: "R744 (CO₂)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-250-glass", "co2-split-315-stainless", "co2-split-250-earthworker"],
      },
      {
        slug: "co2-split-250-earthworker",
        name: "Reclaim CO₂ Split · 250L Earthworker Stainless",
        compressorKw: 5.0,
        tankLitres: 250,
        model: "REHP-CO2-250SSEW-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · Earthworker stainless tank",
        capacity: "250 L Earthworker stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Earthworker.webp",
        photoAlt: "Reclaim CO₂ split heat pump on an Earthworker stainless tank",
        bestFor: "Buyers who want the tank built here, by a worker-owned co-op in Gippsland",
        ourTake: "Same Reclaim CO₂ heat pump, on a stainless tank built in Morwell by Earthworker, a worker-owned co-op an hour up the highway. It performs like the standard stainless because it is stainless, 15-year tank warranty and no anode to service. What you are choosing is where it was made and who got paid to make it, and for a lot of people around here that is a good enough reason on its own.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Stainless steel, built in Morwell by Earthworker" },
          { label: "Made in", value: "Morwell, Victoria (Earthworker Energy Manufacturing Cooperative)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-250-stainless", "co2-split-315-earthworker"],
      },
      {
        slug: "co2-split-215-5kw",
        name: "Reclaim CO₂ Split · 215L",
        compressorKw: 5.0,
        tankLitres: 215,
        model: "Reclaim CO₂ split · 215 L",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump",
        capacity: "215 L tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim CO₂ split heat pump",
        bestFor: "Couples and small families who shower in a tight window rather than across the day",
        ourTake:
          "215 L sits between the 160 and the 250, on the same 5 kW CO₂ heat pump as every other split in the range. That output is what makes the smaller tank work: it puts water back fast enough that a household showering inside one hour doesn't feel the missing litres, and it keeps the footprint down where a 250 would be tight.",
        specs: [
          { label: "Tank capacity", value: "215 L" },
          { label: "Heat pump", value: "5 kW CO₂ (R744)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour (Reclaim EHPE-4550P-A)" },
        ],
        related: ["co2-split-250-glass", "co2-split-315-glass", "co2-split-160-stainless"],
      },
      {
        slug: "co2-split-315-glass",
        name: "Reclaim CO₂ Split · 315L Glass-Lined",
        compressorKw: 5.0,
        tankLitres: 315,
        model: "REHP-CO2-315GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "315 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim CO₂ split heat pump",
        bestFor: "Family of four or five on town water",
        ourTake: "315 L is the size most families land on, on the same CO₂ split platform as everything else in the range. Glass-lined tank with a sacrificial anode, which we swap every five to seven years, and which is perfectly at home in Pakenham town water.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Glass-lined + sacrificial anode" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-315-stainless-squat", "co2-split-250-glass"],
      },
      {
        slug: "co2-split-315-stainless",
        name: "Reclaim CO₂ Split · 315L Stainless",
        compressorKw: 5.0,
        tankLitres: 315,
        model: "REHP-CO2-315SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "315 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        starRating: "5-star equivalent",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim 315L CO₂ split heat pump stainless tank",
        bestFor: "Family of four or five who want the tank to outlast the compressor",
        ourTake: "Our most-installed Reclaim, and Reclaim's own best seller. 315 L of stainless with no anode to service, a 15-year tank warranty, and quiet enough at 37 dBA to sit against a bedroom wall without anyone noticing it run.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Stainless steel" },
          { label: "Refrigerant", value: "R744 (CO₂, natural)" },
          { label: "Rated COP", value: "5.02 @ 15°C ambient" },
          { label: "Sound level", value: "37 dBA at 1 m" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-315-glass", "co2-split-315-stainless-squat", "co2-split-315-earthworker"],
      },
      {
        slug: "co2-split-315-stainless-squat",
        name: "Reclaim CO₂ Split · 315L Stainless Squat (SSQ)",
        compressorKw: 5.0,
        tankLitres: 315,
        model: "REHP-CO2-315SSQ-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · squat stainless tank",
        capacity: "315 L stainless tank, squat body",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/reclaim-duplex-316ss-.png",
        photoAlt: "Reclaim 315L squat stainless steel heat pump tank",
        bestFor: "315 L where the ceiling, the eave or the cupboard won't take a tall tank",
        ourTake: "The Q is squat. Same 315 litres and the same stainless steel as the tall SST, in a shorter, wider body that gets under a low eave, into a laundry with a shelf over it, or through a doorway the tall one won't make. It costs the same and it is the same system. We measure the space on the site visit and tell you which one fits.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Stainless steel, squat body" },
          { label: "Tank height", value: "1490 mm, against 1985 mm for the tall SST" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-315-earthworker"],
      },
      {
        slug: "co2-split-315-earthworker",
        name: "Reclaim CO₂ Split · 315L Earthworker Stainless",
        compressorKw: 5.0,
        tankLitres: 315,
        model: "REHP-CO2-315SSEW-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · Earthworker stainless tank",
        capacity: "315 L Earthworker stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Earthworker.webp",
        photoAlt: "Reclaim 315L heat pump on an Earthworker stainless tank",
        bestFor: "A family of four or five who want the tank built here, in Gippsland",
        ourTake: "The 315 L in the Earthworker tank, built in Morwell by a worker-owned co-op. Identical Reclaim CO₂ heat pump in front of it and the same 15-year stainless tank warranty behind it, so nothing about how it runs changes. What changes is that the steel was rolled an hour up the Princes Highway rather than shipped in, and around here that lands with a lot of people.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Stainless steel, built in Morwell by Earthworker" },
          { label: "Made in", value: "Morwell, Victoria (Earthworker Energy Manufacturing Cooperative)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-250-earthworker"],
      },
      {
        slug: "co2-split-400-glass",
        name: "Reclaim CO₂ Split · 400L Glass-Lined",
        compressorKw: 5.0,
        tankLitres: 400,
        model: "REHP-CO2-400GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "400 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim 400L CO₂ split heat pump",
        bestFor: "Households of six or more on town water",
        ourTake: "The biggest glass-lined tank Reclaim build, on the 5 kW compressor. It's for a household where the draw is genuinely high and the water is kind enough that an anode does its job, and the 5 kW is what has 400 L back before the evening run.",
        specs: [
          { label: "Tank capacity", value: "400 L" },
          { label: "Tank material", value: "Glass-lined + sacrificial anode" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
        ],
        related: ["co2-split-400-stainless", "co2-split-315-glass"],
      },
      {
        slug: "co2-split-400-stainless",
        name: "Reclaim CO₂ Split · 400L Stainless",
        compressorKw: 5.0,
        tankLitres: 400,
        model: "REHP-CO2-400SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "400 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Reclaim 400L CO₂ split heat pump stainless tank",
        bestFor: "Larger families (6+), acreage properties with high draw",
        ourTake: "The most volume Reclaim make, in stainless, on the 5 kW compressor. For acreage through Devon Meadows and Pearcedale, or a big household in Cranbourne South, where the draw is high enough that stored litres and recovery speed both have to be there.",
        specs: [
          { label: "Tank capacity", value: "400 L" },
          { label: "Tank material", value: "Stainless steel" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-400-glass"],
      },
      // ---- ECO R290 ALL-IN-ONE (single unit) ----
      {
        slug: "eco-r290-200",
        name: "Reclaim ECO R290 · 200L All-in-One",
        tankLitres: 200,
        model: "RE-ECO-200",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "200 L integrated tank + heat pump",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Couples / small households wanting a single-unit install",
        ourTake: "Tank and heat pump in one shell, running R290 rather than the split range's CO₂. Nothing goes outside, which is the whole point of it: 200 L for a smaller household on a block where there's no clean spot for an outdoor unit.",
        specs: [
          { label: "Tank capacity", value: "200 L" },
          { label: "Format", value: "All-in-one (single unit)" },
          { label: "Refrigerant", value: "R290 (propane, natural)" },
          { label: "Tank warranty", value: "8 years, parts and labour" },
        ],
        related: ["eco-r290-300", "co2-split-250-glass"],
      },
      {
        slug: "eco-r290-300",
        name: "Reclaim ECO R290 · 285L All-in-One",
        tankLitres: 285,
        model: "RE-ECO-300",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "285 L integrated tank + heat pump",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Family of 4-5 wanting a single-unit install (no separate outdoor)",
        ourTake: "285 L with the heat pump built into the same shell as the tank. It goes in where there's no good outdoor position for a split heat pump but there is room where the old tank stood, which describes a lot of townhouses and a lot of narrow side paths.",
        specs: [
          { label: "Tank capacity", value: "285 L" },
          { label: "Format", value: "All-in-one (single unit)" },
          { label: "Refrigerant", value: "R290 (propane)" },
          { label: "Tank warranty", value: "8 years, parts and labour" },
        ],
        related: ["eco-r290-200", "co2-split-315-glass"],
      },
      // ---- Panasonic CO₂ Split (Reclaim tank + Panasonic Aquarea heat pump) ----
      // Glass-lined tank variants — 4 kW + 6 kW compressor × 250 / 315 L.
      {
        slug: "panasonic-co2-glass-4kw-250",
        name: "Panasonic CO₂ Split · Glass-Lined · 4 kW · 250L",
        compressorKw: 4.0,
        tankLitres: 250,
        model: "Panasonic Aquarea 4 kW + Reclaim 250 L glass-lined tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · glass-lined tank",
        capacity: "250 L glass-lined tank · 4 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 4 kW compressor + 250L glass-lined Reclaim tank",
        bestFor: "Couples / family of 3 wanting the Panasonic Aquarea compressor on a Reclaim glass-lined tank",
        ourTake:
          "The Panasonic Aquarea 4 kW compressor on a Reclaim glass-lined tank, the same tank platform as the rest of the CO₂ split range. The 4 kW is the compact one, and on a household that spreads its hot water across the day it never runs short. If everyone showers inside the same hour, the 6 kW is the one that keeps up.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 4 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Glass-lined steel · sacrificial anode (~7-10 yr)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-glass-6kw-250", "panasonic-co2-glass-4kw-315", "co2-split-250-glass"],
      },
      {
        slug: "panasonic-co2-glass-4kw-315",
        name: "Panasonic CO₂ Split · Glass-Lined · 4 kW · 315L",
        compressorKw: 4.0,
        tankLitres: 315,
        model: "Panasonic Aquarea 4 kW + Reclaim 315 L glass-lined tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · glass-lined tank",
        capacity: "315 L glass-lined tank · 4 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 4 kW compressor + 315L glass-lined Reclaim tank",
        bestFor: "Family of 4-5 wanting the Panasonic Aquarea compressor on a Reclaim glass-lined tank",
        ourTake:
          "The Panasonic Aquarea 4 kW compressor on a Reclaim glass-lined tank, the same tank platform as the rest of the CO₂ split range. The 4 kW is the compact one, and on a household that spreads its hot water across the day it never runs short. If everyone showers inside the same hour, the 6 kW is the one that keeps up.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 4 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Glass-lined steel · sacrificial anode (~7-10 yr)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-glass-6kw-315", "panasonic-co2-glass-4kw-250", "co2-split-315-glass"],
      },
      {
        slug: "panasonic-co2-glass-6kw-250",
        name: "Panasonic CO₂ Split · Glass-Lined · 6 kW · 250L",
        compressorKw: 6.0,
        tankLitres: 250,
        model: "Panasonic Aquarea 6 kW + Reclaim 250 L glass-lined tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · glass-lined tank",
        capacity: "250 L glass-lined tank · 6 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 6 kW compressor + 250L glass-lined Reclaim tank",
        bestFor: "Couples / family of 3 wanting the Panasonic Aquarea compressor on a Reclaim glass-lined tank",
        ourTake:
          "The Panasonic Aquarea 6 kW compressor on a Reclaim glass-lined tank. It refills the tank faster, which is what you want when the whole house showers in one go, and it modulates further down than the 4 kW, so at the low loads it spends most of its life at it actually runs more efficiently despite the bigger number on the plate. Worth having in the hills postcodes, where the air it's pulling heat from is colder.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 6 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Glass-lined steel · sacrificial anode (~7-10 yr)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-glass-4kw-250", "panasonic-co2-glass-6kw-315", "co2-split-250-glass"],
      },
      {
        slug: "panasonic-co2-glass-6kw-315",
        name: "Panasonic CO₂ Split · Glass-Lined · 6 kW · 315L",
        compressorKw: 6.0,
        tankLitres: 315,
        model: "Panasonic Aquarea 6 kW + Reclaim 315 L glass-lined tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · glass-lined tank",
        capacity: "315 L glass-lined tank · 6 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 6 kW compressor + 315L glass-lined Reclaim tank",
        bestFor: "Family of 4-5 wanting the Panasonic Aquarea compressor on a Reclaim glass-lined tank",
        ourTake:
          "The Panasonic Aquarea 6 kW compressor on a Reclaim glass-lined tank. It refills the tank faster, which is what you want when the whole house showers in one go, and it modulates further down than the 4 kW, so at the low loads it spends most of its life at it actually runs more efficiently despite the bigger number on the plate. Worth having in the hills postcodes, where the air it's pulling heat from is colder.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 6 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Glass-lined steel · sacrificial anode (~7-10 yr)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-glass-4kw-315", "panasonic-co2-glass-6kw-250", "co2-split-315-glass"],
      },
      // Stainless tank variants — 4 kW + 6 kW compressor × 250 / 315 L.
      {
        slug: "panasonic-co2-stainless-4kw-250",
        name: "Panasonic CO₂ Split · Stainless · 4 kW · 250L",
        compressorKw: 4.0,
        tankLitres: 250,
        model: "Panasonic Aquarea 4 kW + Reclaim 250 L stainless tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · stainless tank",
        capacity: "250 L stainless tank · 4 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 4 kW compressor + 250L stainless Reclaim tank",
        bestFor: "Couples / family of 3 wanting the Panasonic Aquarea compressor on a Reclaim stainless tank",
        ourTake:
          "The Panasonic Aquarea 4 kW compressor on a Reclaim stainless tank, the same tank platform as the rest of the CO₂ split range. No anode to service, and the 4 kW never runs short on a household that spreads its hot water across the day. If everyone showers inside the same hour, the 6 kW is the one that keeps up.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 4 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Stainless steel · no anode to service" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-stainless-6kw-250", "panasonic-co2-stainless-4kw-315", "co2-split-250-stainless"],
      },
      {
        slug: "panasonic-co2-stainless-4kw-315",
        name: "Panasonic CO₂ Split · Stainless · 4 kW · 315L",
        compressorKw: 4.0,
        tankLitres: 315,
        model: "Panasonic Aquarea 4 kW + Reclaim 315 L stainless tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · stainless tank",
        capacity: "315 L stainless tank · 4 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 4 kW compressor + 315L stainless Reclaim tank",
        bestFor: "Family of 4-5 wanting the Panasonic Aquarea compressor on a Reclaim stainless tank",
        ourTake:
          "The Panasonic Aquarea 4 kW compressor on a Reclaim stainless tank, the same tank platform as the rest of the CO₂ split range. No anode to service, and the 4 kW never runs short on a household that spreads its hot water across the day. If everyone showers inside the same hour, the 6 kW is the one that keeps up.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 4 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Stainless steel · no anode to service" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-stainless-6kw-315", "panasonic-co2-stainless-4kw-250", "co2-split-315-stainless"],
      },
      {
        slug: "panasonic-co2-stainless-6kw-250",
        name: "Panasonic CO₂ Split · Stainless · 6 kW · 250L",
        compressorKw: 6.0,
        tankLitres: 250,
        model: "Panasonic Aquarea 6 kW + Reclaim 250 L stainless tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · stainless tank",
        capacity: "250 L stainless tank · 6 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 6 kW compressor + 250L stainless Reclaim tank",
        bestFor: "Couples / family of 3 wanting the Panasonic Aquarea compressor on a Reclaim stainless tank",
        ourTake:
          "The Panasonic Aquarea 6 kW compressor on a Reclaim stainless tank. It refills the tank faster, which is what you want when the whole house showers in one go, and it modulates further down than the 4 kW, so at the low loads it spends most of its life at it actually runs more efficiently despite the bigger number on the plate. Worth having in the hills postcodes, where the air it's pulling heat from is colder.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 6 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Stainless steel · no anode to service" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-stainless-4kw-250", "panasonic-co2-stainless-6kw-315", "co2-split-250-stainless"],
      },
      {
        slug: "panasonic-co2-stainless-6kw-315",
        name: "Panasonic CO₂ Split · Stainless · 6 kW · 315L",
        compressorKw: 6.0,
        tankLitres: 315,
        model: "Panasonic Aquarea 6 kW + Reclaim 315 L stainless tank",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · stainless tank",
        capacity: "315 L stainless tank · 6 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.webp",
        photoAlt: "Panasonic CO₂ split heat pump · 6 kW compressor + 315L stainless Reclaim tank",
        bestFor: "Family of 4-5 wanting the Panasonic Aquarea compressor on a Reclaim stainless tank",
        ourTake:
          "The Panasonic Aquarea 6 kW compressor on a Reclaim stainless tank. It refills the tank faster, which is what you want when the whole house showers in one go, and it modulates further down than the 4 kW, so at the low loads it spends most of its life at it actually runs more efficiently despite the bigger number on the plate. Worth having in the hills postcodes, where the air it's pulling heat from is colder.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 6 kW · CO₂ (R744)" },
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Stainless steel · no anode to service" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "315 L is the biggest tank on the Aquarea platform, no 400 L option" },
        ],
        related: ["panasonic-co2-stainless-4kw-315", "panasonic-co2-stainless-6kw-250", "co2-split-315-stainless"],
      },
    ],
  },

  // ================== THERMANN (Rheem) ==================
  {
    slug: "thermann",
    name: "Thermann",
    tagline: "Reece exclusive, built by Dux in NSW.",
    origin: "Made by Dux in Moss Vale NSW · Reece-exclusive brand",
    intro:
      "Thermann is Reece's exclusive plumbing-trade brand, built by Dux at their Moss Vale factory in NSW. Reece owns the distribution, Dux does the manufacturing, and between them Thermann has the widest Australian parts pipeline of any hot water brand: every Reece store in the state carries the common spares, which is why a fault on one of these rarely costs you a week.",
    ourTake:
      "Thermann is the one to pick when you want the parts pipeline behind you. It's Reece's own brand, built in Australia, and as a Reece trade partner we pull parts and warranty over the counter at any store in Victoria. In practice that means most faults get fixed the same day rather than next week, and across heat pumps, continuous flow and storage it's the range we can support fastest.",
    accreditation: "Reece trade partner · Dux/Thermann approved installer",
    productLabel: "8 models · heat pump (all-in-one + split), G-series continuous flow, electric storage",
    photo: "/thermann_integrated_heat_pump_02.jpg",
    photoFallback: "/thermann-heat-pump.webp",
    photoAlt: "Thermann integrated heat pump hot water system",
    accent: "#C1272D",
    established: "Reece exclusive brand · manufactured by Dux at their Moss Vale (NSW) factory",
    warranty: "5-year cylinder + 3-year compressor + 6-year on our workmanship. R290 heat pump range extends compressor warranty to 5 years.",
    keyFeatures: [
      "Reece-exclusive, so every Reece store in Victoria carries the common parts",
      "Built in NSW by Dux, genuinely Australian-made, and it qualifies for the Australian-made VEU bonus",
      "R290 natural refrigerant across the heat pump range, low-GWP and efficient with it",
      "Strong VEU rebate outcome, and the Australian-made bonus on top",
    ],
    commonInMelbourne:
      "The one we reach for when the parts pipeline is what matters most, which on a rental, an investment property or anywhere a fault has to be fixed today is often the whole argument. Thermann all-in-one heat pumps go into a lot of Hampton Park, Cranbourne and Narre Warren jobs, and the G-series continuous flow is our standard gas hot water swap right across the corridor.",
    support:
      "The Reece store network across Melbourne is same-day for us, and every branch stocks the common Thermann parts. Dux handles compressor and cylinder warranty claims directly.",
    resources: [
      { label: "Thermann · manufacturer website", href: "https://www.thermann.com.au/" },
      { label: "Dux (made in Australia by)", href: "https://www.dux.com.au/" },
    ],
    products: [
      // ---- Heat pump: all-in-one (200 L + 300 L) ----
      {
        slug: "thermann-eco-r290-200",
        name: "Thermann ECO R290 · 200L All-in-One",
        compressorKw: 2.5,
        tankLitres: 200,
        model: "T-HP-ECO-200",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "200 L integrated tank + heat pump",
        refrigerant: "R290 (propane, natural)",
        veuEligible: true,
        photo: "/thermann_integrated_heat_pump_02.jpg",
        photoAlt: "Thermann integrated R290 all-in-one heat pump",
        bestFor: "Couple or small household wanting a single-unit heat pump swap",
        ourTake:
          "Tank and heat pump in one shell, with nothing going outside. The 200 L is the size for a couple or a small household, and the single-unit build is what makes it fit where a split system's outdoor unit has nowhere to sit.",
        specs: [
          { label: "Tank capacity", value: "200 L" },
          { label: "Format", value: "All-in-one (single unit)" },
          { label: "Refrigerant", value: "R290 (propane)" },
          { label: "Warranty", value: "5-year cylinder / 5-year compressor" },
        ],
        related: ["thermann-eco-r290-300", "thermann-split-glass", "istore-180"],
      },
      {
        slug: "thermann-eco-r290-300",
        name: "Thermann ECO R290 · 285L All-in-One",
        compressorKw: 2.5,
        tankLitres: 285,
        model: "T-HP-ECO-300",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "285 L integrated tank + heat pump",
        refrigerant: "R290 (propane, natural)",
        veuEligible: true,
        photo: "/thermann_integrated_heat_pump_02.jpg",
        photoAlt: "Thermann integrated R290 all-in-one heat pump",
        bestFor: "Family of 4-5 wanting a single-unit heat pump swap",
        ourTake:
          "285 L in a single shell, tank and heat pump together, nothing to place outside. Our default Thermann when there's no clean run to an outdoor position but there is room where the old tank was standing.",
        specs: [
          { label: "Tank capacity", value: "300 L" },
          { label: "Format", value: "All-in-one (single unit)" },
          { label: "Refrigerant", value: "R290 (propane)" },
          { label: "Warranty", value: "5-year cylinder / 5-year compressor" },
        ],
        related: ["thermann-eco-r290-200", "thermann-split-glass", "istore-270"],
      },
      // ---- Heat pump: split (glass-lined only) ----
      {
        slug: "thermann-split-glass",
        name: "Thermann Split · Glass-Lined",
        compressorKw: 2.5,
        tankLitres: 270,
        model: "T-HP-SPLIT-GL",
        category: "heat-pump",
        categoryLabel: "Split heat pump · glass-lined tank",
        capacity: "270 L or 315 L glass-lined tank",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        photo: "/Thermann-Split-heat-pump.jpg",
        photoAlt: "Thermann split heat pump, outdoor unit + tank",
        bestFor: "Household wanting a split heat pump with the tank indoors",
        ourTake:
          "Thermann build their split in one tank finish, glass-lined with a sacrificial anode. The anode is a part we swap every five to seven years and the tank warranty depends on it being done, so it wants to be on the service list rather than forgotten. Pick it when the tank needs to live in one place and the heat pump in another.",
        specs: [
          { label: "Tank capacity options", value: "270 L or 315 L" },
          { label: "Tank material", value: "Glass-lined + sacrificial anode" },
          { label: "Refrigerant", value: "R290 (propane)" },
          { label: "Warranty", value: "5-year cylinder / 5-year compressor" },
        ],
        related: ["thermann-eco-r290-300", "co2-split-315-glass"],
      },
      // ---- Gas continuous flow: G-series (4 sizes) ----
      {
        slug: "cf-16",
        name: "Thermann G-Series · 16 L/min",
        model: "T-G16",
        category: "gas-continuous-flow",
        categoryLabel: "G-series gas continuous-flow",
        capacity: "16 L/min",
        veuEligible: false,
        bestFor: "Couple or small family (1 bathroom)",
        ourTake:
          "The 16 L/min G-series suits a couple or a single-bathroom household. Two showers that might run at once want the 20 L/min instead, which is a question of outlets rather than of spend.",
        specs: [
          { label: "Flow rate", value: "16 L/min at 25°C rise" },
          { label: "Gas type", value: "Natural gas or LPG" },
        ],
        related: ["cf-20", "cf-26", "cf-32"],
      },
      {
        slug: "cf-20",
        name: "Thermann G-Series · 20 L/min",
        model: "T-G20",
        category: "gas-continuous-flow",
        categoryLabel: "G-series gas continuous-flow",
        capacity: "20 L/min",
        veuEligible: false,
        bestFor: "Family of 3-4, one or two bathrooms",
        ourTake:
          "The 20 L/min is our most-installed continuous flow. It carries two showers running at once without either of them going thin, which is the moment most households find out what they actually bought.",
        specs: [
          { label: "Flow rate", value: "20 L/min at 25°C rise" },
        ],
        related: ["cf-16", "cf-26"],
      },
      {
        slug: "cf-26",
        name: "Thermann G-Series · 26 L/min",
        model: "T-G26",
        category: "gas-continuous-flow",
        categoryLabel: "G-series gas continuous-flow",
        capacity: "26 L/min",
        veuEligible: false,
        bestFor: "Larger family (2+ bathrooms), simultaneous draw",
        ourTake:
          "The 26 L/min G-series handles two bathrooms simultaneously plus a kitchen tap without pressure drop. Our default for family homes with more than one bathroom.",
        specs: [
          { label: "Flow rate", value: "26 L/min at 25°C rise" },
        ],
        related: ["cf-20", "cf-32"],
      },
      {
        slug: "cf-32",
        name: "Thermann G-Series · 32 L/min",
        model: "T-G32",
        category: "gas-continuous-flow",
        categoryLabel: "G-series gas continuous-flow",
        capacity: "32 L/min",
        veuEligible: false,
        bestFor: "3+ bathrooms, high simultaneous demand",
        ourTake:
          "The biggest continuous flow we install. It's for three bathrooms and up, or any house where the taps genuinely run at the same time, and it's sized by outlets rather than by people.",
        specs: [
          { label: "Flow rate", value: "32 L/min at 25°C rise" },
        ],
        related: ["cf-26"],
      },
      // ---- Gas storage ----
      {
        slug: "gas-storage-135",
        name: "Thermann Gas Storage · 135L",
        tankLitres: 135,
        model: "T-GS-135 (4-star natural gas)",
        category: "gas-storage",
        categoryLabel: "Gas storage hot water",
        capacity: "135 L",
        starRating: "4-star",
        veuEligible: false,
        photo: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg",
        photoAlt: "Thermann 135L gas storage hot water unit",
        bestFor: "Couples / small households wanting a like-for-like gas tank replacement",
        ourTake:
          "The compact gas storage tank, natural gas or LPG, 4-star. It suits a unit or a small household where the daily draw really is low. Past two people it runs out mid-morning, and at that point the 170 L or a heat pump is the honest answer, so we'll price whichever fits the site.",
        specs: [
          { label: "Tank capacity", value: "135 L" },
          { label: "Star rating", value: "4-star" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Install position", value: "External wall-mount pad" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year cylinder + 1-year components + 6-year workmanship" },
        ],
        related: ["gas-storage-170", "cf-16", "thermann-eco-r290-200"],
      },
      {
        slug: "gas-storage-170",
        name: "Thermann Gas Storage · 170L",
        tankLitres: 170,
        model: "T-GS-170 (4-star natural gas)",
        category: "gas-storage",
        categoryLabel: "Gas storage hot water",
        capacity: "170 L",
        starRating: "4-star",
        veuEligible: false,
        photo: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg",
        photoAlt: "Thermann 170L gas storage hot water unit",
        bestFor: "Family of 3-4 wanting a like-for-like gas tank replacement",
        ourTake:
          "170 L is the gas storage size for a three or four person household, where a smaller tank runs dry partway through the back-to-back showers. Same 4-star efficiency and the same warranty position as the 135, in a taller body, so the cupboard needs checking before we order it.",
        specs: [
          { label: "Tank capacity", value: "170 L" },
          { label: "Star rating", value: "4-star" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Install position", value: "External wall-mount pad" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year cylinder + 1-year components + 6-year workmanship" },
        ],
        related: ["gas-storage-135", "cf-20", "thermann-eco-r290-300"],
      },
      // ---- Electric storage (Smart Electric range · one product per size) ----
      {
        slug: "electric-storage-80",
        name: "Thermann Smart Electric · 80L",
        tankLitres: 80,
        model: "T-SE-80 · 1.8 kW element",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "80 L · 1.8 kW element",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.webp",
        photoAlt: "Thermann Smart Electric 80L storage tank",
        bestFor: "Studio, granny flat or 1-person unit where daily hot-water draw is genuinely small",
        ourTake: "The compact size in the Smart Electric range, and it suits a studio or a granny flat where a heat pump has nowhere to sit. Worth knowing before you buy: electric storage doesn't attract the VEU rebate and it's the dearest fuel to run, so wherever a heat pump physically fits we'll price one next to it.",
        specs: [
          { label: "Tank capacity", value: "80 L" },
          { label: "Element power", value: "1.8 kW" },
          { label: "Tariff", value: "Peak or off-peak controlled" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 6-yr workmanship" },
        ],
        related: ["electric-storage-125", "electric-storage-160"],
      },
      {
        slug: "electric-storage-125",
        name: "Thermann Smart Electric · 125L",
        tankLitres: 125,
        model: "T-SE-125 · 1.8 kW element",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "125 L · 1.8 kW element",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.webp",
        photoAlt: "Thermann Smart Electric 125L storage tank",
        bestFor: "1-2 person households · unit or small apartment replacement",
        ourTake: "125 L suits a one or two person household. Electric storage doesn't attract the VEU rebate, so where a heat pump can physically go, we'll price one. Where it can't, a body corporate rule, a rental, no outdoor position at all, this is the size that fits.",
        specs: [
          { label: "Tank capacity", value: "125 L" },
          { label: "Element power", value: "1.8 kW" },
          { label: "Tariff", value: "Peak or off-peak controlled" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 6-yr workmanship" },
        ],
        related: ["electric-storage-80", "electric-storage-160"],
      },
      {
        slug: "electric-storage-160",
        name: "Thermann Smart Electric · 160L",
        tankLitres: 160,
        model: "T-SE-160 · 2.4 kW element",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "160 L · 2.4 kW element",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.webp",
        photoAlt: "Thermann Smart Electric 160L storage tank",
        bestFor: "2-person household · townhouse replacement",
        ourTake: "160 L with the 2.4 kW element for a 2-person household. Element size steps up here so recovery time stays reasonable as draw increases.",
        specs: [
          { label: "Tank capacity", value: "160 L" },
          { label: "Element power", value: "2.4 kW" },
          { label: "Tariff", value: "Peak or off-peak controlled" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 6-yr workmanship" },
        ],
        related: ["electric-storage-125", "electric-storage-250"],
      },
      {
        slug: "electric-storage-250",
        name: "Thermann Smart Electric · 250L",
        tankLitres: 250,
        model: "T-SE-250 · 3.0 kW element (single or twin)",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "250 L · 3.0 kW element · twin-element option",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.webp",
        photoAlt: "Thermann Smart Electric 250L storage tank",
        bestFor: "3-4 person family emergency electric replacement",
        ourTake: "250 L is the electric size for a three or four person household, with a twin-element option if recovery time matters. Where it earns its place is the day the old tank goes and hot water has to be back on before tonight. If the change is planned rather than forced, we'll put a heat pump price beside it, because it runs at roughly half the cost a year.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Element power", value: "3.0 kW single (twin-element option available)" },
          { label: "Tariff", value: "Peak or off-peak controlled" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 6-yr workmanship" },
        ],
        related: ["electric-storage-160", "electric-storage-315", "thermann-eco-r290-300"],
      },
      {
        slug: "electric-storage-315",
        name: "Thermann Smart Electric · 315L",
        tankLitres: 315,
        model: "T-SE-315 · 3.0 kW element (single or twin)",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "315 L · 3.0 kW element · twin-element option",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.webp",
        photoAlt: "Thermann Smart Electric 315L storage tank",
        bestFor: "4-5 person family emergency electric replacement",
        ourTake:
          "315 L for a four or five person household, twin element available. This is the one that goes in on a burst-tank Friday with five people in the house and hot water needed today. When there's time to plan instead, the heat pump equivalent takes the VEU rebate and runs at a fraction of the cost, so we'll show you both.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Element power", value: "3.0 kW single (twin-element option available)" },
          { label: "Tariff", value: "Peak or off-peak controlled" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 6-yr workmanship" },
        ],
        related: ["electric-storage-250", "electric-storage-400", "thermann-eco-r290-300"],
      },
      {
        slug: "electric-storage-400",
        name: "Thermann Smart Electric · 400L",
        tankLitres: 400,
        model: "T-SE-400 · 3.0 kW twin element",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "400 L · 3.0 kW twin element",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.webp",
        photoAlt: "Thermann Smart Electric 400L storage tank",
        bestFor: "5+ person family / acreage properties with high hot-water draw",
        ourTake: "400 L is the biggest Smart Electric tank, for high-draw households and acreage where a 315 runs out before the day does. Same note as the rest of the electric range: on a planned changeover the Reclaim CO₂ 400 L or a Thermann heat pump takes the rebate and costs far less to run, and on an emergency this gets the water hot tonight.",
        specs: [
          { label: "Tank capacity", value: "400 L" },
          { label: "Element power", value: "3.0 kW twin element" },
          { label: "Tariff", value: "Peak or off-peak controlled" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 6-yr workmanship" },
        ],
        related: ["electric-storage-315", "co2-split-400-stainless"],
      },
    ],
  },

  // ================== iSTORE ==================
  {
    slug: "istore",
    name: "iStore",
    tagline: "The one to pick when the rebate decides it.",
    origin: "Australia",
    intro:
      "iStore is the one to pick when the rebate decides it. Solid heat pump platform, and the built-in PV diverter means it plays well with solar homes without needing an aftermarket accessory.",
    ourTake:
      "When the VEU rebate is what decides the job, iStore is the answer. Nothing else we fit takes the rebate as far, it goes in with the same crew and the same warranty as anything on the list, and for a household replacing an electric storage tank that is exactly the right call.",
    accreditation: "iStore accredited installer",
    productLabel: "2 models · 180L + 270L heat pump storage",
    photo: "/270L-istore-heatpump.webp",
    photoFallback: "/reclaim-spit-close-up.webp",
    photoAlt: "iStore 270L heat pump hot water system",
    accent: "#00A0DF",
    established: "Australian company (Sydney) · manufactured in China to AS/NZS standards",
    warranty: "6-year cylinder + 3-year compressor + 6-year on our workmanship",
    keyFeatures: [
      "Best VEU rebate outcome of any heat pump we install",
      "Built-in PV-diverter compatibility, so the compressor runs when your panels are making power",
      "Wi-Fi smart-app control comes standard · no aftermarket module needed",
      "R290 natural refrigerant, high COP",
    ],
    commonInMelbourne:
      "Hampton Park, Cranbourne North and Doveton are where we install the most iStore, because they are full of the electric storage tanks the VEU rebate was written for. It also does well with solar households through Officer and Clyde North, where the built-in PV diverter puts the compressor on power the house was exporting anyway.",
    support:
      "iStore parts come through their Melbourne distributor. Warranty claims are handled by iStore's Sydney office directly with the homeowner, and we do the on-site swap-out.",
    resources: [
      { label: "iStore · manufacturer website", href: "https://istore.com.au/" },
    ],
    products: [
      {
        slug: "istore-180",
        name: "iStore 180L Heat Pump",
        compressorKw: 2.5,
        tankLitres: 180,
        model: "iS-HP-180",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "180 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Couples and apartments, where the rebate is what decides it",
        photo: "/270L-istore-heatpump.webp",
        photoAlt: "iStore 180L heat pump, full unit view",
        ourTake:
          "180 L on a 2.5 kW compressor, the smallest iStore we fit. It's the right size for a couple or an apartment, where a 270 would be paying for water nobody uses. The rebate is applied at the quote, and this is where it goes furthest.",
        specs: [
          { label: "Tank capacity", value: "180 L" },
          { label: "Refrigerant", value: "R290" },
          { label: "Warranty", value: "6-year cylinder + 3-year compressor" },
        ],
        related: ["istore-270", "thermann-eco-r290-200"],
      },
      {
        slug: "istore-270",
        name: "iStore 270L Heat Pump",
        compressorKw: 4.0,
        tankLitres: 270,
        model: "iS-HP-270",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "270 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Family of three or four, where the rebate is what decides it",
        photo: "/270L-istore-heatpump.webp",
        photoAlt: "iStore 270L heat pump, installed unit",
        ourTake:
          "270 L on a 4 kW compressor, and that pairing is the point: enough stored for a family of four, and enough output to have it back before the evening run. Our most-installed unit through Hampton Park and Cranbourne, with the rebate applied at the quote.",
        specs: [
          { label: "Tank capacity", value: "270 L" },
          { label: "Refrigerant", value: "R290" },
          { label: "Warranty", value: "6-year cylinder + 3-year compressor" },
        ],
        related: ["istore-180", "thermann-eco-r290-300"],
      },
    ],
  },

  // ================== KADEN ==================
  {
    slug: "kaden",
    name: "Kaden",
    tagline: "Reece exclusive. Splits, ducted, gas and evap on one parts list.",
    origin: "Reece-exclusive brand · Australian-distributed",
    intro:
      "Kaden is Reece-exclusive, which means parts in every store in Victoria and a supply chain that does not blink. Solid build, national parts support, and a 5-year compressor warranty behind it.",
    ourTake:
      "Kaden is what we quote when a family wants the whole house done in one visit instead of a room a year. It's Reece-exclusive, so parts sit on a shelf in every store in Victoria, and it goes in with the same crew, the same brackets and the same workmanship warranty as anything else we fit. Across three bedrooms and a living zone, doing it once is worth more than doing it in stages.",
    accreditation: "Reece trade partner · Kaden authorised dealer",
    productLabel: "12 models · splits, multi-head, ducted, gas ducted, evaporative",
    photo: "/Kaden KSI V3 wall split system.jpg",
    photoFallback: "/kaden-indoor.webp",
    photoAlt: "Kaden split system with outdoor condenser",
    accent: "#2472CE",
    established: "Reece exclusive brand, distributed via Reece stores nationally · trading since 2015",
    warranty: "5-year manufacturer parts + labour + 6-year on our workmanship",
    keyFeatures: [
      "Reece-exclusive, stocked in every Reece store, same-day parts across Victoria",
      "Build quality that holds up next to anything else we fit, on a range wide enough to do a whole house in one visit",
      "Full range: wall splits, multi-head, ducted (10-16 kW), gas ducted, evaporative",
      "Kaden 6-star gas ducted runs a modulating burner, so a house that heats a lot of hours burns noticeably less gas",
    ],
    commonInMelbourne:
      "What we reach for when a family wants three or more bedrooms done in one visit rather than one a year. Very common through Cranbourne, Narre Warren, Hampton Park and Endeavour Hills, where the houses are big enough that doing it in stages means three summers of half a solution. Kaden gas ducted is also our standard like-for-like path out of an old Brivis or Braemar.",
    support:
      "Every Reece store in Melbourne stocks the common Kaden parts, which means same-day pickup for us on almost every job. Warranty claims run through the Reece trade portal.",
    resources: [
      { label: "Kaden · manufacturer website", href: "https://www.kadenair.com.au/" },
      { label: "Reece (distributor)", href: "https://www.reece.com.au/" },
    ],
    products: [
      {
        slug: "kaden-split-25",
        name: "Kaden KSI-v3 2.5 kW Split",
        model: "KSI25-V3",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "2.5 kW cooling / 3.2 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden KSI V3 wall split system.jpg",
        photoAlt: "Kaden KSI-v3 wall split system",
        bestFor: "Bedroom or home office up to 25 m², especially when several rooms go in together",
        ourTake:
          "Inverter compressor, R32, Wi-Fi ready, and enough for a bedroom or a home office. It runs a little louder than the Mitsubishi at the same size, which is worth knowing if the bed sits directly under it, and it's what makes three bedrooms in one visit possible instead of one bedroom a year.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.2 kW" },
          { label: "Room size", value: "up to 25 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Compressor", value: "DC inverter" },
          { label: "Indoor sound (min)", value: "26 dBA" },
          { label: "Wi-Fi", value: "Ready (adapter optional)" },
          { label: "Warranty", value: "5-year parts + 6-year workmanship" },
        ],
        features: [
          "DC inverter compressor for efficient part-load running",
          "R32 low-GWP refrigerant across the KSI-v3 range",
          "Wi-Fi control ready with Kaden app (adapter sold separately)",
          "Auto-restart after a power outage, no reset needed",
          "Follow-me sensor in remote for room-accurate temp targeting",
          "Anti-cold air, sleep mode and ionizer filter across every size",
        ],
        whyWeInstall: [
          "Same crew, same brackets, same 6-year workmanship as anything else we fit",
          "Kaden's Australian distribution means parts and support are reliable through Emerson",
          "5-year parts warranty on top of our 6-year workmanship, 6+ years fully backed",
          "The usual answer when three bedrooms need doing in one visit rather than one a year",
          "R32 refrigerant + inverter puts it on modern efficiency footing, not the old fixed-speed",
        ],
        related: ["kaden-split-35", "kaden-split-5", "msz-ap25"],
      },
      {
        slug: "kaden-split-35",
        name: "Kaden KSI-v3 3.5 kW Split",
        model: "KSI35-V3",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "3.5 kW cooling / 4.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden KSI V3 wall split system.jpg",
        photoAlt: "Kaden KSI-v3 3.5 kW wall split",
        bestFor: "Master bedroom or medium living zone up to 35 m²",
        ourTake:
          "3.5 kW is the size for a master bedroom or a small living zone. Same inverter and Wi-Fi platform as the 2.5, with enough capacity to hold the room with the door open rather than sitting flat out all summer.",
        specs: [
          { label: "Cooling capacity", value: "3.5 kW" },
          { label: "Heating capacity", value: "4.0 kW" },
          { label: "Room size", value: "up to 35 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Compressor", value: "DC inverter" },
          { label: "Indoor sound (min)", value: "28 dBA" },
          { label: "Warranty", value: "5-year parts + 6-year workmanship" },
        ],
        related: ["kaden-split-25", "kaden-split-5"],
      },
      {
        slug: "kaden-split-5",
        name: "Kaden KSI-v3 5.0 kW Split",
        model: "KSI50-V3",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "5.0 kW cooling / 6.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden KSI V3 wall split system.jpg",
        photoAlt: "Kaden KSI-v3 5.0 kW wall split",
        bestFor: "Open-plan living and dining up to 50 m², done alongside the rest of the house",
        ourTake:
          "Enough to hold a modern brick-veneer open-plan through a Melbourne heatwave with the doors open. If the quietest possible unit is what that room needs, say so and we'll price the Mitsubishi instead. If getting the whole house done in one visit is what matters, this is how that happens.",
        specs: [
          { label: "Cooling capacity", value: "5.0 kW" },
          { label: "Heating capacity", value: "6.0 kW" },
          { label: "Room size", value: "up to 50 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Compressor", value: "DC inverter" },
          { label: "Indoor sound (min)", value: "35 dBA" },
          { label: "Wi-Fi", value: "Ready (adapter optional)" },
          { label: "Warranty", value: "5-year parts + 6-year workmanship" },
        ],
        features: [
          "DC inverter compressor, modulates smoothly across part loads",
          "R32 low-GWP refrigerant",
          "Follow-me sensor targets your room temp from the remote position",
          "4-way auto-swing louvres for even room airflow",
          "Wi-Fi control via the Kaden app (adapter sold separately)",
          "Anti-cold air, sleep mode, ionizer filter",
        ],
        whyWeInstall: [
          "Holds the same room the Mitsubishi 5.0 does, on the range that lets the whole house happen at once",
          "Sweet-spot capacity for a typical open-plan family living zone",
          "Kaden distributor pipeline through Emerson gives us reliable parts turnaround",
          "Reece-exclusive rather than an import nobody stocks parts for, which is the difference that shows up in year six",
          "Backed by 5-year parts + our 6-year workmanship",
        ],
        related: ["kaden-split-35", "kaden-split-7", "msz-ap50"],
      },
      {
        slug: "kaden-split-7",
        name: "Kaden KSI-v3 7.0 kW Split",
        model: "KSI70-V3",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "7.0 kW cooling / 8.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden KSI V3 wall split system.jpg",
        photoAlt: "Kaden KSI-v3 7.0 kW wall split",
        bestFor: "Large open-plan living zone up to 70 m²",
        ourTake: "7.0 kW covers a big living zone. Same inverter platform as the smaller sizes, scaled up, so a house done in Kaden stays on one remote, one app and one parts list.",
        specs: [
          { label: "Cooling capacity", value: "7.0 kW" },
          { label: "Heating capacity", value: "8.0 kW" },
          { label: "Room size", value: "up to 70 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Compressor", value: "DC inverter" },
          { label: "Warranty", value: "5-year parts + 6-year workmanship" },
        ],
        related: ["kaden-split-5", "kaden-split-8"],
      },
      {
        slug: "kaden-split-8",
        name: "Kaden KSI-v3 8.0 kW Split",
        model: "KSI80-V3",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "8.0 kW cooling / 9.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden KSI V3 wall split system.jpg",
        photoAlt: "Kaden KSI-v3 8.0 kW wall split",
        bestFor: "Warehouse living zones or big open-plan double-height rooms",
        ourTake: "The biggest wall split in the KSI-v3 range. In a room this size, ducted or multi-head usually moves the air around better, so this one is for the large single space you'd rather not duct.",
        specs: [
          { label: "Cooling capacity", value: "8.0 kW" },
          { label: "Heating capacity", value: "9.0 kW" },
          { label: "Room size", value: "up to 85 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Compressor", value: "DC inverter" },
          { label: "Warranty", value: "5-year parts + 6-year workmanship" },
        ],
        related: ["kaden-split-7", "kaden-ducted-14"],
      },
      {
        slug: "kaden-ducted-10",
        name: "Kaden Ducted 10 kW",
        model: "KCI-100",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "10.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden kdi-v2-Ducted Split System.webp",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Small 3-bed single-storey ducted retrofit",
        ourTake:
          "10 kW of ducted for a smaller three-bedroom single-storey. Same ductwork, same zoning and the same crew as any ducted job we do, on the range that keeps a whole-house number reachable.",
        specs: [{ label: "Cool capacity", value: "10.0 kW" }],
        related: ["kaden-ducted-12", "pead-m"],
      },
      {
        slug: "kaden-ducted-12",
        name: "Kaden Ducted 12.5 kW",
        model: "KCI-125",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "12.5 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden kdi-v2-Ducted Split System.webp",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "3-4 bed single-storey ducted retrofit",
        ourTake: "12.5 kW is the size a typical three or four bedroom single-storey lands on. It's the Kaden ducted we install most, and it zones exactly the way the Mitsubishi does.",
        specs: [{ label: "Cool capacity", value: "12.5 kW" }],
        related: ["kaden-ducted-10", "kaden-ducted-14"],
      },
      {
        slug: "kaden-ducted-14",
        name: "Kaden Ducted 14 kW",
        model: "KCI-140",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "14.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden kdi-v2-Ducted Split System.webp",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Larger single-storey or a modest double-storey",
        ourTake: "14 kW for a larger single-storey, or a long duct run that loses air before it reaches the far bedroom. The one to have when the rest of the house is already on Kaden and you want one remote and one parts list.",
        specs: [{ label: "Cool capacity", value: "14.0 kW" }],
        related: ["kaden-ducted-12", "kaden-ducted-17"],
      },
      {
        slug: "kaden-ducted-17",
        name: "Kaden Ducted 17 kW",
        model: "KCI-170",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "17.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        photo: "/Kaden kdi-v2-Ducted Split System.webp",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Larger single-storey and double-storey family homes",
        ourTake: "The top of the Kaden ducted range, and what goes into the double-storey family homes through Berwick, Officer and Clyde. Past 17 kW the range stops and the Mitsubishi PEA-M picks it up, which is a question of capacity rather than of quality.",
        specs: [{ label: "Cool capacity", value: "17.0 kW" }],
        related: ["kaden-ducted-14", "pead-large"],
      },
      {
        slug: "kaden-multi-2",
        name: "Kaden Multi-Head · 2 Heads",
        model: "KDM2 (4.0 kW combined)",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/Kaden Multi Head.jpg",
        photoAlt: "Kaden multi-head condenser + indoor units",
        capacity: "4.0 kW combined · 2 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Two-bedroom install with only one balcony spot for the outdoor unit",
        ourTake: "Two heads off one outdoor. Same arrangement as the Mitsubishi MXZ-2F, and the option we quote when the house is already on Kaden or the numbers need to cover two rooms in one job.",
        specs: [
          { label: "Combined cooling", value: "4.0 kW" },
          { label: "Indoor heads", value: "2" },
          { label: "Refrigerant", value: "R32" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-multi-4", "mxz-2f"],
      },
      {
        slug: "kaden-multi-4",
        name: "Kaden Multi-Head · 4 Heads",
        model: "KDM4 (8.0 kW combined)",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/Kaden Multi Head.jpg",
        photoAlt: "Kaden multi-head condenser + indoor units",
        capacity: "8.0 kW combined · 4 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Four-head family home install, all four rooms done in one visit",
        ourTake: "Four heads off one outdoor unit, four rooms controlled separately. Same per-room control as any multi-head, same install team and the same 6-year workmanship warranty, and it's the version of this job that gets all four rooms done at once.",
        specs: [
          { label: "Combined cooling", value: "8.0 kW" },
          { label: "Indoor heads", value: "4" },
          { label: "Refrigerant", value: "R32" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-multi-2", "kaden-multi-12", "mxz-4f"],
      },
      {
        slug: "kaden-multi-12",
        name: "Kaden Multi-Head · 12 kW · 5 Heads",
        model: "KDM12 (5-port · 12 kW combined)",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/Kaden Multi Head.jpg",
        photoAlt: "Kaden 12 kW multi-head condenser + indoor heads",
        capacity: "12.0 kW combined · up to 5 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "4-5 bedroom family homes wanting per-room control from one outdoor unit",
        ourTake: "One outdoor condenser feeding up to five indoor heads. Placement is as much of the reason as anything: one unit to find a spot for instead of five, which matters on a block with a single side path narrow enough to argue about.",
        specs: [
          { label: "Combined cooling", value: "12.0 kW" },
          { label: "Combined heating", value: "14.0 kW" },
          { label: "Indoor heads", value: "Up to 5" },
          { label: "Refrigerant", value: "R32" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-multi-4", "kaden-multi-18", "mxz-5f"],
      },
      {
        slug: "kaden-multi-18",
        name: "Kaden Multi-Head · 18 kW · 6 Heads",
        model: "KDM18 (6-port · 18 kW combined)",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/Kaden Multi Head.jpg",
        photoAlt: "Kaden 18 kW multi-head condenser + indoor heads",
        capacity: "18.0 kW combined · up to 6 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Five and six bedroom homes that want per-room control without going ducted",
        ourTake: "Kaden's biggest multi-head, six indoor heads off one outdoor unit. Six rooms each on their own setpoint with no ductwork in the ceiling, which is the answer for a house where running ducts would mean opening up half the roof space.",
        specs: [
          { label: "Combined cooling", value: "18.0 kW" },
          { label: "Combined heating", value: "21.0 kW" },
          { label: "Indoor heads", value: "Up to 6" },
          { label: "Refrigerant", value: "R32" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-multi-12", "mxz-6c"],
      },
      {
        slug: "kaden-internal-3",
        name: "Kaden Gas Ducted · 3-Star Internal",
        model: "KGH-3 Compact Universal · internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · internal cupboard",
        starRating: "3-star",
        veuEligible: false,
        photo: "/kaden_internal_ducted_heater_3 star.jpg",
        photoAlt: "Kaden 3-star internal gas ducted heater",
        bestFor: "Like-for-like swap for an ageing 3-star internal, done in a day",
        ourTake:
          "Drops straight into an existing cupboard cavity, so the ducts, the controller wiring and the return-air grille all stay put and the house is warm again the same day. Same install team and the same 6-year workmanship as anything else we fit.",
        specs: [
          { label: "Star rating", value: "3-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-internal-starpro-45", "kaden-external-3", "brivis-internal-wombat-3"],
      },
      {
        slug: "kaden-internal-starpro-45",
        name: "Kaden Starpro · 4 & 5-Star Internal",
        model: "Starpro 4★ / 5★ Internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 4-star or 5-star · internal cupboard",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/kaden_internal_ducted_heater_star pro 4 and 5  star.jpg",
        photoAlt: "Kaden Starpro 4/5-star internal gas ducted heater",
        bestFor: "In-cupboard retrofit for a household that runs the heater all winter",
        ourTake:
          "The Kaden with the efficiency where the gas bill notices it. Same internal cupboard footprint as the 3-star so the retrofit stays clean, and enough of a step that a family heating every day through a Melbourne winter feels it.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-internal-3", "kaden-external-starpro-45", "brivis-internal-starpro-45"],
      },
      {
        slug: "kaden-external-3",
        name: "Kaden Gas Ducted · 3-Star External",
        model: "KGH-3-EXT Compact Universal · external cabinet",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · external weatherproof cabinet",
        starRating: "3-star",
        veuEligible: false,
        photo: "/kaden_external_ducted_heater_3 star.jpg",
        photoAlt: "Kaden 3-star external gas ducted heater cabinet",
        bestFor: "External-cabinet retrofit for homes with the ducted heater outside on a pad",
        ourTake:
          "The 3-star external is the outdoor-cabinet sibling of the internal 3-star, same core burner and heat exchanger, weatherproof cabinet. Common on older Endeavour Hills / Berwick weatherboards where the ducted heater sits on an external slab.",
        specs: [
          { label: "Star rating", value: "3-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-external-starpro-45", "kaden-internal-3", "brivis-external-buffalo"],
      },
      {
        slug: "kaden-external-starpro-45",
        name: "Kaden Starpro · 4 & 5-Star External",
        model: "Starpro 4★ / 5★ External",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 4-star or 5-star · external cabinet",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/kaden_external_ducted_heater_4 and 5 star.jpg",
        photoAlt: "Kaden Starpro 4/5-star external gas ducted heater cabinet",
        bestFor: "External-cabinet retrofit where the heater runs most of the winter",
        ourTake:
          "The 4/5-star in a weatherproof cabinet, for the house that has always had its heater outside. The universal footprint drops onto an existing Brivis or Braemar pad without new base work, so the slab and the gas line both stay where they are.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-external-3", "kaden-internal-starpro-45", "brivis-external-starpro-45"],
      },
      {
        slug: "kaden-evaporative-classic",
        name: "Kaden Classic Evaporative Cooler",
        model: "KDE Classic profile",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling",
        capacity: "Small · Medium · Large roof units · Classic (taller) silhouette",
        veuEligible: false,
        photo: "/Kaden classic_evap cooler .jpg",
        photoAlt: "Kaden Classic evaporative cooler roof unit",
        bestFor: "Standard roof pitches where the Classic silhouette isn't a street-view concern",
        ourTake:
          "Kaden's Classic evap works on the same principle as the Brivis Contour, with an Emerson-backed parts pipeline behind it. Cools a whole home for ~25% of refrigerated running cost when outside humidity is low.",
        specs: [
          { label: "Silhouette", value: "Classic (taller) roof profile" },
          { label: "Capacity", value: "Small · Medium · Large roof unit sizes" },
          { label: "Refrigerant", value: "None · evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Same whole-home cooling principle as the Brivis Contour, on the Kaden parts pipeline",
          "Three roof-unit sizes (Small / Medium / Large) matched to home cooling load",
          "Roof-mounted install, cooled air through ceiling vents",
          "Emerson-backed parts pipeline, reliable Melbourne warranty turnaround",
        ],
        whyWeInstall: [
          "Whole-home evap for dry-summer suburbs, on the Kaden parts pipeline",
          "Same install team, same 6-year workmanship warranty as the Brivis quote",
          "Suits the large-footprint homes through Cranbourne, Clyde and Officer, where summers are dry enough that evap does the job refrigerated ducted would do at several times the running cost",
        ],
        related: ["kaden-evaporative-low", "brivis-evap-contour", "kaden-internal-3"],
      },
      {
        slug: "kaden-evaporative-low",
        name: "Kaden Low-Profile Evaporative Cooler",
        model: "KDE Low-Profile",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling",
        capacity: "Small · Medium · Large roof units · Low-Profile (flatter) silhouette",
        veuEligible: false,
        photo: "/Kaden low_evap cooler.jpg",
        photoAlt: "Kaden Low-Profile evaporative cooler roof unit",
        bestFor: "Street-view sensitive homes and low-pitch roofs where the Classic silhouette is too tall",
        ourTake:
          "The same job as the Kaden Classic, in a flatter cabinet. It goes on where the roofline is what matters, a character street or a covenanted estate, and on low-pitch roofs where a taller cabinet would sit awkwardly no matter how well it cooled.",
        specs: [
          { label: "Silhouette", value: "Low-Profile (flatter) roof silhouette" },
          { label: "Capacity", value: "Small · Medium · Large roof unit sizes" },
          { label: "Install position", value: "Roof-mounted (suits low-pitch roofs)" },
          { label: "Refrigerant", value: "None · evaporative water cooling" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Low-Profile silhouette, clean street-view roofline",
          "Same cooling capability as the Classic, just a flatter cabinet",
          "Same flatter cabinet as the Brivis Advance, on the Kaden parts pipeline",
          "Suits low-pitch roofs where the Classic silhouette would sit awkwardly",
        ],
        whyWeInstall: [
          "Low-profile evap for heritage and covenanted streets, where roof height is capped",
          "Same install team, same 6-year workmanship warranty",
          "Emerson parts pipeline, quick Melbourne warranty turnaround",
        ],
        related: ["kaden-evaporative-classic", "brivis-evap-advance", "kaden-internal-3"],
      },
    ],
  },

  // ================== ZONEMATE ==================
  {
    slug: "zonemate",
    name: "Zonemate",
    tagline: "Zoning controllers for ducted systems.",
    origin: "Australia",
    intro:
      "Zonemate is what turns a single-motor ducted system into something you can run room by room. Every ducted install we quote has one in it as standard rather than as an extra, because shutting off the rooms nobody is in cuts running cost 30 to 40% against an always-on ducted, and that is the biggest number on the whole job.",
    ourTake:
      "Zoning is the single biggest efficiency win on a ducted system. Zonemate's touch controllers are the ones we specify because they're built for Australian installer wiring standards and the ranges of dampers they support cover every ducted brand we install.",
    productLabel: "1 product · Milieu Touch zoning (up to 24 zones, multi-unit)",
    photo: "/Milieu Zonemate tablet.jpg",
    photoFallback: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",
    photoAlt: "Zonemate Milieu wall tablet zoning control",
    photoScene: true,
    accent: "#1E8E4E",
    established: "Australian-designed and manufactured for the local ducted market",
    warranty: "5-year controller + 5-year dampers + 6-year on our workmanship",
    keyFeatures: [
      "Up to 12 zones on a single control board, covers virtually every residential ducted install",
      "Second control board doubles capacity to 24 zones, large homes and commercial fitouts",
      "Runs multiple ducted units off one Milieu tablet, a single interface for a two-system home",
      "Variable-speed dampers modulate airflow 0-100% per zone (proper comfort, not just on/off)",
    ],
    commonInMelbourne:
      "Every ducted job we quote has a Zonemate Milieu in it as standard. Zoning is the biggest single lever on a ducted system's running cost, and shutting off unused rooms takes 30 to 40% off it. Twelve zones on one board covers a larger home without an expansion board, and running more than one indoor unit from a single tablet is what makes the Clyde North and Officer double-storeys with two ducted systems workable.",
    support:
      "Zonemate's Melbourne office is on the phone within the hour when we hit a wiring issue. Controllers and dampers are held locally by our supplier network, so warranty replacements land the same day rather than the following week.",
    resources: [
      { label: "Zonemate zoning systems", href: "https://zonemate.com.au/" },
    ],
    products: [
      {
        slug: "zonemate-touch",
        name: "Zonemate Touch Zoning System",
        model: "Zonemate Milieu · up to 12 zones / one board (24 with second board)",
        category: "zoning",
        categoryLabel: "Ducted zoning system",
        capacity: "Up to 12 zones on one control board · up to 24 with a second board · runs multiple ducted units off a single control",
        veuEligible: false,
        photo: "/Milieu Zonemate tablet.jpg",
        photoAlt: "Zonemate Milieu wall tablet, up to 12 zones + multi-unit control",
        bestFor: "Every ducted install, from a 4-zone single-storey through to a 24-zone commercial fitout with multiple ducted units run off one control",
        ourTake:
          "Zoning is the biggest single lever on a ducted system's running cost. Shutting off the rooms nobody is in cuts it 30 to 40%, which is why every ducted job we quote has zoning in it rather than as an extra. The Milieu control handles up to 12 zones on one board, and a second board takes it to 24. It will also drive more than one ducted indoor unit from the same wall tablet, so a large home or a commercial fitout gets one interface instead of one per system. Sized to the house: 6 zones for most family homes, 12 for a double-storey, 24 with the expansion board when a warehouse fitout calls for it.",
        specs: [
          { label: "Zones per control board", value: "Up to 12 zones (single board)" },
          { label: "Max zones with expansion", value: "Up to 24 zones (add a second control board)" },
          { label: "Multi-unit control", value: "Runs multiple ducted units off the one Milieu tablet" },
          { label: "Wall interface", value: "Zonemate Milieu touch tablet (Wi-Fi + app control included)" },
          { label: "Damper options", value: "Variable-speed (0-100% modulation) or constant-speed (on/off)" },
          { label: "Compatibility", value: "Mitsubishi PEA-M / PEAD-M, Kaden KCI, and every ducted brand we install" },
          { label: "Room sensors", value: "Optional Zonemate Smart Sensors per zone for true room-temp targeting" },
          { label: "App control", value: "Milieu app on iOS + Android, same UI as the wall tablet" },
          { label: "Controller warranty", value: "5-year parts + labour" },
          { label: "Damper warranty", value: "5-year parts + labour" },
          { label: "Workmanship", value: "6-year on our install" },
        ],
        features: [
          "Up to 12 zones on a single control board, covers virtually every residential ducted install without expansion",
          "Second control board doubles capacity to 24 zones, for large homes or commercial fitouts",
          "Runs multiple ducted units off the one Milieu tablet, no separate controller per system",
          "Milieu app on iOS + Android, same UI as the wall tablet, no learning curve for the household",
          "Variable-speed dampers modulate 0-100% per zone so airflow ramps rather than slams open/shut",
          "Constant-speed dampers where a room only ever needs to be open or shut, which is most spare bedrooms",
          "Room-by-room Smart Sensors give true room-temp targeting instead of just return-air temp",
          "Australian-designed and Melbourne-supported, parts warehouse on the phone within an hour",
          "Plays with every ducted brand we install, no bridge or third-party interface needed",
        ],
        whyWeInstall: [
          "The single biggest efficiency lever on a ducted system, shutting off unused rooms cuts running cost 30-40%",
          "12-zones-on-one-board headroom means we can add a bedroom / study zone in year 3 without ripping out the controller",
          "Multi-unit-from-one-control is unique in the residential zoning market, genuinely handy for larger homes with a second ducted system",
          "Only zoning brand we quote, the wiring standard is built for how Australian installers work",
          "Melbourne parts + support means warranty replacements land same-day, not weeks later",
          "Backed by 5-year parts + our 6-year workmanship, 6+ years fully covered end-to-end",
        ],
      },
    ],
  },
];

export const brands: Brand[] = brandCatalogue
  .slice()
  .sort((a, b) => BRAND_ORDER.indexOf(a.slug) - BRAND_ORDER.indexOf(b.slug));

export const publishedBrands: Brand[] = brands;

export function findBrand(slug: string) {
  return brands.find((b) => b.slug === slug);
}

export function findProduct(brandSlug: string, productSlug: string) {
  const brand = findBrand(brandSlug);
  if (!brand) return null;
  const product = brand.products.find((p) => p.slug === productSlug);
  if (!product) return null;
  return { brand, product };
}

export function allBrandProductPairs() {
  return brands.flatMap((b) => b.products.map((p) => ({ brand: b.slug, product: p.slug })));
}

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
  /**
   * True for a product retired from the catalogue but kept in the data
   * so its old URL can 301 rather than 404. WEB-008 B3: the Thermann
   * electric- and gas-storage tanks were near-duplicate legacy pages
   * (six electric sizes barely distinguishable) that took no clicks and
   * that we don't push — we lead with heat pumps. They're filtered out
   * of every listing and 301'd to the brand hub in next.config.
   */
  retired?: boolean;
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
  /**
   * Where a brand makes more than one kind of system (Reclaim's split and
   * all-in-one), the kinds side by side, each linking to its product page.
   */
  /**
   * The range as the header's picture: product shots on white, each named.
   * For a brand whose only install photos don't read as that brand: a
   * roof-space unit is anybody's, and a photo of the wrong brand under this
   * one's name is worse than none.
   */
  heroProducts?: { src: string; alt: string; label: string }[];
  /**
   * "Why we choose it" as big figures: the number, what it is, and what it
   * means for you. On the blocks layout each one is a photo card, so it can
   * carry an image; `cover` marks a photograph (fills the frame) rather than
   * a studio cut-out (sits on white).
   */
  reasons?: { v: string; k: string; d: string; img?: string; alt?: string; cover?: boolean; pos?: string }[];
  /**
   * "Made better": what's inside that makes it a better system, numbered
   * either side of one product shot. `pin` puts the point's number on the
   * photo where that part sits ([x%, y%] of the photo panel); `inset` is a
   * second, smaller shot in the panel's top corner, for a point about a
   * different unit (the wall unit beside the outdoor one).
   */
  quality?: {
    /** The section's name in the bar of links under the hero; "Made better" if not set. */
    tab?: string;
    heading: string;
    intro: string;
    /** `cover` fills the panel with a photograph instead of sitting a cut-out on white. */
    image: { src: string; alt: string; cover?: boolean };
    inset?: { src: string; alt: string };
    points: { t: string; d: string; pin?: [number, number] }[];
  };
  /**
   * "blocks": the homepage's layout, a run of white sections and navy
   * blocks with few words in each. Mitsubishi asked for it; other brands
   * keep the page below until they're redone the same way.
   */
  layout?: "blocks";
  /**
   * The blocks layout's colour where `accent` won't carry a band of its own:
   * a navy-dark blue disappears against the navy sections. Defaults to `accent`.
   */
  blockAccent?: string;
  /** The coloured word in a heading on a navy band; a lightened accent if not set. */
  accentLight?: string;
  /** Owning one, year by year from install day (year 0), for the year-ten timeline. */
  timeline?: { y: number; t: string; d: string }[];
  /**
   * "Which one is right for you": a few questions that land on one of the
   * brand's options. A step with `if` is only asked when an earlier answer
   * matches; the first result whose `when` matches every answer wins, so
   * list the specific ones first.
   */
  picker?: {
    steps: { id: string; q: string; opts: { v: string; l: string }[]; if?: Record<string, string> }[];
    results: { when: Record<string, string>; model: string; why: string }[];
  };
  /**
   * The company behind the badge, in a few lines and a few dates. `stops`
   * is where the system comes from on its way to a wall here (designed,
   * built, fitted), drawn as a route on the blocks layout.
   */
  story?: { heading: string; body: string; marks: { v: string; k: string }[]; stops?: { place: string; role: string; d: string }[] };
  /** The brand's own mark, drawn in code rather than shipped as an image. */
  mark?: "three-diamonds";
  /** The heading over `versus`, e.g. "Mitsubishi or Kaden?". */
  versusHeading?: string;
  /** A real install photo for the hero, with the product shot on a card over it. */
  heroScene?: { src: string; alt: string; caption: string };
  /** Photos of the product installed, for the "what it looks like at home" row. */
  photos?: { src: string; alt: string; caption?: string }[];
  formats?: { heading: string; items: { name: string; img: string; line: string; points: string[]; best: string; href: string }[] };

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
    /** The section's name in the bar of links on the blocks layout; "Year ten" if not set. */
    tab?: string;
    heading: string;
    photo: string;
    photoAlt: string;
    /** Where the photo's subject sits, for a crop that keeps it in frame (CSS object-position). */
    photoPos?: string;
    body: string;
    facts: string[];
  };

  /** "How the job runs" — the numbered steps, brand-specific. */
  steps?: { title: string; detail: string }[];

  /** Brand-level FAQs. One open at a time, same as everywhere else. */
  faqs?: { q: string; a: string }[];

  /* ---------------------------------------------------------------
   * The brand-page-that's-actually-about-the-brand fields.
   *
   * A brand page's visitor has usually just been handed a quote naming
   * this manufacturer and is checking it's any good — or comparing it
   * against the others. So the page leads with the brand's identity and
   * our honest verdict on it, and demotes our install process to a strip
   * near the bottom. Every field is optional and the section hides when
   * it's absent, so the six brands still on the old data render a leaner
   * version until each is written.
   * ------------------------------------------------------------- */

  /** The one big thing this brand is known for — a short claim and the
   *  sentence that earns it. Leads the "why this brand" section. */
  whyLead?: { claim: string; sub: string };
  /** Our honest verdict, as the installer with no reason to push one
   *  brand. Two or three sentences; distinct from `ourTake`, which is
   *  the shorter facts-strip version. */
  verdict?: string;
  /** Where this brand is NOT the right call. The half a manufacturer's
   *  own site can never write, and the reason ours is worth reading. */
  notRightWhen?: string;
  /** The honest cross-brand line: which of the others we'd fit instead,
   *  and when. Only where there's a real alternative in the same slot. */
  versus?: string;
  /** Service slug for the "Narrow it down" advisor calculator, when the
   *  brand maps cleanly to one service (e.g. Mitsubishi →
   *  "air-conditioning-installation"). Renders the SystemAdvisor box so a
   *  buyer on a brand page can still find the right system for their house. */
  advisorService?: string;
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
    layout: "blocks",
    // Brivis's own navy all but disappears against the page's navy bands.
    blockAccent: "#1F5FBF",
    heroProducts: [
      { src: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg", alt: "Brivis StarPro gas ducted heaters, internal and external", label: "StarPro" },
      { src: "/Brivis Wombat Indoor 3 star.jpg", alt: "Brivis Classic Wombat 3-star internal gas ducted heater", label: "Classic Wombat" },
      { src: "/Brivis touch tablet controller.jpg", alt: "Brivis touch tablet controller", label: "Controller" },
    ],
    story: {
      heading: "Melbourne's gas ducted heater, {since 1971}.",
      body: "Brivis started in Melbourne in 1971 and has been part of Rinnai Australia since 2004. Most homes in Pakenham, Berwick, Officer and Cranbourne built between 1990 and 2015 were built with one.",
      marks: [
        { v: "1971", k: "Founded in Melbourne" },
        { v: "2004", k: "Part of Rinnai Australia" },
        { v: "1990–2015", k: "When most homes here were built with one" },
      ],
      stops: [
        { place: "Melbourne", role: "Founded", d: "A Melbourne heater brand since 1971, and Rinnai-owned since 2004." },
        { place: "Rinnai's Melbourne warehouse", role: "Backed", d: "Parts for every Brivis still in the field, discontinued models included." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed and carbon monoxide tested by our own crew." },
      ],
    },
    quality: {
      tab: "Built to swap",
      heading: "Built to {swap straight in}.",
      intro: "Same footprint, same ducts, same controller wiring, so the house is warm again the day we start.",
      image: { src: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg", alt: "Brivis StarPro gas ducted heaters" },
      points: [
        { t: "The same footprint", d: "The Wombat and Buffalo share their footprint with older Brivis and Braemar units, so the ducts, wiring and return-air grille all stay put." },
        { t: "Cupboard or pad", d: "An internal unit where the heater lives in a cupboard, the weatherproof Buffalo where it sits outside on a slab." },
        { t: "3-star to 6-star", d: "A Wombat for a rental, a StarPro 4 or 5-star where the gas bill starts to move." },
        { t: "A burner that modulates", d: "The 6-star StarPro varies its output to match the rooms, for a house that heats a lot of hours." },
      ],
    },
    reasons: [
      { v: "Same day", k: "warm again", d: "A like-for-like swap reuses the ducts and wiring, so the house is heated the day we start.", img: "/Brivis Wombat Indoor 3 star.jpg", alt: "Brivis Classic Wombat internal gas ducted heater" },
      { v: "1971", k: "a Melbourne brand", d: "The heater more homes in this corridor were built with than any other.", img: "/Brivis Compact Classic Indoor Gas Heater.jpg", alt: "Brivis Compact Classic internal gas ducted heater" },
      { v: "6-star", k: "modulating burner", d: "The most efficient StarPro varies its output instead of cycling on and off.", img: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg", alt: "Brivis StarPro gas ducted heaters" },
      { v: "Year 15", k: "and still fixable", d: "Rinnai holds Brivis parts for every unit still in the field, so most are fixed in one visit.", img: "/Brivis Buffalo Outdorr.jpg", alt: "Brivis Buffalo external gas ducted heater" },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "Both warranties start. CO tested." },
      { y: 5, t: "Year 5", d: "Brivis's heat exchanger warranty ends." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
      { y: 15, t: "Year 15", d: "Usually still fixable. Rinnai holds the parts." },
    ],
    picker: {
      steps: [
        { id: "use", q: "How much do you run the heater?", opts: [{ v: "rent", l: "It's a rental, or we're selling" }, { v: "eve", l: "A few hours on cold evenings" }, { v: "most", l: "Most evenings, all winter" }, { v: "day", l: "Most of the day, all winter" }] },
      ],
      results: [
        { when: { use: "rent" }, model: "Classic Wombat 3-star", why: "The lowest price up front, in the same footprint as the old one. The right call for a house being rented or sold." },
        { when: { use: "eve" }, model: "StarPro 4-star", why: "Uses less gas than a 3-star, without paying for efficiency you won't use in a few hours a night." },
        { when: { use: "most" }, model: "StarPro 5-star", why: "Less gas again, which adds up over a long Melbourne winter of heating every evening." },
        { when: { use: "day" }, model: "StarPro 6-star", why: "The modulating burner matches its output to the house, the most efficient way to heat a lot of hours." },
      ],
    },
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

    // --- brand-first fields (Brivis) ---
    advisorService: "gas-plumbing",
    whyLead: {
      claim: "Why we choose {Brivis}.",
      sub: "It's the heater most of these houses were built with, so a like-for-like swap has the house warm again the same day.",
    },
    verdict:
      "Brivis is the answer when a gas ducted heater comes out and a gas ducted heater goes back in: same footprint, same ducts, same controller wiring, so the house is warm again the day we start. It is the brand more homes in this corridor were built with than any other, and because Rinnai holds parts for every unit still in the field, even a fifteen-year-old one usually stays serviceable. Where we are straight with you is age: past 12–15 years we put a reverse-cycle price alongside it, not to talk you off gas, but so you decide with both running costs in front of you.",
    notRightWhen:
      "If the old unit is well past its life and you run the heater all winter, gas is not automatically the cheap option any more, the running-cost gap to a reverse-cycle ducted can pay back the swap. And if you are moving off gas entirely, there is no sense putting a new burner in first. In both cases we price the reverse-cycle alternative next to the Brivis so the numbers make the call, not us.",
    versus:
      "We fit reverse-cycle too, and where the old unit is well past its life and you heat all winter, a Mitsubishi Electric ducted is the honest spend: it reuses much of the existing duct run, does the cooling as well, and ends the gas bill. Brivis is what goes in when the ducts are sound, the unit is not ancient, and a same-day like-for-like is what the house needs.",
    heroSub:
      "The gas ducted heater we replace, service and re-install more than any other in the south-east, most homes here were built with one. When the ducts are sound and only the heater has failed, a like-for-like Brivis has the house warm again the same day.",
    fitsWhere:
      "The heater cupboard or the side-of-house pad in Pakenham, Berwick, Officer, Cranbourne and Endeavour Hills homes built 1990–2015: internal Wombat and Starpro where it lives in a cupboard, Buffalo and external Starpro where it sits outside on a slab.",
    heroFacts: [
      { v: "9", k: "Models we install and support" },
      { v: "Since 1971", k: "Melbourne-built · Rinnai-owned since 2004" },
      { v: "3–6 star", k: "Wombat through to Starpro efficiency" },
      { v: "5 yr & 6 yr", k: "5-yr manufacturer and 6-yr workmanship warranties, both from install day" },
    ],
    benefitsHeading: "Why the like-for-like usually wins.",
    benefitTiles: [
      {
        t: "Warm again the same day",
        line: "Same footprint, same ducts, same controller wiring",
        detail:
          "The Wombat and Buffalo share their footprint with the older Brivis and Braemar units, so the existing ducts, controller wiring and return-air grille all stay where they are. A straight swap is usually done in a day, and the house is heated the same afternoon.",
        icon: "clock",
      },
      {
        t: "The one these houses were built with",
        line: "Most homes here built 1990–2015 shipped with a Brivis",
        detail:
          "We have been inside more Brivis than anything else on this list. Pakenham, Berwick, Officer, Cranbourne and Endeavour Hills. When the ductwork is sound and only the heater has failed, staying on Brivis is the least-disruptive path there is.",
        icon: "people",
      },
      {
        t: "Parts on a Melbourne shelf in year fifteen",
        line: "Rinnai holds Brivis parts for every unit still in the field",
        detail:
          "Rinnai's Melbourne warehouse stocks parts for every Brivis still out there, discontinued models included. We carry controllers, ignition units and burners on the truck, so most service jobs are fixed in one visit rather than booked in twice.",
        icon: "truck",
      },
      {
        t: "3-star to 6-star, one range",
        line: "A Wombat for a rental, a modulating Starpro for a house you heat hard",
        detail:
          "A 3-star Wombat is the right call for a house being sold or rented; the Starpro 4/5-star is where the gas bill starts to move; the 6-star Starpro's modulating burner varies its output to match the rooms in a home that heats a lot of hours. Same cupboard footprint across the lot, so the retrofit stays clean whichever you pick.",
        icon: "flame",
      },
      {
        t: "Cupboard or pad, we match what's there",
        line: "Internal Wombat and Starpro, or the weatherproof Buffalo outside",
        detail:
          "Some of these homes have the heater in an internal cupboard; the older Berwick, Endeavour Hills and Cranbourne weatherboards have it outside on a slab. We fit the internal unit or the external cabinet to suit, reusing the existing pad and gas line rather than pouring anything new.",
        icon: "wrench",
      },
      {
        t: "Both running costs, in writing",
        line: "Past 12–15 years we price a reverse-cycle alongside",
        detail:
          "If the old unit is getting on, we put a reverse-cycle ducted price next to the Brivis, not to talk you off gas, but so you decide with both running costs in front of you. Plenty of people still choose the gas swap, and that is fine when it is the right call for the house.",
        icon: "snowflake",
      },
    ],
    servicing: {
      tab: "Year fifteen",
      heading: "Still going in {year fifteen}.",
      photo: "/gas-ducted-install.webp",
      photoAlt: "A Brivis gas ducted heater installed in a Melbourne home",
      body:
        "Anyone can swap a heater in. The part that decides whether it was a good decision is whether it can still be fixed in ten or fifteen years, and with Brivis that answer is usually yes, because Rinnai keeps the parts pipeline open on units most brands would have orphaned. Every gas heater we touch also gets a carbon monoxide test, whether you asked for one or not.",
      facts: [
        "Rinnai's Melbourne warehouse holds Brivis parts for every unit still in the field, discontinued models included",
        "We carry controllers, ignition units and burners on the truck, so most service jobs are fixed in one visit rather than booked in twice",
        "Every gas heater we install or service gets a carbon monoxide test: a safety check, not a sales one",
        "Our 6-year workmanship warranty covers the install: the gas line, the ducting connections, the flue and the mounting, on top of the Brivis manufacturer cover on the unit itself",
      ],
    },
    steps: [
      { title: "Look at what's there", detail: "We check the existing unit, the ductwork, the return-air and the cupboard or pad it sits on. Nine times out of ten only the heater has failed and everything around it gets reused, which is the whole reason a Brivis swap stays cheap." },
      { title: "Written quote: with the honest comparison", detail: "Model, star rating, output and the total installed price in writing. If the old unit is past 12–15 years we put a reverse-cycle ducted price next to it, so you decide with both running costs in front of you rather than on the spot." },
      { title: "Stock ordered, day booked", detail: "Rinnai's Melbourne warehouse is quick on Brivis stock, so we confirm your install day the moment the unit lands with us rather than pencilling one in and hoping." },
      { title: "Old unit out, new one in", detail: "We pull the failed heater and drop the like-for-like into the same footprint: internal cupboard or external cabinet: reusing the existing ducts, controller wiring and, on an outdoor job, the existing pad and gas line. Most swaps are done in a day." },
      { title: "Commission and set the controller", detail: "We fire it up, check the burner and gas pressure, run a carbon monoxide test, and set up the Brivis Networker wall controller with you before we leave." },
      { title: "Compliance and warranty", detail: "Gas compliance certificate lodged, and the Brivis manufacturer warranty registered in your name, with our 6-year workmanship warranty on the install behind it." },
    ],
    faqs: [
      {
        q: "Can you just swap the heater and reuse my existing ducts?",
        a: "Almost always, yes. The Wombat and Buffalo share their footprint with the older Brivis and Braemar units, so when the ductwork is sound and only the heater has failed we reuse the existing ducts, the controller wiring and the return-air grille and drop a new unit into the same spot. That is what keeps a swap well under the cost of a fresh install, and it is usually done in a day.",
      },
      {
        q: "My Brivis is fifteen years old: can it still be fixed, or do I have to replace it?",
        a: "Often it can still be fixed. Rinnai keeps Brivis parts for every unit still in the field, discontinued models included, and we carry controllers, ignition units and burners on the truck, so a lot of older units are a one-visit repair rather than a replacement. If it is genuinely past it we will tell you, carbon monoxide test it first for safety, and price the replacement so you decide with numbers in front of you rather than in a cold house in June.",
      },
      {
        q: "Should I stay on gas or switch to reverse-cycle?",
        a: "It depends on the unit's age and how hard you run it. If the ducts are sound and the heater is not ancient, a like-for-like Brivis is the least-disruptive and usually cheapest way to be warm again the same day. If the old unit is well past its life and you heat all winter, we put a reverse-cycle ducted price alongside it: not to push you off gas, but so both running costs are in front of you.",
      },
      {
        q: "What's the difference between the Wombat and the Starpro?",
        a: "Star rating, and therefore the gas bill. The Wombat is a 3-star heater: the right call for a house being sold, rented, or heated a few weeks a year. The Starpro 4/5-star is where the gas bill starts to move for a family running it all winter, and the 6-star Starpro adds a modulating burner that varies its output to match the rooms. Same cupboard footprint across all of them, so the retrofit is the same job whichever you pick.",
      },
      {
        q: "My heater's outside on a slab, not in a cupboard, is that a problem?",
        a: "Not at all. The Buffalo and external Starpro are the weatherproof-cabinet builds for exactly that, common on the older Berwick, Endeavour Hills and Cranbourne weatherboards where the heater has always sat outside. We reuse the existing pad and gas line, so nothing new gets poured.",
      },
      {
        q: "What warranty do I get, and do you carbon monoxide test it?",
        a: "The Brivis manufacturer warranty covers the unit, and on top of that we carry six years on our own workmanship: the gas line, the ducting connections, the flue and the mounting, the things that are our fault if they go wrong. And every gas heater we install or service gets a carbon monoxide test whether you asked for one or not; it is a safety check, not a sales one.",
      },
    ],

    products: [
      {
        slug: "brivis-internal-wombat-3",
        name: "Brivis Classic Wombat · 3-Star Internal",
        model: "Compact Classic Wombat 3★",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 26 · 30 kW output",
        starRating: "3-star",
        veuEligible: false,
        photo: "/Brivis Wombat Indoor 3 star.jpg",
        photoAlt: "Brivis Classic Wombat 3-star internal gas ducted heater",
        bestFor: "Like-for-like retrofit into an existing cupboard cavity, usually done in a few hours",
        ourTake:
          "The Wombat is the straight swap. It shares its footprint with the older Brivis and Braemar units, so the existing ducts, controller wiring and return-air grille all stay where they are and the job is usually done in 3–5 hours. It's a 3-star heater, which is the right call for a house that's being sold, rented out, or heated a few weeks a year. If you're staying and running it all winter, a Starpro burns less gas doing the same work, and we'll show you both numbers.",
        specs: [
          { label: "Star rating", value: "3-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
        capacity: "15 · 20 · 26 · 30 kW output · higher-spec internal",
        veuEligible: false,
        photo: "/Brivis Compact Classic Indoor Gas Heater.jpg",
        photoAlt: "Brivis Compact Classic internal gas ducted heater",
        bestFor: "In-cupboard retrofit where the heater cupboard backs onto a bedroom",
        ourTake:
          "Same in-cupboard footprint as the Wombat, with a better fan and a longer service life behind it. What usually decides it is noise: when the heater cupboard backs onto a bedroom or the hallway you walk down at 6am, that's the difference you actually notice. Fit it and forget about it for 15 years.",
        specs: [
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
        capacity: "15 · 20 · 26 · 30 kW output · 4-star or 5-star",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/Brivis Starpro 4 and 4 & 5 star indoor verison and external verson .jpg",
        photoAlt: "Brivis Starpro 4/5-star internal gas ducted heater",
        bestFor: "In-cupboard retrofit for a household staying put and running the heater all winter",
        ourTake:
          "Starpro 4/5-star is where the gas bill starts to move. Same in-cupboard footprint as the Wombat so the retrofit stays clean, and enough of an efficiency gain that a family running the heater every day through a Melbourne winter feels it on the bill. The 6-star adds a modulating burner on top of that, which is worth having in some houses and not in others, and we'll tell you which yours is.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
        capacity: "15 · 20 · 26 · 30 kW output · 6-star premium",
        starRating: "6-star",
        veuEligible: false,
        photo: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg",
        photoAlt: "Brivis Starpro 6-star internal gas ducted heater",
        bestFor: "Homes staying on gas for the long haul that run the heater hard",
        ourTake:
          "The modulating burner is what you're buying here. Instead of firing flat out and shutting off, it varies its output to match what the rooms are asking for, so there's less temperature swing and less gas burnt getting there. It earns its money in a house that heats a lot of hours, and it's the most efficient gas ducted heater Brivis builds.",
        specs: [
          { label: "Star rating", value: "6-star (premium efficiency)" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
        capacity: "15 · 20 · 26 · 30 kW output · external cabinet",
        veuEligible: false,
        photo: "/Brivis Buffalo Outdorr.jpg",
        photoAlt: "Brivis Buffalo external gas ducted heater cabinet",
        bestFor: "Homes built with the ducted heater outside on a pad rather than in an internal cupboard",
        ourTake:
          "The outdoor-cabinet build, weatherproofed, with the quieter fan and longer service life of the internal Compact Classic. Common on older weatherboard homes where the heater has always sat on a slab down the side of the house, and where the existing pad and gas line come straight across.",
        specs: [
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
        capacity: "15 · 20 · 26 · 30 kW output · 4-star or 5-star · external cabinet",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/Brivis Starpro 4 and 4 & 5 star indoor verison and external verson .jpg",
        photoAlt: "Brivis Starpro 4/5-star external gas ducted heater cabinet",
        bestFor: "External-cabinet retrofit where the heater runs most of the winter",
        ourTake:
          "Starpro External in 4-star or 5-star, for the house with the heater outdoors that runs it hard enough to care what the gas costs. Same weatherproof cabinet footprint as the Buffalo External, so the existing pad and gas line get reused and nothing new gets poured.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
        capacity: "15 · 20 · 26 · 30 kW output · 6-star premium · external cabinet",
        starRating: "6-star",
        veuEligible: false,
        photo: "/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg",
        photoAlt: "Brivis Starpro 6-star external gas ducted heater cabinet",
        bestFor: "Outdoor-cabinet homes staying on gas for the long haul",
        ourTake:
          "The modulating burner, in the weatherproof cabinet. Output varies to match what the house is asking for rather than cycling hard on and off, which is the difference you feel in a home that heats a lot of hours. The most efficient outdoor-cabinet heater Brivis makes.",
        specs: [
          { label: "Star rating", value: "6-star (premium efficiency)" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
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
          "Same cooling as the Contour, in a flatter cabinet. It goes on when the roofline is the thing that matters: a character street, an estate with covenants, or a low-pitch roof where the taller cabinet sits awkwardly. You're buying the silhouette rather than the cooling, and that's a fair reason to buy it.",
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
    // The product, not an install photo. The roof-space photo this used
    // (/ducted-split.webp) is a Kaden ducted unit: its rating plate says so.
    photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
    photoAlt: "Mitsubishi Electric MSZ-AP wall split system",
    heroProducts: [
      { src: "/mitsubishi-msz-ap-wall-split-v2-v3.webp", alt: "Mitsubishi Electric MSZ-AP wall split indoor unit", label: "MSZ-AP wall split" },
      { src: "/mitsubishi-puz-outdoor-white.webp", alt: "Mitsubishi Electric outdoor unit", label: "Outdoor unit" },
      { src: "/mitsubishi-zone-controller-v2.webp", alt: "Mitsubishi Electric touch zone controller", label: "Zone controller" },
    ],
    layout: "blocks",
    accentLight: "#FF5A6B",
    // Mitsubishi Electric's own failure rate across its whole range, not
    // our call-back count: an earlier draft said "come back to us", which
    // was the wrong claim.
    reasons: [
      { v: "Under 1%", k: "failure rate", d: "Across Mitsubishi Electric's whole range. The lowest of anything we install.", img: "/mitsubishi-pea-m-ducted-v2-v3.webp", alt: "Mitsubishi Electric PEA-M ducted indoor unit" },
      { v: "19 dBA", k: "on low", d: "The smallest wall split is quieter than a library. Quiet enough to sleep next to.", img: "/mitsubishi-msz-ap-wall-split-v2-v3.webp", alt: "Mitsubishi Electric MSZ-AP wall split indoor unit" },
      { v: "1 brand", k: "unit, controls and zoning", d: "Mitsubishi Electric's own zone controller on its own ducted system, so one warranty covers the lot.", img: "/mitsubishi-zone-controller-v2.webp", alt: "Mitsubishi Electric touch zone controller" },
      { v: "Year 12", k: "and the parts are still there", d: "Common parts come out of the Melbourne warehouse the same day, however old the unit.", img: "/mitsubishi-mxz-multi-split-condenser-v2.webp", alt: "Mitsubishi Electric MXZ outdoor unit" },
    ],
    quality: {
      heading: "Made better, {from the inside}.",
      intro: "The difference is in the parts you never see. Mitsubishi Electric makes the important ones itself.",
      image: { src: "/mitsubishi-puz-outdoor-white.webp", alt: "Mitsubishi Electric outdoor unit" },
      inset: { src: "/mitsubishi-msz-ap-wall-split-v2-v3.webp", alt: "Mitsubishi Electric MSZ-AP wall unit" },
      points: [
        { t: "Its own compressor", d: "The compressor does the work and takes the wear. Mitsubishi Electric designs and builds its own, in its own factory, rather than buying one in.", pin: [63, 79] },
        { t: "Its own inverter electronics", d: "The inverter that speeds the compressor up and down is Mitsubishi Electric's own power electronics, the same field it supplies to trains. Smooth, efficient and long-lived.", pin: [62, 52] },
        { t: "A coil that stays clean", d: "Inside the wall unit, the fan and coil are coated so dust and grease don't stick. It keeps its airflow, and its output, between services.", pin: [57, 19] },
        { t: "Built to be fixed", d: "Parts are on a Melbourne shelf for units well past ten years old, so a repair stays a repair." },
      ],
    },
    versusHeading: "Mitsubishi or Kaden?",
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
      "In every suburb we work in, and specified for different reasons in each. Berwick, Officer, Clyde North and Cranbourne new-builds go PEAD-M ducted almost by default. Berwick and Pakenham weatherboards, where there is no roof space to run ducts through, get MSZ-AP wall splits.",
    support:
      "Mitsubishi's Melbourne parts warehouse is same-day for common indoor/outdoor parts. Manufacturer tech support is genuinely responsive. We rarely wait on a part.",
    resources: [
      { label: "Mitsubishi Electric · manufacturer website", href: "https://www.mitsubishielectric.com.au/" },
    ],

    /* --- The brand-first layout: identity and our verdict lead, our
       install process is a strip near the bottom. --- */
    whyLead: {
      claim: "Why we choose {Mitsubishi Electric}.",
      sub: "It costs a little more than a budget brand. This is what the difference buys you.",
    },
    mark: "three-diamonds",
    story: {
      heading: "A Japanese engineering company, {since 1921}.",
      body: "Mitsubishi Electric builds lifts, trains and satellites, and it brings the same engineering to the air conditioner on your wall.",
      marks: [
        { v: "1921", k: "Founded in Tokyo" },
        { v: "1978", k: "Selling in Australia" },
        { v: "Same day", k: "Parts from the Melbourne warehouse" },
      ],
      stops: [
        { place: "Tokyo, Japan", role: "Designed", d: "Engineered by a company that has been building machines since 1921." },
        { place: "Thailand", role: "Built", d: "Wall splits and outdoor units come off Mitsubishi Electric's own production lines." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed by our own crew, with the parts warehouse a drive away in Melbourne." },
      ],
    },
    timeline: [
      { y: 0, t: "Install day", d: "Both warranties start." },
      { y: 5, t: "Year 5", d: "Mitsubishi's parts and labour warranty ends." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
      { y: 10, t: "Year 10", d: "Still making its rated output. We measure them." },
      { y: 12, t: "Year 12", d: "Parts still on the Melbourne shelf." },
    ],
    picker: {
      steps: [
        { id: "rooms", q: "How much of the house do you want to heat and cool?", opts: [{ v: "one", l: "One room" }, { v: "few", l: "Two to four rooms" }, { v: "all", l: "The whole house" }] },
        { id: "roof", q: "Is there roof space above the rooms?", opts: [{ v: "yes", l: "Yes, room to work up there" }, { v: "no", l: "No, or not much" }], if: { rooms: "all" } },
      ],
      results: [
        { when: { rooms: "one" }, model: "MSZ-AP wall split", why: "One unit on the wall and one outside. Our default for a bedroom or living room, and usually in within half a day." },
        { when: { rooms: "few" }, model: "MXZ multi-head", why: "One outdoor unit runs two to six indoor units, each room on its own remote. One set of holes in the wall, not four." },
        { when: { rooms: "all", roof: "yes" }, model: "PEAD-M + zone controller", why: "The unit lives in the roof and vents into every room, and Mitsubishi Electric's own zone controller means you only run the rooms you're using." },
        { when: { rooms: "all" }, model: "MXZ multi-head", why: "With no roof space for ducts, one outdoor unit runs up to six indoor units instead." },
      ],
    },
    verdict:
      "Mitsubishi is what we quote first and fit most, and we'd rather be straight about why: it costs a few hundred more than a budget brand on a bedroom split, and that gap buys you a decade where we don't come back. The reliability is real, the parts are on a Melbourne shelf in year twelve, and a decade-old MSZ-AP still makes its rated output, we measure them. If a system you'll own for fifteen years is worth paying for once, this is the one.",
    notRightWhen:
      "Renovating to sell inside two years? The reliability premium is money you won't see again at the open house, a Kaden cools the room just as well for the photos. Mitsubishi earns its price over a decade of ownership, not a quick flip, and we'll say so rather than sell you up.",
    versus:
      "We fit Kaden too, and for a bedroom you're keeping five years it's the sensible spend: a real warranty, a genuine app, hundreds less. Mitsubishi is what goes in when the house is the one you're staying in.",
    advisorService: "air-conditioning-installation",

    /* --- The filtration treatment. Mitsubishi first, because it's the
       brand with sixteen models and therefore the one the old grid
       served worst. --- */
    heroSub:
      "The brand we quote first on any air conditioning job, and the one we still get parts for in year twelve. Sixteen models across five shapes. Start with the shape.",
    fitsWhere:
      "Wall splits in weatherboards with no roof space, ducted with Mitsubishi's own zone controller in the Clyde North and Officer new-builds.",
    // The failure rate and the dates have their own sections below, so the
    // header carries what's left: range, size of it, parts and warranty.
    heroFacts: [
      { v: "5 shapes", k: "Wall, multi-head, ducted, floor console and controls" },
      { v: "16", k: "Models we install and support" },
      { v: "Same day", k: "Common parts from the Melbourne warehouse" },
      { v: "5 yr & 6 yr", k: "5-yr manufacturer and 6-yr workmanship warranties, both from install day" },
    ],

    systemsHeading: "Five shapes. Start here, not with a model number.",
    systemsLede:
      "Sixteen models is a lot to read through, and nobody chooses between an MSZ-AP50 and an MSZ-AP60 first. You choose a shape, one room or the whole house, on the wall or in the roof, and the model follows from the heat load.",
    systems: [
      {
        id: "wall-split",
        label: "MSZ-AP wall splits",
        blurb:
          "One outdoor unit, one indoor head on the wall. Our default for a bedroom, a living room or a granny flat, and the quickest thing we fit. Most go in back-to-back in a single morning.",
        photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
        photoAlt: "Mitsubishi Electric MSZ-AP wall-mounted split system",
        priceFrom: "from $2,199 installed",
        facts: [
          { lead: "Six sizes", note: "2.5 kW for a bedroom up to 8.0 kW for large open-plan" },
          { lead: "19 dBA on low", note: "On the AP25, quiet enough to sleep next to" },
          { lead: "One morning", note: "Back-to-back install in three to four hours" },
          { lead: "Phone control", note: "Add the MELCloud Wi-Fi module to any indoor unit" },
        ],
        models: ["msz-ap25", "msz-ap35", "msz-ap50", "msz-ap60", "msz-ap71", "msz-ap80"],
      },
      {
        id: "multi-head",
        label: "MXZ multi-head",
        blurb:
          "One outdoor unit running two to six indoor heads. The answer when you want three bedrooms done but there is only room, or only body-corporate permission, for a single condenser outside.",
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
          "A wall split that sits at floor level instead of up near the ceiling. For rooms with nothing to mount high on, such as full-height glass, a heritage cornice or a wall of joinery, and for anyone who wants the heat coming out at ankle height in winter.",
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
          "The wired wall controller and the native ducted zone controller. Not an upsell. On a ducted job the zoning is what decides whether the system costs sense to run, and it goes in as part of the install.",
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
      heading: "What happens in {year ten}.",
      // A real Mitsubishi outdoor unit (the badge is on it). The ductwork
      // photo this replaced could have been any brand's.
      photo: "/reclaim-and-mitsubishi.jpg",
      photoAlt: "A Mitsubishi Electric outdoor unit on a brick wall, beside a Reclaim heat pump",
      photoPos: "88% 64%",
      body:
        "Anyone can sell you a system. The part that decides whether it was a good decision is what the next fifteen years look like: whether it holds its output, whether the parts still exist, and whether somebody can get to it. That last one is a decision made on install day, not on service day.",
      facts: [
        "A decade-old MSZ-AP still makes its rated output: we measure them on annual services and they hold",
        "Common indoor and outdoor parts come out of the Melbourne warehouse same-day",
        "Annual service, priced in writing, and we text you eleven months later so it gets booked",
        "We lodge the service report with Mitsubishi, so the warranty record stays clean for any future claim",
        "Ducted indoors go on a platform with a clear path to them, because a unit walled in behind cabinetry is a quote, not a service",
      ],
    },

    steps: [
      { title: "Room-by-room heat load", detail: "We walk the house, measure ceiling height, window aspect and insulation, then compute the actual kW. A 5 kW room gets a 5 kW unit, not a 7 kW one somebody had on the truck." },
      { title: "Written quote in 12 hours", detail: "Model number, capacity, line-set length, controller spec, warranty position and the total installed price. No \u2018from $X\u2019, and no allowance that turns into a variation later." },
      { title: "Stock ordered, day booked", detail: "Mitsubishi's Melbourne warehouse is same-day on common stock. We confirm your install day the moment the unit lands with us rather than pencilling one in and hoping." },
      { title: "Install day", detail: "Single split back-to-back is three to four hours. Multi-head or ducted is a full day. Drop sheets down, dust extraction on the wall cut, conduit colour-matched outside, fresh copper every time." },
      { title: "Commission and walk through", detail: "We run it up, check refrigerant pressures against spec, and set up the remote and MELCloud with you. You sign the job card when you're happy with it, not before." },
      { title: "Compliance and warranty inside 24 hours", detail: "Electrical and refrigeration compliance certificates emailed by end of business the next day, and the manufacturer warranty registered in your name at the same time." },
    ],

    faqs: [
      {
        q: "Is Mitsubishi Electric actually worth the extra over a budget brand?",
        a: "On a bedroom split the gap is modest, and the honest answer is that it usually pays for itself the first time something goes wrong, or rather, the first time it doesn't. Under 1% of the ones we've installed have come back to us. Where it clearly matters is year eight onwards: a budget unit with no parts left is a whole new system, and that is a five-figure difference on a ducted job.",
      },
      {
        q: "Which Mitsubishi wall split do you install?",
        a: "The MSZ-AP series, in six sizes from 2.5 kW for a bedroom up to 8.0 kW for a large open-plan room. It's the one we know inside out and keep parts for, so it's the only Mitsubishi wall split we fit.",
      },
      {
        q: "Do I need the ducted zoning, or is it an upsell?",
        a: "You need it. An unzoned ducted system conditions the whole house every time it runs, including four bedrooms nobody is in at seven at night. Four to eight zones is what makes the running cost sensible, and we fit it by default rather than quoting it as an extra to make the headline number look better.",
      },
      {
        q: "Can I control it from my phone?",
        a: "Yes. A MELCloud Wi-Fi module clips into any indoor unit in the range, including the cheapest one. You get scheduling, geofencing and a usage history. It's a module rather than a model tier, so you don't have to buy up to get it.",
      },
      {
        q: "How long does a Mitsubishi install take?",
        a: "A single split back-to-back is three to four hours, done in one visit. A multi-head is usually a full day. Ducted is one to two days depending on how many zones and how kind the roof space is. We tell you which of those you're in before you accept the quote.",
      },
      {
        q: "What warranty do I get?",
        a: "Five years manufacturer parts and labour on the unit, registered in your name the day after we install it. On top of that we carry six years on our own workmanship, which covers the install rather than the box: brackets, line-set, drainage, penetrations, the things that are our fault if they go wrong.",
      },
      {
        q: "Can you service a Mitsubishi you didn't install?",
        a: "Yes, and we do a lot of them. Split or ducted, the service is priced before we come, and the service report goes to Mitsubishi so your warranty record stays clean. If we find something we'd have done differently on the install we'll tell you what it is and whether it's worth fixing.",
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
        veuEligible: true,
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
        veuEligible: true,
        bestFor: "Master bedroom or medium living zone up to 35 m²",
        ourTake:
          "The 3.5 kW is the sweet spot for a big master bedroom or a smaller open-plan. Same reliability as the 2.5, same low-noise profile, just enough extra capacity to handle the doors-open scenario without running at 100% all summer.",
        specs: [
          { label: "Cooling capacity", value: "3.5 kW" },
          { label: "Heating capacity", value: "4.0 kW" },
          { label: "Room size", value: "up to 35 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Indoor sound (min)", value: "22 dBA" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
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
        veuEligible: true,
        bestFor: "Open-plan living / dining up to 50 m²",
        ourTake:
          "The 5.0 kW MSZ-AP is our default recommendation for an open-plan living zone in a modern brick-veneer family home. Big enough to handle a Melbourne heatwave with the doors open, small enough that it doesn't cycle constantly on a mild day.",
        specs: [
          { label: "Cooling capacity", value: "5.0 kW" },
          { label: "Heating capacity", value: "6.0 kW" },
          { label: "Room size", value: "up to 50 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
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
        veuEligible: true,
        bestFor: "Large open-plan or living zone with cathedral ceilings",
        ourTake:
          "The 6.0 is for the room that falls between the two obvious sizes. Cathedral ceilings, or a big north-facing glass wall, add load that a floor-area calculation misses, and that's usually what pushes a room off the 5.0 and onto this one.",
        specs: [
          { label: "Cooling capacity", value: "6.0 kW" },
          { label: "Heating capacity", value: "6.8 kW" },
          { label: "Room size", value: "up to 60 m²" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
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
        veuEligible: true,
        bestFor: "Large great-room, warehouse-style living, or open double-height space",
        ourTake:
          "The 7.1 is for a big open-plan living area, the kind with a wall of glass facing the afternoon sun. Only the 8.0 kW goes bigger in this range, and once a space needs more than that, ducted or multi-head moves the air around better than one head can.",
        specs: [
          { label: "Cooling capacity", value: "7.1 kW" },
          { label: "Heating capacity", value: "8.0 kW" },
          { label: "Room size", value: "up to 75 m²" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
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
        veuEligible: true,
        bestFor: "Warehouse conversions, large open-plan double-height spaces",
        ourTake:
          "The biggest wall split Mitsubishi makes. In most rooms this size, ducting moves the air better. Where this one wins is the single large space you don't want to duct: a warehouse conversion, a double-height room, anywhere the ceiling turns ductwork into a project of its own.",
        specs: [
          { label: "Cooling capacity", value: "8.0 kW" },
          { label: "Heating capacity", value: "9.0 kW" },
          { label: "Room size", value: "up to 85 m²" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
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
        veuEligible: true,
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
        veuEligible: true,
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
        veuEligible: true,
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
        veuEligible: true,
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
        veuEligible: true,
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
        model: "PEA-M100/125/140HAA",
        category: "ducted",
        categoryLabel: "Ducted",
        capacity: "10 kW / 12.5 kW / 14 kW cooling · heating parity",
        refrigerant: "R32",
        veuEligible: true,
        photo: "/mitsubishi-pea-m-ducted-v2-v3.webp",
        photoAlt: "Mitsubishi Electric PEA-M ducted indoor unit",
        bestFor: "3-4 bed single-storey ducted retrofit or new-build, 4-6 zones",
        ourTake:
          "Our default ducted system for a three or four-bedroom home. Zoned with Mitsubishi Electric's own controller.",
        specs: [
          { label: "Cool / heat capacity", value: "10 kW · 12.5 kW · 14 kW (three model steps)" },
          { label: "Model codes", value: "PEA-M100HAA · PEA-M125HAA · PEA-M140HAA" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "External static pressure", value: "Adjustable 50–150 Pa" },
          { label: "Air flow", value: "1,320–2,340 L/s across the three sizes" },
          { label: "Indoor sound", value: "34–41 dBA" },
          { label: "Power supply", value: "Single-phase" },
          { label: "Zoning", value: "Mitsubishi Electric zone controller (PAR-ZC01M-E + PAC-ZC40/ZC80), 4 or 8 zones" },
          { label: "Controller", value: "PAR-40 wired / MA-remote / MELCloud Wi-Fi module" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Three capacity steps (10 / 12.5 / 14 kW), right-size to the actual heat load, not oversized as a habit",
          "Adjustable external static pressure 50–150 Pa suits typical 3-4 zone Melbourne retrofits",
          "R32 refrigerant across all three sizes, low-GWP, no HFC phase-down risk",
          "MELCloud Wi-Fi module adds phone control to the wired PAR-40 controller",
          "Zoned with Mitsubishi Electric's own zone controller: one brand from the outdoor unit to the wall",
          "Inverter compressor + DC fan motor for quiet, efficient part-load running",
          "Made in Thailand at Mitsubishi's dedicated air-conditioning plant",
        ],
        whyWeInstall: [
          "The most reliable ducted platform in our install base, decade-old PEA-M / PEAD-M units still run to spec",
          "Mitsubishi's Melbourne parts warehouse is same-day on virtually every PEA-M part we've ever needed",
          "Under 1% failure rate across the range. It is the unit we are least likely to have to come back to",
          "Right-sizing across three capacity steps means we don't oversize you into a bigger unit that short-cycles and wastes power",
          "Mitsubishi's own zone controller means one brand end to end, so one warranty covers the lot and there's no argument over whose part failed",
        ],
        related: ["pead-large", "me-zone-controller", "par-41maa", "mfz-kw"],
      },
      {
        slug: "pead-large",
        name: "PEA-M160 / M180 / M200 Ducted (Large Homes)",
        model: "PEA-M160HAA · PEA-M180HAA · PEA-M200HAA",
        category: "ducted",
        categoryLabel: "Ducted",
        capacity: "16 kW / 18 kW / 20 kW cooling · heating parity",
        refrigerant: "R32",
        veuEligible: true,
        photo: "/mitsubishi-pea-m-ducted-v2-v3.webp",
        photoAlt: "Mitsubishi Electric PEA-M large-capacity ducted indoor unit",
        bestFor: "Larger single-storey, double-storey or long duct-run family homes needing 16-20 kW output",
        ourTake:
          "The same system, sized up for bigger and double-storey homes. 16 or 18 kW, or 20 kW on three-phase power.",
        specs: [
          { label: "Cool / heat capacity", value: "16 kW · 18 kW · 20 kW (three larger model steps)" },
          { label: "Model codes", value: "PEA-M160HAA · PEA-M180HAA · PEA-M200HAA" },
          { label: "Power supply", value: "16 & 18 kW single-phase · 20 kW three-phase" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "External static pressure", value: "Adjustable 100–200 Pa (higher-static than M100-M140)" },
          { label: "Zoning", value: "Mitsubishi Electric zone controller (PAR-ZC01M-E + PAC-ZC40/ZC80), up to 8 zones" },
          { label: "Controller", value: "PAR-42MAA wired / MA-remote" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Three larger capacity steps (16 / 18 / 20 kW) extend the PEA-M range for double-storey + long-run installs",
          "The 20 kW runs on three-phase power",
          "Higher external static pressure (100–200 Pa) delivers rated flow through longer flex-duct runs",
          "Same R32 refrigerant + inverter platform as the M100-M140, so parts + service story is unchanged",
          "Mitsubishi Electric's eight-zone controller gives a bigger home proper per-room control",
        ],
        whyWeInstall: [
          "The pick for a two-storey Berwick / Officer / Clyde home where a single M140 would short-cycle in shoulder seasons",
          "Same Mitsubishi parts + support platform as the smaller M-series, no separate stocking to worry about",
          "Mitsubishi's own eight-zone controller gives full per-room control on a home big enough to need it",
        ],
        related: ["pead-m", "me-zone-controller", "par-41maa"],
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
          "The PAR-41MAA is Mitsubishi's current-generation standard wired wall controller, the model we fit as standard on every PEA-M and MFZ-KW install. Physical wall control for anyone who'd rather not reach for a phone or handheld remote. On a zoned job it sits alongside Mitsubishi Electric's own zone controller.",
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
          "Sits alongside Mitsubishi Electric's own zone controller on a zoned ducted system",
        ],
        whyWeInstall: [
          "The controller we fit as standard on every ducted install",
          "Physical wall control ages better than app-based control, no login drift, no OS upgrades to chase",
        ],
        related: ["me-zone-controller", "pead-m", "pead-large"],
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
    layout: "blocks",
    heroProducts: [
      { src: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png", alt: "Reclaim CO₂ split: outdoor heat pump, tank and controller", label: "CO₂ split" },
      { src: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", alt: "Reclaim ECO R290 all-in-one heat pump", label: "ECO R290 all-in-one" },
      { src: "/Reclaim Earthworker.webp", alt: "Reclaim Earthworker stainless tank", label: "Stainless tank" },
    ],
    story: {
      heading: "Designed in Sydney, {since 2007}.",
      body: "Reclaim designs and assembles its heat pumps in Sydney, for Australian conditions. Two kinds: the CO₂ split and the ECO R290 all-in-one.",
      marks: [
        { v: "2007", k: "Trading since" },
        { v: "-10°", k: "The CO₂ split still heats" },
        { v: "15 years", k: "Parts warranty on a stainless tank" },
      ],
      stops: [
        { place: "Sydney, NSW", role: "Designed and assembled", d: "Australian-designed for Australian conditions." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed by our own crew, with the VEU rebate off at the quote." },
      ],
    },
    quality: {
      heading: "Hot water {from cold air}.",
      intro: "CO₂ keeps pulling heat out of the air on mornings other heat pumps struggle, and the tank is built to outlast the pump.",
      image: { src: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png", alt: "Reclaim CO₂ split: outdoor heat pump, tank and controller" },
      points: [
        { t: "CO₂ refrigerant", d: "Holds its heating capacity down to -10°, with zero global-warming potential.", pin: [51, 67] },
        { t: "Quiet outside", d: "37 dBA at a metre, so the heat pump can sit by a bedroom wall.", pin: [36, 55] },
        { t: "A tank that outlasts it", d: "Stainless has no anode to swap and nothing to rust. 15 years' parts warranty.", pin: [62, 32] },
        { t: "Runs on your solar", d: "The PV-diverter kit runs the compressor on power you'd otherwise export." },
      ],
    },
    reasons: [
      { v: "-10°", k: "and still heating", d: "The CO₂ split keeps making hot water on an Emerald or Gembrook morning.", img: "/reclaim-split-stand-back-shot.webp", alt: "A Reclaim CO₂ split we installed against a brick wall", cover: true, pos: "50% 60%" },
      { v: "15 years", k: "on a stainless tank", d: "Parts warranty on the tank, with no anode to replace along the way.", img: "/Reclaim Glass lined and stainless v2.webp", alt: "Reclaim tank and heat pump" },
      { v: "37 dBA", k: "outside", d: "Quiet enough to sit next to a bedroom wall.", img: "/reclaim-split-back-2.jpg", alt: "A Reclaim tank and heat pump we installed against a brick wall", cover: true },
      { v: "8 years", k: "on the all-in-one", d: "The ECO R290's warranty covers the whole unit, parts and labour.", img: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", alt: "Reclaim ECO R290 all-in-one" },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "Warranties registered in your name." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
      { y: 8, t: "Year 8", d: "The ECO all-in-one's warranty ends." },
      { y: 10, t: "Year 10", d: "Reclaim's CO₂ heat pump warranty ends." },
      { y: 15, t: "Year 15", d: "A stainless tank's parts warranty ends." },
    ],
    picker: {
      steps: [
        { id: "space", q: "Where will it go?", opts: [{ v: "room", l: "There's room for a tank and a small unit beside it" }, { v: "tight", l: "Only where the old tank stands" }] },
        { id: "stay", q: "How long are you staying in the house?", opts: [{ v: "long", l: "Ten years or more" }, { v: "short", l: "A few years" }], if: { space: "room" } },
      ],
      results: [
        { when: { space: "tight" }, model: "ECO R290 all-in-one", why: "Heat pump and tank in one unit, in the old tank's spot, with nothing else to mount outside." },
        { when: { space: "room", stay: "long" }, model: "CO₂ split heat pump", why: "The one for the long stay: it heats down to -10° and the tank is built to outlast the pump." },
        { when: { space: "room" }, model: "ECO R290 all-in-one", why: "The simple swap, with eight years on the whole unit. The split's premium pays back over a longer stay." },
      ],
    },
    name: "Reclaim Energy",
    tagline: "Two kinds of heat pump: the CO₂ split and the ECO R290 all-in-one.",
    origin: "Sydney, Australia",
    intro:
      "Reclaim makes two kinds of heat pump hot water, and we fit both. The CO₂ split puts a quiet heat pump outside and a separate long-life tank where it suits, and keeps working on the coldest mornings. The ECO R290 all-in-one is a single unit, heat pump and tank together, that goes where the old system stood.",
    ourTake:
      "Reclaim gives you two good ways to do it. The CO₂ split is the one for the long stay and the cold hills suburbs: CO₂ pulls heat out of cold air in a way most refrigerants can't, and the tank is built to outlast the pump in front of it. The ECO R290 all-in-one is the simple swap: one unit in the old tank's spot, nothing else to mount outside, and eight years on the whole thing. We'll tell you which suits your house at the site check.",
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
      "Two kinds to choose from: the CO₂ split (outdoor heat pump + separate tank) and the ECO R290 all-in-one (one unit)",
      "ECO R290 all-in-one: 200 or 285 L, nothing else to mount outside, 8-year warranty on the whole unit",
      "CO₂ (R744) natural refrigerant on the split, zero global-warming potential",
      "The split holds heating capacity down to -10°C ambient, which is what Emerald and Gembrook mornings ask for",
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

    // --- brand-first fields (Reclaim) ---
    advisorService: "heat-pump-installation",
    whyLead: {
      claim: "Why we choose {Reclaim}.",
      sub: "The CO₂ split keeps making hot water at -10° with a tank built to outlast the pump. The ECO R290 all-in-one is one unit in the old tank's spot.",
    },
    verdict:
      "Reclaim is what we put in for someone staying in the house, the ten-to-fifteen-year plan, not the flip. CO₂ (R744) pulls heat out of cold air in a way R290 and R134a can't, which is what earns it on an Emerald or Gembrook morning rather than on a spec sheet, and a stainless tank has no anode to swap and nothing in it to rust, so it outlasts the compressor sitting in front of it. Two shapes: the CO₂ SPLIT: an outdoor heat pump plumbed to a separate tank, in glass-lined, stainless, 316 stainless and Earthworker finishes from 160 to 400 L, and the ECO R290 ALL-IN-ONE, the lot in one shell at 200 or 285 L. It costs more on day one, and it's built to still be there in fifteen years. If hot water you never think about is worth paying for once, this is the one.",
    notRightWhen:
      "Selling inside a couple of years, or the up-front number is the whole decision? The premium Reclaim charges is money you earn back over a decade of ownership, not at the next open house, and if the VEU rebate is what makes the job add up, an iStore does the same job for less today. Reclaim earns its price on the long hold, and we'll say so rather than sell you up.",
    versus:
      "We fit iStore and Thermann too, and they win different jobs. When the VEU rebate is what makes the numbers work, best rebate, cheaper up front, an iStore is the sensible call. When same-day parts on the shelf matter more than anything else, a Thermann's pipeline is hard to beat. Reclaim is what goes in when you're staying in the house and want the tank to outlast the compressor, not the rebate to close the gap.",
    heroSub:
      "Two ways to heat your water with the air. The CO₂ split: a quiet outdoor heat pump and a separate tank, for the coldest mornings and the longest stay. The ECO R290 all-in-one: one unit, nothing extra outside, for a simple swap.",
    fitsWhere:
      "Pakenham Cameron Park estates on the ten-year plan, Berwick weatherboards coming off gas storage, and Cranbourne and Officer jobs where the stainless tank sits somewhere you walk past every day.",
    heroFacts: [
      { v: "2 types", k: "CO₂ split and ECO R290 all-in-one" },
      { v: "-10°", k: "The CO₂ split still heats that cold" },
      { v: "8-year", k: "Whole-unit warranty on the all-in-one" },
      { v: "15-year", k: "Parts warranty on a stainless split tank" },
    ],
    heroScene: { src: "/reclaim-split-stand-back-shot.webp", alt: "A Reclaim CO₂ split heat pump and tank on a brick wall", caption: "Reclaim CO₂ split, installed" },
    photos: [
      { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ split: tank and outdoor heat pump against a brick wall", caption: "CO₂ split: tank and heat pump side by side" },
      { src: "/reclaim-and-mitsubishi.jpg", alt: "A Reclaim tank and heat pump beside a Mitsubishi Electric outdoor unit", caption: "Sharing a wall with the aircon" },
      { src: "/reclaim-split-close-1.jpg", alt: "The base of a Reclaim tank on its slab, with insulated pipework", caption: "Insulated pipework, set on a slab" },
      { src: "/reclaim-spit-close-up.webp", alt: "Close-up of a Reclaim CO₂ heat pump outdoor unit", caption: "The CO₂ heat pump up close" },
    ],
    formats: {
      heading: "Two ways to do it: split or all-in-one.",
      items: [
        {
          name: "CO₂ split",
          img: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png",
          line: "A quiet heat pump outside, the tank where it suits",
          points: ["Keeps heating down to -10°: the best on cold mornings", "Tank 160, 250, 315 or 400 L, glass-lined or stainless", "37 dBA outdoor unit, fine by a bedroom wall", "PV-diverter kit runs it on your solar"],
          best: "Staying 10+ years, the colder hills suburbs, bigger households",
          href: "/find/heat-pump/signature",
        },
        {
          name: "ECO R290 all-in-one",
          img: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp",
          line: "Heat pump and tank in one unit",
          points: ["One unit in the old tank's spot, nothing else outside", "200 L or 285 L", "8-year warranty on the whole unit, parts and labour", "R290 natural refrigerant, VEU rebate at the quote"],
          best: "A straight swap, townhouses and tight side paths",
          href: "/find/heat-pump/premium",
        },
      ],
    },
    benefitsHeading: "What each one does best.",
    benefitTiles: [
      {
        t: "Split: heat out of cold air",
        line: "Holds its heating capacity down to -10° ambient",
        detail:
          "CO₂ (R744) keeps pulling heat out of the air when an R290 or R134a heat pump is working hardest for the least. On an Emerald or Gembrook morning in July that's the difference between a full tank and a lukewarm one, and it's the whole reason we run the refrigerant most of the market doesn't.",
        icon: "snowflake",
      },
      {
        t: "Split: the tank outlasts the pump",
        line: "Stainless: no anode to swap, nothing to rust",
        detail:
          "A stainless Reclaim tank carries 15-year parts + 5-year labour, and there's no sacrificial anode to replace along the way because there's nothing in there to corrode. On the hardest water the duplex tank steps up to 2205 duplex / 316-grade. It's built to still be holding water after the compressor in front of it has been swapped.",
        icon: "shield",
      },
      {
        t: "Split: heats on your own solar",
        line: "PV-diverter kit fires the compressor on surplus",
        detail:
          "If you've got panels on the roof, the PV-diverter kit runs the compressor on the power you'd otherwise be exporting for a few cents. The water gets hot on daytime sun instead of grid power, which is the honest way to get the running cost down rather than a claim on a sticker.",
        icon: "flame",
      },
      {
        t: "All-in-one: one unit, one spot",
        line: "Heat pump and tank together, nothing else outside",
        detail:
          "The ECO R290 all-in-one goes where the old tank stood, with no separate outdoor unit to find a place for. That suits townhouses, narrow side paths and anyone who wants a straight swap. 200 L for a smaller household, 285 L for a family of four or five.",
        icon: "people",
      },
      {
        t: "All-in-one: eight years on everything",
        line: "8-year whole-unit warranty, parts and labour",
        detail:
          "One warranty covers the lot: tank, heat pump and controls, parts and labour, for eight years. It runs R290, a natural refrigerant, and like the split it's VEU-eligible, with the rebate taken off at the quote.",
        icon: "shield",
      },
      {
        t: "Built for the long stay",
        line: "The pick when you're here in ten to fifteen years",
        detail:
          "This is the one we recommend first to anyone planning to still be in the house in a decade. It costs more on day one than a budget heat pump, and that gap buys a system built to still be there in fifteen years: the ten-year plan, not the two-year flip.",
        icon: "clock",
      },
    ],
    servicing: {
      tab: "Year fifteen",
      heading: "What year {fifteen} looks like.",
      photo: "/reclaim-split-close-2.jpg",
      photoAlt: "A Reclaim CO₂ heat pump on its wall bracket, with the insulated pipework running to it",
      body:
        "Anyone can sell you a heat pump. What decides whether it was the right call is the next fifteen years: whether the tank's still sound, whether the parts still exist, and whether somebody can actually get to the compressor. That last one is settled on install day, not on service day.",
      facts: [
        "Reclaim's Sydney factory holds parts for every unit currently in the field, so a compressor swap-out inside warranty is a booked job, not a wait for stock",
        "We carry the common seals, O-rings and PV-diverter controllers on the truck, so the small faults get sorted the first visit",
        "A stainless tank has no anode to replace, so there's none of the five-yearly rod change a glass-lined tank asks for",
        "The split heat pump sits out in the open with clear access, because a unit boxed in against a fence is a quote, not a service",
        "Warranty runs 10-year parts + labour on the Reclaim EHPE-4550P-A heat pump and 15-year parts on a stainless tank, and we register it in your name the day we commission it",
      ],
    },
    steps: [
      { title: "Site visit and tank choice", detail: "We look at where the tank and the outdoor heat pump can go, check your hot-water demand and how hard the water is, and settle the tank: glass-lined or stainless, 160 through 400 L, or an ECO R290 all-in-one where the split won't fit." },
      { title: "Written quote after the VEU rebate", detail: "A written quote: model, tank finish, capacity, warranty position and the total after the VEU rebate is taken off, not a 'from $X'. The rebate is assigned to us and already in the number you see." },
      { title: "Old unit removed", detail: "On the day we drain, disconnect and take away the old gas or electric storage unit, and cap or make good the gas point if you're coming off gas." },
      { title: "Set the new system", detail: "For a split, we stand the tank, mount the outdoor CO₂ heat pump on a level pad or bracket and run the insulated pipework between them. For an all-in-one, it stands on the pad where the old tank was. Either way it's plumbed in with fresh fittings, not whatever was there." },
      { title: "Tempering valve and PV diverter", detail: "A tempering valve goes on so the water leaves the tap at a safe temperature, and where you've got solar we fit the PV-diverter kit so the compressor fires on your surplus rather than the grid." },
      { title: "Commission and rebate paperwork", detail: "We fill and run it up, check it's making temperature, register the warranty in your name and lodge the VEU paperwork and compliance certificates so the rebate lands and the record stays clean." },
    ],
    faqs: [
      {
        q: "Do I want the split or the ECO R290 all-in-one?",
        a: "The CO₂ split: outdoor heat pump plumbed to a separate tank: is the one we fit most, in 160 through 400 L, because it's the best cold-weather performer and the tank choice is widest. The ECO R290 all-in-one puts everything in one shell at 200 or 285 L and goes in where there's no room to separate the pump and tank, or where the run between them would be awkward. We'll tell you which your house is at the quote.",
      },
      {
        q: "Why CO₂ when everyone else runs R290 or R134a?",
        a: "Because CO₂ (R744) keeps pulling heat out of cold air when the other refrigerants are working hardest for the least. Reclaim holds its heating capacity down to -10° ambient, which is exactly the Emerald and Gembrook mornings in July when you want a full tank. It's also a natural refrigerant with zero global-warming potential, but the reason we fit it is the cold-morning performance, not the badge.",
      },
      {
        q: "Glass-lined or stainless, is the stainless worth the extra?",
        a: "If you're staying in the house, usually yes. A glass-lined tank carries 10-year parts + 5-year labour and has a sacrificial anode that needs checking over its life; a stainless tank carries 15-year parts + 5-year labour, has no anode to swap and nothing in it to rust. On hard water the duplex tank steps up to 2205 duplex / 316-grade. The stainless tank is built to outlast the compressor in front of it, which is the whole idea.",
      },
      {
        q: "It costs more than the other heat pumps, is it worth it?",
        a: "On the long hold, yes; on a quick sale, probably not. Reclaim costs more on day one and it's built to still be there in fifteen years, so it earns its price over a decade of ownership rather than at the next open house. If the VEU rebate and the up-front number are what the decision comes down to, an iStore gets you the best rebate for less today, and we'll say so rather than sell you up.",
      },
      {
        q: "Is there a rebate, and do you handle the paperwork?",
        a: "Yes: the Reclaim systems are VEU-eligible, and the rebate is assigned to us and already taken off the price on your quote, so there are no forms to chase or money to claim back later. We lodge it after commissioning along with the compliance certificates. If the rebate is the thing that makes the job add up, that's worth talking through, because a couple of the brands we fit rebate differently.",
      },
      {
        q: "What warranty do I actually get?",
        a: "On the tank, 10-year parts + 5-year labour glass-lined, or 15-year parts + 5-year labour stainless. On the heat pump, 10-year parts + labour on the Reclaim EHPE-4550P-A, 7-year parts + labour on the Reclaim/Panasonic HE-UM60AR. The controller is 10-year on the Reclaim one and 7-year on the Reclaim/Panasonic non-Wi-Fi controller, and the ECO R290 all-in-one is 8-year tank, parts and labour. On top of all of that we carry 6 years on our own workmanship, which covers the install: the pipework, the mounts, the plumbing, rather than the box.",
      },
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
        // Retired: the 215 L sat between the 160 and the 250 on the same
        // pump and only muddied the range. Kept in the data so its old URL
        // 301s to the brand hub rather than 404ing.
        retired: true,
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
        ourTake: "315 L is the size most families land on, on the same CO₂ split platform as everything else in the range. Glass-lined tank with a sacrificial anode, which we swap every five to seven years, and which is perfectly at home on town water.",
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
        name: "Reclaim CO₂ Split · 315L Duplex Stainless",
        compressorKw: 5.0,
        tankLitres: 315,
        model: "REHP-CO2-315SSQ-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · duplex stainless tank",
        capacity: "315 L duplex stainless tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/reclaim-duplex-316ss-.png",
        photoAlt: "Reclaim 315L duplex stainless steel heat pump tank",
        bestFor: "Hard water: bore, tank or a hard-water suburb, where a standard tank works harder for less life",
        ourTake: "The duplex is the tank for hard water. It steps the steel up to 2205 duplex / 316-grade, which shrugs off the chloride and mineral load that eats a glass-lined anode and pits ordinary stainless: bore water, tank water, and the harder-water pockets around the south-east. Same 315 litres and the same 5 kW CO₂ heat pump as the rest of the range, in a shorter, wider body that also gets under a low eave. We test your water on the site visit and tell you whether you actually need it.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Duplex 2205 / 316-grade stainless steel" },
          { label: "Best for", value: "Hard, bore or tank water" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-400-duplex", "co2-split-315-stainless", "co2-split-315-earthworker"],
      },
      {
        slug: "co2-split-400-duplex",
        name: "Reclaim CO₂ Split · 400L Duplex Stainless",
        compressorKw: 5.0,
        tankLitres: 400,
        model: "REHP-CO2-400SSQ-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · duplex stainless tank",
        capacity: "400 L duplex stainless tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/reclaim-duplex-316ss-.png",
        photoAlt: "Reclaim 400L duplex stainless steel heat pump tank",
        bestFor: "A big household on hard water: the duplex tank, in the largest size Reclaim now build it",
        ourTake: "The duplex tank, now in 400 litres, the size Reclaim added for the bigger household that also happens to be on hard water. Same 2205 duplex / 316-grade steel that resists the chloride and mineral load bore and tank water carry, on the same 5 kW CO₂ heat pump, with enough stored volume for six-plus people and the recovery to have it back before the evening run. It's the tank we reach for on acreage where the draw is high and the water is anything but soft.",
        specs: [
          { label: "Tank capacity", value: "400 L" },
          { label: "Tank material", value: "Duplex 2205 / 316-grade stainless steel" },
          { label: "Best for", value: "High draw on hard, bore or tank water" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-315-stainless-squat", "co2-split-400-stainless"],
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
        ourTake: "The most volume Reclaim make, in stainless, on the 5 kW compressor. For acreage properties and big households, where the draw is high enough that stored litres and recovery speed both have to be there.",
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
          { label: "Warranty", value: "8-year whole unit, parts and labour" },
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
          { label: "Warranty", value: "8-year whole unit, parts and labour" },
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
    layout: "blocks",
    heroProducts: [
      { src: "/thermann_integrated_heat_pump_02.jpg", alt: "Thermann all-in-one heat pump", label: "Heat pump" },
      { src: "/G-Series_Front_On_View_1200x900.jpg", alt: "Thermann G-series continuous flow gas unit", label: "G-series continuous flow" },
      { src: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg", alt: "Thermann 4-star gas storage unit", label: "Gas storage" },
    ],
    story: {
      heading: "Built by Dux in NSW, {sold through Reece}.",
      body: "Thermann is Reece's own hot water brand, made by Dux at its Moss Vale factory. Every Reece store in Victoria carries the common spares.",
      marks: [
        { v: "Aus-made", k: "Built by Dux in Moss Vale, NSW" },
        { v: "Same day", k: "Common parts at any Reece store" },
        { v: "3", k: "Ways to heat: heat pump, gas and electric" },
      ],
      stops: [
        { place: "Moss Vale, NSW", role: "Built", d: "Made by Dux at its Moss Vale factory." },
        { place: "Every Reece store in Victoria", role: "Stocked", d: "The common spares on the shelf, over the counter for us." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed by our own crew, and fixed the same day when it faults." },
      ],
    },
    quality: {
      tab: "Built here",
      heading: "Australian-made, {Reece-backed}.",
      intro: "Built in New South Wales, with the parts on a shelf at every Reece store in the state.",
      image: { src: "/thermann_integrated_heat_pump_02.jpg", alt: "Thermann all-in-one heat pump" },
      points: [
        { t: "Built in Moss Vale", d: "Genuinely Australian-made, so it qualifies for the Australian-made VEU bonus on top of the rebate." },
        { t: "R290 refrigerant", d: "A natural refrigerant across the heat pump range, low in global-warming terms and efficient." },
        { t: "Three ways to heat", d: "Heat pumps, G-series continuous flow and storage, from the one brand." },
        { t: "One parts counter", d: "Whichever you have, the parts come from the same Reece counter." },
      ],
    },
    reasons: [
      { v: "Same day", k: "most faults fixed", d: "We pull the common spares over the counter at any Reece store in Victoria.", img: "/thermann-heat-pump.webp", alt: "A Thermann heat pump we installed", cover: true, pos: "50% 45%" },
      { v: "Aus-made", k: "VEU bonus", d: "Built by Dux in NSW, so the Australian-made bonus comes off on top of the rebate.", img: "/thermann_integrated_heat_pump_02.jpg", alt: "Thermann all-in-one heat pump" },
      { v: "R290", k: "natural refrigerant", d: "The same refrigerant across the heat pump range, nothing exotic to track down later.", img: "/Thermann-Split-heat-pump.jpg", alt: "Thermann split heat pump" },
      { v: "5 years", k: "on the cylinder", d: "Plus six years on our workmanship. Dux handles cylinder and compressor claims directly.", img: "/thermann-contineues-flow-standing-back.webp", alt: "A Thermann continuous flow unit we installed on a brick wall", cover: true },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "All warranties start." },
      { y: 3, t: "Year 3", d: "Compressor warranty ends, or year 5 on R290." },
      { y: 5, t: "Year 5", d: "Cylinder warranty ends." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
      { y: 7, t: "Years 5 to 7", d: "Anode swap on a split's glass-lined tank." },
    ],
    picker: {
      steps: [
        { id: "type", q: "What kind of gas hot water do you want?", opts: [{ v: "cf", l: "Instant: hot water that doesn't run out" }, { v: "tank", l: "A tank, like for like" }] },
        { id: "two", q: "Two showers running at once?", opts: [{ v: "yes", l: "Yes, often" }, { v: "no", l: "Not usually" }], if: { type: "cf" } },
      ],
      results: [
        { when: { type: "cf", two: "yes" }, model: "G-series, high-flow", why: "Endless hot water, with the flow for two showers running at once." },
        { when: { type: "cf" }, model: "G-series continuous flow", why: "Endless hot water, and our standard gas swap. Same-day on common models." },
        { when: { type: "tank" }, model: "4-star gas storage", why: "A like-for-like swap for the tank you have, same-day on common sizes, and the old one taken away." },
      ],
    },
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

    // --- brand-first fields (Thermann) ---
    advisorService: "heat-pump-installation",
    whyLead: {
      claim: "Why we choose {Thermann}.",
      sub: "Every Reece store in Victoria carries the common Thermann spares, so a fault on one of these rarely costs you a week.",
    },
    verdict:
      "Thermann is the one we reach for when the parts pipeline is what matters most: on a rental, an investment property, or anywhere a fault has to be fixed today. It's Reece's own brand, built by Dux in NSW, and as a Reece trade partner we pull parts and warranty over the counter at any store in Victoria, so most faults get sorted the same day rather than next week. It's genuinely Australian-made too, which means the VEU rebate with the Australian-made bonus on top: and across heat pumps, continuous flow and storage it's the range we can support fastest.",
    notRightWhen:
      "Staying in the house fifteen years and want the tank to outlast the compressor in front of it? Thermann's split runs a glass-lined tank with a sacrificial anode that wants swapping every five to seven years, and if that's a job you'd rather never think about, a stainless Reclaim is the honest answer. Thermann earns its keep on the parts pipeline, not on outliving everything.",
    versus:
      "We fit Reclaim and iStore alongside it, and the honest split is this: if you're staying long-term and want CO₂ and a stainless tank that shrugs off a cold Pakenham morning, Reclaim is the one; if the VEU rebate is the whole decision, iStore takes it furthest. Thermann is what goes in when getting a part today matters more than either.",
    heroSub:
      "Reece's own hot-water brand, built by Dux in NSW, and the one we can get parts for over the counter at any Reece store in Victoria. Heat pump, continuous flow and storage, start with what you're replacing.",
    fitsWhere:
      "All-in-one heat pumps into Hampton Park, Cranbourne and Narre Warren, the G-series continuous flow as our standard gas swap right across the corridor, and the first call on a rental where a fault has to be fixed today.",
    heroFacts: [
      { v: "Same day", k: "Common parts over the counter at any Reece store" },
      { v: "8", k: "Models we install and support" },
      { v: "Aus-made", k: "Built by Dux in Moss Vale NSW · VEU bonus" },
      { v: "5 yr & 6 yr", k: "5-yr cylinder and 6-yr workmanship warranties, both from install day" },
    ],
    benefitsHeading: "Why the parts pipeline is the whole argument.",
    benefitTiles: [
      {
        t: "Parts on a Victorian shelf",
        line: "Every Reece store carries the common Thermann spares",
        detail:
          "Thermann is Reece's own brand, so the common parts sit on a shelf at every Reece store in the state and we pull them over the counter as a trade partner. That's why a fault on one of these rarely costs you a week, most get fixed the same day rather than next.",
        icon: "truck",
      },
      {
        t: "Fixed today, not next week",
        line: "The Reece network across Melbourne is same-day for us",
        detail:
          "The Reece store network across Melbourne is same-day for us, and every branch stocks the common Thermann parts. On a rental or an investment property, where a cold shower is a phone call you don't want, that turnaround is often the whole decision.",
        icon: "clock",
      },
      {
        t: "The warranty, and where it splits",
        line: "5-year cylinder, 6-year on our workmanship",
        detail:
          "5-year cylinder + 3-year compressor + 6-year on our workmanship. R290 heat pump range extends compressor warranty to 5 years. Dux handles the cylinder and compressor claims directly; the six years on workmanship is ours, and covers the install rather than the box.",
        icon: "shield",
      },
      {
        t: "R290, and nothing exotic",
        line: "Natural refrigerant across the whole heat pump range",
        detail:
          "The heat pump range runs R290, propane, a natural refrigerant with a low global-warming number and good efficiency to go with it. It's the same refrigerant across the all-in-one and the split, so there's nothing unusual to gas up or track down in year eight.",
        icon: "snowflake",
      },
      {
        t: "Australian-made, bonus on top",
        line: "Built by Dux in Moss Vale NSW",
        detail:
          "Thermann is Reece's brand, but the units are built by Dux at their Moss Vale factory in NSW. Because it's genuinely Australian-made it qualifies for the Australian-made VEU bonus, which comes off the price on top of the standard rebate: real money, not a sticker.",
        icon: "people",
      },
      {
        t: "One brand across three fuels",
        line: "Heat pump, continuous flow and storage, supported the same way",
        detail:
          "The all-in-one and split heat pumps, the G-series continuous flow that's our standard gas swap, and electric storage all come from the one brand and the one parts counter. Whichever your house needs, it's the range we can support fastest.",
        icon: "wrench",
      },
    ],
    servicing: {
      tab: "When it faults",
      heading: "What happens the day {one faults}.",
      photo: "/gas-hot-water-changeover.webp",
      photoAlt: "A Thermann hot water unit installed and connected",
      body:
        "Anyone can sell you a hot water unit. What decides whether it was a good buy is the day it faults: whether the part exists, whether it's nearby, and whether someone can get to it this week. With Thermann that's a decision Reece already made for us: the common spares sit on a shelf at every store in the state.",
      facts: [
        "The Reece store network across Melbourne is same-day for us, and every branch stocks the common Thermann parts",
        "Dux handles compressor and cylinder warranty claims directly, and we do the on-site swap-out",
        "The split's glass-lined tank has a sacrificial anode we swap every five to seven years: the tank warranty depends on it, so it goes on the service list rather than getting forgotten",
        "The warranty is 5-year cylinder + 3-year compressor + 6-year on our workmanship. R290 heat pump range extends compressor warranty to 5 years",
        "Heat pump, continuous flow or storage, the parts come from the same counter, which is why it's the range we can support fastest",
      ],
    },
    steps: [
      { title: "We size it to the house, not the truck", detail: "How many of you there are, what's there now and where it lives, a couple on one bathroom is a different unit to five people back-to-back. An all-in-one where there's no outdoor spot, a split where the tank and heat pump want to live apart, or the G-series continuous flow for a straight gas swap." },
      { title: "Written quote", detail: "Model, capacity, install position and the total installed price, with the VEU rebate and the Australian-made bonus already taken off rather than promised later. No 'from $X' that turns into a variation on the day." },
      { title: "Unit and parts over the counter", detail: "Because it's Reece's own brand we pull the unit and the common fittings over the counter at the local store, usually same-day. That's the difference between booking your changeover this week and waiting on a delivery." },
      { title: "Old unit out, new one in", detail: "We drain and pull the old tank or heater, cart it away, and set the Thermann on a proper base or wall pad. Fresh water connections, and a new tempering valve fitted so the hot water leaves the unit at a safe 50° at the tap." },
      { title: "Commission and hand over", detail: "We fill it, fire it up, check it's making hot water to spec and walk you through the controller. On a heat pump we set the run timer for the cheap part of the day, or onto your solar if you've got it." },
      { title: "Rebate and compliance paperwork", detail: "We lodge the VEU rebate and the Australian-made bonus, register the manufacturer warranty in your name, and email the plumbing compliance certificate. The paperwork is our job, not yours." },
    ],
    faqs: [
      {
        q: "Why Thermann over the other heat pumps you fit?",
        a: "One reason above the rest: the parts pipeline. Thermann is Reece's own brand, so the common spares sit on a shelf at every Reece store in Victoria and we pull them over the counter as a trade partner. A fault on one of these rarely costs you a week, most get fixed the same day. If getting a part today matters more than anything else, this is the range we can support fastest.",
      },
      {
        q: "Is it actually made in Australia?",
        a: "Yes. Thermann is Reece's brand, but the units are built by Dux at their Moss Vale factory in NSW. That's not just a sticker: because it's genuinely Australian-made it qualifies for the Australian-made VEU bonus, which comes off the price on top of the standard rebate.",
      },
      {
        q: "What's the warranty?",
        a: "5-year cylinder + 3-year compressor + 6-year on our workmanship. R290 heat pump range extends compressor warranty to 5 years. Dux handles the compressor and cylinder claims directly; the six years on workmanship is ours, and it covers the install: the fittings, the tempering valve, the connections, rather than the box.",
      },
      {
        q: "All-in-one or split heat pump?",
        a: "An all-in-one is tank and heat pump in one shell with nothing to place outside, which is what makes it fit where a split's outdoor unit has nowhere to sit, it's our default across Hampton Park, Cranbourne and Narre Warren. A split lets the tank live indoors and the heat pump outside, but its glass-lined tank has a sacrificial anode we swap every five to seven years to keep the warranty alive. We'll tell you which your site wants.",
      },
      {
        q: "Can I still get a gas unit?",
        a: "Yes. The G-series continuous flow is our standard gas hot-water swap right across the corridor, natural gas or LPG, sized by how many outlets run at once rather than by people. If your gas unit's on its way out though, it's worth letting us price a heat pump beside it, the VEU rebate and the Australian-made bonus close the gap by more than most people expect.",
      },
      {
        q: "How fast can you do it, and what if it faults later?",
        a: "Because we pull the unit and the fittings over the counter at Reece, most changeovers get booked the same week rather than waiting on a delivery. And the reason we reach for Thermann in the first place is the day it faults years later: the Reece network is same-day for us and every branch stocks the common parts, so you're not sitting cold while a part ships from interstate.",
      },
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
        tankLitres: 315,
        model: "T-HP-SPLIT-GL",
        category: "heat-pump",
        categoryLabel: "Split heat pump · glass-lined tank",
        capacity: "160 / 250 / 315 / 400 L glass-lined tank",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        photo: "/Thermann-Split-heat-pump.jpg",
        photoAlt: "Thermann split heat pump, outdoor unit + tank",
        bestFor: "Household wanting a split heat pump with the tank indoors, sized from a unit to a full house",
        ourTake:
          "Thermann build their split in one tank finish, glass-lined with a sacrificial anode, and now across four sizes: 160, 250, 315 and 400 litres, so it covers a single unit through to a big household. The anode is a part we swap every five to seven years and the tank warranty depends on it being done, so it wants to be on the service list rather than forgotten. Pick it when the tank needs to live in one place and the heat pump in another, and let us size it off how many of you actually shower.",
        specs: [
          { label: "Tank capacity options", value: "160 / 250 / 315 / 400 L" },
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
          "The compact gas storage tank, natural gas or LPG, 4-star. It suits a unit or a smaller household. The burner puts back 122 L an hour, so it keeps up better than the size suggests, but for a busy house the 170 L or a heat pump is the better answer, and we'll price whichever fits the site.",
        specs: [
          { label: "Tank capacity", value: "135 L" },
          { label: "Star rating", value: "4-star" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Install position", value: "External wall-mount pad" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Suitable for", value: "2–5 people across the range" },
          { label: "Gas consumption", value: "29.5 MJ/h natural gas · 28 MJ/h LPG" },
          { label: "Recovery rate", value: "122 L/h at a 45°C rise" },
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
          { label: "Suitable for", value: "2–5 people across the range" },
          { label: "Gas consumption", value: "33.5 MJ/h" },
          { label: "Recovery rate", value: "145 L/h at a 45°C rise" },
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
    layout: "blocks",
    // iStore's sky blue is too light for a band of its own; a deeper blue from the same family.
    blockAccent: "#0A78B8",
    story: {
      heading: "An Australian company, {built to AS/NZS}.",
      body: "iStore is an Australian company out of Sydney. Its units are made in China to AS/NZS standards, and we'd rather tell you that straight.",
      marks: [
        { v: "VEU", k: "The best rebate outcome of any heat pump we fit" },
        { v: "2", k: "Models: 180 L and 275 L" },
        { v: "5 years", k: "On the whole unit" },
      ],
      stops: [
        { place: "Sydney, NSW", role: "Company", d: "An Australian company. Warranty claims are handled from Sydney." },
        { place: "China", role: "Built", d: "Made to AS/NZS standards." },
        { place: "Melbourne", role: "Parts", d: "Through iStore's Melbourne distributor, not a container from overseas." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed by our own crew, with the rebate off at the quote." },
      ],
    },
    quality: {
      tab: "Built in",
      heading: "Built in, {not bolted on}.",
      intro: "The extras other heat pumps sell you separately come in the box.",
      image: { src: "/istore-product.png", alt: "iStore all-in-one heat pump" },
      points: [
        { t: "A PV diverter, built in", d: "On a solar home the compressor runs on power your panels were exporting anyway." },
        { t: "Wi-Fi app as standard", d: "Scheduling and monitoring on both models, with no add-on module." },
        { t: "R290, high COP", d: "A natural refrigerant, and a lot of hot water back for the power it uses." },
        { t: "Two sizes, sized right", d: "180 L for a couple, 275 L for a family of three or four." },
      ],
    },
    reasons: [
      { v: "VEU", k: "the rebate goes furthest", d: "Of every heat pump we fit, the iStore is the one the rebate stretches furthest, off at the quote.", img: "/270L-istore-heatpump.webp", alt: "iStore 275 L heat pump" },
      { v: "R290", k: "high COP", d: "For a house coming off an electric tank, that's the running-cost drop doing the work.", img: "/istore-product.png", alt: "iStore all-in-one heat pump" },
      { v: "2 sizes", k: "180 L and 275 L", d: "Sized to the house, not up. A bigger tank heating water nobody uses is just a bigger bill.", img: "/270L-istore-heatpump.webp", alt: "iStore 275 L heat pump" },
      { v: "5 years", k: "on the whole unit", d: "Tank, heat pump and parts alike, plus six years from us on the workmanship.", img: "/istore-product.png", alt: "iStore all-in-one heat pump" },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "Both warranties start." },
      { y: 5, t: "Year 5", d: "iStore's whole-unit warranty ends." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
    ],
    name: "iStore",
    tagline: "The one to pick when the rebate decides it.",
    origin: "Australia",
    intro:
      "iStore is the one to pick when the rebate decides it. Solid heat pump platform, and the built-in PV diverter means it plays well with solar homes without needing an aftermarket accessory.",
    ourTake:
      "When the VEU rebate is what decides the job, iStore is the answer. Nothing else we fit takes the rebate as far, it goes in with the same crew and the same warranty as anything on the list, and for a household replacing an electric storage tank that is exactly the right call.",
    accreditation: "iStore accredited installer",
    productLabel: "2 models · 180L + 275L heat pump storage",
    photo: "/270L-istore-heatpump.webp",
    photoFallback: "/reclaim-spit-close-up.webp",
    photoAlt: "iStore all-in-one heat pump hot water system",
    accent: "#00A0DF",
    established: "Australian company (Sydney) · manufactured in China to AS/NZS standards",
    warranty: "5-year iStore warranty on the whole unit (tank, heat pump and parts) + 6-year on our workmanship",
    keyFeatures: [
      "Best VEU rebate outcome of any heat pump we install",
      "Built-in PV-diverter compatibility, so the compressor runs when your panels are making power",
      "Wi-Fi smart-app control comes standard · no aftermarket module needed",
      "R290 natural refrigerant, high COP",
    ],
    commonInMelbourne:
      "Most of the iStore we fit replace old electric storage tanks, the job the VEU rebate was written for. It also suits solar households, where the built-in PV diverter puts the compressor on power the house was exporting anyway.",
    support:
      "iStore parts come through their Melbourne distributor. Warranty claims are handled by iStore's Sydney office directly with the homeowner, and we do the on-site swap-out.",
    resources: [
      { label: "iStore · manufacturer website", href: "https://istore.com.au/" },
    ],

    // --- brand-first fields (iStore) ---
    whyLead: {
      claim: "Why we choose {iStore}.",
      sub: "Of every heat pump we fit, the iStore is the one the VEU rebate stretches furthest, and for a household pulling out an old electric tank, that's usually the whole decision.",
    },
    verdict:
      "When the VEU rebate is what decides the job, the iStore is our answer: nothing else we fit takes the rebate as far, and the rebate comes off right there at the quote. It's a solid R290 platform on a high COP, with the PV diverter and the Wi-Fi app built into the unit rather than bolted on afterward. It goes in with the same crew as anything else on our list, with 5 years from iStore on the whole unit and 6 years from us on the workmanship. For a household replacing an old electric storage tank that's exactly the right call, and we'll say plainly when it isn't.",
    notRightWhen:
      "Staying in the house for the long haul, and it's the coldest mornings that worry you most? The iStore is built to a price the rebate makes sense of, not to outlast everything else on the block. If tank longevity and cold-morning recovery matter to you more than the biggest upfront rebate, we'd point you at a Reclaim instead, and we'd rather tell you that now than have you wish we had in year eight.",
    versus:
      "We fit Reclaim too, and where the house is the one you're staying in and cold-morning performance and a stainless tank matter more than the upfront rebate, that's the one we'd steer you to. The iStore is what goes in when the rebate is what decides it.",
    advisorService: "heat-pump-installation",
    heroSub:
      "The heat pump we reach for when the VEU rebate is what decides the job, nothing else we fit takes it as far. Two models, 180 L and 275 L, with the PV diverter and the smart app built in rather than sold to you as extras.",
    fitsWhere:
      "Replacing tired electric storage tanks, and running the compressor on solar surplus for households with panels on the roof.",
    heroFacts: [
      { v: "VEU", k: "Rebate taken off at the quote, not claimed back later" },
      { v: "2 models", k: "180 L and 275 L, nothing in between to read through" },
      { v: "R290", k: "Natural refrigerant, high COP" },
      { v: "5 yr & 6 yr", k: "5-yr iStore warranty on the whole unit and 6-yr on our workmanship, both from install day" },
    ],
    benefitsHeading: "Why it's the pick when the rebate decides it.",
    benefitTiles: [
      {
        t: "The rebate goes furthest",
        line: "The best VEU rebate outcome of any heat pump we fit",
        detail:
          "Of everything on our list, the iStore is the one the VEU rebate stretches furthest, and the rebate comes off right there at the quote. If the rebate is what makes the job stack up: and pulling out an old electric tank, it usually is, this is the unit that makes the most of it.",
        icon: "shield",
      },
      {
        t: "Runs on your solar",
        line: "PV-diverter compatibility built in, not bolted on",
        detail:
          "The PV diverter is part of the unit, so on a solar home the compressor fires on the surplus your panels are already exporting for a few cents. There's no aftermarket accessory to buy or wire in, which is why we like it on solar homes: it puts the compressor on power the house was giving away anyway.",
        icon: "wrench",
      },
      {
        t: "Run it from your phone",
        line: "Wi-Fi smart-app control standard on both models",
        detail:
          "Scheduling and monitoring come through the app on every iStore we fit, no higher model to buy up to and no add-on module. Handy for timing the heat-up to the middle of the day when the panels are working, and for knowing what it's actually costing you rather than guessing.",
        icon: "phone",
      },
      {
        t: "R290 and a high COP",
        line: "Natural refrigerant, and cheap to run for it",
        detail:
          "R290 is a natural refrigerant with a fraction of the environmental number of the older gases, and the platform runs a high COP, the measure of how much hot water you get back per unit of power. For a house coming off electric resistance, that COP is the running-cost drop doing the heavy lifting.",
        icon: "snowflake",
      },
      {
        t: "Two models, sized right",
        line: "180 L for a couple, 275 L for a family",
        detail:
          "There are only two: 180 L on a 2.5 kW compressor for a couple or an apartment, and 275 L on a 4 kW for a family of three or four. We size it to the house rather than up, a 275 heating water nobody uses is just a bigger power bill, and there's no wall of model numbers to wade through to get there.",
        icon: "people",
      },
    ],
    servicing: {
      tab: "After the swap",
      heading: "Who looks after it {after the swap}.",
      photo: "/270L-istore-heatpump.webp",
      photoAlt: "An iStore 275L heat pump hot water system installed outside",
      body:
        "A heat pump is a compressor and a tank, and both carry a warranty worth knowing how to use before you need it. The iStore is an Australian company out of Sydney, its units built in China to AS/NZS standards, and the way a claim runs is worth understanding on install day rather than the day something stops, because who you ring is decided by which part it is.",
      facts: [
        "5 years from iStore on the whole unit, tank, heat pump and parts alike, plus 6 years from us on the workmanship",
        "Warranty claims are handled by iStore's Sydney office directly with the homeowner, and we do the on-site swap-out",
        "Parts come through iStore's Melbourne distributor, so a replacement isn't a wait on a container from overseas",
        "Both models are VEU-eligible, so the rebate applies whether the house needs the 180 L or the 275 L",
        "iStore is an Australian company out of Sydney, its units manufactured in China to AS/NZS standards, we'll tell you that straight rather than dress it up",
      ],
    },
    steps: [
      {
        title: "Size it and confirm the rebate",
        detail:
          "We look at what's on the wall now, how many of you there are, and confirm your VEU eligibility, then size it, 180 L for a couple, 275 L for a family. The rebate is worked out and applied at the quote, so the number you sign is the number you pay.",
      },
      {
        title: "Check the power point",
        detail:
          "The iStore runs off a standard power point. If there's one within 2 m of the existing system we use it and there's nothing to add. If there isn't: no nearby circuit, or the point's too far to reach: running one is an electrical add, and we put it on the quote rather than springing it on you mid-install.",
      },
      {
        title: "Drain and disconnect the old tank",
        detail:
          "On changeover day we isolate the water and the power, drain the old electric storage tank down and disconnect it. A straight electric-tank swap is the cleanest job we do, the plumbing and the position are usually already right for the iStore to take its place.",
      },
      {
        title: "Set the iStore and fit a tempering valve",
        detail:
          "The new unit goes in on a level base with air around the compressor, gets plumbed in, and a tempering valve goes on the outlet so the water reaches the tap at a safe, regulated temperature. The tempering valve is code, not an upsell, and it's on every hot water system we install.",
      },
      {
        title: "Wire the PV diverter and set up the app",
        detail:
          "On a solar home we set the PV diverter so the compressor runs on your export surplus, and connect the Wi-Fi app so you can schedule the heat-up for the middle of the day. Both are built into the unit, so there's no aftermarket module to buy or bolt on the wall.",
      },
      {
        title: "Commission, lodge the rebate, take the old one away",
        detail:
          "We run it up, check it's making hot water, and hand over the app. The VEU rebate paperwork is lodged for you, and the old tank leaves on our truck, you're not left with it sitting in the side passage waiting on a hard-rubbish day.",
      },
    ],
    faqs: [
      {
        q: "Why the iStore and not one of the other heat pumps?",
        a: "Because of the rebate, mostly. Of everything we fit, the iStore is the one the VEU rebate stretches furthest, which is what brings the price down so far. It's a solid R290 platform with the PV diverter and the app built in, and for a house pulling out an old electric tank it's the one that makes the numbers work. Where you're staying long-term and cold-morning recovery matters to you more than the upfront rebate, we'd point you at a Reclaim instead, and we'll say so plainly.",
      },
      {
        q: "What's this electrical charge I've heard about?",
        a: "The iStore runs off a normal power point. If there's one within 2 m of your existing system we just use it and there's nothing extra. If there isn't: no circuit there, or the point's too far away, an electrician has to run one, and that's an extra line on the quote. We check for it on the site visit so it's never a surprise on install day.",
      },
      {
        q: "Will a heat pump keep up with our showers?",
        a: "Sized right, yes. The 180 L on a 2.5 kW compressor suits a couple or an apartment; the 275 L on a 4 kW is our most-fitted unit and covers a family of three or four, with enough output to have it back before the evening run. We size it to how many of you actually shower, not to the biggest tank on the shelf.",
      },
      {
        q: "We've got solar, does that change things?",
        a: "It's where the iStore is at its best. The PV diverter is built in, so the compressor runs on the surplus your panels are exporting for a few cents rather than pulling off the grid. Time the heat-up to the middle of the day through the app and you're heating water on power you'd otherwise have sold back cheap. No extra kit to buy, it's part of the unit.",
      },
      {
        q: "What warranty comes with it?",
        a: "5 years from iStore on the whole unit: the tank, the heat pump and the parts, not one length for the tank and a shorter one for the compressor. That's handled through their Sydney office directly with you if you ever need to claim. On top of it is our 6 years on the workmanship, which covers the install: the plumbing, the base, the tempering valve, the things that are our fault if they go wrong. Parts come through iStore's Melbourne distributor, so a replacement isn't a wait on a container.",
      },
      {
        q: "Where's it made, and is R290 anything to worry about?",
        a: "iStore is an Australian company out of Sydney and the units are built in China to AS/NZS standards, we'll tell you that straight rather than dress it up. R290 is a natural refrigerant with a fraction of the environmental number of the older gases, it runs a high COP so it's cheap on power, and it's been in fridges for years. Nothing to lose sleep over.",
      },
    ],

    products: [
      {
        slug: "istore-180",
        name: "iStore 180L Heat Pump",
        compressorKw: 2.5,
        tankLitres: 180,
        model: "iStore 180 L",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "180 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Couples and apartments, where the rebate is what decides it",
        photo: "/270L-istore-heatpump.webp",
        photoAlt: "iStore 180L heat pump, full unit view",
        ourTake:
          "180 L on a 2.5 kW compressor, the smallest iStore we fit. It's the right size for a couple or an apartment, where a 275 would be paying for water nobody uses. The rebate is applied at the quote, and this is where it goes furthest.",
        specs: [
          { label: "Tank capacity", value: "180 L" },
          { label: "Refrigerant", value: "R290" },
          { label: "Warranty", value: "5 years on the whole unit" },
        ],
        related: ["istore-270", "thermann-eco-r290-200"],
      },
      {
        slug: "istore-270",
        name: "iStore 275L Heat Pump",
        compressorKw: 4.0,
        tankLitres: 275,
        model: "iStore 275 L",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "275 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Family of three or four, where the rebate is what decides it",
        photo: "/270L-istore-heatpump.webp",
        photoAlt: "iStore 275L heat pump, installed unit",
        ourTake:
          "275 L on a 4 kW compressor, and that pairing is the point: enough stored for a family of four, and enough output to have it back before the evening run. One of our most-installed units, with the rebate applied at the quote.",
        specs: [
          { label: "Tank capacity", value: "275 L" },
          { label: "Refrigerant", value: "R290" },
          { label: "Warranty", value: "5 years on the whole unit" },
        ],
        related: ["istore-180", "thermann-eco-r290-300"],
      },
    ],
  },

  // ================== VIESSMANN ==================
  // Added Nov 2026 (Jake): a German option among the heat pumps. Every figure
  // here is from Viessmann Australia's Vitocal 161-A product page; nothing
  // about where it's built, VEU listing or parts supply is claimed, because
  // that page doesn't say.
  {
    slug: "viessmann",
    layout: "blocks",
    blockAccent: "#D93A14",
    story: {
      heading: "A German name, {since 1917}.",
      body: "Viessmann started as a heating manufacturer in Germany in 1917 and is now part of Carrier. The Vitocal 161-A is its all-in-one hot water heat pump for Australia.",
      marks: [
        { v: "1917", k: "Founded in Germany as a heating manufacturer" },
        { v: "2", k: "Sizes: 200 L and 270 L" },
        { v: "5 years", k: "All parts and labour, from Viessmann" },
      ],
      stops: [
        { place: "Germany", role: "Brand", d: "A German heating company since 1917, now part of Carrier." },
        { place: "Australia", role: "Supported", d: "Viessmann Australia handles the warranty registration and claims." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed by our own installers, with six years from us on the workmanship." },
      ],
    },
    quality: {
      tab: "Built in",
      heading: "Built for {Australian conditions}.",
      intro: "What the Vitocal 161-A brings, from Viessmann's own figures.",
      image: { src: "/viessmann-vitocal-161a.webp", alt: "Viessmann Vitocal 161-A all-in-one heat pump" },
      points: [
        { t: "Cold mornings covered", d: "Makes hot water from the air down to −7 °C, and down to −15 °C with its built-in 1.8 kW element." },
        { t: "Quiet", d: "43 dB(A), rated." },
        { t: "Wi-Fi and a colour touch screen", d: "An integrated Wi-Fi timer with a phone app, and a touch-screen controller on the unit." },
        { t: "R290", d: "A natural refrigerant with a very low global warming potential." },
      ],
    },
    reasons: [
      { v: "German", k: "since 1917", d: "A heating manufacturer for over a century, now part of Carrier.", img: "/viessmann-vitocal-161a-scene.webp", alt: "Viessmann Vitocal 161-A beside a house", cover: true },
      { v: "−7 °C", k: "heat pump only", d: "And −15 °C on the element, so a frosty morning still has hot water.", img: "/viessmann-vitocal-161a.webp", alt: "Viessmann Vitocal 161-A" },
      { v: "43 dB", k: "rated noise", d: "A quiet unit for a side passage near a bedroom window.", img: "/viessmann-vitocal-161a.webp", alt: "Viessmann Vitocal 161-A" },
      { v: "5 years", k: "parts and labour", d: "From Viessmann, plus six years from us on the workmanship.", img: "/viessmann-vitocal-161a-scene.webp", alt: "Viessmann Vitocal 161-A installed outside", cover: true },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "Both warranties start." },
      { y: 5, t: "Year 5", d: "Viessmann's parts and labour warranty ends." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
    ],
    name: "Viessmann",
    tagline: "The German option.",
    origin: "Germany",
    intro:
      "Viessmann is a German heating company, founded in 1917 and now part of Carrier. The Vitocal 161-A is its all-in-one hot water heat pump, in 200 L and 270 L.",
    ourTake:
      "For the household that wants a German name on the unit, the Vitocal 161-A is a straightforward all-in-one: R290, Wi-Fi, a backup element for the coldest mornings, and five years from Viessmann on parts and labour. It goes in with the same crew and the same six-year workmanship warranty as everything else we fit.",
    productLabel: "2 models · 200L + 270L heat pump",
    photo: "/viessmann-vitocal-161a.webp",
    photoAlt: "Viessmann Vitocal 161-A all-in-one heat pump hot water system",
    accent: "#FF4419",
    established: "German company, founded 1917 · now part of Carrier",
    warranty: "5-year Viessmann warranty on all parts and labour + 6-year on our workmanship",
    keyFeatures: [
      "German brand, a heating manufacturer since 1917",
      "Hot water down to −7 °C on the heat pump, −15 °C with the 1.8 kW element",
      "43 dB(A) rated, integrated Wi-Fi timer and app",
      "R290 natural refrigerant",
    ],
    commonInMelbourne:
      "It suits a household replacing an old electric or gas tank that wants a German brand and a quiet unit, in a 200 L for up to four people or a 270 L for up to six.",
    support:
      "Warranty registration and claims go through Viessmann Australia, and we do the on-site work.",
    resources: [
      { label: "Viessmann Australia · Vitocal 161-A", href: "https://www.viessmann.com.au/en/products/heat-pump/vitocal-161-a.html" },
    ],
    whyLead: {
      claim: "Why we fit {Viessmann}.",
      sub: "A German heating name since 1917, in an all-in-one heat pump with a backup element for the coldest mornings.",
    },
    verdict:
      "The Vitocal 161-A is the heat pump for the household that wants a German brand on it. It's an all-in-one on R290, with Wi-Fi and a touch screen, rated at 43 dB(A), and it makes hot water down to −7 °C before the element takes over. Five years from Viessmann on parts and labour, six from us on the workmanship.",
    notRightWhen:
      "If the rebate is what decides it, or you want the compressor split away from the tank, we'd point you at an iStore or a Reclaim CO₂ split instead, and we'll show you the difference at the quote.",
    versus:
      "We fit iStore, Reclaim and Viessmann. iStore is the pick when the rebate decides it, Reclaim when you want Australian made or a CO₂ split, and Viessmann when you want the German name.",
    advisorService: "heat-pump-installation",
    heroSub:
      "A German heating name since 1917. The Vitocal 161-A all-in-one heat pump, in 200 L and 270 L, with Wi-Fi, a backup element and five years on parts and labour.",
    fitsWhere:
      "Replacing an old electric or gas tank, for a household that wants a German brand and a quiet unit.",
    heroFacts: [
      { v: "Since 1917", k: "A German heating manufacturer, now part of Carrier" },
      { v: "2 sizes", k: "200 L for up to 4 people, 270 L for up to 6" },
      { v: "43 dB(A)", k: "Rated noise level" },
      { v: "5 yr & 6 yr", k: "5 years from Viessmann on parts and labour, 6 from us on the workmanship" },
    ],
    benefitsHeading: "What you get with the Vitocal 161-A.",
    benefitTiles: [
      { t: "A German name", line: "A heating manufacturer since 1917", detail: "Viessmann has made heating equipment in Germany since 1917 and is now part of Carrier.", icon: "shield" },
      { t: "Cold mornings", line: "−7 °C on the heat pump, −15 °C on the element", detail: "Below −7 °C the built-in 1.8 kW element carries it, so there's still hot water on a frosty morning.", icon: "snowflake" },
      { t: "Run it from your phone", line: "Integrated Wi-Fi timer and app", detail: "Set it to heat in the middle of the day when your solar is running, and check it from the app.", icon: "phone" },
      { t: "Two sizes", line: "200 L or 270 L", detail: "Viessmann sizes the 200 L for up to four people and the 270 L for up to six. We size it to how many of you shower.", icon: "people" },
    ],
    servicing: {
      tab: "After the swap",
      heading: "Who looks after it {after the swap}.",
      photo: "/viessmann-vitocal-161a-scene.webp",
      photoAlt: "A Viessmann Vitocal 161-A heat pump outside a house",
      body:
        "Five years from Viessmann on all parts and labour, and six from us on the workmanship. Viessmann Australia handles the warranty registration and claims, and we do the work on site.",
      facts: [
        "5 years from Viessmann on all parts and labour, plus 6 years from us on the workmanship",
        "Warranty registration and claims through Viessmann Australia",
        "10 amp plug fitted: runs off a standard power point",
        "A built-in 1.8 kW element for the coldest mornings",
      ],
    },
    steps: [
      { title: "Size it", detail: "How many of you shower and for how long: 200 L for up to four people, 270 L for up to six." },
      { title: "Check the power point", detail: "It comes with a 10 amp plug. If there's no point near the old system, running one is an electrical add, and it's on the quote." },
      { title: "Out with the old tank", detail: "We isolate the water and power, drain the old tank and take it away." },
      { title: "In with the Vitocal", detail: "On a level base with air around it, plumbed in with a tempering valve on the outlet." },
      { title: "Set up the app", detail: "Connected to your Wi-Fi so you can time the heat-up, then commissioned and checked before we leave." },
    ],
    faqs: [
      { q: "Is it German made?", a: "Viessmann is a German company, founded in 1917 and now part of Carrier. Viessmann Australia's page calls it a German brand but doesn't say where the Vitocal 161-A is built, so we won't either. Ask us at the quote and we'll find out." },
      { q: "Will it keep up in winter?", a: "It makes hot water from the air down to −7 °C, and its built-in 1.8 kW element carries it down to −15 °C, so a frosty morning still has hot water." },
      { q: "Which size do we need?", a: "Viessmann sizes the 200 L for up to four people and the 270 L for up to six. Our hot water size check works it out from how many of you shower and for how long." },
      { q: "What warranty comes with it?", a: "Five years from Viessmann on all parts and labour, and six years from us on the workmanship." },
    ],
    products: [
      {
        slug: "vitocal-161a-200",
        name: "Viessmann Vitocal 161-A · 200L",
        compressorKw: 2.78,
        tankLitres: 200,
        model: "Vitocal 161-A (200 L)",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "200 L",
        refrigerant: "R290",
        veuEligible: false,
        bestFor: "Up to four people, by Viessmann's sizing guide",
        photo: "/viessmann-vitocal-161a.webp",
        photoAlt: "Viessmann Vitocal 161-A 200L heat pump",
        ourTake:
          "The 200 L Vitocal for up to four people. Same R290 heat pump, element and warranty as the 270, in a shorter tank: 1518 mm tall against 1830.",
        specs: [
          { label: "Tank capacity", value: "200 L" },
          { label: "Suits", value: "Up to 4 people" },
          { label: "Refrigerant", value: "R290 / 400 g" },
          { label: "Heating capacity", value: "2.78 kW" },
          { label: "COP", value: "4.15 (A20/15, W15-55)" },
          { label: "Backup element", value: "1.8 kW" },
          { label: "Noise", value: "43 dB(A)" },
          { label: "Operating range", value: "−7 °C to 43 °C (−15 °C with the element)" },
          { label: "Size", value: "620 mm wide, 1518 mm tall, 120 kg empty" },
          { label: "Power", value: "10 amp plug fitted" },
          { label: "Warranty", value: "5 years parts and labour + 6-year workmanship" },
        ],
        related: ["vitocal-161a-270", "istore-180"],
      },
      {
        slug: "vitocal-161a-270",
        name: "Viessmann Vitocal 161-A · 270L",
        compressorKw: 2.78,
        tankLitres: 270,
        model: "Vitocal 161-A (270 L)",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "270 L",
        refrigerant: "R290",
        veuEligible: false,
        bestFor: "Up to six people, by Viessmann's sizing guide",
        photo: "/viessmann-vitocal-161a.webp",
        photoAlt: "Viessmann Vitocal 161-A 270L heat pump",
        ourTake:
          "The 270 L Vitocal for up to six people, the one for a family. 1830 mm tall, so we check the spot before we order it.",
        specs: [
          { label: "Tank capacity", value: "270 L" },
          { label: "Suits", value: "Up to 6 people" },
          { label: "Refrigerant", value: "R290 / 380 g" },
          { label: "Heating capacity", value: "2.78 kW" },
          { label: "COP", value: "4.15 (A20/15, W15-55)" },
          { label: "Backup element", value: "1.8 kW" },
          { label: "Noise", value: "43 dB(A)" },
          { label: "Operating range", value: "−7 °C to 43 °C (−15 °C with the element)" },
          { label: "Size", value: "620 mm wide, 1830 mm tall, 136 kg empty" },
          { label: "Power", value: "10 amp plug fitted" },
          { label: "Warranty", value: "5 years parts and labour + 6-year workmanship" },
        ],
        related: ["vitocal-161a-200", "istore-270"],
      },
    ],
  },

  // ================== KADEN ==================
  {
    slug: "kaden",
    layout: "blocks",
    heroProducts: [
      { src: "/Kaden KSI V3 wall split system.jpg", alt: "Kaden KSI wall split, indoor and outdoor units", label: "KSI wall split" },
      { src: "/Kaden kdi-v2-Ducted Split System.webp", alt: "Kaden KDI ducted system with its outdoor unit and controller", label: "KDI ducted" },
      { src: "/Kaden classic_evap cooler .jpg", alt: "Kaden classic evaporative cooler", label: "Evaporative" },
    ],
    story: {
      heading: "Reece's own air conditioning, {since 2015}.",
      body: "Kaden is sold only through Reece. That's why the common parts sit on a shelf in every Reece store in Victoria, and why we're rarely the ones waiting on one.",
      marks: [
        { v: "2015", k: "Trading as a Reece-exclusive brand" },
        { v: "12", k: "Models, from splits to evap" },
        { v: "Same day", k: "Parts pickup at any Reece store" },
      ],
      stops: [
        { place: "Reece, nationally", role: "Sold", d: "Kaden is Reece-exclusive: you'll only find it through Reece stores." },
        { place: "Every Reece store in Victoria", role: "Stocked", d: "The common parts are on the shelf, so most are a same-day pickup for us." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Installed by our own crew, with the same brackets and workmanship as anything we fit." },
      ],
    },
    quality: {
      tab: "The whole house",
      heading: "One brand, {the whole house}.",
      intro: "Splits, multi-head, ducted, gas ducted and evap from the one range, so the whole house can be done in one visit.",
      image: { src: "/Kaden kdi-v2-Ducted Split System.webp", alt: "Kaden KDI ducted system with its outdoor unit and controller" },
      points: [
        { t: "Every shape the house needs", d: "A split for a bedroom, a multi-head where there's one spot outside, ducted from 10 kW up, gas ducted and evap." },
        { t: "One remote, one parts list", d: "A whole house on Kaden stays on one app and one parts pipeline. Mixed-brand houses are where warranty arguments start." },
        { t: "Gas ducted that modulates", d: "The 6-star burner ramps up and down instead of running flat-out then off, so a house that heats all winter burns noticeably less gas." },
        { t: "Backed seven years, and six of ours", d: "Seven years of Kaden's parts and labour on the unit (ten on a gas ducted heater's heat exchanger), and six years of ours on the install." },
      ],
    },
    reasons: [
      { v: "Same day", k: "parts from Reece", d: "The common Kaden parts sit in every Reece store in Victoria, so a fault rarely means a wait.", img: "/Kaden Condesnser.jpg", alt: "A Kaden outdoor unit on a roof", cover: true },
      { v: "12 models", k: "one parts list", d: "Wall splits, multi-head, ducted, gas ducted and evap, all from one brand.", img: "/Kaden Multi Head.jpg", alt: "Kaden multi-head system: one outdoor unit and several indoor units" },
      { v: "6-star", k: "gas ducted", d: "A modulating burner that matches its output to the house, instead of cycling on and off.", img: "/kaden_internal_ducted_heater_star pro 4 and 5  star.jpg", alt: "Kaden gas ducted heater" },
      { v: "6 years", k: "on our workmanship", d: "On top of Kaden's seven years on the unit, registered in your name the day after we fit it.", img: "/Kaden KSI V3 wall split system.jpg", alt: "Kaden KSI wall split" },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "Both warranties start." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
      { y: 7, t: "Year 7", d: "Kaden's parts and labour warranty ends." },
      { y: 10, t: "Year 10", d: "The heat exchanger warranty on a Kaden gas ducted heater ends." },
    ],
    picker: {
      steps: [
        { id: "rooms", q: "How much of the house do you want to cool?", opts: [{ v: "one", l: "One room" }, { v: "few", l: "Two to four rooms" }, { v: "all", l: "The whole house" }] },
        { id: "how", q: "Heating as well, or just cooling?", opts: [{ v: "both", l: "Heating and cooling" }, { v: "evap", l: "Just cheap cooling on hot, dry days" }], if: { rooms: "all" } },
        { id: "roof", q: "Does it matter how it looks on the roof?", opts: [{ v: "low", l: "Yes, keep it low" }, { v: "any", l: "Not really" }], if: { how: "evap" } },
      ],
      results: [
        { when: { rooms: "one" }, model: "KSI wall split", why: "One unit on the wall and one outside, heating and cooling. The quickest thing we fit." },
        { when: { rooms: "few" }, model: "Multi-head system", why: "One outdoor unit runs several rooms, each on its own remote." },
        { when: { rooms: "all", how: "both" }, model: "KDI ducted system", why: "Whole-home heating and cooling through vents in each room, sized off a room-by-room heat load." },
        { when: { rooms: "all", how: "evap", roof: "low" }, model: "Low-profile evaporative", why: "Fresh, cool air through the house for very little to run, in a cooler that sits low on the roofline." },
        { when: { rooms: "all", how: "evap" }, model: "Classic evaporative", why: "Fresh, cool air through the house, and cheap to run on dry days." },
      ],
    },
    name: "Kaden",
    tagline: "Reece exclusive. Splits, ducted, gas and evap on one parts list.",
    origin: "Reece-exclusive brand · Australian-distributed",
    intro:
      "Kaden is Reece-exclusive, which means parts in every store in Victoria and a supply chain that does not blink. Solid build, national parts support, and a 7-year manufacturer warranty behind it.",
    ourTake:
      "Kaden is what we quote when a family wants the whole house done in one visit instead of a room a year. It's Reece-exclusive, so parts sit on a shelf in every store in Victoria, and it goes in with the same crew, the same brackets and the same workmanship warranty as anything else we fit. Across three bedrooms and a living zone, doing it once is worth more than doing it in stages.",
    accreditation: "Reece trade partner · Kaden authorised dealer",
    productLabel: "12 models · splits, multi-head, ducted, gas ducted, evaporative",
    photo: "/Kaden KSI V3 wall split system.jpg",
    photoFallback: "/kaden-indoor.webp",
    photoAlt: "Kaden split system with outdoor condenser",
    accent: "#2472CE",
    established: "Reece exclusive brand, distributed via Reece stores nationally · trading since 2015",
    warranty: "7-year manufacturer parts + labour + 6-year on our workmanship",
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

    // --- brand-first fields (Kaden) ---
    advisorService: "air-conditioning-installation",
    whyLead: {
      claim: "Why we choose {Kaden}.",
      sub: "Parts on a shelf in every Reece store, and a range wide enough to do the whole house in one visit.",
    },
    verdict:
      "Kaden is what we quote when a family wants the whole house done in one visit rather than a room a year. It is the sensible spend: build quality that holds up next to anything else we fit, Reece-exclusive parts on a shelf in every store in Victoria, and the same crew, the same brackets and the same 6-year workmanship warranty as anything else we put in. Across three bedrooms and a living zone, doing it once is worth more than doing it in stages, and Kaden is the range that keeps that one number reachable.",
    notRightWhen:
      "Staying in the house fifteen years and want the quietest possible unit over the bed? Kaden runs a touch louder than the Mitsubishi at the same size, worth knowing if the bed sits directly under it, and for a forever home the reliability premium is the thing worth paying once. We fit both, and we will say when the Mitsubishi is the better spend rather than sell you the cheaper box.",
    versus:
      "Mitsubishi is the one we fit when the house is the one you are staying in and parts-in-year-twelve matter most. Kaden is the sensible spend on a house you will hold about five years. On gas ducted specifically, a Brivis is the straight same-footprint swap where a Kaden is our standard like-for-like path out of a tired old Brivis or Braemar. We fit all three, and we will tell you which one the house actually wants.",
    heroSub:
      "Reece-exclusive air conditioning: splits, multi-head, ducted, gas ducted and evap on one parts list. The value pick when a family wants the whole house done in one visit, not a room a year.",
    fitsWhere:
      "Three-or-more-bedroom homes through Cranbourne, Narre Warren, Hampton Park and Endeavour Hills that want the lot done at once, and old Brivis and Braemar gas ducted swapped like for like.",
    heroFacts: [
      { v: "12 models", k: "Splits, multi-head, ducted, gas ducted and evap" },
      { v: "Reece-exclusive", k: "Common parts in every Reece store in Victoria" },
      { v: "Since 2015", k: "Reece-exclusive brand, distributed nationally" },
      { v: "7 yr & 6 yr", k: "7-yr manufacturer and 6-yr workmanship warranties, both from install day" },
    ],
    benefitsHeading: "Why it's the one we quote for the whole house.",
    benefitTiles: [
      {
        t: "The whole house at once",
        line: "One visit, one crew, one parts list, not a room a year",
        detail:
          "The range is wide enough to do three bedrooms and a living zone in a single job, and doing it once beats doing it across three summers of half a solution. Same crew, same brackets and the same workmanship as anything else we fit, the only thing that changes is that you are not booking us back next summer.",
        icon: "people",
      },
      {
        t: "Parts on a Reece shelf",
        line: "Reece-exclusive, stocked in every Reece store in Victoria",
        detail:
          "Because Kaden is Reece-exclusive, the common parts sit on a shelf in every Reece store in the state, same-day pickup for us on almost every job, and a supply chain that does not blink. That is the difference that shows up in year six, when an import nobody stocks becomes a whole new system.",
        icon: "truck",
      },
      {
        t: "Backed seven years, and six of ours",
        line: "7-year manufacturer parts + labour + 6-year on our workmanship",
        detail:
          "That is seven years of Kaden's own parts and labour on the unit, ten on a gas ducted heater's heat exchanger, and on top of it six years of ours on the install: brackets, line-set, drainage, penetrations, the things that are our fault if they go wrong. Seven years fully backed, registered in your name the day after we fit it.",
        icon: "shield",
      },
      {
        t: "Gas ducted that modulates",
        line: "6-star burner ramps rather than full-on, full-off",
        detail:
          "The Kaden 6-star gas ducted runs a modulating burner instead of cycling flat-out then off, so a house that heats a lot of hours through a Melbourne winter burns noticeably less gas. It is also our standard like-for-like path out of a tired old Brivis or Braemar, and the universal cabinet drops onto the existing pad without new base work.",
        icon: "flame",
      },
      {
        t: "One remote, one parts list",
        line: "A whole house on Kaden stays on one app and one pipeline",
        detail:
          "Do the house in Kaden and it stays on one remote, one app and one parts list: splits, multi-head or ducted, all on the same pipeline. Mixed-brand houses are where warranty arguments come from, and keeping it to one brand is how you avoid having one.",
        icon: "wrench",
      },
      {
        t: "Every shape the house needs",
        line: "Wall splits, multi-head, ducted, gas ducted and evap",
        detail:
          "Splits for a bedroom, a multi-head where there is only one spot outside for the condenser, ducted from 10 kW up, gas ducted for the winter and evap for the dry-summer estates, all under one brand. Whatever shape the house wants, the controller, the parts and the service story stay the same.",
        icon: "snowflake",
      },
    ],
    servicing: {
      tab: "The parts",
      heading: "What happens when it {needs a part}.",
      photo: "/ducted-condenser.webp",
      photoAlt: "A Kaden outdoor condenser installed on a brick wall in Melbourne's south-east",
      body:
        "Anyone can sell you a system. What decides whether it was a good buy is the day it needs a part, whether that part still exists, and whether somebody can get to it this week rather than next month. Kaden being Reece-exclusive is the answer to the first half: the common parts sit in every Reece store in Victoria, so we are rarely the ones waiting.",
      facts: [
        "Every Reece store in Melbourne stocks the common Kaden parts, same-day pickup for us on almost every job",
        "Warranty claims run through the Reece trade portal, so the paper trail stays in one place",
        "7-year manufacturer parts and labour on the unit, 10 on a gas ducted heat exchanger, registered in your name after we install it",
        "Six years of our own workmanship on top, covering the install rather than the box",
        "Do the whole house in Kaden and it is one remote, one app and one parts list to service, not five",
      ],
    },
    steps: [
      { title: "Room-by-room heat load", detail: "We walk the house, measure ceiling height, window aspect and insulation, and compute the actual kW room by room. A 5 kW room gets a 5 kW unit, whether that ends up a split, a head off a multi or a zone off the ducted, not a 7 kW one somebody had on the truck." },
      { title: "The whole house, scoped in one go", detail: "The reason to go Kaden is doing the lot in one visit, so we scope every room at once: which rooms take a split, which want a multi-head off a single condenser, and whether ducted works out cheaper than five heads. You see the whole plan before you commit to any of it." },
      { title: "Written quote", detail: "Model numbers, capacities, line-set lengths, controller spec, warranty position and one installed total. No ‘from $X’, and no allowance that turns into a variation on the day. Because Kaden is Reece-exclusive the stock is never far away, so the day we book is a day we can keep." },
      { title: "Install day", detail: "A single split back-to-back is three to four hours; a multi-head or ducted is a full day; a whole house is one or two. Drop sheets down, dust extraction on every wall cut, conduit colour-matched outside, fresh copper every time, same standard as anything else we fit." },
      { title: "Commission and walk through", detail: "We run each system up, check refrigerant pressures against spec, and set up the remotes and the Kaden app with you. You sign the job card when you are happy with it, not before." },
      { title: "Compliance and warranty inside 24 hours", detail: "Electrical and refrigeration compliance certificates emailed by end of business the next day, and the manufacturer warranty registered in your name at the same time so the record is clean for any future claim." },
    ],
    faqs: [
      {
        q: "Is Kaden any good, or is it just the cheap option?",
        a: "It is the value pick, not the cheap pick, there is a difference. The build holds up next to anything else we fit, and because it is Reece-exclusive the parts sit on a shelf in every Reece store in Victoria, which is the bit an unknown import can never promise. Where it earns its place is doing a whole house at once for a number a room-a-year approach never reaches.",
      },
      {
        q: "Why would I choose Kaden over Mitsubishi?",
        a: "Money and how long you are staying. Mitsubishi is what we fit when the house is the one you are staying in fifteen years and you want parts on a shelf in year twelve and the quietest unit over the bed. Kaden is the sensible spend on a house you will hold about five years: it cools the same room just as well, for hundreds less, on a range wide enough to do the lot in one visit. We fit both and we will say which one your situation actually wants.",
      },
      {
        q: "What does ‘Reece-exclusive’ actually mean for me?",
        a: "It means the common Kaden parts are stocked in every Reece store in Melbourne, so when something needs a part we usually pick it up the same day rather than waiting on a container. Warranty claims run through the Reece trade portal, which keeps the whole thing in one place. In plain terms: a brand you can still get parts for quickly is a brand that stays fixed.",
      },
      {
        q: "Can you really do the whole house in one visit?",
        a: "That is the point of quoting Kaden. The range covers splits, multi-head and ducted, so we scope every room at once and fit it as one job, usually one or two days depending on how many rooms and whether it is ducted. Three bedrooms and a living zone done together beats three summers of half a solution, and it comes in under the sum of a room a year.",
      },
      {
        q: "I've got an old Brivis or Braemar gas ducted, can Kaden replace it?",
        a: "Yes, and it is our standard like-for-like path out of one. The Kaden universal cabinet drops onto the existing Brivis or Braemar pad without new base work, so the slab, the gas line and the ducts all stay put and the house is warm again the same day. If you would rather keep the same brand footprint we will price a Brivis instead: and if you heat a lot of hours, the 6-star modulating burner is the one that shows up on the gas bill.",
      },
      {
        q: "What warranty do I get?",
        a: "7-year manufacturer parts + labour + 6-year on our workmanship. The seven years is Kaden's own cover on the unit (a gas ducted heater's heat exchanger gets ten), registered in your name the day after we install it; the six years is ours on the install: brackets, line-set, drainage, penetrations, the things that are our fault if they go wrong. So it is seven years fully backed.",
      },
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
        veuEligible: true,
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
          { label: "Warranty", value: "7-year parts + 6-year workmanship" },
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
          "7-year parts warranty alongside our 6-year workmanship, 7 years fully backed",
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
        veuEligible: true,
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
          { label: "Wi-Fi", value: "Ready (adapter optional)" },
          { label: "Warranty", value: "7-year parts + 6-year workmanship" },
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
        veuEligible: true,
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
          { label: "Warranty", value: "7-year parts + 6-year workmanship" },
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
          "Backed by 7-year parts + our 6-year workmanship",
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
        veuEligible: true,
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
          { label: "Wi-Fi", value: "Ready (adapter optional)" },
          { label: "Warranty", value: "7-year parts + 6-year workmanship" },
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
        veuEligible: true,
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
          { label: "Warranty", value: "7-year parts + 6-year workmanship" },
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
        veuEligible: true,
        photo: "/Kaden kdi-v2-Ducted Split System.webp",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Larger single-storey and double-storey family homes",
        ourTake: "The top of the Kaden ducted range, and what goes into larger double-storey family homes. Past 17 kW the range stops and the Mitsubishi PEA-M picks it up, which is a question of capacity rather than of quality.",
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
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
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
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
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
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
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
        veuEligible: true,
        bestFor: "Five and six bedroom homes that want per-room control without going ducted",
        ourTake: "Kaden's biggest multi-head, six indoor heads off one outdoor unit. Six rooms each on their own setpoint with no ductwork in the ceiling, which is the answer for a house where running ducts would mean opening up half the roof space.",
        specs: [
          { label: "Combined cooling", value: "18.0 kW" },
          { label: "Combined heating", value: "21.0 kW" },
          { label: "Indoor heads", value: "Up to 6" },
          { label: "Refrigerant", value: "R32" },
          { label: "Power supply", value: "1-phase 230 V" },
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-multi-12", "mxz-6c"],
      },
      {
        slug: "kaden-internal-3",
        name: "Kaden Gas Ducted · 3-Star Internal",
        model: "KGH-3 Compact Universal · internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 26 · 30 kW output · internal cupboard",
        starRating: "3-star",
        veuEligible: false,
        photo: "/kaden_internal_ducted_heater_3 star.jpg",
        photoAlt: "Kaden 3-star internal gas ducted heater",
        bestFor: "Like-for-like swap for an ageing 3-star internal, done in a day",
        ourTake:
          "Drops straight into an existing cupboard cavity, so the ducts, the controller wiring and the return-air grille all stay put and the house is warm again the same day. Same install team and the same 6-year workmanship as anything else we fit.",
        specs: [
          { label: "Star rating", value: "3-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
          { label: "Heat exchanger warranty", value: "10 years" },
        ],
        related: ["kaden-internal-starpro-45", "kaden-external-3", "brivis-internal-wombat-3"],
      },
      {
        slug: "kaden-internal-starpro-45",
        name: "Kaden Starpro · 4 & 5-Star Internal",
        model: "Starpro 4★ / 5★ Internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 26 · 30 kW output · 4-star or 5-star · internal cupboard",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/kaden_internal_ducted_heater_star pro 4 and 5  star.jpg",
        photoAlt: "Kaden Starpro 4/5-star internal gas ducted heater",
        bestFor: "In-cupboard retrofit for a household that runs the heater all winter",
        ourTake:
          "The Kaden with the efficiency where the gas bill notices it. Same internal cupboard footprint as the 3-star so the retrofit stays clean, and enough of a step that a family heating every day through a Melbourne winter feels it.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
          { label: "Heat exchanger warranty", value: "10 years" },
        ],
        related: ["kaden-internal-3", "kaden-external-starpro-45", "brivis-internal-starpro-45"],
      },
      {
        slug: "kaden-external-3",
        name: "Kaden Gas Ducted · 3-Star External",
        model: "KGH-3-EXT Compact Universal · external cabinet",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 26 · 30 kW output · external weatherproof cabinet",
        starRating: "3-star",
        veuEligible: false,
        photo: "/kaden_external_ducted_heater_3 star.jpg",
        photoAlt: "Kaden 3-star external gas ducted heater cabinet",
        bestFor: "External-cabinet retrofit for homes with the ducted heater outside on a pad",
        ourTake:
          "The 3-star external is the outdoor-cabinet sibling of the internal 3-star, same core burner and heat exchanger, weatherproof cabinet. Common on older weatherboard homes where the ducted heater sits on an external slab.",
        specs: [
          { label: "Star rating", value: "3-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
          { label: "Heat exchanger warranty", value: "10 years" },
        ],
        related: ["kaden-external-starpro-45", "kaden-internal-3", "brivis-external-buffalo"],
      },
      {
        slug: "kaden-external-starpro-45",
        name: "Kaden Starpro · 4 & 5-Star External",
        model: "Starpro 4★ / 5★ External",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 26 · 30 kW output · 4-star or 5-star · external cabinet",
        starRating: "4-star / 5-star",
        veuEligible: false,
        photo: "/kaden_external_ducted_heater_4 and 5 star.jpg",
        photoAlt: "Kaden Starpro 4/5-star external gas ducted heater cabinet",
        bestFor: "External-cabinet retrofit where the heater runs most of the winter",
        ourTake:
          "The 4/5-star in a weatherproof cabinet, for the house that has always had its heater outside. The universal footprint drops onto an existing Brivis or Braemar pad without new base work, so the slab and the gas line both stay where they are.",
        specs: [
          { label: "Star rating options", value: "4-star or 5-star" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "7-year Kaden manufacturer + 6-year workmanship" },
          { label: "Heat exchanger warranty", value: "10 years" },
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
    layout: "blocks",
    story: {
      heading: "Australian-designed, {for Australian ducts}.",
      body: "Zonemate is designed and made for the local ducted market, to the wiring standards Australian installers work to, and it fits the ducted systems we install.",
      marks: [
        { v: "Up to 24", k: "Zones on one control" },
        { v: "0–100%", k: "Airflow in each zone" },
        { v: "Within the hour", k: "Zonemate's Melbourne office on the phone" },
      ],
      stops: [
        { place: "Australia", role: "Designed", d: "Designed and made for the Australian ducted market." },
        { place: "Melbourne", role: "Backed", d: "The Melbourne office picks up within the hour, and parts are held locally." },
        { place: "Pakenham, VIC", role: "Fitted", d: "Wired in by our own crew as part of the ducted install." },
      ],
    },
    quality: {
      tab: "Room by room",
      heading: "Room by room, {not all or nothing}.",
      intro: "Cheap zoning is a damper that's open or shut. This is what Zonemate does instead.",
      image: { src: "/Milieu Zonemate tablet.jpg", alt: "Zonemate Milieu tablet on a living room wall", cover: true },
      points: [
        { t: "Dampers that ease back", d: "Variable-speed dampers ramp airflow anywhere from 0 to 100%, so a room near temperature eases off instead of slamming shut." },
        { t: "Twelve zones on one board", d: "Room to add a study or a converted bedroom later. A second board takes it to 24." },
        { t: "One tablet, two systems", d: "A double-storey with two ducted units runs both from the one Milieu tablet." },
        { t: "The same screen on your phone", d: "The Milieu app on iOS and Android is the tablet again, so you learn it once." },
      ],
    },
    reasons: [
      { v: "30–40%", k: "off the running bill", d: "What shutting the rooms nobody's in does to an always-on ducted system.", img: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg", alt: "A Zonemate touch controller in a living room", cover: true },
      { v: "0–100%", k: "airflow per zone", d: "Not just open or shut, so it's quieter and more even.", img: "/ZoneMate-Smart-Sensor-Residential_8-1.jpg", alt: "A Zonemate smart sensor on a wall", cover: true },
      { v: "12 zones", k: "on one board", d: "Covers nearly every home, with room to add a zone later.", img: "/Milieu Zonemate tablet.jpg", alt: "Zonemate Milieu tablet", cover: true },
      { v: "1 tablet", k: "for two systems", d: "Two ducted units, one screen on the wall and one app.", img: "/Zonemate milieu app main screen.jpg", alt: "The Milieu app on a phone", cover: true },
    ],
    timeline: [
      { y: 0, t: "Install day", d: "All three warranties start." },
      { y: 3, t: "Any year", d: "Add a zone on the same board." },
      { y: 5, t: "Year 5", d: "Controller and damper warranties end." },
      { y: 6, t: "Year 6", d: "Our workmanship warranty ends." },
    ],
    picker: {
      steps: [
        { id: "phone", q: "Do you want to run it from your phone?", opts: [{ v: "yes", l: "Yes, from my phone too" }, { v: "no", l: "A controller on the wall is fine" }] },
      ],
      results: [
        { when: { phone: "yes" }, model: "Touch + Wi-Fi", why: "A touchscreen on the wall and the same controls in the app, so you can turn zones on before you get home." },
        { when: { phone: "no" }, model: "Zone controller", why: "Turn rooms on and off from the wall. It fits most ducted systems." },
      ],
    },
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

    // --- brand-first fields (Zonemate) ---
    whyLead: {
      claim: "Why we fit {Zonemate}.",
      sub: "Shutting the rooms nobody's in takes 30–40% off what a ducted system costs to run. It's the biggest number on the whole job.",
    },
    verdict:
      "Zoning is the single biggest lever there is on what a ducted system costs to run, and it's the one part of a ducted job we won't quote as an optional line item, every system we put in has a Zonemate Milieu in it as standard. Shutting off the rooms nobody's in takes 30–40% off the bill, which on a ducted system is real money every quarter, not a rounding error. It's the only zoning brand we fit, because the wiring standard is built for how Australian installers actually work and it plays with every ducted unit we install, no bridge or third-party box needed.",
    notRightWhen:
      "If you're only ever conditioning one open-plan living zone and nothing else, there's nothing to shut off, zoning can't claw back money the system was never spending. Same story with a system small enough that it's really only doing one part of the house already. On a genuine multi-room ducted job the 30–40% pays the controller back quickly; on a single-zone home it just adds a tablet you don't need, and we'll tell you that rather than fit it.",
    heroSub:
      "The zoning control that turns a single-motor ducted system into one you run room by room. Australian-designed, and wired in as part of the ducted install, not sold as an add-on.",
    fitsWhere:
      "Every ducted install we quote, from a 4-zone single-storey through to the Clyde North and Officer double-storeys running two ducted systems off the one tablet.",
    heroFacts: [
      { v: "30–40%", k: "Off an always-on ducted's running bill" },
      { v: "Up to 24", k: "Zones on one control, second board added" },
      { v: "0–100%", k: "Airflow per zone, not just on/off" },
      { v: "5 yr · 5 yr · 6 yr", k: "Controller, dampers and workmanship warranties, all from install day" },
    ],
    benefitsHeading: "Why it goes in every ducted job we quote.",
    benefitTiles: [
      {
        t: "The biggest number on the job",
        line: "Shutting unused rooms cuts running cost 30–40%",
        detail:
          "An unzoned ducted system conditions the whole house every time it runs, including four bedrooms nobody's in at seven at night. Zoning is the single biggest lever on what that costs, and 30–40% off the quarterly bill is why we fit it by default rather than dangling it as an extra to make a headline price look smaller.",
        icon: "flame",
      },
      {
        t: "Room by room, not all or nothing",
        line: "Variable-speed dampers modulate airflow 0–100% per zone",
        detail:
          "Cheap zoning is just a damper that's either open or shut. Zonemate's variable-speed dampers ramp airflow anywhere from 0 to 100%, so a zone that's nearly at temperature eases back instead of slamming closed: proper comfort, and none of the pressure spikes that make a badly zoned system noisy.",
        icon: "snowflake",
      },
      {
        t: "Twelve zones on one board",
        line: "Room to add a zone in year three without a new controller",
        detail:
          "One control board handles up to 12 zones, which covers virtually every residential ducted install with headroom to spare. Add a study or a converted bedroom later and the wiring's already there. A second board doubles it to 24 for a large home or a commercial fitout.",
        icon: "wrench",
      },
      {
        t: "One tablet for the whole house",
        line: "Runs multiple ducted units off a single Milieu control",
        detail:
          "A two-system double-storey normally means a separate controller per unit. The Milieu tablet drives more than one ducted unit from the same wall interface, and the Milieu app on iOS and Android is the same screen again: so the household learns it once, not twice.",
        icon: "phone",
      },
      {
        t: "Melbourne-made, Melbourne-backed",
        line: "Parts on a local shelf, support on the phone within the hour",
        detail:
          "Zonemate is Australian-designed and built for the local ducted market, and its Melbourne office picks up inside the hour when we've got a wiring question on your job. Controllers and dampers are held locally by our supplier network, so a warranty replacement lands same-day rather than the following week.",
        icon: "truck",
      },
    ],
    servicing: {
      tab: "After the sale",
      heading: "The part that only matters {after the sale}.",
      photo: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",
      photoAlt: "A Zonemate touch controller mounted in a living area",
      body:
        "A zoning controller earns its keep every quarter for the whole life of the ducted system, so the questions that decide whether it was a good call aren't about install day. They're whether somebody picks up when there's a fault, whether the part still exists, and whether you can grow the system without replacing the box: and all three come down to who backs it, not the brochure.",
      facts: [
        "Zonemate's Melbourne office is on the phone within the hour when we hit a wiring question on your job",
        "Controllers and dampers are held locally by our supplier network, so a warranty replacement lands same-day rather than the following week",
        "5-year controller + 5-year dampers + 6-year on our workmanship, better than six years covered end to end",
        "Twelve zones of headroom on one board means a study or spare-room zone can be added later without ripping out the controller",
      ],
    },
    steps: [
      { title: "Zone plan off the room-by-room load", detail: "Before any hardware, we take the ducted heat load room by room and decide the zones: which rooms share one, which stand alone, and which barely get used and only ever need to be open or shut. The plan is what makes the 30–40% real, so it's done properly, not to a template." },
      { title: "Damper type per branch", detail: "Variable-speed dampers go on the living areas that need to modulate 0–100% for comfort; constant-speed on the spare bedrooms that only ever need to be open or closed. Right damper on the right branch keeps the cost sensible without giving up control where it matters." },
      { title: "Sensor placement", detail: "Where a zone needs to hit a real room temperature rather than just return-air, we place an optional Zonemate Smart Sensor in it. That's how a bedroom targets 21° in the bedroom, not 21° at the unit in the roof." },
      { title: "Control board and Milieu tablet", detail: "Up to 12 zones land on one board, a second board goes in when a large home or fitout needs 24, and where there's more than one ducted unit we wire them back to a single Milieu tablet instead of a controller each." },
      { title: "Commission every zone", detail: "We run the system up and drive each zone through its range: 0 to 100% on the variable dampers, full open and shut on the constant-speed ones, and confirm every zone opens, closes and holds airflow to the plan before you ever touch it." },
      { title: "Walk you through the tablet and app", detail: "We set up the schedules with you on the wall tablet, load the Milieu app on your phone: same screen, no learning curve, and hand it over once you're happy running it, not before." },
    ],
    faqs: [
      {
        q: "Do I actually need zoning, or is it an upsell?",
        a: "You need it. An unzoned ducted system conditions the whole house every time it runs, bedrooms included, and zoning is the single biggest lever on what that costs, 30–40% off the running bill. That's why every ducted job we quote has zoning in it as standard rather than as an extra we tack on to lift the price.",
      },
      {
        q: "How many zones do I need?",
        a: "It's sized to the house, not sold by the zone. Around 6 zones suits most family homes, 12 covers a double-storey and all fit on one control board. Only a large home or a commercial fitout needs the second board that takes it to 24. We work the number off your room-by-room load, not off a package.",
      },
      {
        q: "What's the difference between variable-speed and constant-speed dampers?",
        a: "A constant-speed damper is either open or shut, fine for a spare bedroom that only ever needs to be on or off. A variable-speed damper modulates airflow anywhere from 0 to 100%, so a living zone eases back as it nears temperature instead of slamming closed. We put variable-speed where comfort matters and constant-speed where it doesn't, so you're not paying for modulation on a room that never needs it.",
      },
      {
        q: "Will it work with my ducted brand?",
        a: "Yes. The Milieu works with the ducted brands we install, Kaden ducted and the rest, with no bridge or third-party interface bolted on. On a Mitsubishi Electric ducted system we'd normally fit Mitsubishi's own zone controller instead, so the whole system sits under one manufacturer's warranty.",
      },
      {
        q: "Can one tablet run two ducted systems?",
        a: "Yes, and it's the reason we specify it on the bigger jobs. The Milieu tablet runs more than one ducted indoor unit off the same wall interface, so a two-system double-storey in Clyde North or Officer gets one screen for the whole house instead of a separate controller for each unit, and the phone app is the same UI again.",
      },
      {
        q: "What warranty do I get on the zoning?",
        a: "5-year controller + 5-year dampers + 6-year on our workmanship. The parts warranty covers the Zonemate hardware; our six years covers the install: the wiring, the damper fit, the sensor placement, the things that are our fault if they go wrong. Better than six years of it is covered end to end.",
      },
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
  // Retired products are excluded, so they aren't statically generated —
  // their old URL is caught by a 301 in next.config instead.
  return brands.flatMap((b) =>
    b.products.filter((p) => !p.retired).map((p) => ({ brand: b.slug, product: p.slug })),
  );
}

/** A brand's products for display — everything except the retired ones. */
export function visibleProducts(b: Brand): Product[] {
  return b.products.filter((p) => !p.retired);
}

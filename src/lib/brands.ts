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
  /** Per-brand install-gallery photos (6 tiles rendered on the brand hub).
   *  When absent, the brand page falls back to a generic curated set —
   *  which is fine for a first pass but makes every brand page look the
   *  same. Populate per-brand to make each hub feel distinct. Use
   *  { src: "", alt: "" } to leave a blank tile Jake can drop into. */
  gallery?: { src: string; alt: string }[];
  products: Product[];
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
  "split-system":       { src: "/AP_70-80HP_front-1920x1440-1.png",                 fallback: "/kaden-indoor.webp",              alt: "Mitsubishi MSZ-AP wall split system" },
  "multi-head":         { src: "/mac_slide0.jpg",                                    fallback: "/reclaim-split-back.webp",        alt: "Multi-head split system with outdoor condenser" },
  "ducted":             { src: "/kdi-v2-image_01.jpg",                               fallback: "/duct-work.webp",                 alt: "Ducted air conditioning indoor unit" },
  "cassette":           { src: "/ducted-condenser.webp",                             fallback: "/ducted-condenser.webp",          alt: "Cassette air conditioning unit" },
  "floor-console":      { src: "/AP_70-80HP_front-1920x1440-1.png",                 fallback: "/kaden-indoor.webp",              alt: "Floor console air conditioner" },
  "heat-pump":          { src: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", fallback: "/reclaim-spit-close-up.webp",  alt: "Reclaim heat pump hot water system" },
  "gas-continuous-flow":{ src: "/G-Series_Front_On_View_1200x900.jpg",              fallback: "/gas-hot-water-changeover.webp",  alt: "Thermann G-series continuous flow gas hot water unit" },
  "gas-storage":        { src: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg", fallback: "/gas-hot-water-changeover.webp", alt: "Thermann gas storage hot water tank" },
  "electric-storage":   { src: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg", fallback: "/gas-hot-water-changeover.webp", alt: "Thermann electric storage hot water tank" },
  "solar-hot-water":    { src: "/reclaim-mitsubishi.webp",                          fallback: "/reclaim-mitsubishi.webp",        alt: "Solar hot water" },
  "controller":         { src: "/Individual-Temps-Family_Mobile.jpg",               fallback: "/gas-line.webp",                  alt: "Zonemate Wi-Fi controller app on phone" },
  "zoning":             { src: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",         fallback: "/duct-work.webp",                 alt: "Zonemate touch controller for ducted zoning" },
  "damper":             { src: "/ZoneMate-Smart-Sensor-Residential_8-1.jpg",        fallback: "/duct-work.webp",                 alt: "Zonemate smart sensor" },
  "accessory":          { src: "/gas-line.webp",                                    fallback: "/gas-line.webp",                  alt: "Accessory kit" },
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

export const brands: Brand[] = [

  // ================== BRIVIS ==================
  {
    slug: "brivis",
    name: "Brivis",
    tagline: "Melbourne gas ducted heating · the local incumbent.",
    origin: "Melbourne, Australia (Rinnai Group)",
    intro:
      "Brivis is the gas ducted heater we replace, service and re-install more than any other in the south-east. Melbourne winters and Brivis are historically intertwined · most homes in Pakenham, Berwick, Officer and Cranbourne built between 1990 and 2015 shipped with a Brivis in the roof or under the floor.",
    ourTake:
      "We install Brivis when a customer wants a like-for-like gas ducted replacement · same footprint, same ducts, same controller wiring. If the existing unit is past 12-15 years old, we'll also quote a reverse-cycle switch alongside so the customer can compare running-cost economics before committing.",
    accreditation: "Brivis-Rinnai approved installer",
    productLabel: "3 models · Wombat + Buffalo internal ducted, evaporative",
    photo: "/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg",
    photoFallback: "/gas-ducted-install.webp",
    photoAlt: "Brivis gas ducted heater installed in a Melbourne home",
    accent: "#0058A5",
    established: "Founded 1971 · Melbourne · part of Rinnai Australia since 2004",
    warranty: "5-year manufacturer warranty on heat exchanger + 6-year on our workmanship",
    keyFeatures: [
      "The gas ducted brand more Melbourne homes were built with than any other",
      "Same-footprint retrofit into most existing Brivis / Braemar cavities",
      "Full internal range: Wombat + Buffalo, each in 3-star / 4-star / 5-star / 6-star at 15 / 20 / 26 / 30 kW",
      "Evaporative cooling range covers 15 / 20 / 26 / 30 kW for whole-home summer cooling at ~25% of refrigerated running cost",
      "Rinnai-backed parts pipeline · even 15-year-old units are still serviceable",
    ],
    commonInMelbourne:
      "The dominant gas ducted heater in Pakenham, Berwick, Cranbourne, Officer and Endeavour Hills homes built 1990-2015. If a customer is retrofitting a working ducted system, staying on Brivis is the cheapest path because the existing ducts, controller wiring and cupboard footprint all reuse.",
    support:
      "Rinnai's Melbourne warehouse holds Brivis parts for every unit still in the field, including discontinued models. We keep a stock of controllers, ignition units and burners on the truck · most Brivis service jobs are one-visit fixes.",
    resources: [
      { label: "Brivis · manufacturer website", href: "https://www.brivis.com.au/" },
      { label: "Rinnai Australia (parent)", href: "https://www.rinnai.com.au/" },
    ],
    gallery: [
      { src: "/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg", alt: "Brivis Wombat internal gas ducted heater" },
      { src: "/gas-ducted-install.webp", alt: "Brivis ducted heater in-cupboard install" },
      { src: "/duct-work.webp", alt: "Ductwork run for a Brivis ducted retrofit" },
      { src: "/classic_evap_product_image.jpg", alt: "Brivis roof-mounted evaporative cooler" },
      { src: "/evap-cooler-service.webp", alt: "Evaporative cooler service — roof-side access" },
      { src: "", alt: "Brivis install photo — add later" },
    ],
    products: [
      {
        slug: "brivis-gas-internal",
        name: "Brivis Internal Gas Ducted Heater",
        model: "Wombat · Buffalo · Starpro — 3★ / 4★ / 5★ / 6★",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 3-star through 6-star efficiency options",
        veuEligible: false,
        photo: "/Brivis Wombat Indoor 3 star.jpg",
        photoAlt: "Brivis internal gas ducted heater — Wombat 3-star through Starpro 6-star",
        bestFor: "In-cupboard retrofit into an existing Brivis or Braemar cavity",
        ourTake:
          "Brivis's internal gas ducted range covers everything from the Wombat 3-star (compact entry) through the Buffalo (higher-spec, quieter fan) up to the Starpro 6-star (premium modulating burner). All variants share the same in-cupboard footprint so retrofit into an existing Brivis or Braemar cavity is quick and the existing ducts, controller wiring and return-air grille all reuse. We spec the star rating to how long you plan to stay in the home and the output size (15 / 20 / 25 / 30 kW) to your actual heat load.",
        specs: [
          { label: "Model tiers", value: "Wombat 3★ · Buffalo · Starpro 4★ / 5★ / 6★" },
          { label: "Star rating range", value: "3-star (entry) through 6-star (premium modulating)" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard (under-floor or roof-space cavity)" },
          { label: "Configuration", value: "Down-flow / up-flow / horizontal" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Controller compatibility", value: "Brivis Networker + Touch wall controller" },
          { label: "Cooling add-on", value: "Add-on cooling coil (ADD ON) or paired evap" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        features: [
          "One internal cupboard footprint across every tier — Wombat, Buffalo or Starpro all fit the same cavity",
          "Four star-rating tiers (3 / 4 / 5 / 6) — spec efficiency to the household's payback horizon",
          "Four output sizes (15 / 20 / 25 / 30 kW) — right-sized to heat load, not oversized",
          "Direct-spark ignition across the range — no pilot light burning gas year-round",
          "Networker + Touch wall controller unified across the range — same interface whichever tier you pick",
          "Aluminised steel heat exchanger with 7-year manufacturer warranty on every model",
          "Cooling-ready — can be paired with an add-on cooling coil or a Brivis evap",
        ],
        whyWeInstall: [
          "The most-common ducted heater in Melbourne's south-east — we replace one nearly every week",
          "Retrofit into an existing Brivis / Braemar cavity is usually a same-day job because ducts, wiring and grille all stay",
          "Rinnai's Melbourne parts warehouse means one-visit service on virtually every Brivis service job",
          "Consolidated range (Wombat → Buffalo → Starpro) lets us match the customer's budget to their efficiency ambition on the day",
          "Backed by our 6-year workmanship warranty on top of Brivis's 7-year heat exchanger cover",
        ],
        related: ["brivis-gas-external", "brivis-evap-contour"],
      },
      {
        slug: "brivis-gas-external",
        name: "Brivis External Gas Ducted Heater",
        model: "Buffalo External · Starpro External — 4★ / 5★ / 6★",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW output · 4-star through 6-star efficiency options · weatherproof outdoor cabinet",
        veuEligible: false,
        photo: "/Brivis Buffalo Outdorr.jpg",
        photoAlt: "Brivis external gas ducted heater — Buffalo + Starpro outdoor cabinets",
        bestFor: "Retrofit into homes where the ducted heater lives on an external pad rather than inside a cupboard",
        ourTake:
          "Brivis's external range packages the same Buffalo and Starpro cores in a weatherproof outdoor cabinet · what we install when the home was built with the ducted heater outside on a pad (common in older Berwick, Endeavour Hills and Cranbourne weatherboards). Same burner tiers as the internal (4-star Buffalo through 6-star Starpro), same 4 output sizes, same 7-year heat exchanger warranty — just packaged for outdoor life.",
        specs: [
          { label: "Model tiers", value: "Buffalo External · Starpro External 4★ / 5★ / 6★" },
          { label: "Star rating range", value: "4-star through 6-star (premium modulating)" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on ground pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Controller compatibility", value: "Brivis Networker + Touch wall controller" },
          { label: "Cooling add-on", value: "Add-on cooling coil or paired evap" },
          { label: "Heat exchanger warranty", value: "7-year (aluminised steel)" },
          { label: "Unit warranty", value: "3-year full unit + 6-year workmanship" },
        ],
        features: [
          "Weatherproof outdoor cabinet for homes without an internal heater cupboard",
          "Same burner tiers as the internal range (Buffalo through Starpro 6-star)",
          "Four output sizes (15 / 20 / 25 / 30 kW) — matched to the home's heat load",
          "Direct-spark ignition — no pilot light burning gas year-round",
          "Networker + Touch wall controller compatible — same interface as the internal range",
          "7-year aluminised-steel heat exchanger warranty across every tier",
        ],
        whyWeInstall: [
          "The right pick for older weatherboard homes built with the heater on an external pad — no need to build an internal cupboard",
          "External-cabinet retrofit reuses the existing pad + gas line — install stays clean and same-day",
          "Same Rinnai-backed parts pipeline as the internal range for future service",
          "Backed by our 6-year workmanship warranty on top of Brivis's 7-year heat exchanger cover",
        ],
        related: ["brivis-gas-internal", "brivis-evap-contour"],
      },
      {
        slug: "brivis-evap-contour",
        name: "Brivis Contour Evaporative Cooler (Classic profile)",
        model: "Contour · Classic roof profile",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling · Classic silhouette",
        capacity: "15 · 20 · 26 · 30 kW · Classic (taller) roof silhouette",
        veuEligible: false,
        photo: "/classic_evap_product_image.jpg",
        photoAlt: "Brivis Contour Classic evaporative cooler on the roof",
        bestFor: "Standard roof pitches where the Classic silhouette isn't a street-view concern",
        ourTake:
          "The Contour is the Classic (taller) profile Brivis evap · what we install as the default when the roof pitch handles it and there's no reason to pay the Advance premium. Cools a whole home for a fraction of refrigerated ducted running cost.",
        specs: [
          { label: "Silhouette", value: "Classic (taller) roof profile" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "Roof-mounted" },
          { label: "Refrigerant", value: "None — evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Classic (taller) silhouette — Brivis's default evap profile",
          "Four output sizes (15 / 20 / 26 / 30 kW) — matched to home cooling load",
          "Roof-mounted install pushes cooled air through ceiling vents",
          "Running cost ~25% of refrigerated ducted — genuinely cheap to run in dry heatwaves",
          "No refrigerant — no ARC ticket needed for service, straightforward annual clean",
        ],
        whyWeInstall: [
          "Default evap pick for the dry-summer suburbs (Cranbourne, Clyde, Officer)",
          "Rinnai-backed parts pipeline — Brivis evap parts are same-day from Melbourne",
          "Backed by our 6-year workmanship warranty + Brivis's 5-year cover",
        ],
        related: ["brivis-evap-advance", "brivis-gas-internal", "kaden-evaporative-classic"],
      },
      {
        slug: "brivis-evap-advance",
        name: "Brivis Advance Evaporative Cooler (Low-Profile)",
        model: "Advance · Low-Profile roof silhouette",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling · Low-Profile",
        capacity: "15 · 20 · 26 · 30 kW · Low-Profile (flatter) roof silhouette",
        veuEligible: false,
        photo: "/evap-cooler-service.webp",
        photoAlt: "Brivis Advance low-profile evaporative cooler on the roof",
        bestFor: "Street-view sensitive homes and low-pitch roofs where the Classic silhouette is too tall",
        ourTake:
          "The Advance is the Low-Profile version · same core cooling capability as the Contour, but a flatter roof silhouette that reads much cleaner from the street. What we spec on character-street cases (Berwick heritage, Officer new-build estates with covenants) and low-pitch roofs where the Contour would sit awkwardly.",
        specs: [
          { label: "Silhouette", value: "Low-Profile (flatter) roof silhouette" },
          { label: "Output range", value: "15 · 20 · 26 · 30 kW" },
          { label: "Install position", value: "Roof-mounted (suits low-pitch roofs)" },
          { label: "Refrigerant", value: "None — evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Low-Profile silhouette — clean street-view roofline, ~30% lower than the Contour",
          "Same four output sizes as the Contour (15 / 20 / 26 / 30 kW)",
          "Same cooling capability as the Classic — just a flatter cabinet",
          "Suits low-pitch roofs where the Contour would sit awkwardly",
          "Standard Brivis evap service pipeline — no new parts to learn",
        ],
        whyWeInstall: [
          "The right pick for heritage streets and covenanted estates that don't want a tall evap silhouette",
          "Character-street cases in Berwick and older Pakenham weatherboards benefit from the cleaner roofline",
          "Same parts + service pipeline as the Contour — no extra warranty complexity",
        ],
        related: ["brivis-evap-contour", "brivis-gas-internal", "kaden-evaporative-low"],
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
      "Mitsubishi Electric is the brand we quote first on any air conditioning job unless the customer's budget rules it out. The reliability record across our install base is genuinely without peer · a decade-old MSZ-AP still runs to spec, and the parts pipeline for older units is still open.",
    ourTake:
      "We're pursuing Mitsubishi Electric Diamond Dealer accreditation. When it lands we can offer the extended 7-year manufacturer warranty on top of our own 6-year workmanship warranty. That's a 13-year backstop on a unit that's already the most reliable in the category.",
    accreditation: "Diamond Dealer (in progress)",
    productLabel: "22 models · splits, multi-head, ducted, cassette, controllers",
    photo: "/AP_70-80HP_front-1920x1440-1.png",
    photoFallback: "/reclaim-mitsubishi.webp",
    photoAlt: "Mitsubishi Electric MSZ-AP wall split system",
    accent: "#DA1A32",
    established: "Australian sales since 1978 · manufacturing in Thailand",
    warranty: "5-year manufacturer parts + labour + 6-year on our workmanship. Diamond Dealer accredited installers unlock a 7-year extended warranty.",
    keyFeatures: [
      "The lowest failure rate in our install base · a decade-old MSZ-AP still runs to spec",
      "Parts pipeline is genuinely never a worry, even for units we installed 10+ years ago",
      "MSZ-AP is our default; MSZ-FH Hyper Heating for cold-climate suburbs; PEAD-M ducted for family homes",
      "Diamond Dealer accreditation (in progress) unlocks 7-year extended warranty",
      "R32 refrigerant across the range · modern, low-GWP",
      "MELCloud Wi-Fi module adds phone control to any indoor unit",
    ],
    commonInMelbourne:
      "The default premium spec across every Melbourne suburb we install in. Berwick, Officer, Clyde North and Cranbourne new-builds spec the PEAD-M ducted almost by default; Berwick and Pakenham weatherboards typically get the MSZ-AP wall splits; hills suburbs (Emerald, Gembrook, Cockatoo) get the MSZ-FH Hyper Heating for cold-morning performance.",
    support:
      "Mitsubishi's Melbourne parts warehouse is same-day for common indoor/outdoor parts. Manufacturer tech support is genuinely responsive. We rarely wait on a part.",
    resources: [
      { label: "Mitsubishi Electric · manufacturer website", href: "https://www.mitsubishielectric.com.au/" },
    ],
    gallery: [
      { src: "/AP_70-80HP_front-1920x1440-1.png", alt: "Mitsubishi Electric MSZ-AP wall split indoor unit" },
      { src: "/PUZ_M140VKA_2-1920x1440-1.png", alt: "Mitsubishi Electric twin-fan outdoor condenser" },
      { src: "/reclaim-mitsubishi.webp", alt: "Mitsubishi Electric split system installed in a Melbourne home" },
      { src: "/mac_slide0.jpg", alt: "Mitsubishi multi-head installation diagram" },
      { src: "/kdi-v2-image_01.jpg", alt: "Mitsubishi PEAD-M ducted indoor unit" },
      { src: "", alt: "Mitsubishi install photo — add later" },
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
          "The 2.5 kW MSZ-AP is our workhorse bedroom unit · quiet at 21 dBA on low fan, sips power on standby, and the parts pipeline is genuinely never a worry. If you want a single unit in a kid's bedroom, this is what we install.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.2 kW" },
          { label: "Room size", value: "up to 25 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Indoor sound (min)", value: "21 dBA" },
          { label: "Star rating", value: "4.5 cool / 4.5 heat (zoned)" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        related: ["msz-ap35", "msz-ap50", "mxz-multi"],
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
        related: ["msz-ap25", "msz-ap50", "mxz-multi"],
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
          "The step between the 5.0 and the 7.1 · for the awkward room size that's between a normal living and a proper great-room. Cathedral ceilings or a big north-facing glass wall usually push us up to the 6.0.",
        specs: [
          { label: "Cooling capacity", value: "6.0 kW" },
          { label: "Heating capacity", value: "6.8 kW" },
          { label: "Room size", value: "up to 60 m²" },
        ],
        related: ["msz-ap50", "msz-ap71", "mxz-multi"],
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
          "The 7.1 is the biggest wall-mounted unit we'd typically spec · beyond this, ducted or multi-head makes more sense. For a big north-facing living zone in Berwick or Officer, this is usually the answer.",
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
          "The biggest wall split Mitsubishi makes. Beyond this size a ducted system usually delivers better airflow distribution · but for a large single space where you don't want ducting, this is the pick.",
        specs: [
          { label: "Cooling capacity", value: "8.0 kW" },
          { label: "Heating capacity", value: "9.0 kW" },
          { label: "Room size", value: "up to 85 m²" },
        ],
        related: ["msz-ap71", "pead-m"],
      },
      {
        slug: "mxz-multi",
        name: "MXZ Multi-Head Range · 2-Port through 6-Port",
        model: "MXZ-2F42VF · 3F54VF · 4F80VF · 5F100VF · 6C120VA",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/Mitsubishi Electric Multi Rooms Air Conditioner  6-Port Multi-Split condenser.png",
        photoAlt: "Mitsubishi Electric MXZ multi-head range — 2 to 6 ports",
        capacity: "4.2 kW / 5.4 kW / 8.0 kW / 10.0 kW / 12.0 kW — one outdoor, 2 to 6 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Every multi-head install — from a two-bedroom apartment (2F) through to a 5-6 bed family home wanting per-room control (6C 6-port)",
        ourTake:
          "One outdoor condenser, 2 to 6 indoor heads · Mitsubishi's MXZ range covers every multi-head install we quote. The MXZ-2F is the smallest (apartments, townhouses with one balcony spot). The MXZ-3F is our most-installed model (3-bedroom homes). The MXZ-4F handles a 4-bed family home wanting per-room zone control. The MXZ-5F steps up to 5 heads for larger single-storey homes. The MXZ-6C is the biggest — 12 kW / 6 ports for 5-6 bed family homes that want per-room control without going ducted. All share the same MSZ-AP indoor unit range and the same R32 + inverter platform, so parts + service story is unified across the range.",
        specs: [
          { label: "MXZ-2F", value: "4.2 kW combined · 2 heads (apartments, townhouses)" },
          { label: "MXZ-3F", value: "5.4 kW combined · 3 heads (3-bedroom homes)" },
          { label: "MXZ-4F", value: "8.0 kW combined · 4 heads (family homes with per-room control)" },
          { label: "MXZ-5F", value: "10.0 kW combined · 5 heads (larger single-storey)" },
          { label: "MXZ-6C", value: "12.0 kW combined · 6 heads (5-6 bed premium alternative to ducted)" },
          { label: "Refrigerant", value: "R32 (low GWP) across the entire range" },
          { label: "Power supply", value: "1-phase 230 V across the range — no 3-phase upgrade required" },
          { label: "Indoor unit compatibility", value: "MSZ-AP wall splits + MFZ-KW floor console + SLZ cassette (mixed loops supported)" },
          { label: "Warranty", value: "5-year Mitsubishi manufacturer + 6-year workmanship" },
        ],
        features: [
          "One outdoor condenser feeds 2 to 6 indoor heads — cleaner externally than separate splits",
          "R32 low-GWP refrigerant + inverter compressor across the entire range",
          "Mix-and-match indoor units (MSZ-AP + MFZ-KW + cassette) on the same refrigerant loop",
          "1-phase power supply on every model — no 3-phase upgrade at the meter box",
          "Per-room controllers give proper zone control, unlike shared ducted zones",
          "One condenser to service instead of five separate outdoor units",
        ],
        whyWeInstall: [
          "The MXZ-3F is our most-installed multi-head — 3 bedrooms, one outdoor, clean external look",
          "MXZ-6C 12 kW / 6-port is genuinely rare in the market — most brands cap at 5 heads",
          "Same MSZ-AP indoor units as our single-split installs, so the interior finish stays consistent across the home",
          "Mitsubishi's Melbourne parts warehouse means same-day on MXZ common parts",
          "Backed by 5-year Mitsubishi manufacturer + our 6-year workmanship",
        ],
        related: ["msz-ap50", "pead-m", "kaden-multi"],
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
        photo: "/Mitsubishi Electric Ducted Split System PEA-M-HAA Series.png",
        photoAlt: "Mitsubishi Electric PEA-M ducted indoor unit",
        bestFor: "3-4 bed single-storey ducted retrofit or new-build, 4-6 zones",
        ourTake:
          "The PEA-M is Mitsubishi's default ducted system for a typical Melbourne family home. Three capacity steps (10 / 12.5 / 14 kW) cover most single-storey retrofits, and the HAA-VKA Hyper Heating variant holds capacity down to −15 °C — worth specifying for hills postcodes like Emerald and Gembrook. Pairs with the PUZ outdoor and any Zonemate zone controller.",
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
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship (7-year Diamond Dealer extension pending)" },
        ],
        features: [
          "Three capacity steps (10 / 12.5 / 14 kW) — right-size to the actual heat load, not oversized as a habit",
          "Adjustable external static pressure 50–150 Pa suits typical 3-4 zone Melbourne retrofits",
          "Hyper Heating outdoor option (VKA) holds full heating capacity down to −15 °C for cold-morning hills postcodes",
          "R32 refrigerant across all three sizes — low-GWP, no HFC phase-down risk",
          "MELCloud Wi-Fi module adds phone control to the wired PAR-40 controller",
          "Zonemate zoning compatible out of the box — no interface adapter required",
          "Inverter compressor + DC fan motor for quiet, efficient part-load running",
          "Made in Thailand at Mitsubishi's dedicated air-conditioning plant",
        ],
        whyWeInstall: [
          "The most reliable ducted platform in our install base — decade-old PEA-M / PEAD-M units still run to spec",
          "Mitsubishi's Melbourne parts warehouse is same-day on virtually every PEA-M part we've ever needed",
          "Diamond Dealer accreditation in progress unlocks the 7-year extended manufacturer warranty on top of our 6-year workmanship",
          "Hyper Heating (VKA) variant is a genuine differentiator for hills homes vs the mid-market ducted competition",
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
        photo: "/Mitsubishi Electric Ducted Split System PEA-M-HAA Series.png",
        photoAlt: "Mitsubishi Electric PEA-M large-capacity ducted indoor unit",
        bestFor: "Larger single-storey, double-storey or long duct-run family homes needing 16-20 kW output",
        ourTake:
          "The PEA-M160/180/200 is the large-capacity extension of the PEA-M range — same indoor platform as the M100/125/140, sized up for double-storey homes, 6+ zones, or long ceiling-cavity duct runs. The 20 kW step is offered in both single-phase and three-phase to suit whatever supply the property has. Pairs with the PUZ-M outdoor and the HAA-VKA Hyper Heating variant is available up to M140 for hills postcodes; larger capacities use the standard PUZ.",
        specs: [
          { label: "Cool / heat capacity", value: "16 kW · 18 kW · 20 kW (three larger model steps)" },
          { label: "Model codes", value: "PEA-M160HAA · PEA-M180HAA · PEA-M200HAA" },
          { label: "Power supply · 16 kW / 18 kW", value: "3-phase 400 V standard" },
          { label: "Power supply · 20 kW", value: "1-phase 230 V OR 3-phase 400 V — spec to suit property supply" },
          { label: "Refrigerant", value: "R32 (low GWP)" },
          { label: "External static pressure", value: "Adjustable 100–200 Pa (higher-static than M100-M140)" },
          { label: "Zoning", value: "Zonemate 6 / 8-zone with damper motors" },
          { label: "Controller", value: "PAR-42MAA wired / MA-remote" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship (7-year Diamond Dealer extension pending)" },
        ],
        features: [
          "Three larger capacity steps (16 / 18 / 20 kW) extend the PEA-M range for double-storey + long-run installs",
          "20 kW available in both 1-phase and 3-phase — spec to match whatever supply is at the meter box",
          "Higher external static pressure (100–200 Pa) delivers rated flow through longer flex-duct runs",
          "Same R32 refrigerant + inverter platform as the M100-M140, so parts + service story is unchanged",
          "Zonemate 8-zone compatible so bigger homes get proper per-room control",
        ],
        whyWeInstall: [
          "The pick for a two-storey Berwick / Officer / Clyde home where a single M140 would short-cycle in shoulder seasons",
          "20 kW 1-phase option means we can quote a large-capacity system into a property without paying for a 3-phase upgrade",
          "Same Mitsubishi parts + support platform as the smaller M-series — no separate stocking to worry about",
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
        photo: "/Mitsubishi Electric Floor Console Air con - MFZ-KW-VGK Series.png",
        photoAlt: "Mitsubishi Electric MFZ-KW-VGK floor console",
        bestFor: "Rooms with no free wall space at head height — under-window retrofits into old radiator locations",
        ourTake:
          "The MFZ-KW sits on the floor like an old radiator · the answer when there's no wall space at head height, when a floor-level warmth pattern suits the room (elderly-owner cottages, sunrooms), or when you're retrofitting into the footprint of an old hydronic radiator without patching walls at head height. Same MSZ-AP-class reliability underneath the floor-standing form factor.",
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
          "Floor-level warm-air pattern — heats a room the way a radiator does, not from the ceiling down",
          "Under-window compatible — clears window frames without needing head-height wall space",
          "R32 refrigerant, DC inverter compressor — modern efficiency in a floor-console form",
          "3 capacity steps (2.5 / 3.5 / 5.0 kW) — right-sized to bedroom, master or small living zone",
          "27 dBA on low fan — safe next to a bedroom wall for overnight running",
        ],
        whyWeInstall: [
          "Only floor console we quote — reliability record is identical to the wall-mount MSZ-AP range",
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
        photo: "/Mitsubishi Electric Ducted Split standard wall controller PAR-41MAA Standard Wired Wall Mounted Controller.png",
        photoAlt: "Mitsubishi PAR-41MAA standard wired wall controller",
        bestFor: "Ducted or floor-console systems where a physical wall controller is preferred over the handheld remote",
        ourTake:
          "The PAR-41MAA is Mitsubishi's current-generation standard wired wall controller — the model we fit as standard on every PEA-M and MFZ-KW install. Physical wall control for anyone who'd rather not reach for a phone or handheld remote. Direct interface into Zonemate zoning so one controller drives both temp and zones.",
        specs: [
          { label: "Model code", value: "PAR-41MAA (current-generation Standard)" },
          { label: "Compatibility", value: "PEA-M / PEAD-M ducted + MFZ-KW floor console" },
          { label: "Display", value: "Backlit LCD with icon menu" },
          { label: "Schedule", value: "7-day, up to 8 events per day" },
          { label: "Sensor", value: "Built-in room temperature sensor at the controller position" },
          { label: "Warranty", value: "5-year parts + labour + 6-year workmanship" },
        ],
        features: [
          "Current-generation replacement for the PAR-40 — same wiring, same footprint, sharper display",
          "7-day schedule with 8 events per day for occupancy-driven control",
          "Built-in room sensor targets the temp at the controller position, not at the return-air grille",
          "Direct interface for Zonemate 4/6/8-zone systems without third-party adaptor",
        ],
        whyWeInstall: [
          "The controller we fit as standard on every ducted install",
          "Physical wall control ages better than app-based control — no login drift, no OS upgrades to chase",
          "Direct Zonemate integration means one screen for temp + zones, not two apps",
        ],
        related: ["me-zone-controller", "pead-m", "zonemate-touch"],
      },
      {
        slug: "me-zone-controller",
        name: "Mitsubishi Electric Standard Zone Controller",
        model: "Mitsubishi Electric Ducted Split Zone Controller",
        category: "zoning",
        categoryLabel: "Ducted zone controller (Mitsubishi native)",
        veuEligible: false,
        photo: "/Mitsubisi electric ducted split   Zone Controller.png",
        photoAlt: "Mitsubishi Electric ducted split zone controller",
        bestFor: "PEA-M / PEAD-M ducted installs where the customer wants Mitsubishi's native zoning instead of a third-party Zonemate",
        ourTake:
          "Mitsubishi's standard zone controller is the native option for PEA-M and PEAD-M ducted installs · connects directly to the indoor unit without a third-party interface, driven from the PAR-41MAA wall controller. We fit this when the customer specifically wants an all-Mitsubishi ecosystem (matching warranty channel, single support line). Zonemate is still our default on most ducted jobs because of its 12/24-zone headroom and multi-unit control, but this is the pick when the buyer wants pure Mitsubishi from indoor unit through to zoning.",
        specs: [
          { label: "Compatibility", value: "PEA-M100/125/140HAA + PEAD-M SG series + PEA-M160/180/200 large-capacity" },
          { label: "Zones supported", value: "Up to 6 zones native" },
          { label: "Wall controller", value: "Driven from the PAR-41MAA standard wired wall controller" },
          { label: "Warranty channel", value: "Single Mitsubishi ecosystem — one support line for indoor, outdoor + zoning" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Native Mitsubishi zone controller — no third-party interface between indoor unit and zoning",
          "Direct PAR-41MAA wall controller integration — single physical interface for temp + zones",
          "Up to 6 zones supported natively (enough for most single-storey family homes)",
          "Single warranty channel through Mitsubishi — indoor, outdoor and zoning all covered by one manufacturer",
        ],
        whyWeInstall: [
          "The pick when the customer wants an all-Mitsubishi install with a single support line for everything",
          "Native integration means fewer wiring points and fewer potential failure points long-term",
          "Zonemate Milieu is still our default on most ducted jobs (12/24-zone headroom + multi-unit) — this is the Mitsubishi-native alternative",
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
      "Reclaim is the premium end of the heat pump hot water market. CO₂ refrigerant (R744) instead of the R290 or R134a everyone else uses · natural refrigerant, zero global-warming potential, and it holds capacity in genuinely cold weather where other heat pumps struggle.",
    ourTake:
      "For a customer who wants the best heat pump on the market and knows they'll be in the house another decade, Reclaim is our first recommendation. Two designs: the CO₂ SPLIT (separate outdoor heat pump + tank) available in glass-lined, stainless, stainless 316 and Earthworks tank finishes; and the ECO R290 ALL-IN-ONE (single unit) at 200 L and 300 L. It costs more up-front and earns that back over 15+ years.",
    accreditation: "Reclaim accredited installer · listed on the Reclaim installer locator",
    productLabel: "13 models · CO₂ split heat pumps + ECO R290 all-in-one",
    photo: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png",
    photoFallback: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump hot water system with controller",
    accent: "#2E8459",
    established: "Designed and assembled in Sydney, Australia · trading since 2007",
    // Warranty terms verified against Reclaim's official May 2026 policy PDF.
    warranty:
      "Tank: 10-year parts + 5-year labour (glass-lined) or 15-year parts + 5-year labour (stainless). Heat pump: 10-year parts + labour (Reclaim EHPE-4550P-A). Wi-Fi controller: 10-year parts + labour. Valves & Quickie Kit: 5-year parts + labour. Plus 6-year workmanship from us.",
    keyFeatures: [
      "CO₂ (R744) natural refrigerant · zero global-warming potential",
      "Holds heating capacity down to -10°C ambient · matters for Emerald / Gembrook / cold-morning mornings",
      "316-grade stainless steel tank option · no anode to swap, no rust",
      "Quiet enough (37 dBA at 1m) to sit next to a bedroom wall",
      "Australian-designed for Australian conditions",
      "PV-diverter kit fires the compressor on solar surplus · earns its price back fast on any home with rooftop solar",
    ],
    commonInMelbourne:
      "Our default recommendation for any customer who intends to be in the house 10+ years. Popular through Pakenham Cameron Park estates, Berwick weatherboards being upgraded from gas storage, and every Cranbourne / Officer job where the customer specifies 'best of' and the tank sits in a visible spot (stainless finish reads as premium).",
    support:
      "Reclaim's Sydney factory holds parts for every unit currently in the field. Compressor swap-out is straightforward within warranty. We stock the common seals, O-rings and PV-diverter controllers on the truck.",
    resources: [
      { label: "Reclaim Energy · manufacturer website", href: "https://reclaimenergy.com.au/" },
    ],
    gallery: [
      { src: "/reclaim-split-back.webp", alt: "Reclaim CO₂ split heat pump — tank and outdoor unit installed" },
      { src: "/reclaim-spit-close-up.webp", alt: "Reclaim heat pump close-up on Melbourne install" },
      { src: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", alt: "Reclaim ECO R290 all-in-one heat pump" },
      { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim split heat pump — full installation view" },
      { src: "/reclaim-mitsubishi.webp", alt: "Reclaim tank alongside Mitsubishi split system" },
      { src: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png", alt: "Reclaim system with Wi-Fi controller" },
    ],
    products: [
      // ---- CO₂ SPLIT SYSTEM (outdoor heat pump + separate tank) ----
      {
        slug: "co2-split-250-glass",
        name: "Reclaim CO₂ Split · 250L Glass-Lined",
        model: "REHP-CO2-250GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "250 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim CO₂ split heat pump outdoor unit + tank",
        bestFor: "Couples / family of 3, glass-lined tank price point",
        ourTake: "The entry into Reclaim's split range. Glass-lined tank (sacrificial anode) at the smallest sensible size for a family — same CO₂ compressor as the 315.",
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
        model: "REHP-CO2-250SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "250 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim CO₂ split heat pump stainless tank",
        bestFor: "Couples / family of 3 wanting a no-anode long-life tank",
        ourTake: "Stainless upgrade on the 250 L glass-lined — same footprint, no sacrificial anode to swap, and a full 15-year tank warranty vs 10-year.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Stainless steel" },
          { label: "Refrigerant", value: "R744 (CO₂)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-250-glass", "co2-split-315-stainless", "co2-split-250-earthworks"],
      },
      {
        slug: "co2-split-250-earthworks",
        name: "Reclaim CO₂ Split · 250L Earthworks Stainless",
        model: "REHP-CO2-250SSEW-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · Earthworks stainless tank",
        capacity: "250 L Earthworks stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Earthworker.png",
        photoAlt: "Reclaim CO₂ split heat pump Earthworks tank",
        bestFor: "Rural / bore-water areas where corrosion protection matters most",
        ourTake: "Earthworks brand stainless tank — the toughest tank finish Reclaim offers. Made for hard-water and bore-fed properties where standard tanks corrode faster than they should.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "Earthworks stainless (marine-grade)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-250-stainless", "co2-split-315-earthworks"],
      },
      {
        slug: "co2-split-315-glass",
        name: "Reclaim CO₂ Split · 315L Glass-Lined",
        model: "REHP-CO2-315GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "315 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim CO₂ split heat pump",
        bestFor: "Family of 4-5, glass-lined tank price point",
        ourTake: "The 315 L Glass-Lined is Reclaim's price-friendly sweet spot. Same CO₂ split platform as the flagship, glass-lined tank keeps ~$500 off vs stainless.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Glass-lined + sacrificial anode" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-315-stainless-316", "co2-split-250-glass"],
      },
      {
        slug: "co2-split-315-stainless",
        name: "Reclaim CO₂ Split · 315L Stainless",
        model: "REHP-CO2-315SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "315 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        starRating: "5-star equivalent",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim 315L CO₂ split heat pump stainless tank",
        bestFor: "Family of 4-5, best-selling Reclaim spec",
        ourTake: "Reclaim's best-selling configuration and our most-installed model in the range. 315 L stainless tank, quiet enough to sit next to a bedroom wall (37 dBA), 15-year tank warranty.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Stainless steel" },
          { label: "Refrigerant", value: "R744 (CO₂, natural)" },
          { label: "Rated COP", value: "5.02 @ 15°C ambient" },
          { label: "Sound level", value: "37 dBA at 1 m" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
          { label: "Heat pump warranty", value: "10 years parts + labour" },
        ],
        related: ["co2-split-315-glass", "co2-split-315-stainless-316", "co2-split-315-earthworks"],
      },
      {
        slug: "co2-split-315-stainless-316",
        name: "Reclaim CO₂ Split · 315L Stainless 316 (Q)",
        model: "REHP-CO2-315SSQ-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · 316-grade stainless tank",
        capacity: "315 L 316-grade stainless tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/reclaim-duplex-316ss-.png",
        photoAlt: "Reclaim 315L 316-grade duplex stainless heat pump",
        bestFor: "Coastal-edge and salt-air suburbs where 304 stainless still corrodes over time",
        ourTake: "316-grade stainless is Reclaim's premium tank finish — better corrosion resistance than standard 304 stainless. Worth the step-up for coastal properties (Tooradin, Lang Lang).",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "316-grade stainless" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-315-earthworks"],
      },
      {
        slug: "co2-split-315-earthworks",
        name: "Reclaim CO₂ Split · 315L Earthworks Stainless",
        model: "REHP-CO2-315SSEW-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · Earthworks stainless tank",
        capacity: "315 L Earthworks stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Earthworker.png",
        photoAlt: "Reclaim 315L Earthworks stainless heat pump",
        bestFor: "Bore-water, hard-water, and rural properties",
        ourTake: "Earthworks branded stainless — the tank Reclaim spec for the worst water conditions. Common on our rural jobs in Devon Meadows, Pearcedale, Nar Nar Goon.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "Earthworks stainless (marine-grade)" },
          { label: "Tank warranty", value: "15 years parts + 5 years labour" },
        ],
        related: ["co2-split-315-stainless", "co2-split-250-earthworks"],
      },
      {
        slug: "co2-split-400-glass",
        name: "Reclaim CO₂ Split · 400L Glass-Lined",
        model: "REHP-CO2-400GL-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · glass-lined tank",
        capacity: "400 L glass-lined tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim 400L CO₂ split heat pump",
        bestFor: "Large family (6+) at the glass-lined tank price point",
        ourTake: "Biggest tank in the glass-lined range. What we spec when the household draw is high but budget rules out a 400 L stainless.",
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
        model: "REHP-CO2-400SST-V2",
        category: "heat-pump",
        categoryLabel: "CO₂ split heat pump · stainless tank",
        capacity: "400 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim 400L CO₂ split heat pump stainless tank",
        bestFor: "Larger families (6+), acreage properties with high draw",
        ourTake: "The 400L stainless is the big-family Reclaim — larger tank, same premium CO₂ compressor + 15-year tank warranty. What we spec for acreage properties in Devon Meadows, Pearcedale, or a big family in Cranbourne South.",
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
        model: "RE-ECO-200",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "200 L integrated tank + heat pump",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Couples / small households wanting a single-unit install",
        ourTake: "Reclaim's all-in-one range uses R290 propane refrigerant instead of the split range's CO₂. Compact single unit — tank and heat pump in one shell. 200 L for smaller households.",
        specs: [
          { label: "Tank capacity", value: "200 L" },
          { label: "Format", value: "All-in-one (single unit)" },
          { label: "Refrigerant", value: "R290 (propane, natural)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
        ],
        related: ["eco-r290-300", "co2-split-250-glass"],
      },
      {
        slug: "eco-r290-300",
        name: "Reclaim ECO R290 · 300L All-in-One",
        model: "RE-ECO-300",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "300 L integrated tank + heat pump",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Family of 4-5 wanting a single-unit install (no separate outdoor)",
        ourTake: "300 L all-in-one is a proper mid-family unit in a footprint smaller than a CO₂ split. What we quote when there's no good outdoor spot for a split heat pump but there IS space next to the existing tank position.",
        specs: [
          { label: "Tank capacity", value: "300 L" },
          { label: "Format", value: "All-in-one (single unit)" },
          { label: "Refrigerant", value: "R290 (propane)" },
          { label: "Tank warranty", value: "10 years parts + 5 years labour" },
        ],
        related: ["eco-r290-200", "co2-split-315-glass"],
      },
      // ---- Panasonic CO₂ Split (Reclaim tank + Panasonic Aquarea heat pump) ----
      {
        slug: "panasonic-co2-4kw",
        name: "Reclaim × Panasonic CO₂ Split · 4 kW compressor",
        model: "Panasonic Aquarea 4 kW compressor + Reclaim tank (250 L or 315 L)",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · 4 kW compressor",
        capacity: "250 L or 315 L tank · 4 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim × Panasonic CO₂ split heat pump · 4 kW compressor",
        bestFor: "Couples through family of 5 wanting the Panasonic Aquarea 4 kW compressor on the Reclaim tank platform",
        ourTake:
          "Reclaim's Panasonic partnership pairs the Panasonic Aquarea 4 kW CO₂ compressor with a Reclaim-branded tank on the same platform as the standard Reclaim CO₂ splits. Tank size is a spec choice (250 L for couples / 3-person households, 315 L for a family of 4-5). Same 15-year stainless / 10-year glass tank warranty options carry over — the compressor is where this diverges, swapping to the Panasonic Aquarea for buyers who specifically want the Aquarea badge.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 4 kW · CO₂ (R744)" },
          { label: "Tank size options", value: "250 L (couples / 3-person) OR 315 L (family of 4-5)" },
          { label: "Tank finish options", value: "Glass-lined · Stainless · 316 duplex (Earthworker)" },
          { label: "Tank warranty", value: "10-yr glass-lined · 15-yr stainless · 15-yr 316 duplex" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "No 400 L option on the Panasonic Aquarea platform — max tank is 315 L" },
        ],
        features: [
          "Panasonic Aquarea 4 kW CO₂ compressor · same brand as the popular Aquarea residential range",
          "Same Reclaim tank platform as the pure Reclaim CO₂ splits (tanks are interchangeable spec choices)",
          "Two tank size options (250 L / 315 L) — right-size to household draw",
          "Three tank finishes (glass-lined / stainless / 316 duplex) — long-life stainless carries the 15-year warranty",
          "R744 natural refrigerant · holds heating capacity down to −10 °C ambient",
        ],
        whyWeInstall: [
          "The pick when the customer specifically wants the Panasonic Aquarea badge on the compressor",
          "Same tank platform + install experience as the pure Reclaim CO₂ range — familiar install",
          "Reclaim carries the tank warranty · Panasonic carries the compressor warranty · both channelled through Reclaim",
        ],
        related: ["panasonic-co2-6kw", "co2-split-315-stainless"],
      },
      {
        slug: "panasonic-co2-6kw",
        name: "Reclaim × Panasonic CO₂ Split · 6 kW compressor",
        model: "Panasonic Aquarea 6 kW compressor + Reclaim tank (250 L or 315 L)",
        category: "heat-pump",
        categoryLabel: "Panasonic CO₂ split heat pump · 6 kW compressor",
        capacity: "250 L or 315 L tank · 6 kW Panasonic Aquarea compressor",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        photo: "/Reclaim Glass lined and stainless v2.png",
        photoAlt: "Reclaim × Panasonic CO₂ split heat pump · 6 kW compressor",
        bestFor: "Cold-climate households and larger families wanting faster tank recovery than the 4 kW",
        ourTake:
          "The 6 kW Aquarea compressor gives faster tank recovery than the 4 kW · matters most in the hills (Emerald, Gembrook, Cockatoo) where cold-morning demand spikes are the tough case. The 6 kW also modulates further down, so at typical part-load it's actually MORE efficient than the 4 kW despite the larger nameplate. Tank size is a spec choice (250 L or 315 L) with the same three finish options as the 4 kW variant.",
        specs: [
          { label: "Compressor", value: "Panasonic Aquarea 6 kW · CO₂ (R744)" },
          { label: "Tank size options", value: "250 L OR 315 L" },
          { label: "Tank finish options", value: "Glass-lined · Stainless · 316 duplex (Earthworker)" },
          { label: "Tank warranty", value: "10-yr glass-lined · 15-yr stainless · 15-yr 316 duplex" },
          { label: "Compressor warranty", value: "5-year Panasonic + 6-year workmanship" },
          { label: "Note", value: "No 400 L option on the Panasonic Aquarea platform — max tank is 315 L" },
        ],
        features: [
          "Panasonic Aquarea 6 kW CO₂ compressor · faster tank recovery than the 4 kW variant",
          "MORE efficient at typical part-load (modulates further down than the 4 kW)",
          "Same Reclaim tank platform (2 sizes × 3 finishes) as the 4 kW",
          "R744 natural refrigerant · holds heating capacity down to −10 °C",
          "Worth the step-up for hills postcodes where cold-morning demand spikes matter",
        ],
        whyWeInstall: [
          "The right pick for hills homes (Emerald, Gembrook, Cockatoo) where cold-morning recovery matters",
          "Part-load efficiency is genuinely better than the 4 kW despite the larger nameplate",
          "Above this size we'd move to the pure-Reclaim 400 L stainless (the Aquarea platform caps at 315 L)",
        ],
        related: ["panasonic-co2-4kw", "co2-split-400-stainless"],
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
      "Thermann is Reece's exclusive plumbing-trade brand, manufactured by Dux at their Moss Vale factory in NSW. Reece owns the distribution; Dux does the manufacturing. That combination gives Thermann the widest Australian parts pipeline of any hot-water brand · every Reece store in the state stocks the common spares.",
    ourTake:
      "Thermann is what we quote first when the customer wants a proven, Aussie-made heat pump but doesn't want to pay Reclaim money. As a Reece trade partner we get direct-line parts and warranty backing at any Reece store · same-day fixes on almost every fault.",
    accreditation: "Reece trade partner · Dux/Thermann approved installer",
    productLabel: "8 models · heat pump (all-in-one + split), G-series continuous flow, electric storage",
    photo: "/thermann_integrated_heat_pump_02.jpg",
    photoFallback: "/thermann-heat-pump.webp",
    photoAlt: "Thermann integrated heat pump hot water system",
    accent: "#0090C3",
    established: "Reece exclusive brand · manufactured by Dux at their Moss Vale (NSW) factory",
    warranty: "5-year cylinder + 3-year compressor + 6-year on our workmanship. R290 heat pump range extends compressor warranty to 5 years.",
    keyFeatures: [
      "Reece-exclusive brand · every Reece store in Victoria stocks the common parts",
      "Manufactured in NSW by Dux · genuine Australian-made, qualifies for the $400 Aus-made VEU bonus",
      "Focused range: heat pump (200L / 300L all-in-one + glass-lined split), G-series continuous-flow gas, electric storage",
      "R290 natural refrigerant in the heat pump range · low-GWP, high efficiency",
      "Best mid-tier VEU rebate outcome when Reclaim busts the budget",
      "G-series continuous flow is our default gas hot water swap when the customer wants to stay on gas",
    ],
    commonInMelbourne:
      "Our volume-tier default for VEU rebate customers who want a proven, well-supported brand at a mid price point. Thermann all-in-one heat pumps go into a lot of Hampton Park, Cranbourne and Narre Warren jobs where the rebate math works best. G-series continuous flow is our go-to gas hot water swap across the corridor.",
    support:
      "Reece store network across Melbourne is same-day for us · every branch stocks common Thermann parts. Dux handles compressor + cylinder warranty claims direct.",
    resources: [
      { label: "Thermann · manufacturer website", href: "https://www.thermann.com.au/" },
      { label: "Dux (made in Australia by)", href: "https://www.dux.com.au/" },
    ],
    gallery: [
      { src: "/thermann-heat-pump.webp", alt: "Thermann integrated heat pump installed on a Pakenham home" },
      { src: "/thermann-contineues-flow-standing-back.webp", alt: "Thermann G-series continuous-flow gas hot water unit" },
      { src: "/thermann-continues-flow-close-up.webp", alt: "Thermann G-series close-up" },
      { src: "/G-Series_Front_On_View_1200x900.jpg", alt: "Thermann G-series product view" },
      { src: "/G-Series_Angle_View_1200x900.jpg", alt: "Thermann G-series angle view" },
      { src: "/gas-hot-water-changeover.webp", alt: "Thermann hot water changeover on install day" },
    ],
    products: [
      // ---- Heat pump: all-in-one (200 L + 300 L) ----
      {
        slug: "thermann-eco-r290-200",
        name: "Thermann ECO R290 · 200L All-in-One",
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
          "The 200 L all-in-one is Thermann's compact heat pump · tank and heat pump in one shell, no separate outdoor. Our value pick for a couple or a small household on a VEU rebate who wants a proven brand at a mid price point.",
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
        name: "Thermann ECO R290 · 300L All-in-One",
        model: "T-HP-ECO-300",
        category: "heat-pump",
        categoryLabel: "R290 all-in-one heat pump",
        capacity: "300 L integrated tank + heat pump",
        refrigerant: "R290 (propane, natural)",
        veuEligible: true,
        photo: "/thermann_integrated_heat_pump_02.jpg",
        photoAlt: "Thermann integrated R290 all-in-one heat pump",
        bestFor: "Family of 4-5 wanting a single-unit heat pump swap",
        ourTake:
          "The 300 L is Thermann's family-size all-in-one · tank and heat pump in one shell, no separate outdoor unit needed. Our default Thermann pick when there's no clean spot outside for a split heat pump.",
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
        model: "T-HP-SPLIT-GL",
        category: "heat-pump",
        categoryLabel: "Split heat pump · glass-lined tank",
        capacity: "270 L or 315 L glass-lined tank",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        photo: "/Thermann-Split-heat-pump.jpg",
        photoAlt: "Thermann split heat pump — outdoor unit + tank",
        bestFor: "Household wanting a split heat pump on a mid-tier budget",
        ourTake:
          "Thermann only makes their split configuration in one tank finish · glass-lined with a sacrificial anode. Trade-off vs Reclaim's stainless is a cheaper up-front price, but the anode does need swapping every 5-7 years for the tank warranty to hold. Good pick when the customer prefers a split layout but stainless is over-budget.",
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
          "The 16 L/min G-series is our smallest continuous-flow · enough for a couple or a single-bathroom household. Step up to the 20 L/min if two showers might run simultaneously.",
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
          "The 20 L/min G-series is our most-installed continuous flow · enough capacity for two showers simultaneously without pressure loss on either.",
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
          "The 32 L/min G-series is the biggest continuous flow we install · for homes with three bathrooms or high-draw applications.",
        specs: [
          { label: "Flow rate", value: "32 L/min at 25°C rise" },
        ],
        related: ["cf-26"],
      },
      // ---- Gas storage ----
      {
        slug: "gas-storage-135",
        name: "Thermann Gas Storage · 135L",
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
          "The 135L Thermann is the compact gas storage tank for a small household or a unit — natural gas or LPG, 4-star efficiency. What we quote when the customer wants to stay on gas and household draw is genuinely low. For anything more than 2 people we usually recommend the 170L or a heat pump.",
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
          "The 170L is the family-size gas storage · steps up from the 135L for 3-4 person households where a smaller tank would run out during back-to-back showers. Same 4-star efficiency and warranty position, physically taller footprint.",
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
      // ---- Electric storage (Smart Electric range · one product covering all sizes) ----
      {
        slug: "electric-storage",
        name: "Thermann Smart Electric Storage",
        model: "T-SE range · 80 · 125 · 160 · 250 · 315 · 400 L",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "80 · 125 · 160 · 250 · 315 · 400 L · 1.8 / 2.4 / 3.0 kW element options",
        veuEligible: false,
        photo: "/Thermann-Smart_Hot_Water_System-315L.png",
        photoAlt: "Thermann Smart Electric storage tank range",
        bestFor: "Emergency like-for-like replacement of a failed electric tank · every size for every household from studio to acreage",
        ourTake:
          "Thermann's Smart Electric range covers every household size from a studio (80 L) up to a big family / acreage property (400 L). Element size steps up with tank size — 1.8 kW on the 80/125 L for compact draw, 2.4 kW on the 160 L, 3.0 kW single or twin on the 250 / 315 / 400 L. We install this as a last-resort emergency replacement because electric storage doesn't qualify for VEU and is the most expensive fuel to run · for any planned upgrade, the Thermann heat pump equivalent is a much better financial outcome. Same 10-year cylinder warranty across every size.",
        specs: [
          { label: "80 L", value: "1.8 kW element · studio / granny flat" },
          { label: "125 L", value: "1.8 kW element · 1-2 person household" },
          { label: "160 L", value: "2.4 kW element · 2-person household / townhouse" },
          { label: "250 L", value: "3.0 kW single or twin element · 3-4 person family" },
          { label: "315 L", value: "3.0 kW single or twin element · 4-5 person family" },
          { label: "400 L", value: "3.0 kW twin element · 5+ person / acreage" },
          { label: "Tariff", value: "Peak or off-peak controlled across the range" },
          { label: "Made in", value: "Australia · Reece-exclusive brand" },
          { label: "Warranty", value: "10-yr cylinder + 3-yr parts & labour + 1-yr other parts + 6-yr workmanship" },
        ],
        features: [
          "Six tank sizes cover every household — 80 L studio through 400 L acreage",
          "Element size scales with tank (1.8 / 2.4 / 3.0 kW) so recovery time stays reasonable at every size",
          "Twin-element option on 250 / 315 / 400 L for faster recovery on higher-draw households",
          "10-year cylinder warranty across every size in the range",
          "Australian-made · Reece parts network means same-day common spares state-wide",
          "Peak or off-peak controlled across the range — matches whatever tariff the meter is on",
        ],
        whyWeInstall: [
          "Only when it's a last-resort emergency replacement · electric doesn't qualify for VEU and is the most expensive fuel to run",
          "The 250 / 315 L family sizes are the most-common emergency swap · same 3-5 hour install as the smaller sizes",
          "For any planned upgrade we always quote both — the Thermann heat pump alternative pays back in 2-4 years on the difference",
          "Backed by our 6-year workmanship on top of Thermann's 10-year cylinder warranty",
        ],
        related: ["thermann-eco-r290-300", "co2-split-315-stainless"],
      },
    ],
  },

  // ================== iSTORE ==================
  {
    slug: "istore",
    name: "iStore",
    tagline: "Best mid-tier VEU rebate outcome.",
    origin: "Australia",
    intro:
      "iStore is our value pick for VEU rebate customers. Solid heat pump platform, aggressive price point, and the built-in PV diverter option means it plays well with solar homes without needing an aftermarket accessory.",
    ourTake:
      "iStore doesn't quite reach Reclaim's build quality or Thermann Series 5's parts network, but for the VEU rebate customer who wants their out-of-pocket under $500, iStore hits the sweet spot every time.",
    accreditation: "iStore accredited installer",
    productLabel: "2 models · 180L + 270L heat pump storage",
    photo: "/270L-istore-heatpump.webp",
    photoFallback: "/reclaim-split-close-up.webp",
    photoAlt: "iStore 270L heat pump hot water system",
    accent: "#F36722",
    established: "Australian company (Sydney) · manufactured in China to AS/NZS standards",
    warranty: "6-year cylinder + 3-year compressor + 6-year on our workmanship",
    keyFeatures: [
      "Best VEU rebate outcome in the market · 270L install often lands under $900 out-of-pocket",
      "Built-in PV-diverter compatibility · smart-schedule the compressor around your solar",
      "Wi-Fi smart-app control comes standard · no aftermarket module needed",
      "R290 natural refrigerant, high COP",
      "Aggressive price point · the value pick when budget is the driving factor",
    ],
    commonInMelbourne:
      "Hampton Park, Cranbourne North and Doveton are the postcodes we install the most iStore into · the VEU rebate maths there consistently gets the out-of-pocket under $500. Also popular with solar-paired households through Officer and Clyde North where the built-in PV diverter pays back inside the first year.",
    support:
      "iStore parts flow through their Melbourne distributor. Warranty claims are handled by iStore's Sydney office directly with the homeowner · we handle the on-site swap-out.",
    resources: [
      { label: "iStore · manufacturer website", href: "https://istore.com.au/" },
    ],
    gallery: [
      { src: "/270L-istore-heatpump.webp", alt: "iStore 270L heat pump — full unit view" },
      { src: "/gas-hot-water-changeover.webp", alt: "iStore install day — old tank swap" },
      { src: "", alt: "iStore install photo — add later" },
      { src: "", alt: "iStore install photo — add later" },
      { src: "", alt: "iStore install photo — add later" },
      { src: "", alt: "iStore install photo — add later" },
    ],
    products: [
      {
        slug: "istore-180",
        name: "iStore 180L Heat Pump",
        model: "iS-HP-180",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "180 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Couples, apartments, tight VEU rebate budget",
        photo: "/270L-istore-heatpump.webp",
        photoAlt: "iStore 180L heat pump — full unit view",
        ourTake:
          "The 180L is the smallest iStore · for couples or apartment installs where 270L is overkill. Post-VEU-rebate this can land under $500 out of pocket, which no other heat pump in the market can match.",
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
        model: "iS-HP-270",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "270 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Family of 3-4, best-value VEU rebate spec",
        photo: "/270L-istore-heatpump.webp",
        photoAlt: "iStore 270L heat pump — installed unit",
        ourTake:
          "The 270L iStore is our most-installed unit for Hampton Park and Cranbourne VEU rebate jobs. Post-VEU-rebate typically sits under $900, which is a genuinely hard number to beat.",
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
    tagline: "Reece exclusive value-tier splits + ducted.",
    origin: "Reece-exclusive brand · Australian-distributed",
    intro:
      "Kaden is our value alternative when Mitsubishi Electric busts the customer's budget but they still want a properly-installed, warranty-backed system. Solid build for the price, national parts support, and the 5-year warranty on the compressor takes the risk out of the value tier.",
    ourTake:
      "We install Kaden when a family needs cooling in three bedrooms plus living and the Mitsubishi quote comes in over budget. The gap has closed noticeably over the last 3-4 years · Kaden today is what mid-tier Panasonic was five years ago.",
    accreditation: "Reece trade partner · Kaden authorised dealer",
    productLabel: "12 models · splits, multi-head, ducted, gas ducted, evaporative",
    photo: "/Kaden KSI V3 wall split system.jpg",
    photoFallback: "/kaden-indoor.webp",
    photoAlt: "Kaden split system with outdoor condenser",
    accent: "#12224E",
    established: "Reece exclusive brand, distributed via Reece stores nationally · trading since 2015",
    warranty: "5-year manufacturer parts + labour + 6-year on our workmanship",
    keyFeatures: [
      "Reece exclusive · stocked in every Reece store, same-day parts across Victoria",
      "Best value-to-quality ratio at the mid-tier · genuinely closes the gap on premium brands",
      "Full range: wall splits, multi-head, ducted (10-16 kW), gas ducted, evaporative",
      "Kaden 6-star gas ducted is the most efficient value-tier gas heater in Melbourne",
      "R32 refrigerant in the aircon range",
    ],
    commonInMelbourne:
      "Our value alternative when a family wants cooling in 3+ bedrooms and the Mitsubishi quote busts the budget. Very common in Cranbourne, Narre Warren, Hampton Park and Endeavour Hills where the customer wants a real system but the numbers need to work. Kaden gas ducted is our default like-for-like Brivis / Braemar replacement path.",
    support:
      "Every Reece store in Melbourne stocks common Kaden parts · same-day pickup for us on almost every job. Warranty claims run through the Reece trade portal.",
    resources: [
      { label: "Kaden · manufacturer website", href: "https://www.kadenair.com.au/" },
      { label: "Reece (distributor)", href: "https://www.reece.com.au/" },
    ],
    gallery: [
      { src: "/kaden-indoor.webp", alt: "Kaden indoor head unit — Melbourne install" },
      { src: "/4 kadens with chaz.jpg", alt: "Four Kaden systems staged pre-install with our team" },
      { src: "/Kaden Condesnser.jpg", alt: "Kaden outdoor condenser unit installed" },
      { src: "/duct-work.webp", alt: "Kaden ducted install — ceiling void ductwork" },
      { src: "/gas-ducted-install.webp", alt: "Kaden gas ducted heater in-cupboard install" },
      { src: "/evap-cooler-service.webp", alt: "Kaden evaporative cooler on the roof" },
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
        bestFor: "Bedroom or home office up to 25 m² on a value spec",
        ourTake:
          "The KSI-v3 2.5 kW is a genuinely capable value bedroom split. Inverter compressor, R32 refrigerant and Wi-Fi ready — not as whisper-quiet as the MSZ-AP25, but a ~$600 saving that matters when you're doing three bedrooms at once.",
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
          "Auto-restart after a power outage — no reset needed",
          "Follow-me sensor in remote for room-accurate temp targeting",
          "Anti-cold air, sleep mode and ionizer filter across every size",
        ],
        whyWeInstall: [
          "About $600 cheaper installed than the Mitsubishi MSZ-AP25 for the same room-size fit",
          "Kaden's Australian distribution means parts and support are reliable through Emerson",
          "5-year parts warranty on top of our 6-year workmanship — 6+ years fully backed",
          "Common choice when a customer wants 3 bedrooms done in one visit",
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
          "The KSI-v3 3.5 kW steps up for master bedrooms and small living zones. Same inverter and Wi-Fi platform as the 2.5, just enough capacity to handle a doors-open scenario without running at 100% all summer.",
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
        bestFor: "Open-plan living / dining up to 50 m² on a value spec",
        ourTake:
          "The KSI-v3 5.0 kW is our value pick for a modern brick-veneer open-plan. Big enough to handle a Melbourne heatwave with the doors open, ~$700 cheaper installed than the Mitsubishi MSZ-AP50. Not our first pick if noise floor is the top priority — but genuinely good value.",
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
          "DC inverter compressor — modulates smoothly across part loads",
          "R32 low-GWP refrigerant",
          "Follow-me sensor targets your room temp from the remote position",
          "4-way auto-swing louvres for even room airflow",
          "Wi-Fi control via the Kaden app (adapter sold separately)",
          "Anti-cold air, sleep mode, ionizer filter",
        ],
        whyWeInstall: [
          "~$700 cheaper installed than the Mitsubishi MSZ-AP50 for the same room-size fit",
          "Sweet-spot capacity for a typical open-plan family living zone",
          "Kaden distributor pipeline through Emerson gives us reliable parts turnaround",
          "Solid pick when you want 2-3 rooms done at the value price and don't want the cheapest fly-by-night imports",
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
        bestFor: "Large open-plan living zone up to 70 m² on a value spec",
        ourTake: "The KSI-v3 7.0 kW covers a big living zone where the budget won't stretch to Mitsubishi. Same inverter platform as the smaller siblings, just scaled up.",
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
        ourTake: "The biggest wall split in the KSI-v3 range. Beyond this a ducted or multi-head usually delivers better airflow distribution.",
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
        photo: "/Kaden kdi-v2-Ducted Split System.jpg",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Small 3-bed single-storey ducted retrofit",
        ourTake:
          "The 10 kW Kaden Ducted is our value ducted pick for a smaller family home. Comes in about $1,500-$2,000 under the Mitsubishi PEAD-M equivalent.",
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
        photo: "/Kaden kdi-v2-Ducted Split System.jpg",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "3-4 bed single-storey ducted retrofit",
        ourTake: "12.5 kW is the sweet spot for a typical 3-4 bed family home ducted retrofit at the value price point.",
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
        photo: "/Kaden kdi-v2-Ducted Split System.jpg",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Larger single-storey or a modest double-storey",
        ourTake: "14 kW Ducted for larger single-storeys · value alternative to the PEAD-M or PEA-RP.",
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
        photo: "/Kaden kdi-v2-Ducted Split System.jpg",
        photoAlt: "Kaden ducted install with return-air duct work",
        bestFor: "Larger single-storey and double-storey family homes",
        ourTake: "17 kW is the top of the Kaden ducted range · what we spec for the double-storey family homes in Berwick, Officer and Clyde. Above this we move up to the Mitsubishi PEA-M large-capacity ducted.",
        specs: [{ label: "Cool capacity", value: "17.0 kW" }],
        related: ["kaden-ducted-14", "pead-large"],
      },
      {
        slug: "kaden-multi",
        name: "Kaden Multi-Head Range · 2-Head through 6-Head",
        model: "KDM2 · KDM4 · KDM12 · KDM18",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        photo: "/Kaden Multi Head.jpg",
        photoAlt: "Kaden multi-head range — 2-head through 6-head condenser + indoor units",
        capacity: "4.0 kW / 8.0 kW / 12.0 kW / 18.0 kW — one outdoor, 2 to 6 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Every Kaden multi-head install — value alternative to Mitsubishi's MXZ range at every port count",
        ourTake:
          "Kaden's multi-head range mirrors Mitsubishi's port counts at the value price · KDM2 (4 kW · 2 heads) for apartments, KDM4 (8 kW · 4 heads) for a family home wanting per-room control, KDM12 (12 kW · up to 5 heads) for larger single-storey, KDM18 (18 kW · up to 6 heads) as the value alternative to the Mitsubishi MXZ-6C. All share the same R32 + inverter platform, one Emerson parts pipeline. About $1,000-1,500 saving vs the Mitsubishi equivalent at each port count, backed by our 6-year workmanship.",
        specs: [
          { label: "KDM2 · 2-head", value: "4.0 kW combined · apartments, townhouses with one balcony spot" },
          { label: "KDM4 · 4-head", value: "8.0 kW combined · 4-bedroom family homes" },
          { label: "KDM12 · 5-head · 12 kW", value: "12.0 kW combined · up to 5 heads, larger single-storey" },
          { label: "KDM18 · 6-head · 18 kW", value: "18.0 kW combined · up to 6 heads, value alternative to MXZ-6C" },
          { label: "Refrigerant", value: "R32 (low GWP) across the range" },
          { label: "Power supply", value: "1-phase 230 V across the range" },
          { label: "Warranty", value: "5-year Kaden manufacturer + 6-year workmanship" },
        ],
        features: [
          "Port count matches Mitsubishi's MXZ range at every step (2 / 4 / 5 / 6 heads)",
          "One condenser feeds 2 to 6 indoor heads — cleaner externally than separate splits",
          "R32 refrigerant + inverter compressor across the entire range",
          "1-phase power supply on every model — no 3-phase upgrade at the meter box",
          "About $1,000-1,500 saving vs Mitsubishi equivalent at each port count",
        ],
        whyWeInstall: [
          "Value alternative to Mitsubishi MXZ across every port count",
          "Same install team, same 6-year workmanship warranty as the Mitsubishi quote",
          "Emerson-backed parts network in Melbourne — reliable warranty turnaround",
          "KDM18 6-head is genuinely rare in the value tier — matches Mitsubishi's MXZ-6C but cheaper",
        ],
        related: ["kaden-ducted-14", "mxz-multi"],
      },
      {
        slug: "kaden-gas-internal",
        name: "Kaden Internal Gas Ducted Heater",
        model: "KGH · 3★ / 4★ / 5★ / Starpro internal",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW · 3-star through 5-star Starpro efficiency options",
        veuEligible: false,
        photo: "/kaden_internal_ducted_heater_3 star.jpg",
        photoAlt: "Kaden internal gas ducted heater — 3-star + Starpro 4/5-star variants",
        bestFor: "Value alternative to Brivis internal ducted — like-for-like cupboard retrofit",
        ourTake:
          "Kaden's internal gas ducted range covers the 3-star entry (Compact Universal) up through the Starpro 4/5-star mid-tier. Same in-cupboard footprint as older Brivis / Braemar internal ducted heaters so the retrofit is straightforward — existing ducts, controller wiring and return-air grille all reuse. What we quote when the customer wants to stay on gas at the value price point.",
        specs: [
          { label: "Model tiers", value: "3-star Compact Universal · Starpro 4★ / 5★" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "Internal cupboard" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "One internal cupboard footprint across every tier — 3-star through Starpro 5-star all fit the same cavity",
          "3-star entry (Compact Universal) is the value like-for-like Brivis Wombat swap",
          "Starpro 4/5-star tier for customers wanting meaningful efficiency without paying premium prices",
          "Direct-spark ignition across the range — no pilot light burning gas year-round",
          "Universal Brivis / Braemar footprint — retrofit stays clean and same-day",
        ],
        whyWeInstall: [
          "~$700–1,000 cheaper installed than the Brivis equivalent at the same star rating",
          "Emerson-backed parts network gives us reliable Melbourne warranty turnaround",
          "Same install team, same 6-year workmanship as the Brivis quote",
          "Backed by our 6-year workmanship + Kaden's 5-year manufacturer cover",
        ],
        related: ["kaden-gas-external", "brivis-gas-internal"],
      },
      {
        slug: "kaden-gas-external",
        name: "Kaden External Gas Ducted Heater",
        model: "KGH-EXT · 3★ / 4★ / 5★ external cabinet",
        category: "ducted",
        categoryLabel: "External gas ducted heater",
        capacity: "15 · 20 · 25 · 30 kW · 3-star through 5-star Starpro efficiency options · weatherproof outdoor cabinet",
        veuEligible: false,
        photo: "/kaden_external_ducted_heater_3 star.jpg",
        photoAlt: "Kaden external gas ducted heater — 3-star + Starpro 4/5-star variants",
        bestFor: "Value alternative to Brivis external ducted — homes with the heater on an external pad",
        ourTake:
          "The external range packages the same 3-star entry and Starpro 4/5-star cores in a weatherproof outdoor cabinet · what we install when the home was built with the ducted heater outside on a pad rather than inside a cupboard. Universal footprint keeps the retrofit clean and the parts pipeline through Emerson is reliable.",
        specs: [
          { label: "Model tiers", value: "3-star external · Starpro External 4★ / 5★" },
          { label: "Output range", value: "15 · 20 · 25 · 30 kW" },
          { label: "Install position", value: "External weatherproof cabinet on pad" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Ignition", value: "Direct spark, no pilot light" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Weatherproof outdoor cabinet for homes without an internal heater cupboard",
          "Same 3-star / Starpro 4-5 star tiers as the internal range",
          "Four output sizes (15 / 20 / 25 / 30 kW) — matched to the home's heat load",
          "Universal footprint fits Brivis / Braemar external pads without new base work",
        ],
        whyWeInstall: [
          "Value alternative to the Brivis external — ~$700–1,000 saving at the same star rating",
          "External-cabinet retrofit reuses the existing pad + gas line, so the install stays same-day",
          "Emerson parts network turns warranty replacements around quickly in Melbourne",
        ],
        related: ["kaden-gas-internal", "brivis-gas-external"],
      },
      {
        slug: "kaden-evaporative-classic",
        name: "Kaden Classic Evaporative Cooler",
        model: "KDE Classic profile",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling · Classic silhouette",
        capacity: "Small · Medium · Large roof units · Classic (taller) silhouette",
        veuEligible: false,
        photo: "/Kaden classic_evap cooler .jpg",
        photoAlt: "Kaden Classic evaporative cooler roof unit",
        bestFor: "Standard roof pitches where the Classic silhouette isn't a street-view concern",
        ourTake:
          "Kaden's Classic evap is the value-tier equivalent of the Brivis Contour · same principle, cheaper install price, Emerson-backed parts pipeline. Cools a whole home for ~25% of refrigerated running cost when outside humidity is low.",
        specs: [
          { label: "Silhouette", value: "Classic (taller) roof profile" },
          { label: "Capacity", value: "Small · Medium · Large roof unit sizes" },
          { label: "Refrigerant", value: "None · evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Value-tier evap · ~$800-1,200 cheaper installed than the Brivis Contour",
          "Three roof-unit sizes (Small / Medium / Large) matched to home cooling load",
          "Roof-mounted install, cooled air through ceiling vents",
          "Emerson-backed parts pipeline — reliable Melbourne warranty turnaround",
        ],
        whyWeInstall: [
          "Value alternative to the Brivis Contour for dry-summer suburbs",
          "Same install team, same 6-year workmanship warranty as the Brivis quote",
          "Ideal for large-footprint homes in Cranbourne / Clyde / Officer where ducted refrigerated is over-spec",
        ],
        related: ["kaden-evaporative-low", "brivis-evap-contour", "kaden-gas-internal"],
      },
      {
        slug: "kaden-evaporative-low",
        name: "Kaden Low-Profile Evaporative Cooler",
        model: "KDE Low-Profile",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling · Low-Profile",
        capacity: "Small · Medium · Large roof units · Low-Profile (flatter) silhouette",
        veuEligible: false,
        photo: "/Kaden low_evap cooler.jpg",
        photoAlt: "Kaden Low-Profile evaporative cooler roof unit",
        bestFor: "Street-view sensitive homes and low-pitch roofs where the Classic silhouette is too tall",
        ourTake:
          "Kaden's Low-Profile evap is the value-tier equivalent of the Brivis Advance · same flatter cabinet for clean street-view rooflines, at Kaden's value price. What we spec on character streets or covenanted estates where a taller evap would sit awkwardly on the roof.",
        specs: [
          { label: "Silhouette", value: "Low-Profile (flatter) roof silhouette" },
          { label: "Capacity", value: "Small · Medium · Large roof unit sizes" },
          { label: "Install position", value: "Roof-mounted (suits low-pitch roofs)" },
          { label: "Refrigerant", value: "None · evaporative water cooling" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        features: [
          "Low-Profile silhouette · clean street-view roofline",
          "Same cooling capability as the Classic — just a flatter cabinet",
          "Value price vs the Brivis Advance equivalent",
          "Suits low-pitch roofs where the Classic silhouette would sit awkwardly",
        ],
        whyWeInstall: [
          "Value alternative to the Brivis Advance for heritage / covenanted streets",
          "Same install team, same 6-year workmanship warranty",
          "Emerson parts pipeline — quick Melbourne warranty turnaround",
        ],
        related: ["kaden-evaporative-classic", "brivis-evap-advance", "kaden-gas-internal"],
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
      "Zonemate is what turns a single-motor ducted system into something you can zone room-by-room. Every ducted install we quote includes a Zonemate as standard · the ability to shut off unused rooms cuts running costs by 30-40% over an always-on ducted.",
    ourTake:
      "Zoning is the single biggest efficiency win on a ducted system. Zonemate's touch controllers are the ones we specify because they're built for Australian installer wiring standards and the ranges of dampers they support cover every ducted brand we install.",
    productLabel: "1 product · Milieu Touch zoning (up to 24 zones, multi-unit)",
    photo: "/Milieu Zonemate tablet.jpg",
    photoFallback: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",
    photoAlt: "Zonemate Milieu wall tablet zoning control",
    accent: "#7A4CD8",
    established: "Australian-designed and manufactured for the local ducted market",
    warranty: "5-year controller + 5-year dampers + 6-year on our workmanship",
    keyFeatures: [
      "Up to 12 zones on a single control board — covers virtually every residential ducted install",
      "Second control board doubles capacity to 24 zones — large homes and commercial fitouts",
      "Runs multiple ducted units off one Milieu tablet — a single interface for a two-system home",
      "Milieu app on iOS + Android mirrors the wall tablet — one UI, two access points",
      "Variable-speed dampers modulate airflow 0-100% per zone (proper comfort, not just on/off)",
      "Constant-speed dampers offered where a customer just wants on/off zone control at a lower price",
    ],
    commonInMelbourne:
      "Every ducted job we quote includes a Zonemate Milieu as standard. Zoning is the single biggest efficiency lever on a ducted system · shutting off unused rooms cuts running cost 30-40%. Milieu's 12-zones-on-one-board headroom means we can quote larger homes without expansion, and the multi-unit control feature is genuinely useful for the Clyde North / Officer double-storeys running two ducted systems.",
    support:
      "Zonemate's Melbourne office is on the phone within an hour when we hit a wiring issue. Controllers and dampers are held locally by our supplier network · same-day delivery for warranty replacements.",
    resources: [
      { label: "Zonemate zoning systems", href: "https://zonemate.com.au/" },
    ],
    gallery: [
      { src: "/Milieu Zonemate tablet.jpg", alt: "Zonemate Milieu wall tablet zoning control" },
      { src: "/Zonemate milieu app main screen.jpg", alt: "Zonemate Milieu app main screen" },
      { src: "/Zonemate milieu app control . jpg.jpg", alt: "Zonemate Milieu app zone control" },
      { src: "/ZoneMate-Smart-Sensor-Residential_8-1.jpg", alt: "Zonemate smart room sensor" },
      { src: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg", alt: "Zonemate touch controller in a living room" },
      { src: "/Individual-Temps-Family_Mobile.jpg", alt: "Zonemate app running individual room temperatures" },
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
        photoAlt: "Zonemate Milieu wall tablet — up to 12 zones + multi-unit control",
        bestFor: "Every ducted install — from a 4-zone single-storey through to a 24-zone commercial fitout with multiple ducted units run off one control",
        ourTake:
          "Zonemate is the only zoning system we install and the reason is simple: it's the single biggest efficiency lever on any ducted system. Shutting off unused rooms cuts running cost 30-40%. The Milieu control handles up to 12 zones on a single board (a second board doubles it to 24) and — crucially — it can run multiple ducted indoor units off the same wall tablet, so a large home or a commercial fitout gets a single interface instead of one per system. Right-sized to the home: 6-zone for most family homes, 12-zone for double-storey and larger, 24-zone with the expansion board when a warehouse fitout or a big commercial job calls for it.",
        specs: [
          { label: "Zones per control board", value: "Up to 12 zones (single board)" },
          { label: "Max zones with expansion", value: "Up to 24 zones (add a second control board)" },
          { label: "Multi-unit control", value: "Runs multiple ducted units off the one Milieu tablet" },
          { label: "Wall interface", value: "Zonemate Milieu touch tablet (Wi-Fi + app control included)" },
          { label: "Damper options", value: "Variable-speed (0-100% modulation) or constant-speed (on/off)" },
          { label: "Compatibility", value: "Mitsubishi PEA-M / PEAD-M, Kaden KCI, and every ducted brand we install" },
          { label: "Room sensors", value: "Optional Zonemate Smart Sensors per zone for true room-temp targeting" },
          { label: "App control", value: "Milieu app on iOS + Android — same UI as the wall tablet" },
          { label: "Controller warranty", value: "5-year parts + labour" },
          { label: "Damper warranty", value: "5-year parts + labour" },
          { label: "Workmanship", value: "6-year on our install" },
        ],
        features: [
          "Up to 12 zones on a single control board — covers virtually every residential ducted install without expansion",
          "Second control board doubles capacity to 24 zones — for large homes or commercial fitouts",
          "Runs multiple ducted units off the one Milieu tablet — no separate controller per system",
          "Milieu app on iOS + Android — same UI as the wall tablet, no learning curve for the household",
          "Variable-speed dampers modulate 0-100% per zone so airflow ramps rather than slams open/shut",
          "Constant-speed dampers offered where the customer just wants simple on/off zone control at a lower price",
          "Room-by-room Smart Sensors give true room-temp targeting instead of just return-air temp",
          "Australian-designed and Melbourne-supported — parts warehouse on the phone within an hour",
          "Plays with every ducted brand we install — no bridge or third-party interface needed",
        ],
        whyWeInstall: [
          "The single biggest efficiency lever on a ducted system — shutting off unused rooms cuts running cost 30-40%",
          "12-zones-on-one-board headroom means we can add a bedroom / study zone in year 3 without ripping out the controller",
          "Multi-unit-from-one-control is unique in the residential zoning market — genuinely handy for larger homes with a second ducted system",
          "Only zoning brand we quote — the wiring standard is built for how Australian installers work",
          "Melbourne parts + support means warranty replacements land same-day, not weeks later",
          "Backed by 5-year parts + our 6-year workmanship — 6+ years fully covered end-to-end",
        ],
      },
    ],
  },
];

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

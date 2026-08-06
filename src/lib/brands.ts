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
   *  south-east — housing stock it suits, suburbs we install a lot in. */
  commonInMelbourne?: string;
  /** Parts + service context (how quickly we can get replacement parts,
   *  service turnaround, etc). */
  support?: string;
  /** Optional links to spec sheets / brochures on the manufacturer's site. */
  resources?: { label: string; href: string }[];
  products: Product[];
};

/** Category → photo map. Products fall through to this when they don't
 *  set a per-product `photo` override. All paths live in /public as WebP.
 *
 *  When real manufacturer shots are dropped into /public (see filename
 *  list below), swap the src to point at them here.
 *
 *  Filenames to save real photos as (Wave 3 of the photo-swap plan):
 *    /mitsubishi-msz-ap.webp          — Mitsubishi MSZ-AP wall split
 *    /mitsubishi-pead-ducted.webp     — Mitsubishi PEAD-M ducted indoor
 *    /mitsubishi-outdoor-large.webp   — Mitsubishi twin-fan outdoor
 *    /kaden-bold-split.webp           — Kaden wall split + outdoor
 *    /kaden-ducted-small.webp         — Kaden ducted small
 *    /kaden-ducted-large.webp         — Kaden ducted twin-fan outdoor
 *    /kaden-multi-diagram.webp        — Kaden multi-head system diagram
 *    /kaden-gas-ducted.webp           — Kaden gas ducted heater
 *    /kaden-evaporative.webp          — Kaden evaporative roof cooler
 *    /reclaim-co2-split.webp          — Reclaim CO2 split system
 *    /reclaim-r290-range.webp         — Reclaim R290 tank range
 *    /thermann-integrated-heat-pump.webp — Thermann integrated HP
 *    /thermann-continuous-flow.webp   — Thermann G-series CF
 *    /thermann-electric-storage.webp  — Thermann electric storage tank
 *    /zonemate-touch-controller.webp  — Zonemate wall tablet
 *    /zonemate-app.webp               — Zonemate app on phone
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
    tagline: "Melbourne gas ducted heating — the local incumbent.",
    origin: "Melbourne, Australia (Rinnai Group)",
    intro:
      "Brivis is the gas ducted heater we replace, service and re-install more than any other in the south-east. Melbourne winters and Brivis are historically intertwined — most homes in Pakenham, Berwick, Officer and Cranbourne built between 1990 and 2015 shipped with a Brivis in the roof or under the floor.",
    ourTake:
      "We install Brivis when a customer wants a like-for-like gas ducted replacement — same footprint, same ducts, same controller wiring. If the existing unit is past 12-15 years old, we'll also quote a reverse-cycle switch alongside so the customer can compare running-cost economics before committing.",
    accreditation: "Brivis-Rinnai approved installer",
    productLabel: "4 models — internal, external, in-slab, add-on cooling",
    photo: "/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg",
    photoFallback: "/gas-ducted-install.webp",
    photoAlt: "Brivis gas ducted heater installed in a Melbourne home",
    accent: "#0058A5",
    established: "Founded 1971 · Melbourne · part of Rinnai Australia since 2004",
    warranty: "5-year manufacturer warranty on heat exchanger + 6-year on our workmanship",
    keyFeatures: [
      "The gas ducted brand more Melbourne homes were built with than any other",
      "Same-footprint retrofit into most existing Brivis / Braemar cavities",
      "3-star to 5-star efficiency options across the range",
      "Australian-designed for Melbourne winters",
      "Rinnai-backed parts pipeline — even 15-year-old units are still serviceable",
    ],
    commonInMelbourne:
      "The dominant gas ducted heater in Pakenham, Berwick, Cranbourne, Officer and Endeavour Hills homes built 1990-2015. If a customer is retrofitting a working ducted system, staying on Brivis is the cheapest path because the existing ducts, controller wiring and cupboard footprint all reuse.",
    support:
      "Rinnai's Melbourne warehouse holds Brivis parts for every unit still in the field, including discontinued models. We keep a stock of controllers, ignition units and burners on the truck — most Brivis service jobs are one-visit fixes.",
    resources: [
      { label: "Brivis product range", href: "https://www.brivis.com.au/products/" },
      { label: "Rinnai Australia support", href: "https://www.rinnai.com.au/" },
    ],
    products: [
      {
        slug: "brivis-buffalo",
        name: "Brivis Buffalo Internal Gas Ducted",
        model: "Buffalo 80 / 100 / 120",
        category: "ducted",
        categoryLabel: "Internal gas ducted heater",
        capacity: "20 kW to 32 kW output",
        veuEligible: false,
        bestFor: "Retrofit into existing internal gas heater cupboard",
        ourTake:
          "The Buffalo is Brivis's internal in-cupboard heater — the most common Brivis we replace. Fits into the same footprint as older Brivis and Braemar units, so the retrofit is quick and the existing ducts are reused. 3-star to 5-star efficiency options.",
        specs: [
          { label: "Output range", value: "20 – 32 kW" },
          { label: "Install position", value: "Internal cupboard (under-floor / roof)" },
          { label: "Star rating", value: "3-star / 4-star / 5-star options" },
          { label: "Gas type", value: "Natural gas / LPG" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        related: ["brivis-starpro", "brivis-contour", "kaden-gas-ducted"],
      },
      {
        slug: "brivis-starpro",
        name: "Brivis StarPro External Gas Ducted",
        model: "StarPro SP 5",
        category: "ducted",
        categoryLabel: "External roof-mount gas ducted",
        capacity: "20 kW to 32 kW output",
        veuEligible: false,
        bestFor: "Roof-mounted replacement where internal space is at a premium",
        ourTake:
          "The StarPro is Brivis's roof-top unit — for homes without internal cupboard space. Weather-rated cabinet, 5-star efficiency, same ductwork compatibility as the Buffalo. Common on the newer 2010s estates in Officer + Clyde where roof-mount was the developer's default.",
        specs: [
          { label: "Output range", value: "20 – 32 kW" },
          { label: "Install position", value: "Roof-mounted, external" },
          { label: "Star rating", value: "5-star" },
          { label: "Gas type", value: "Natural gas / LPG" },
        ],
        related: ["brivis-buffalo", "brivis-contour"],
      },
      {
        slug: "brivis-in-slab",
        name: "Brivis Compact In-Slab Gas Ducted",
        model: "HX 3 / HX 5",
        category: "ducted",
        categoryLabel: "In-slab compact gas ducted",
        capacity: "17 kW to 28 kW output",
        veuEligible: false,
        bestFor: "Homes with in-slab ducting from build",
        ourTake:
          "The HX is Brivis's compact under-floor / in-slab option. Common in older Pakenham and Berwick homes with slab-in-ground ducts. Smaller footprint than the Buffalo but ties into the same duct network.",
        specs: [
          { label: "Output range", value: "17 – 28 kW" },
          { label: "Install position", value: "In-slab / under-floor" },
          { label: "Star rating", value: "3-star / 4-star" },
        ],
        related: ["brivis-buffalo"],
      },
      {
        slug: "brivis-contour",
        name: "Brivis Contour Add-on Refrigerated Cooling",
        model: "Contour C 3.5 / 5 / 6.5",
        category: "ducted",
        categoryLabel: "Add-on cooling module (piggy-backs gas ducted)",
        capacity: "8 kW to 16 kW cooling",
        veuEligible: false,
        bestFor: "Existing Brivis gas ducted customer wanting summer cooling without a full ducted retrofit",
        ourTake:
          "The Contour piggy-backs onto an existing Brivis gas ducted setup — same ducts, adds a refrigerated cooling module. Cheaper than ripping out gas and installing full reverse-cycle. Solid mid-life upgrade for a homeowner staying on gas but wanting summer cooling.",
        specs: [
          { label: "Cooling capacity", value: "8 – 16 kW" },
          { label: "Requires", value: "Compatible Brivis gas ducted unit + suitable ductwork" },
          { label: "Gas type", value: "Retains natural gas / LPG for heating" },
        ],
        related: ["brivis-buffalo", "brivis-starpro", "kaden-ducted-14"],
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
      "Mitsubishi Electric is the brand we quote first on any air conditioning job unless the customer's budget rules it out. The reliability record across our install base is genuinely without peer — a decade-old MSZ-AP still runs to spec, and the parts pipeline for older units is still open.",
    ourTake:
      "We're pursuing Mitsubishi Electric Diamond Dealer accreditation. When it lands we can offer the extended 7-year manufacturer warranty on top of our own 6-year workmanship warranty. That's a 13-year backstop on a unit that's already the most reliable in the category.",
    accreditation: "Diamond Dealer (in progress)",
    productLabel: "22 models — splits, multi-head, ducted, cassette, controllers",
    photo: "/AP_70-80HP_front-1920x1440-1.png",
    photoFallback: "/reclaim-mitsubishi.webp",
    photoAlt: "Mitsubishi Electric MSZ-AP wall split system",
    accent: "#DA1A32",
    established: "Australian sales since 1978 · manufacturing in Thailand",
    warranty: "5-year manufacturer parts + labour + 6-year on our workmanship. Diamond Dealer accredited installers unlock a 7-year extended warranty.",
    keyFeatures: [
      "The lowest failure rate in our install base — a decade-old MSZ-AP still runs to spec",
      "Parts pipeline is genuinely never a worry, even for units we installed 10+ years ago",
      "MSZ-AP is our default; MSZ-FH Hyper Heating for cold-climate suburbs; PEAD-M ducted for family homes",
      "Diamond Dealer accreditation (in progress) unlocks 7-year extended warranty",
      "R32 refrigerant across the range — modern, low-GWP",
      "MELCloud Wi-Fi module adds phone control to any indoor unit",
    ],
    commonInMelbourne:
      "The default premium spec across every Melbourne suburb we install in. Berwick, Officer, Clyde North and Cranbourne new-builds spec the PEAD-M ducted almost by default; Berwick and Pakenham weatherboards typically get the MSZ-AP wall splits; hills suburbs (Emerald, Gembrook, Cockatoo) get the MSZ-FH Hyper Heating for cold-morning performance.",
    support:
      "Mitsubishi's Melbourne parts warehouse is same-day for common indoor/outdoor parts. Manufacturer tech support is genuinely responsive. We rarely wait on a part.",
    resources: [
      { label: "Wall-mounted range", href: "https://www.mitsubishielectric.com.au/products/residential/air-conditioners/wall-mounted-air-conditioners/" },
      { label: "Ducted range", href: "https://www.mitsubishielectric.com.au/products/residential/air-conditioners/ducted-air-conditioning/" },
      { label: "Multi-head range", href: "https://www.mitsubishielectric.com.au/products/residential/air-conditioners/multi-head-split-system-air-conditioners/" },
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
          "The 2.5 kW MSZ-AP is our workhorse bedroom unit — quiet at 21 dBA on low fan, sips power on standby, and the parts pipeline is genuinely never a worry. If you want a single unit in a kid's bedroom, this is what we install.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.2 kW" },
          { label: "Room size", value: "up to 25 m²" },
          { label: "Refrigerant", value: "R32" },
          { label: "Indoor sound (min)", value: "21 dBA" },
          { label: "Star rating", value: "4.5 cool / 4.5 heat (zoned)" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        related: ["msz-ap35", "msz-ap50", "msz-ln25"],
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
        related: ["msz-ap25", "msz-ap50", "msz-ln35"],
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
          "The step between the 5.0 and the 7.1 — for the awkward room size that's between a normal living and a proper great-room. Cathedral ceilings or a big north-facing glass wall usually push us up to the 6.0.",
        specs: [
          { label: "Cooling capacity", value: "6.0 kW" },
          { label: "Heating capacity", value: "6.8 kW" },
          { label: "Room size", value: "up to 60 m²" },
        ],
        related: ["msz-ap50", "msz-ap71", "mxz-4f"],
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
          "The 7.1 is the biggest wall-mounted unit we'd typically spec — beyond this, ducted or multi-head makes more sense. For a big north-facing living zone in Berwick or Officer, this is usually the answer.",
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
          "The biggest wall split Mitsubishi makes. Beyond this size a ducted system usually delivers better airflow distribution — but for a large single space where you don't want ducting, this is the pick.",
        specs: [
          { label: "Cooling capacity", value: "8.0 kW" },
          { label: "Heating capacity", value: "9.0 kW" },
          { label: "Room size", value: "up to 85 m²" },
        ],
        related: ["msz-ap71", "pead-m"],
      },
      {
        slug: "msz-ln25",
        name: "MSZ-LN25 Design Wall Split",
        model: "MSZ-LN25VG2",
        category: "split-system",
        categoryLabel: "Design series wall split",
        capacity: "2.5 kW cooling / 3.2 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Bedroom where the unit is visible and design matters",
        ourTake:
          "The LN is the Design-series MSZ-AP — same reliability underneath, flush glass front, matte finish. About $500 more than the AP but people who care about the look on the wall don't mind the premium.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.2 kW" },
          { label: "Finish", value: "Pearl White / Ruby Red / Onyx Black / Natural White" },
        ],
        related: ["msz-ap25", "msz-ln35", "msz-ln50"],
      },
      {
        slug: "msz-ln35",
        name: "MSZ-LN35 Design Wall Split",
        model: "MSZ-LN35VG2",
        category: "split-system",
        categoryLabel: "Design series wall split",
        capacity: "3.5 kW cooling / 4.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Master bedroom with a design finish",
        ourTake:
          "The 3.5 kW Design — our recommendation when the customer specifies a matte black or ruby red unit to match a feature wall.",
        specs: [
          { label: "Cooling capacity", value: "3.5 kW" },
          { label: "Heating capacity", value: "4.0 kW" },
          { label: "Finish", value: "4 designer colours" },
        ],
        related: ["msz-ln25", "msz-ln50", "msz-ap35"],
      },
      {
        slug: "msz-ln50",
        name: "MSZ-LN50 Design Wall Split",
        model: "MSZ-LN50VG2",
        category: "split-system",
        categoryLabel: "Design series wall split",
        capacity: "5.0 kW cooling / 6.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Open-plan living with a visible-unit design brief",
        ourTake:
          "The Design 5.0 goes into a lot of high-end Berwick and Officer new-builds where the interior designer has specified a matte finish. Same 5.0 kW performance as the AP, just wrapped in glass.",
        specs: [
          { label: "Cooling capacity", value: "5.0 kW" },
          { label: "Heating capacity", value: "6.0 kW" },
        ],
        related: ["msz-ap50", "msz-ln35", "msz-fh50"],
      },
      {
        slug: "msz-ef25",
        name: "MSZ-EF25 Design Wall Split",
        model: "MSZ-EF25VG",
        category: "split-system",
        categoryLabel: "Design series wall split",
        capacity: "2.5 kW cooling / 3.2 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Design-conscious bedroom install where LN is over-specified",
        ourTake:
          "The EF is a mid-tier design option between the AP and the LN. Sleeker face than the AP but without the LN's glass premium.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.2 kW" },
        ],
        related: ["msz-ap25", "msz-ln25"],
      },
      {
        slug: "msz-ef35",
        name: "MSZ-EF35 Design Wall Split",
        model: "MSZ-EF35VG",
        category: "split-system",
        categoryLabel: "Design series wall split",
        capacity: "3.5 kW cooling / 4.0 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Master bedroom, mid-tier design finish",
        ourTake:
          "3.5 kW in the EF trim — the split we recommend when someone wants the design cue without the LN price step.",
        specs: [
          { label: "Cooling capacity", value: "3.5 kW" },
          { label: "Heating capacity", value: "4.0 kW" },
        ],
        related: ["msz-ap35", "msz-ln35"],
      },
      {
        slug: "msz-fh25",
        name: "MSZ-FH25 Hyper Heating Wall Split",
        model: "MSZ-FH25VE",
        category: "split-system",
        categoryLabel: "Hyper Heating wall split",
        capacity: "2.5 kW cooling / 3.6 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Emerald, Gembrook, Cockatoo — cold-climate zone bedrooms",
        ourTake:
          "The FH-series is the only Mitsubishi that holds rated heating capacity down to -15°C outdoor. It's not overkill for the Dandenong Ranges — a normal MSZ-AP loses ~30% of its heating capacity at 0°C, the FH doesn't. We spec it for every Cockatoo / Emerald / Gembrook install.",
        specs: [
          { label: "Cooling capacity", value: "2.5 kW" },
          { label: "Heating capacity", value: "3.6 kW at 7°C, 3.3 kW at -15°C" },
          { label: "Refrigerant", value: "R32" },
        ],
        related: ["msz-fh35", "msz-fh50", "msz-ap25"],
      },
      {
        slug: "msz-fh35",
        name: "MSZ-FH35 Hyper Heating Wall Split",
        model: "MSZ-FH35VE",
        category: "split-system",
        categoryLabel: "Hyper Heating wall split",
        capacity: "3.5 kW cooling / 4.8 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Hills-country living zones — Emerald, Gembrook, Cockatoo",
        ourTake:
          "3.5 kW cool, 4.8 kW heat at -15°C — the FH35 punches above its weight when it's a cold morning in the ranges. Costs more up-front but pays for itself in comfort inside a couple of winters.",
        specs: [
          { label: "Cooling capacity", value: "3.5 kW" },
          { label: "Heating capacity", value: "4.8 kW at 7°C" },
        ],
        related: ["msz-fh25", "msz-fh50"],
      },
      {
        slug: "msz-fh50",
        name: "MSZ-FH50 Hyper Heating Wall Split",
        model: "MSZ-FH50VE",
        category: "split-system",
        categoryLabel: "Hyper Heating wall split",
        capacity: "5.0 kW cooling / 6.7 kW heating",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Large open-plan hills living zone",
        ourTake:
          "5.0 kW in Hyper Heating trim — the pick for a large hills-country living space where cold-morning performance genuinely matters.",
        specs: [
          { label: "Cooling capacity", value: "5.0 kW" },
          { label: "Heating capacity", value: "6.7 kW at 7°C" },
        ],
        related: ["msz-fh35", "msz-ap50"],
      },
      {
        slug: "mxz-2f",
        name: "MXZ-2F Multi-Head Outdoor",
        model: "MXZ-2F42VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        capacity: "4.2 kW combined — 2 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Two-bedroom apartment or a townhouse with limited outdoor space",
        ourTake:
          "The 2F is the smallest multi-head — one outdoor condenser feeding two indoor heads. Ideal for an apartment where you only have one balcony spot for the outdoor unit.",
        specs: [
          { label: "Combined cool", value: "4.2 kW" },
          { label: "Combined heat", value: "5.2 kW" },
          { label: "Heads supported", value: "2" },
          { label: "Refrigerant", value: "R32" },
        ],
        related: ["mxz-3f", "mxz-4f", "msz-ap25"],
      },
      {
        slug: "mxz-3f",
        name: "MXZ-3F Multi-Head Outdoor",
        model: "MXZ-3F54VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        capacity: "5.4 kW combined — 3 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Three-bedroom home where three heads share one condenser",
        ourTake:
          "The 3F is our most-installed multi-head. One outdoor unit, three bedrooms — cleaner externally than three separate splits, and the individual room controllers give proper zone control.",
        specs: [
          { label: "Combined cool", value: "5.4 kW" },
          { label: "Combined heat", value: "6.8 kW" },
          { label: "Heads supported", value: "3" },
        ],
        related: ["mxz-2f", "mxz-4f", "mxz-5f"],
      },
      {
        slug: "mxz-4f",
        name: "MXZ-4F Multi-Head Outdoor",
        model: "MXZ-4F80VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        capacity: "8.0 kW combined — 4 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Four-bedroom family home wanting per-room zone control",
        ourTake:
          "The 4F is our recommendation for a family home that's outgrown ducted zones and wants individual per-room setpoints. Fewer outdoor units, per-room controllers, one refrigerant loop to service.",
        specs: [
          { label: "Combined cool", value: "8.0 kW" },
          { label: "Combined heat", value: "9.6 kW" },
          { label: "Heads supported", value: "4" },
        ],
        related: ["mxz-3f", "mxz-5f", "pead-m"],
      },
      {
        slug: "mxz-5f",
        name: "MXZ-5F Multi-Head Outdoor",
        model: "MXZ-5F100VF",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        capacity: "10.0 kW combined — 5 indoor heads",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Larger single-storey family homes with 4 bed + 1 living zone",
        ourTake:
          "The 5F is the biggest multi-head Mitsubishi makes. Five heads, one outdoor unit. Beyond this we'd move to ducted.",
        specs: [
          { label: "Combined cool", value: "10.0 kW" },
          { label: "Combined heat", value: "12.0 kW" },
          { label: "Heads supported", value: "5" },
        ],
        related: ["mxz-4f", "pead-m"],
      },
      {
        slug: "pead-m",
        name: "PEAD-M Ducted (Mid-Static)",
        model: "PEAD-M SG series",
        category: "ducted",
        categoryLabel: "Mid-static ducted system",
        capacity: "5 kW to 14 kW (multiple indoor sizes)",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Single-storey family home ducted retrofit or new-build",
        ourTake:
          "The PEAD-M is our default ducted indoor unit. Mid-static means it has enough duct capacity for a typical 3-4 zone family home without oversized fan power. Pairs with the PUZ outdoor and any Mitsubishi zone controller.",
        specs: [
          { label: "Cool capacity range", value: "5 to 14 kW indoor" },
          { label: "Static pressure", value: "up to 150 Pa" },
          { label: "Refrigerant", value: "R32" },
          { label: "Zoning", value: "compatible with Zonemate 4/6/8" },
        ],
        related: ["pea-rp", "sez-kd", "zonemate-8"],
      },
      {
        slug: "pea-rp",
        name: "PEA-RP Ducted (High-Static)",
        model: "PEA-RP SG series",
        category: "ducted",
        categoryLabel: "High-static ducted system",
        capacity: "12 kW to 22 kW",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Double-storey homes, long duct runs, 6+ zones",
        ourTake:
          "The PEA-RP is the high-static big brother — necessary when you've got long duct runs or a double-storey with six or more zones. Enough fan power to actually deliver rated flow to the furthest zone.",
        specs: [
          { label: "Cool capacity range", value: "12 to 22 kW" },
          { label: "Static pressure", value: "up to 220 Pa" },
        ],
        related: ["pead-m", "zonemate-8"],
      },
      {
        slug: "sez-kd",
        name: "SEZ-KD Slim Ducted",
        model: "SEZ-KD series",
        category: "ducted",
        categoryLabel: "Slim ducted (shallow ceiling void)",
        capacity: "2.5 kW to 7.1 kW",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Homes with shallow ceiling void (200-250mm) where PEAD doesn't fit",
        ourTake:
          "The SEZ-KD is a slim-line ducted indoor that fits into a 200mm ceiling void — the pick when the ceiling cavity is too shallow for a normal PEAD. Common in the older Berwick and Officer weatherboards.",
        specs: [
          { label: "Indoor unit height", value: "200 mm" },
          { label: "Capacity range", value: "2.5 to 7.1 kW" },
        ],
        related: ["pead-m", "pea-rp"],
      },
      {
        slug: "slz-m",
        name: "SLZ-M Compact Cassette",
        model: "SLZ-M series",
        category: "cassette",
        categoryLabel: "600×600 compact 4-way cassette",
        capacity: "2.5 kW to 7.1 kW",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Small commercial fit-outs — offices, small retail, medical",
        ourTake:
          "The SLZ-M is the 600×600 compact cassette — the standard for small commercial and medical fit-outs. Slots into a suspended ceiling tile grid without cutting, 4-way airflow.",
        specs: [
          { label: "Cassette size", value: "600 × 600 mm" },
          { label: "Airflow", value: "4-way distribution" },
        ],
        related: ["pla-m"],
      },
      {
        slug: "pla-m",
        name: "PLA-M Large Cassette",
        model: "PLA-M series",
        category: "cassette",
        categoryLabel: "840×840 large 4-way cassette",
        capacity: "5 kW to 14 kW",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Larger commercial spaces, warehouse-style offices",
        ourTake:
          "The PLA-M is the bigger 840×840 cassette for larger commercial spaces. Better throw distance, better for rooms with higher ceilings.",
        specs: [
          { label: "Cassette size", value: "840 × 840 mm" },
        ],
        related: ["slz-m"],
      },
      {
        slug: "mfz-kj",
        name: "MFZ-KJ Floor Console",
        model: "MFZ-KJ series",
        category: "floor-console",
        categoryLabel: "Floor-standing console",
        capacity: "2.5 kW to 6.0 kW",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Rooms where you can't mount high on the wall — under a window, retrofit into old radiator locations",
        ourTake:
          "The MFZ-KJ sits on the floor like an old radiator — the answer when there's no wall space at high level, or the customer wants direct floor-level warmth.",
        specs: [
          { label: "Install", value: "floor-mounted, under-window compatible" },
        ],
        related: ["msz-ap35"],
      },
      {
        slug: "par-42maaub",
        name: "PAR-42 Wired Wall Controller",
        model: "PAR-42MAAUB",
        category: "controller",
        categoryLabel: "Wired wall controller",
        veuEligible: false,
        bestFor: "Ducted or cassette systems where the customer prefers a physical wall controller",
        ourTake:
          "The PAR-42 is the physical touchscreen wall controller — the option for anyone who doesn't want to reach for their phone to change the temperature. Standard on our commercial cassette installs.",
        specs: [{ label: "Compatibility", value: "PEAD-M / PEA-RP / SLZ-M / PLA-M" }],
        related: ["melcloud"],
      },
      {
        slug: "melcloud",
        name: "MELCloud Wi-Fi Controller",
        model: "MAC-587IF-E",
        category: "controller",
        categoryLabel: "Wi-Fi controller add-on",
        veuEligible: false,
        bestFor: "Adding smartphone control to any Mitsubishi indoor unit",
        ourTake:
          "MELCloud plugs into any Mitsubishi indoor unit and adds phone + web control. We fit it as standard on new installs — you'd rather have it and not need it than the reverse.",
        specs: [{ label: "Compatibility", value: "all current Mitsubishi Electric indoor units" }],
        related: ["par-42maaub"],
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
      "Reclaim is the premium end of the heat pump hot water market. CO₂ refrigerant (R744) instead of the R290 or R134a everyone else uses — natural refrigerant, zero global-warming potential, and it holds capacity in genuinely cold weather where other heat pumps struggle.",
    ourTake:
      "For a customer who wants the best heat pump on the market and knows they'll be in the house another decade, Reclaim is our first recommendation. Stainless steel tank, 6-year warranty on the tank, 5-year on the compressor, made in Australia. It costs more up-front and it earns that back.",
    accreditation: "Reclaim installer locator listed",
    productLabel: "6 models — CO₂ heat pumps, split PV kits, controllers",
    photo: "/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png",
    photoFallback: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump hot water system with controller",
    accent: "#2E8459",
    established: "Designed and assembled in Sydney, Australia · trading since 2007",
    warranty: "6-year cylinder + 5-year compressor + 6-year on our workmanship",
    keyFeatures: [
      "CO₂ (R744) natural refrigerant — zero global-warming potential",
      "Holds heating capacity down to -10°C ambient — matters for Emerald / Gembrook / cold-morning mornings",
      "316-grade stainless steel tank option — no anode to swap, no rust",
      "Quiet enough (37 dBA at 1m) to sit next to a bedroom wall",
      "Australian-designed for Australian conditions",
      "PV-diverter kit fires the compressor on solar surplus — earns its price back fast on any home with rooftop solar",
    ],
    commonInMelbourne:
      "Our default recommendation for any customer who intends to be in the house 10+ years. Popular through Pakenham Cameron Park estates, Berwick weatherboards being upgraded from gas storage, and every Cranbourne / Officer job where the customer specifies 'best of' and the tank sits in a visible spot (stainless finish reads as premium).",
    support:
      "Reclaim's Sydney factory holds parts for every unit currently in the field. Compressor swap-out is straightforward within warranty. We stock the common seals, O-rings and PV-diverter controllers on the truck.",
    resources: [
      { label: "Reclaim ECO R290 heat pump", href: "https://reclaimenergy.com.au/reclaim-eco-r290-heat-pump/" },
      { label: "Reclaim CO₂ heat pump", href: "https://reclaimenergy.com.au/co2-heat-pump/" },
      { label: "Reclaim CO₂ Wi-Fi heat pump", href: "https://reclaimenergy.com.au/reclaim-energy-co2-wi-fi-heat-pump/" },
    ],
    products: [
      {
        slug: "co2-315-stainless",
        name: "Reclaim CO₂ Series 3 · 315L Stainless",
        model: "RE315SS",
        category: "heat-pump",
        categoryLabel: "CO₂ heat pump hot water",
        capacity: "315 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        starRating: "5-star equivalent",
        veuEligible: true,
        bestFor: "Family of 4-6, wanting the premium end of heat pump hot water",
        ourTake:
          "The 315L stainless is Reclaim's flagship — and the tank we install more often than any other in the range. 316-grade stainless (no anode to replace, no rust), CO₂ refrigerant that holds capacity to -10°C, and quiet enough to sit next to a bedroom wall (37 dBA).",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "316-grade stainless" },
          { label: "Refrigerant", value: "R744 (CO₂, natural)" },
          { label: "Rated COP", value: "5.02 @ 15°C ambient" },
          { label: "Sound level", value: "37 dBA at 1 m" },
          { label: "Tank warranty", value: "6 years" },
          { label: "Compressor warranty", value: "5 years" },
        ],
        related: ["co2-250-stainless", "co2-400-stainless", "reclaim-pv-kit"],
      },
      {
        slug: "co2-250-stainless",
        name: "Reclaim CO₂ Series 3 · 250L Stainless",
        model: "RE250SS",
        category: "heat-pump",
        categoryLabel: "CO₂ heat pump hot water",
        capacity: "250 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        bestFor: "Couples or family of 3, premium spec",
        ourTake:
          "The 250L is the smaller Reclaim — same CO₂ compressor and stainless tank as the 315, just sized for smaller households. Ideal for a couple or a small family who don't need 315L of storage.",
        specs: [
          { label: "Tank capacity", value: "250 L" },
          { label: "Tank material", value: "316-grade stainless" },
          { label: "Refrigerant", value: "R744 (CO₂)" },
        ],
        related: ["co2-315-stainless", "co2-400-stainless"],
      },
      {
        slug: "co2-400-stainless",
        name: "Reclaim CO₂ Series 3 · 400L Stainless",
        model: "RE400SS",
        category: "heat-pump",
        categoryLabel: "CO₂ heat pump hot water",
        capacity: "400 L stainless steel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        bestFor: "Larger families (6+), acreage properties with high draw",
        ourTake:
          "The 400L is the big-family Reclaim — larger tank, same CO₂ compressor. What we spec for the acreage properties in Devon Meadows, Pearcedale, or a big family in Cranbourne South.",
        specs: [
          { label: "Tank capacity", value: "400 L" },
          { label: "Tank material", value: "316-grade stainless" },
        ],
        related: ["co2-315-stainless"],
      },
      {
        slug: "co2-315-vitreous",
        name: "Reclaim CO₂ Series 3 · 315L Vitreous",
        model: "RE315VE",
        category: "heat-pump",
        categoryLabel: "CO₂ heat pump hot water",
        capacity: "315 L vitreous-enamel tank",
        refrigerant: "R744 (CO₂)",
        veuEligible: true,
        bestFor: "Budget-conscious buyer who still wants Reclaim's CO₂ compressor",
        ourTake:
          "The vitreous tank drops the price ~$300 vs stainless — same compressor and refrigerant, just a glass-lined tank with a sacrificial anode instead of stainless. Better bang-for-buck if you're not planning to be in the house 20 years.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Tank material", value: "vitreous enamel + sacrificial anode" },
        ],
        related: ["co2-315-stainless", "co2-250-stainless"],
      },
      {
        slug: "reclaim-pv-kit",
        name: "Reclaim Split PV-Diverter Kit",
        model: "RE-PV-DIV",
        category: "accessory",
        categoryLabel: "Solar PV diverter",
        veuEligible: false,
        bestFor: "Homes with solar PV wanting to divert daytime surplus to hot water",
        ourTake:
          "The PV diverter tells the Reclaim compressor to fire when your PV is exporting — you heat water on free solar rather than grid power. Adds a few hundred bucks and pays back in one year for anyone with a decent-size PV system.",
        specs: [{ label: "Requires", value: "Reclaim heat pump + CT clamp on solar export" }],
        related: ["co2-315-stainless", "reclaim-wifi"],
      },
      {
        slug: "reclaim-wifi",
        name: "Reclaim Wi-Fi Controller Add-on",
        model: "RE-WIFI",
        category: "controller",
        categoryLabel: "Wi-Fi controller add-on",
        veuEligible: false,
        bestFor: "Monitoring COP and hot-water temperature from your phone",
        ourTake:
          "The Wi-Fi module gives you tank temperature, COP, and runtime in an app. Nice-to-have not need-to-have — but if you're the sort of person who cares about the numbers, this is what unlocks them.",
        specs: [{ label: "Compatibility", value: "any current Reclaim Series 3 tank" }],
        related: ["co2-315-stainless", "reclaim-pv-kit"],
      },
    ],
  },

  // ================== THERMANN (Rheem) ==================
  {
    slug: "thermann",
    name: "Thermann",
    tagline: "Volume brand, wide range, VEU-friendly.",
    origin: "Rheem Australia (Melbourne HQ)",
    intro:
      "Thermann is Rheem's premium sub-brand — the wider Rheem parts pipeline, distribution and warranty support, wrapped around a more modern product line. It's our volume brand: solid outcomes, wide range covering every fuel type and price point.",
    ourTake:
      "Thermann is what we quote first when the customer wants a proven, well-supported heat pump but doesn't want to pay Reclaim money. Rheem Pro accreditation means we get direct-line parts and warranty backing.",
    accreditation: "Rheem Pro accredited installer",
    productLabel: "14 models — heat pump, gas continuous flow, gas storage, solar",
    photo: "/thermann_integrated_heat_pump_02.jpg",
    photoFallback: "/thermann-heat-pump.webp",
    photoAlt: "Thermann integrated heat pump hot water system",
    accent: "#0090C3",
    established: "Rheem's premium sub-brand · Rheem Australia has been Melbourne-based since 1937",
    warranty: "5-year cylinder + 3-year compressor + 6-year on our workmanship. Series 5 compressor warranty extends to 5 years.",
    keyFeatures: [
      "Backed by Rheem Australia's Melbourne distribution and parts network",
      "Wide range covers every fuel type — heat pump, gas continuous flow, gas storage, solar",
      "R290 refrigerant in the heat pump range — low-GWP, high efficiency",
      "Best mid-tier VEU rebate outcome when Reclaim busts the budget",
      "Rheem Pro accreditation gives us direct-line parts + warranty backing",
      "G-series continuous flow is our default gas hot water swap when the customer wants to stay on gas",
    ],
    commonInMelbourne:
      "Our volume-tier default for VEU rebate customers who want a proven, well-supported brand at a mid price point. Thermann Series 5 heat pumps go into a lot of Hampton Park, Cranbourne and Narre Warren jobs where the rebate math works best. G-series continuous flow is our go-to gas hot water swap across the corridor.",
    support:
      "Rheem's Truganina and Dandenong South parts warehouses are same-day for us. Warranty claims process is streamlined via the Rheem Pro portal. Compressor + cylinder swap-outs are quick.",
    resources: [
      { label: "Thermann Integrated Heat Pump", href: "https://www.thermann.com.au/products/integrated-heat-pump/" },
      { label: "Thermann G-series continuous flow", href: "https://www.thermann.com.au/products/g-series-continuous-flow/" },
    ],
    products: [
      {
        slug: "series-4-270",
        name: "Thermann Series 4 · 270L Heat Pump",
        model: "T-HP-S4-270",
        category: "heat-pump",
        categoryLabel: "R290 heat pump hot water",
        capacity: "270 L",
        refrigerant: "R290 (propane, natural)",
        veuEligible: true,
        bestFor: "Family of 3-4, tight budget, VEU-eligible upgrade",
        ourTake:
          "The Series 4 is Thermann's mid-tier — a real workhorse for VEU rebate customers where budget is tight but the outcome needs to be solid. R290 refrigerant, 5-year warranty, quiet enough for most yards.",
        specs: [
          { label: "Tank capacity", value: "270 L" },
          { label: "Refrigerant", value: "R290 (propane)" },
          { label: "Warranty", value: "5-year cylinder / 3-year compressor" },
        ],
        related: ["series-4-315", "series-5-270", "istore-270"],
      },
      {
        slug: "series-4-315",
        name: "Thermann Series 4 · 315L Heat Pump",
        model: "T-HP-S4-315",
        category: "heat-pump",
        categoryLabel: "R290 heat pump hot water",
        capacity: "315 L",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Family of 4-5, tight budget, VEU-eligible",
        ourTake:
          "Same platform as the 270 with a larger tank. Our recommendation when the household draw is over about 200 L/day.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
          { label: "Refrigerant", value: "R290 (propane)" },
        ],
        related: ["series-4-270", "series-5-315"],
      },
      {
        slug: "series-5-270",
        name: "Thermann Series 5 · 270L Heat Pump",
        model: "T-HP-S5-270",
        category: "heat-pump",
        categoryLabel: "R290 heat pump hot water",
        capacity: "270 L",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Family of 3-4, want better cold-weather performance than Series 4",
        ourTake:
          "The Series 5 steps up the compressor and controls over the Series 4. Better COP in cooler weather, longer warranty on the compressor. Worth the ~$400 step for anyone who wants more than the minimum.",
        specs: [
          { label: "Tank capacity", value: "270 L" },
          { label: "Compressor warranty", value: "5 years" },
        ],
        related: ["series-4-270", "series-5-315", "series-5-r290-270"],
      },
      {
        slug: "series-5-315",
        name: "Thermann Series 5 · 315L Heat Pump",
        model: "T-HP-S5-315",
        category: "heat-pump",
        categoryLabel: "R290 heat pump hot water",
        capacity: "315 L",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Family of 4-5, mid-premium spec",
        ourTake:
          "The 315L Series 5 is our default recommendation in the Thermann range — best balance of tank size, compressor spec and price for a typical family draw.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
        ],
        related: ["series-5-270", "series-4-315", "co2-315-stainless"],
      },
      {
        slug: "series-5-r290-270",
        name: "Thermann R290 Series 5 · 270L",
        model: "T-HP-R290-270",
        category: "heat-pump",
        categoryLabel: "R290 heat pump hot water (Rev 2)",
        capacity: "270 L",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Cooler-climate suburbs — Emerald, Cockatoo, Gembrook",
        ourTake:
          "The R290 variant of the Series 5 — tuned for cooler ambient temperatures. Not as extreme as Reclaim's CO₂, but a solid step above the standard Series 5 for anywhere the ranges hit single digits on winter mornings.",
        specs: [
          { label: "Tank capacity", value: "270 L" },
        ],
        related: ["series-5-r290-315", "series-5-270"],
      },
      {
        slug: "series-5-r290-315",
        name: "Thermann R290 Series 5 · 315L",
        model: "T-HP-R290-315",
        category: "heat-pump",
        categoryLabel: "R290 heat pump hot water (Rev 2)",
        capacity: "315 L",
        refrigerant: "R290 (propane)",
        veuEligible: true,
        bestFor: "Larger families in cooler suburbs",
        ourTake:
          "R290 Series 5 in the 315L tank size — the pick for a 4-5 person family in the Dandenong Ranges or a cool-morning postcode.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
        ],
        related: ["series-5-r290-270", "series-5-315"],
      },
      {
        slug: "solar-300",
        name: "Thermann Solar · 300L Close-Couple",
        model: "T-SOL-300CC",
        category: "solar-hot-water",
        categoryLabel: "Solar hot water",
        capacity: "300 L close-couple",
        veuEligible: false,
        bestFor: "Roof with north-facing space and no shading, wanting the traditional solar setup",
        ourTake:
          "Solar hot water is a decreasing part of the market — heat pump usually beats it on economics and complexity now. But if you've got a good north roof and no PV, close-couple solar still works.",
        specs: [
          { label: "Tank capacity", value: "300 L" },
          { label: "Layout", value: "close-couple (tank on roof with panels)" },
        ],
        related: ["solar-400", "series-5-315"],
      },
      {
        slug: "solar-400",
        name: "Thermann Solar · 400L Split System",
        model: "T-SOL-400SP",
        category: "solar-hot-water",
        categoryLabel: "Solar hot water (split)",
        capacity: "400 L split",
        veuEligible: false,
        bestFor: "Larger household wanting solar with ground-mounted tank",
        ourTake:
          "Split solar — panels on the roof, tank on the ground. Bigger tank capacity, no weight on the roof. More common for larger family homes than close-couple.",
        specs: [
          { label: "Tank capacity", value: "400 L" },
          { label: "Layout", value: "split (panels on roof, tank on ground)" },
        ],
        related: ["solar-300"],
      },
      {
        slug: "cf-16",
        name: "Thermann Continuous Flow · 16 L/min",
        model: "T-CF-16",
        category: "gas-continuous-flow",
        categoryLabel: "Gas continuous-flow hot water",
        capacity: "16 L/min",
        veuEligible: false,
        bestFor: "Couple or small family (1-2 bathrooms)",
        ourTake:
          "The 16 L/min is our smallest continuous-flow — enough for a couple or a small family with one bathroom. If you might ever run a shower and a tap simultaneously, jump up to the 20 L/min.",
        specs: [
          { label: "Flow rate", value: "16 L/min at 25°C rise" },
          { label: "Gas type", value: "Natural gas or LPG" },
        ],
        related: ["cf-20", "cf-26", "cf-32"],
      },
      {
        slug: "cf-20",
        name: "Thermann Continuous Flow · 20 L/min",
        model: "T-CF-20",
        category: "gas-continuous-flow",
        categoryLabel: "Gas continuous-flow hot water",
        capacity: "20 L/min",
        veuEligible: false,
        bestFor: "Family of 3-4, one or two bathrooms",
        ourTake:
          "The 20 L/min is our most-installed continuous flow. Enough capacity for two showers simultaneously without pressure loss.",
        specs: [
          { label: "Flow rate", value: "20 L/min at 25°C rise" },
        ],
        related: ["cf-16", "cf-26"],
      },
      {
        slug: "cf-26",
        name: "Thermann Continuous Flow · 26 L/min",
        model: "T-CF-26",
        category: "gas-continuous-flow",
        categoryLabel: "Gas continuous-flow hot water",
        capacity: "26 L/min",
        veuEligible: false,
        bestFor: "Larger family (2+ bathrooms), simultaneous draw",
        ourTake:
          "The 26 L/min handles two bathrooms running simultaneously plus a kitchen tap without pressure drop. Our default for family homes with more than one bathroom.",
        specs: [
          { label: "Flow rate", value: "26 L/min at 25°C rise" },
        ],
        related: ["cf-20", "cf-32"],
      },
      {
        slug: "cf-32",
        name: "Thermann Continuous Flow · 32 L/min",
        model: "T-CF-32",
        category: "gas-continuous-flow",
        categoryLabel: "Gas continuous-flow hot water",
        capacity: "32 L/min",
        veuEligible: false,
        bestFor: "3+ bathrooms, high simultaneous demand",
        ourTake:
          "The 32 L/min is the biggest continuous flow we install — for homes with three bathrooms all running simultaneously or high-draw applications.",
        specs: [
          { label: "Flow rate", value: "32 L/min at 25°C rise" },
        ],
        related: ["cf-26"],
      },
      {
        slug: "gas-storage-170",
        name: "Thermann Gas Storage · 170L",
        model: "T-GS-170",
        category: "gas-storage",
        categoryLabel: "Gas storage hot water",
        capacity: "170 L",
        veuEligible: false,
        bestFor: "Like-for-like replacement of an old gas storage tank",
        ourTake:
          "Gas storage is a shrinking market — most customers moving off gas move to heat pump. But for a like-for-like replacement where the existing gas connection and location can't accommodate anything else, this is the tank.",
        specs: [
          { label: "Tank capacity", value: "170 L" },
        ],
        related: ["cf-20", "series-5-270"],
      },
      {
        slug: "electric-storage-315",
        name: "Thermann Electric Storage · 315L",
        model: "T-ES-315",
        category: "electric-storage",
        categoryLabel: "Electric storage hot water",
        capacity: "315 L",
        veuEligible: false,
        bestFor: "Emergency like-for-like replacement of a failed electric tank",
        ourTake:
          "Electric storage doesn't qualify for VEU and is the most expensive fuel to run — we only install this as a last-resort emergency replacement. For any planned upgrade, the heat pump equivalent is a better financial outcome.",
        specs: [
          { label: "Tank capacity", value: "315 L" },
        ],
        related: ["series-5-315", "co2-315-stainless"],
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
    productLabel: "5 models — heat pump storage, PV diverter",
    photo: "/270L-istore-heatpump.webp",
    photoFallback: "/relcaim-split-close-up.webp",
    photoAlt: "iStore 270L heat pump hot water system",
    accent: "#F36722",
    established: "Australian-designed, Chinese-manufactured · trading since 2018",
    warranty: "6-year cylinder + 3-year compressor + 6-year on our workmanship",
    keyFeatures: [
      "Best VEU rebate outcome in the market — 270L install often lands under $900 out-of-pocket",
      "Built-in PV-diverter compatibility — smart-schedule the compressor around your solar",
      "Wi-Fi smart-app control comes standard — no aftermarket module needed",
      "R290 natural refrigerant, high COP",
      "Aggressive price point — the value pick when budget is the driving factor",
    ],
    commonInMelbourne:
      "Hampton Park, Cranbourne North and Doveton are the postcodes we install the most iStore into — the VEU rebate maths there consistently gets the out-of-pocket under $500. Also popular with solar-paired households through Officer and Clyde North where the built-in PV diverter pays back inside the first year.",
    support:
      "iStore parts flow through their Melbourne distributor. Warranty claims are handled by iStore's Sydney office directly with the homeowner — we handle the on-site swap-out.",
    resources: [
      { label: "iStore product range", href: "https://istore.com.au/" },
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
        ourTake:
          "The 180L is the smallest iStore — for couples or apartment installs where 270L is overkill. Post-VEU-rebate this can land under $500 out of pocket, which no other heat pump in the market can match.",
        specs: [
          { label: "Tank capacity", value: "180 L" },
          { label: "Refrigerant", value: "R290" },
        ],
        related: ["istore-270", "series-4-270"],
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
        ourTake:
          "The 270L iStore is our most-installed unit for Hampton Park and Cranbourne VEU rebate jobs. Post-VEU-rebate typically sits under $900, which is a genuinely hard number to beat.",
        specs: [
          { label: "Tank capacity", value: "270 L" },
          { label: "Refrigerant", value: "R290" },
        ],
        related: ["istore-180", "istore-300", "series-4-270"],
      },
      {
        slug: "istore-300",
        name: "iStore 300L Heat Pump",
        model: "iS-HP-300",
        category: "heat-pump",
        categoryLabel: "Heat pump hot water",
        capacity: "300 L",
        refrigerant: "R290",
        veuEligible: true,
        bestFor: "Larger families (5+) on a VEU rebate budget",
        ourTake:
          "The 300L is the biggest iStore — the pick for a large family that qualifies for VEU and wants tank capacity without paying Reclaim money.",
        specs: [
          { label: "Tank capacity", value: "300 L" },
          { label: "Refrigerant", value: "R290" },
        ],
        related: ["istore-270", "co2-400-stainless"],
      },
      {
        slug: "istore-pv-diverter",
        name: "iStore PV Diverter Controller",
        model: "iS-PV-DIV",
        category: "accessory",
        categoryLabel: "Solar PV diverter",
        veuEligible: false,
        bestFor: "iStore + rooftop PV — divert daytime solar surplus to hot water",
        ourTake:
          "The iStore PV diverter is built-in-friendly with the iStore range. Fires the compressor when the CT clamp sees PV export. Almost always worth it for solar homes.",
        specs: [{ label: "Requires", value: "iStore heat pump + CT on solar export circuit" }],
        related: ["istore-270", "reclaim-pv-kit"],
      },
      {
        slug: "istore-replacement-compressor",
        name: "iStore Replacement Compressor Kit",
        model: "iS-COMP-KIT",
        category: "accessory",
        categoryLabel: "Replacement compressor kit",
        veuEligible: false,
        bestFor: "Out-of-warranty iStore compressor replacement",
        ourTake:
          "Compressor replacement for out-of-warranty iStore tanks — cheaper than a full unit swap if the tank itself is still sound and the plumbing is in good shape.",
        specs: [{ label: "Compatibility", value: "iStore Gen 2 and later" }],
        related: ["istore-270"],
      },
    ],
  },

  // ================== KADEN ==================
  {
    slug: "kaden",
    name: "Kaden",
    tagline: "Aussie-distributed value-tier splits + ducted.",
    origin: "Australia (distributor)",
    intro:
      "Kaden is our value alternative when Mitsubishi Electric busts the customer's budget but they still want a properly-installed, warranty-backed system. Solid build for the price, national parts support, and the 5-year warranty on the compressor takes the risk out of the value tier.",
    ourTake:
      "We install Kaden when a family needs cooling in three bedrooms plus living and the Mitsubishi quote comes in over budget. The gap has closed noticeably over the last 3-4 years — Kaden today is what mid-tier Panasonic was five years ago.",
    accreditation: "Kaden authorised dealer",
    productLabel: "17 models — splits, multi-head, ducted, gas ducted, evaporative",
    photo: "/ksi_slide_0.jpg",
    photoFallback: "/kaden-indoor.webp",
    photoAlt: "Kaden split system with outdoor condenser",
    accent: "#12224E",
    established: "Australian-distributed since 2015 · manufactured in China to AS/NZS standards",
    warranty: "5-year manufacturer parts + labour + 6-year on our workmanship",
    keyFeatures: [
      "Best value-to-quality ratio at the mid-tier — genuinely closes the gap on premium brands",
      "Full range: wall splits (Bold + Ultra), multi-head, ducted (10-18 kW), gas ducted, evaporative",
      "Kaden Advance 6-star gas ducted is the most efficient value-tier gas heater in Melbourne",
      "R32 refrigerant in the aircon range",
      "National parts distribution — no waiting on overseas orders",
    ],
    commonInMelbourne:
      "Our value alternative when a family wants cooling in 3+ bedrooms and the Mitsubishi quote busts the budget. Very common in Cranbourne, Narre Warren, Hampton Park and Endeavour Hills where the customer wants a real system but the numbers need to work. Kaden gas ducted is our default like-for-like Brivis / Braemar replacement path.",
    support:
      "Kaden's Sydney warehouse handles Victorian parts distribution overnight to our supplier network. Warranty claims are handled through our supplier direct — 5-year parts + labour means most fixes are just a service call.",
    resources: [
      { label: "Kaden wall-mounted", href: "https://www.kadenair.com.au/products/wall-mounted-air-conditioning/" },
      { label: "Kaden ducted", href: "https://www.kadenair.com.au/products/ducted-air-conditioners/" },
      { label: "Kaden multi-head", href: "https://www.kadenair.com.au/products/multi-air-conditioning/" },
      { label: "Kaden gas ducted heating", href: "https://www.kadenair.com.au/products/gas-ducted-heating/" },
      { label: "Kaden evaporative cooling", href: "https://www.kadenair.com.au/products/evaporative-cooling/" },
    ],
    products: [
      {
        slug: "kaden-bold-25",
        name: "Kaden Bold 2.5 kW Split",
        model: "KDB25",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "2.5 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Bedroom on a tight budget",
        ourTake:
          "The Bold 2.5 is a genuinely capable budget bedroom split. Not as quiet as the MSZ-AP25 but a $600 saving that matters when you're doing three bedrooms.",
        specs: [{ label: "Cooling capacity", value: "2.5 kW" }],
        related: ["kaden-bold-35", "kaden-bold-5", "msz-ap25"],
      },
      {
        slug: "kaden-bold-35",
        name: "Kaden Bold 3.5 kW Split",
        model: "KDB35",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "3.5 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Master bedroom, budget spec",
        ourTake: "The step up from the 2.5 for master bedrooms and small living zones. Same value proposition.",
        specs: [{ label: "Cooling capacity", value: "3.5 kW" }],
        related: ["kaden-bold-25", "kaden-bold-5"],
      },
      {
        slug: "kaden-bold-5",
        name: "Kaden Bold 5.0 kW Split",
        model: "KDB50",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "5.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Living zone, budget spec",
        ourTake:
          "The Bold 5.0 is a big-selling value living-zone unit. About $700 saving vs the Mitsubishi MSZ-AP50 — not our first pick, but genuinely good value.",
        specs: [{ label: "Cooling capacity", value: "5.0 kW" }],
        related: ["kaden-bold-35", "kaden-bold-7", "kaden-ultra-5"],
      },
      {
        slug: "kaden-bold-7",
        name: "Kaden Bold 7.0 kW Split",
        model: "KDB70",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "7.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Large open-plan living zone, budget spec",
        ourTake: "7.0 kW at the value price point — for big living zones where the budget won't stretch to Mitsubishi.",
        specs: [{ label: "Cooling capacity", value: "7.0 kW" }],
        related: ["kaden-bold-5", "kaden-bold-8"],
      },
      {
        slug: "kaden-bold-8",
        name: "Kaden Bold 8.0 kW Split",
        model: "KDB80",
        category: "split-system",
        categoryLabel: "Wall split system",
        capacity: "8.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Warehouse living zones or big open-plan double-height rooms",
        ourTake: "The biggest wall split Kaden makes. Beyond this a ducted or multi-head makes more sense.",
        specs: [{ label: "Cooling capacity", value: "8.0 kW" }],
        related: ["kaden-bold-7", "kaden-ducted-14"],
      },
      {
        slug: "kaden-ultra-25",
        name: "Kaden Ultra 2.5 kW Split",
        model: "KDU25",
        category: "split-system",
        categoryLabel: "Premium wall split",
        capacity: "2.5 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Bedroom, mid-premium spec",
        ourTake:
          "The Ultra sits between the Bold and Mitsubishi's MSZ-AP — better inverter, quieter operation, WiFi-ready. Worth the ~$400 step from the Bold for anyone who cares.",
        specs: [{ label: "Cooling capacity", value: "2.5 kW" }],
        related: ["kaden-bold-25", "kaden-ultra-35", "msz-ap25"],
      },
      {
        slug: "kaden-ultra-35",
        name: "Kaden Ultra 3.5 kW Split",
        model: "KDU35",
        category: "split-system",
        categoryLabel: "Premium wall split",
        capacity: "3.5 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Master bedroom, mid-premium spec",
        ourTake: "3.5 kW Ultra — better fit-and-finish than the Bold at a ~$400 step up.",
        specs: [{ label: "Cooling capacity", value: "3.5 kW" }],
        related: ["kaden-ultra-25", "kaden-ultra-5", "kaden-bold-35"],
      },
      {
        slug: "kaden-ultra-5",
        name: "Kaden Ultra 5.0 kW Split",
        model: "KDU50",
        category: "split-system",
        categoryLabel: "Premium wall split",
        capacity: "5.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Open-plan living, mid-premium spec",
        ourTake:
          "5.0 kW Ultra — the value pick when Mitsubishi's MSZ-AP50 is out of reach but the customer still wants a properly quiet, well-appointed unit.",
        specs: [{ label: "Cooling capacity", value: "5.0 kW" }],
        related: ["kaden-ultra-35", "kaden-bold-5", "msz-ap50"],
      },
      {
        slug: "kaden-ducted-10",
        name: "Kaden Ducted 10 kW",
        model: "KDD100",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "10.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Small 3-bed single-storey ducted retrofit",
        ourTake:
          "The 10 kW Kaden Ducted is our value ducted pick for a smaller family home. Comes in about $1,500-$2,000 under the Mitsubishi PEAD-M equivalent.",
        specs: [{ label: "Cool capacity", value: "10.0 kW" }],
        related: ["kaden-ducted-12", "pead-m"],
      },
      {
        slug: "kaden-ducted-12",
        name: "Kaden Ducted 12.5 kW",
        model: "KDD125",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "12.5 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "3-4 bed single-storey ducted retrofit",
        ourTake: "12.5 kW is the sweet spot for a typical 3-4 bed family home ducted retrofit at the value price point.",
        specs: [{ label: "Cool capacity", value: "12.5 kW" }],
        related: ["kaden-ducted-10", "kaden-ducted-14"],
      },
      {
        slug: "kaden-ducted-14",
        name: "Kaden Ducted 14 kW",
        model: "KDD140",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "14.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Larger single-storey or a modest double-storey",
        ourTake: "14 kW Ducted for larger single-storeys — value alternative to the PEAD-M or PEA-RP.",
        specs: [{ label: "Cool capacity", value: "14.0 kW" }],
        related: ["kaden-ducted-12", "kaden-ducted-16"],
      },
      {
        slug: "kaden-ducted-16",
        name: "Kaden Ducted 16 kW",
        model: "KDD160",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "16.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Double-storey family homes",
        ourTake: "16 kW for the double-storey family homes in Berwick, Officer and Clyde where 14 doesn't quite cover it.",
        specs: [{ label: "Cool capacity", value: "16.0 kW" }],
        related: ["kaden-ducted-14", "kaden-ducted-18"],
      },
      {
        slug: "kaden-ducted-18",
        name: "Kaden Ducted 18 kW",
        model: "KDD180",
        category: "ducted",
        categoryLabel: "Ducted system",
        capacity: "18.0 kW cooling",
        refrigerant: "R32",
        veuEligible: false,
        bestFor: "Larger double-storeys or high-load great-rooms",
        ourTake: "18 kW is the biggest Kaden Ducted — pushes toward Mitsubishi PEA-RP territory but at value pricing.",
        specs: [{ label: "Cool capacity", value: "18.0 kW" }],
        related: ["kaden-ducted-16", "pea-rp"],
      },
      {
        slug: "kaden-multi-2",
        name: "Kaden Multi-Head · 2 Indoor",
        model: "KDM2",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        capacity: "4.0 kW combined",
        veuEligible: false,
        bestFor: "Two-bedroom install with only one balcony space for outdoor",
        ourTake: "Value alternative to the Mitsubishi MXZ-2F for two-head installs.",
        specs: [{ label: "Combined cool", value: "4.0 kW" }],
        related: ["kaden-multi-4", "mxz-2f"],
      },
      {
        slug: "kaden-multi-4",
        name: "Kaden Multi-Head · 4 Indoor",
        model: "KDM4",
        category: "multi-head",
        categoryLabel: "Multi-head outdoor unit",
        capacity: "8.0 kW combined",
        veuEligible: false,
        bestFor: "Four-head family home install, budget alternative to MXZ-4F",
        ourTake: "Value 4-head — about $1,000 saving vs Mitsubishi MXZ-4F.",
        specs: [{ label: "Combined cool", value: "8.0 kW" }],
        related: ["kaden-multi-2", "mxz-4f"],
      },
      {
        slug: "kaden-gas-ducted",
        name: "Kaden Gas Ducted Heater",
        model: "KDG series",
        category: "ducted",
        categoryLabel: "Gas ducted heating",
        capacity: "3-star to 6-star models · 15 kW to 30 kW",
        veuEligible: false,
        bestFor: "Like-for-like replacement of an aging Brivis or Braemar ducted heater",
        ourTake:
          "Kaden's gas ducted range is a solid Brivis / Braemar replacement — same footprint, quiet operation, and the 6-star Advance model is the most efficient in the value tier. What we quote when the customer wants to stay on gas but the old unit's due.",
        specs: [
          { label: "Capacity range", value: "15 kW to 30 kW" },
          { label: "Star rating options", value: "3-star to 6-star" },
          { label: "Gas type", value: "Natural gas or LPG" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-ducted-14", "kaden-evaporative"],
      },
      {
        slug: "kaden-evaporative",
        name: "Kaden Evaporative Cooler",
        model: "KDE series",
        category: "ducted",
        categoryLabel: "Roof-mounted evaporative cooling",
        capacity: "Small · Medium · Large roof units",
        veuEligible: false,
        bestFor: "Dry-summer suburbs (Cranbourne, Clyde, Officer) wanting cheap-to-run cooling",
        ourTake:
          "Evaporative cooling costs a quarter of refrigerated aircon to run — but it only works when the outside humidity is low. Perfect for a Cranbourne / Officer summer, less useful during a humid Melbourne stretch. We spec it where the customer explicitly wants it or a large-footprint home makes ducted refrigerated cost-prohibitive.",
        specs: [
          { label: "Capacity", value: "Small (S), Medium (M), Large (L) roof unit sizes" },
          { label: "Refrigerant", value: "None — evaporative water cooling" },
          { label: "Running cost", value: "~25% of a refrigerated ducted equivalent" },
          { label: "Warranty", value: "5-year manufacturer + 6-year workmanship" },
        ],
        related: ["kaden-ducted-14", "kaden-gas-ducted"],
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
      "Zonemate is what turns a single-motor ducted system into something you can zone room-by-room. Every ducted install we quote includes a Zonemate as standard — the ability to shut off unused rooms cuts running costs by 30-40% over an always-on ducted.",
    ourTake:
      "Zoning is the single biggest efficiency win on a ducted system. Zonemate's touch controllers are the ones we specify because they're built for Australian installer wiring standards and the ranges of dampers they support cover every ducted brand we install.",
    productLabel: "6 models — controllers, WiFi, dampers",
    photo: "/ZoneMate-Touch-Duotone_Living-Room_1.jpg",
    photoFallback: "/duct-work.webp",
    photoAlt: "Zonemate touch controller mounted in a living room",
    accent: "#7A4CD8",
    established: "Australian-designed and manufactured for the local ducted market",
    warranty: "5-year controller + 5-year dampers + 6-year on our workmanship",
    keyFeatures: [
      "Built for Australian ducted installer wiring standards — plays with every ducted brand we install",
      "4, 6 and 8-zone touch controllers — cover single-storey through to large double-storey",
      "Wi-Fi module snaps in — turns the wall panel into a phone-controlled system",
      "Variable-speed dampers modulate airflow 0-100% per zone (proper comfort, not just on/off)",
      "Constant-speed dampers where the customer just wants on/off zone control at a lower price",
    ],
    commonInMelbourne:
      "Every ducted job we quote includes a Zonemate as standard. Zoning is the single biggest efficiency lever on a ducted system — shutting off unused rooms cuts running cost 30-40%. 6-zone is our most-installed model; 8-zone for Clyde North / Officer double-storeys.",
    support:
      "Zonemate's Melbourne office is on the phone within an hour when we hit a wiring issue. Controllers and dampers are held locally by our supplier network — same-day delivery for warranty replacements.",
    resources: [
      { label: "Zonemate zoning systems", href: "https://zonemate.com.au/" },
    ],
    products: [
      {
        slug: "zonemate-4",
        name: "Zonemate 4-Zone Touch Controller",
        model: "ZM-4T",
        category: "zoning",
        categoryLabel: "Ducted zoning controller",
        veuEligible: false,
        bestFor: "3-bed single-storey ducted (bedrooms + living)",
        ourTake:
          "4 zones is the minimum for a single-storey home to work properly — living, master, kids, and either study or bathroom. Anything less and you can't shut off unused rooms.",
        specs: [{ label: "Zone count", value: "4" }],
        related: ["zonemate-6", "zonemate-8"],
      },
      {
        slug: "zonemate-6",
        name: "Zonemate 6-Zone Touch Controller",
        model: "ZM-6T",
        category: "zoning",
        categoryLabel: "Ducted zoning controller",
        veuEligible: false,
        bestFor: "4-5 bed single-storey or a small double-storey ducted",
        ourTake:
          "6 zones handles a 4-5 bedroom family home properly — living, master, kids × 3, and a study. Our most-installed zone count.",
        specs: [{ label: "Zone count", value: "6" }],
        related: ["zonemate-4", "zonemate-8"],
      },
      {
        slug: "zonemate-8",
        name: "Zonemate 8-Zone Touch Controller",
        model: "ZM-8T",
        category: "zoning",
        categoryLabel: "Ducted zoning controller",
        veuEligible: false,
        bestFor: "Double-storey or 5+ bed ducted installs",
        ourTake:
          "8 zones for the double-storeys and larger family homes. Upstairs / downstairs split adds serious efficiency — you don't need to cool bedrooms during the day and living zones at night.",
        specs: [{ label: "Zone count", value: "8" }],
        related: ["zonemate-6", "zonemate-wifi"],
      },
      {
        slug: "zonemate-wifi",
        name: "Zonemate Wi-Fi Module",
        model: "ZM-WIFI",
        category: "controller",
        categoryLabel: "Wi-Fi add-on",
        veuEligible: false,
        bestFor: "Adding smartphone control to any Zonemate touch controller",
        ourTake: "Snap-in Wi-Fi module — turns the wall-mounted Zonemate touch panel into a phone-controlled system.",
        specs: [{ label: "Compatibility", value: "ZM-4T / ZM-6T / ZM-8T" }],
        related: ["zonemate-8"],
      },
      {
        slug: "zonemate-vsd",
        name: "Zonemate Variable-Speed Damper",
        model: "ZM-VSD",
        category: "damper",
        categoryLabel: "Ducted damper",
        veuEligible: false,
        bestFor: "Modulating airflow to individual zones",
        ourTake:
          "Variable-speed dampers let you set a per-zone airflow percentage instead of just on/off. Nicer comfort in less-used zones — never fully off, never fully open.",
        specs: [{ label: "Modulation", value: "0-100% variable" }],
        related: ["zonemate-8", "zonemate-csd"],
      },
      {
        slug: "zonemate-csd",
        name: "Zonemate Constant-Speed Damper",
        model: "ZM-CSD",
        category: "damper",
        categoryLabel: "Ducted damper",
        veuEligible: false,
        bestFor: "Standard on/off zone control",
        ourTake: "The standard constant-speed damper — on or off per zone. What we install by default unless the customer specifies VSD.",
        specs: [{ label: "Modulation", value: "on/off" }],
        related: ["zonemate-vsd", "zonemate-4"],
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

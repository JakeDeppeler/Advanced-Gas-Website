// Long-form copy for each service page. SEO-optimised, H1 + intro contain
// primary keyword + region, FAQs feed FAQPage schema, internal links flow
// to /quote and suburb pages.

export type ServiceContent = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  benefits: { t: string; d: string }[];
  brands: string[];
  pricing: { tier: string; price: string; includes: string }[];
  faqs: { q: string; a: string }[];
  /** Numbered install-process steps rendered as a stepper below the
   *  benefits block. Distinct per service so no two pages read the same. */
  steps?: { title: string; detail: string }[];
  /** Real photos from our install archive — displayed as a small gallery
   *  strip under the pricing block. Use existing /public paths. */
  photos?: { src: string; alt: string; caption?: string }[];
  /** Rich "brands we install" section — one card per brand with a
   *  reason line + link into the brand hub. Renders BELOW the flat
   *  brand tag row so both SEO and buyers get what they need. */
  brandPods?: { brand: string; reason: string; href?: string }[];
  /** "What's typical for this job" summary card — time on site,
   *  warranty specifics, price range. */
  typical?: {
    time: string;
    warranty: string;
    priceRange: string;
    followUp: string;
  };
  /** Optional list of what's included / excluded — sits alongside the
   *  pricing table so buyers see the boundary before they call. */
  included?: string[];
  excluded?: string[];
  /**
   * Photos of our own installs for this service, rendered as a
   * full-bleed grid on a navy band so they break the page up.
   *
   * This is the one to add to. Drop the file into /public, add a line
   * here with an honest alt and a caption, and it appears — no layout
   * work, no code change. The grid reflows from two up to four across on
   * its own, so any number from three upwards looks deliberate.
   *
   * Rule that doesn't bend: these are OUR jobs. Manufacturer renders go
   * in `photos`, which sits under a heading that says exactly that.
   */
  installPhotos?: {
    heading: string;
    blurb: string;
    shots: { src: string; alt: string; caption?: string }[];
  };
  /**
   * Lead the page with the case for doing this at all, before any
   * specification. Set on services where the customer hasn't decided
   * they want the thing yet — nobody wakes up wanting a heat pump, they
   * wake up with a dead tank and a decision to make.
   *
   * When present the page reorders: why → brands → range → proof → us,
   * and the spec-heavy blocks move below the fold. Absent, the page
   * renders in its original order.
   */
  whyFirst?: {
    eyebrow: string;
    heading: string;
    blurb: string;
    /** Big numbers. Three or four, no more — this is a glance, not a read. */
    stats: { value: string; label: string }[];
    /** Short reasons. Each one a sentence, not a paragraph. */
    reasons: { t: string; d: string }[];
    photo: { src: string; alt: string };
    /** The honest counterweight. */
    caveat: string;
  };
  /**
   * "Why we install this gear" — the argument for the specific systems
   * this service uses, not a generic company pitch. Every service page
   * gets its own, because the case for Mitsubishi in a bedroom wall is a
   * different case from Reclaim on a hot water pad.
   */
  whyThese?: {
    heading: string;
    blurb: string;
    points: { t: string; d: string }[];
  };
  /**
   * System types covered by this service, each rendered as its own
   * anchored block.
   *
   * `id` MUST match the fragment the header's mega-menu links to
   * (Header.tsx → SERVICE_MENU). Those links existed before these
   * sections did, so "Split system aircon" and "Multi-head aircon" both
   * dumped you at the top of the same page with nothing to tell them
   * apart. Add a menu entry, add the matching id here.
   */
  systems?: {
    id: string;
    label: string;
    blurb: string;
    photo: { src: string; alt: string };
    points: string[];
    priceFrom?: string;
    /** Long-form opening for the system's own page at
     *  /services/<service>/<id>. Distinct from `blurb`, which is the
     *  one-paragraph version shown on the parent service page. */
    intro?: string;
    /** Where this system is the right call. */
    bestFor?: string[];
    /** Where it isn't — the honest half, and the reason these pages are
     *  worth reading rather than just ranking. */
    watchOut?: string[];
    faqs?: { q: string; a: string }[];
  }[];
};

export const serviceContent: Record<string, ServiceContent> = {
  "air-conditioning-installation": {
    // ------------------------------------------------------------------
    // PHOTOS OF OUR OWN JOBS go here, same shape as the heat pump one
    // above: installPhotos: { heading, blurb, shots: [{ src, alt, caption }] }.
    // Drop the files into /public, add the lines, and a navy photo band
    // appears on this page. Nothing else needs changing.
    // ------------------------------------------------------------------
    metaTitle: "Air Conditioning Installation Pakenham & Berwick",
    metaDescription:
      "Licensed split, multi-head and ducted aircon installation across Melbourne's south-east. Mitsubishi Electric, Kaden. Fixed-price quotes in 2 hrs, 6-year workmanship warranty.",
    h1: "Air conditioning installation across Melbourne's south-east",
    intro:
      "Licensed refrigeration technicians installing split-system, multi-head and ducted air conditioning across every postcode within 75 km of Pakenham. Fixed-price quotes back in 2 business hours, most single-split installs done the same visit, and a 6-year workmanship warranty on every job. We spec Mitsubishi Electric first. It runs under a 1% failure rate across the range, which is the number that matters when you're the one who has to come back, and Kaden where the job calls for it. Same install team, same warranty, same finish either way.",
    whyThese: {
      heading: "Why these two brands, and which one is yours.",
      blurb:
        "Two brands, not twelve. We'd rather know two ranges properly than carry a catalogue we can't stand behind. Which one you end up with depends on your house, not on what you're prepared to spend.",
      points: [
        { t: "Under 1% failure rate", d: "That's Mitsubishi Electric across the whole range, and it's the number that decides what goes in a customer's wall. We're the ones who have to come back if it fails, so a unit that never needs us is worth more than the margin on a cheaper one." },
        { t: "Parts you can actually get", d: "Mitsubishi's Melbourne warehouse still stocks parts for units we put in ten years ago. Plenty of cheap brands are unsupportable by year five, the unit isn't broken, it's just unfixable." },
        { t: "Kaden, when the job wants it", d: "Reece-exclusive, so parts sit in every store in Victoria. It is what we quote when a family wants three or four rooms done in one visit rather than one a year, and it goes in with the same crew, the same finish and the same 6-year workmanship as anything else we fit." },
        { t: "Zoned properly from day one", d: "Every ducted job gets Zonemate zoning as standard, not as an upsell. Zoning added in year three means pulling the ceiling apart twice." },
        { t: "Sized on a heat load, not a guess", d: "Room by room, allowing for ceiling height, window aspect and insulation. Oversizing is the lazy way out, the unit short-cycles, never dehumidifies properly, and costs about 20% more to run forever." },
        { t: "We'd rather quote the smaller unit", d: "If a 5 kW does the room, we quote a 5 kW. Selling someone a 7 they didn't need is how you get one job instead of a family's worth of them." },
      ],
    },
    benefits: [
      { t: "ARCtick-licensed refrigeration", d: "All refrigerant handling by ARC-certified technicians. Legally required, and we hold the ticket." },
      { t: "Mitsubishi Electric default", d: "Under 1% failure rate across the range. We put it in our own homes, which is the only recommendation that really counts." },
      { t: "Right-sized, not oversized", d: "Room-by-room heat-load calc before we quote. Oversized units cycle constantly and cost 20% more to run." },
      { t: "Zonemate zoning for ducted", d: "We install ducted with Zonemate 4/6/8-zone controllers by default. No re-work in year 3 when you want to zone a spare bedroom." },
      { t: "Colour-matched conduit + tidy exit", d: "Drop sheets on the floor, dust extraction in the wall, conduit outside colour-matched to your cladding. It's the details clients remember." },
      { t: "Compliance cert emailed in 24 hrs", d: "Electrical + refrigeration compliance docs into your inbox the day after we leave, not chased weeks later." },
    ],
    brands: ["Mitsubishi Electric", "Kaden", "Brivis (evap)", "Zonemate"],
    pricing: [
      { tier: "Single split system (2.5 kW · bedroom)", price: "from $2,199", includes: "Supply, back-to-back install, up to 3 m line-set, compliance cert" },
      { tier: "Single split system (5.0 kW · living)", price: "from $2,899", includes: "Supply, install, up to 5 m line-set, compliance cert" },
      { tier: "Single split system (7.1 kW · large open-plan)", price: "from $3,299", includes: "Supply, install, up to 5 m line-set, compliance cert" },
      { tier: "Multi-head 2-indoor (Mitsubishi MXZ-2F)", price: "from $6,500", includes: "One outdoor, two indoor heads, up to 15 m combined line-set" },
      { tier: "Multi-head 4-indoor (Mitsubishi MXZ-4F)", price: "from $11,500", includes: "One outdoor, four indoor heads, up to 30 m combined line-set" },
      { tier: "Ducted reverse-cycle (PEAD-M · 4 zones)", price: "from $12,500", includes: "PEAD-M indoor, PUZ outdoor, 4× Zonemate zones, controller, compliance" },
    ],
    steps: [
      { title: "Room-by-room heat-load calc", detail: "We walk the home, check ceiling height, window aspect and insulation, then compute the actual kW load. Nothing gets guessed, a 5 kW room quote sizes to a 5 kW unit, not a 7." },
      { title: "Written fixed-price quote in 2 hrs", detail: "Back to you inside 2 business hours with the model number, capacity, line-set length, controller spec, warranty position and total installed price. No 'from $X' bait." },
      { title: "Order stock, book install day", detail: "Mitsubishi warehouse in Melbourne is same-day on common stock. We confirm your install day the moment the unit lands with us." },
      { title: "Install day, usually one visit", detail: "Single-split back-to-back is 3-4 hours on site. Multi-head or ducted is a full day. Drop sheets down, dust extraction on the wall cut, conduit colour-matched outside." },
      { title: "Test, commission, walk-through", detail: "We run it up, check refrigerant pressures, walk you through the remote and MELCloud Wi-Fi setup. You sign the job card when you're satisfied, not before." },
      { title: "Compliance certificate emailed in 24 hrs", detail: "Electrical and refrigeration compliance docs into your inbox by end of business the next day. Warranty registered with Mitsubishi in your name at the same time." },
    ],
    systems: [
      {
        id: "split",
        label: "Split system air conditioning",
        blurb:
          "One outdoor unit, one indoor head. The right answer for a bedroom, a living room or a granny flat: the simplest system there is, the least to run, and the quickest to get in. Most go in back-to-back in a single morning.",
        photo: { src: "/mitsubishi-msz-ap-series-v2-v3.webp", alt: "Mitsubishi Electric MSZ-AP wall-mounted split system" },
        points: [
          "2.5 kW for bedrooms, 5.0 kW for living, 7.1 kW for large open-plan",
          "Mitsubishi Electric MSZ-AP or Kaden KSI, whichever suits the room and the job",
          "Back-to-back install in 3-4 hours, one visit",
          "Wi-Fi via MELCloud so you can run it from the phone",
          "New line-set. We run fresh copper, never reuse the old pipe",
          "New wall brackets or a ground stand, rated and levelled",
          "Colour-matched ducting capping over the pipework, not bare lagging",
          "Wall penetration cored and sealed, drop sheets down, mess taken with us",
        ],
        priceFrom: "from $2,199 installed",
        intro:
          "A split system is the simplest air conditioner there is: one box outside, one head inside, a pair of copper lines between them. That simplicity is the whole argument. There's less to buy, less to run and less to go wrong, and most go in back-to-back in a single morning without anyone taking a day off work.",
        bestFor: [
          "A bedroom, a living room, a home office or a granny flat",
          "Anywhere you want to condition one room properly rather than the whole house",
          "Retrofits, a back-to-back install needs one core hole and nothing in the roof",
          "Anyone who wants one room sorted this week rather than the whole house next year",
        ],
        watchOut: [
          "It heats and cools the room it's in, not the hallway or the next bedroom",
          "Three or four rooms means three or four outdoor units, at that point multi-head or ducted is tidier and often cheaper",
          "The outdoor unit has to go somewhere, and that somewhere needs airflow and a bit of thought about the neighbour's bedroom window",
        ],
        faqs: [
          { q: "How long does a split system install take?", a: "A straightforward back-to-back, indoor head directly opposite the outdoor unit, is three to four hours. Longer pipe runs, upstairs installs or a difficult outdoor location can make it half a day." },
          { q: "What size do I need?", a: "Roughly: 2.5 kW for a bedroom, 5.0 kW for a living room, 7.1 kW for large open-plan. But ceiling height, window aspect and insulation move it, which is why we do a room-by-room heat load rather than quoting off floor area." },
          { q: "Can I run it from my phone?", a: "Yes. Mitsubishi's MELCloud module adds Wi-Fi to any indoor unit in the range. We set it up and walk you through it before we leave." },
        ],
      },
      {
        id: "multi",
        label: "Multi-head air conditioning",
        blurb:
          "One outdoor unit running two to five indoor heads. Worth it when you want three bedrooms done but only have room, or body-corporate permission, for a single condenser outside.",
        photo: { src: "/mitsubishi-mxz-multi-split-condenser-v2.webp", alt: "Mitsubishi Electric multi-split outdoor condenser" },
        points: [
          "2, 3, 4 and 5-port outdoor units, Mitsubishi MXZ series",
          "Mix head types: wall, floor console or bulkhead on the one system",
          "One set of pipe penetrations instead of four",
          "Each room keeps its own remote and its own set temperature",
          "New copper to every head, individually sized to that indoor unit",
          "New brackets or stand for the outdoor unit, levelled and anti-vibration mounted",
          "Colour-matched capping on every external run",
          "Condensate drained properly to a legal point, not just out the wall",
        ],
        priceFrom: "from $6,500 installed",
        intro:
          "A multi-head runs two to five indoor heads off a single outdoor unit. It's the answer when you want several rooms done but only have room, or body-corporate permission, for one condenser outside, and it means one set of pipe penetrations through the wall instead of four.",
        bestFor: [
          "Three or four bedrooms where separate splits would mean a wall of outdoor units",
          "Townhouses and units where there's exactly one spot the condenser can legally go",
          "Homes where the roof space won't take ducting but you still want most rooms covered",
          "Mixing head types, wall, floor console or bulkhead, on the one system",
        ],
        watchOut: [
          "All the heads share one compressor, so running one small bedroom draws more power than a dedicated split would",
          "If the outdoor unit fails, every room goes off at once, a split only takes one room with it",
          "Costs more than a single split and less than ducted; if you're doing five-plus rooms, price ducted before you commit",
        ],
        faqs: [
          { q: "How many rooms can one outdoor unit run?", a: "Mitsubishi's MXZ range goes from 2 up to 6 ports. Beyond about five heads, ducted usually works out better on both price and comfort." },
          { q: "Can each room have its own temperature?", a: "Yes, each head has its own remote and its own setpoint. They do share a compressor, so extreme differences between rooms are less efficient than similar ones." },
          { q: "Do all the heads have to be the same?", a: "No. You can run a wall unit in the bedrooms, a floor console in a room with no wall height, and a bulkhead unit where you want it hidden, all off the one outdoor." },
        ],
      },
      {
        id: "ducted",
        label: "Ducted reverse-cycle air conditioning",
        blurb:
          "Whole-home heating and cooling from a single system in the roof. Vents in every room, zoned so you are not paying to condition the bedrooms at 7pm. New builds and retrofits both.",
        photo: { src: "/mitsubishi-pea-m-ducted-v2-v3.webp", alt: "Mitsubishi Electric PEA-M ducted indoor fan coil" },
        points: [
          "Mitsubishi PEAD-M / PEA-M indoor with PUZ outdoor",
          "Zonemate 4, 6 and 8-zone control fitted by default",
          "Full duct design. We size the trunk and branches, not just the unit",
          "Retrofit into an existing roof cavity where there's access",
          "New insulated flexible duct throughout, sized per branch",
          "Return-air box and filter frame built to suit the house",
          "New copper between indoor and outdoor, pressure and vacuum tested",
          "Ceiling penetrations cut clean, grilles level, cavity left tidy",
        ],
        priceFrom: "from $12,500 installed",
        intro:
          "Ducted reverse-cycle puts one system in the roof and vents into every room, zoned so you're not paying to condition four empty bedrooms at 7pm. It's the most comfortable way to heat and cool a whole house, and the only one that disappears into the ceiling instead of hanging on a wall.",
        bestFor: [
          "Whole-home heating and cooling from a single system",
          "New builds, and retrofits where there's roof access and clearance",
          "Anyone who wants the gear out of sight, vents in the ceiling, nothing on the walls",
          "Homes where zoning matters: bedrooms at night, living areas by day",
        ],
        watchOut: [
          "Needs real roof space. A tight cavity or a skillion roof can rule it out, and we'll tell you on the site visit rather than after you've paid a deposit",
          "It's the biggest up-front cost of the three, though not per room once you're past four or five",
          "Duct design matters more than the unit. An undersized trunk or a bad branch layout will make an expensive system feel weak",
        ],
        faqs: [
          { q: "Can ducted go into an existing house?", a: "Usually, if there's roof access and enough clearance for the indoor unit and the trunk duct. We check that on the site visit before quoting. It's the one thing that genuinely rules the job out." },
          { q: "How many zones do I need?", a: "Four covers most homes: bedrooms, living, kitchen/meals and a spare. We fit Zonemate as standard so adding a zone later doesn't mean pulling the ceiling apart." },
          { q: "Is ducted more expensive to run than splits?", a: "Zoned properly, no. Unzoned it can be, because you're conditioning the whole house to serve one room, which is exactly why we don't install it unzoned." },
        ],
      },
      {
        id: "evap",
        label: "Evaporative cooling",
        blurb:
          "Roof-mounted, runs on water and a fan rather than refrigerant. Cheap to run and moves a lot of air, which suits the drier inland suburbs. Needs windows cracked to work, and it struggles on humid days.",
        photo: { src: "/classic_evap_product_image.jpg", alt: "Brivis roof-mounted evaporative cooler" },
        points: [
          "Brivis and Kaden roof-mounted units",
          "Running cost is a fraction of refrigerated cooling",
          "Best in the drier north and east, less suited to humid days",
          "Cooling only; pair with gas ducted for winter",
          "New roof flashing and weatherproofing around the penetration",
          "New water supply line and isolation tap to the unit",
          "Ductwork sized to the unit, not just connected to it",
          "Old unit removed, roof made good, nothing left up there",
        ],
        priceFrom: "from $3,900 installed",
        intro:
          "Evaporative cooling pulls outside air through wet pads and blows it through the house. It uses water and a fan rather than refrigerant, which makes it very cheap to run and very good at moving a lot of air, and completely dependent on the day being dry.",
        bestFor: [
          "The drier inland suburbs, where summer days are hot rather than humid",
          "Households that want windows open and a lot of fresh air moving",
          "Running cost, roughly a quarter of refrigerated cooling",
          "Large homes where cooling every room refrigerated would cost more to run than it is worth",
        ],
        watchOut: [
          "It needs windows or doors cracked open to work. Shut the house up and it does nothing",
          "On a humid day it struggles, and Melbourne gets those, this is the honest trade-off",
          "Cooling only. You'll still need gas ducted or a split for winter",
          "Roof-mounted, so it needs an annual pre-summer service to stay working",
        ],
        faqs: [
          { q: "Does evaporative cooling work in Melbourne?", a: "On a dry 38-degree day, very well. On a humid 30-degree day, poorly. If your household can't live with that trade-off, refrigerated is the honest answer and we'll say so." },
          { q: "How much cheaper is it to run?", a: "Roughly a quarter of refrigerated cooling for the same house. It's a fan and a water pump rather than a compressor." },
          { q: "Do I need to leave windows open?", a: "Yes. It works by pushing air through the house and out, so it needs somewhere for the air to go. That's a feature for some households and a deal-breaker for others." },
        ],
      },
    ],
    photos: [
      { src: "/mitsubishi-msz-ap-wall-split-v2-v3.webp", alt: "Mitsubishi MSZ-AP wall split system", caption: "Mitsubishi MSZ-AP · our default living-zone split" },
      { src: "/Kaden KSI V3 wall split system.jpg", alt: "Kaden KSI V3 wall split system", caption: "Kaden KSI V3 · Reece-supplied, same crew, same warranty" },
      { src: "/mitsubishi-mxz-multi-split-condenser-v2.webp", alt: "Mitsubishi Electric multi-split outdoor condenser", caption: "Multi-head, one outdoor, up to 5 indoor heads" },
      { src: "/mitsubishi-pea-m-ducted-v2-v3.webp", alt: "Mitsubishi Electric PEA-M ducted indoor fan coil", caption: "Mitsubishi PEA-M · the ducted indoor unit we fit most" },
    ],
    brandPods: [
      { brand: "Mitsubishi Electric", reason: "The lowest failure rate in our install base. Decade-old MSZ-AP still runs to spec.", href: "/brands/mitsubishi-electric" },
      { brand: "Kaden", reason: "Splits, ducted, gas ducted and evap under one brand, so a whole house runs on one parts list. Same 6-year warranty as everything else we fit.", href: "/brands/kaden" },
      { brand: "Brivis (evap)", reason: "The default evap brand in the corridor, Contour + Advance roof units for dry-summer suburbs like Cranbourne, Clyde and Officer.", href: "/brands/brivis" },
      { brand: "Zonemate", reason: "Our default ducted controller, 4/6/8-zone Touch panel with Wi-Fi and per-room temp sensors.", href: "/brands/zonemate" },
    ],
    typical: {
      time: "Single split · same day. Multi-head · 1 day. Ducted · 1–2 days.",
      warranty: "6-year workmanship + 5-year Mitsubishi manufacturer.",
      priceRange: "$2,199 wall split → $18,500 large ducted with 6 zones.",
      followUp: "We ring the week after install to check it's running the way you expected. Not a marketing call, a genuine one.",
    },
    included: [
      "Supply of the specified unit + all mounting hardware",
      "Standard install labour (up to 3 m line-set for splits, up to 30 m for multi-head)",
      "Electrical connection to existing sub-board (or a new circuit if quoted)",
      "Refrigerant charge + commissioning",
      "Old unit removed and responsibly disposed of",
      "Full electrical + refrigeration compliance certificates",
      "Manufacturer warranty registered in your name",
    ],
    excluded: [
      "Line-set runs beyond the included metres (charged per additional metre in the quote)",
      "Condensate pump if the indoor is above the outdoor and there's no gravity drain (~$220 typical)",
      "Structural rework, ceiling patching or painting after ductwork",
      "LPG bottle relocation for gas-adjacent installs",
    ],
    faqs: [
      { q: "How long does a split-system install take?", a: "A standard back-to-back single-split is 3–4 hours on site. Multi-head is a full day. Ducted retrofit is typically 1–2 days depending on how many zones and whether the ceiling cavity is straightforward." },
      { q: "Do I need a separate electrician?", a: "No. We handle all electrical work in the same visit. Our team holds refrigeration + electrical + gas tickets so nothing gets subbed out." },
      { q: "What size aircon do I need?", a: "Rough rule: ~125-150 W per m² for standard 2.4 m ceilings. Rooms with big north-facing glass, cathedral ceilings or minimal insulation push higher. We do a proper heat-load calc in the quote, not a guess." },
      { q: "Reverse-cycle vs evap for Pakenham?", a: "Reverse-cycle wins for anywhere in the south-east except the driest hot days. Evap is cheaper to run but ineffective when humidity climbs (Melbourne summers get both dry and humid days). Ducted RC is our default for whole-home." },
      { q: "Can you install on a rental?", a: "Yes. We provide a written quote you can share with your property manager, and we lodge the manufacturer warranty in the owner's name. Compliance certs included as standard." },
      { q: "Do you install brands we haven't quoted?", a: "We install every major brand for repair + service, but for a new install we prefer to quote Mitsubishi or Kaden. If you've bought a Daikin or Panasonic and need it installed, we'll do it as a supply-not-included job." },
    ],
  },

  "heat-pump-installation": {
    metaTitle: "Heat Pump Hot Water Installation, VEU Applied",
    metaDescription:
      "Reclaim, iStore and Thermann heat pump hot water installed across Melbourne's south-east. VEU rebate up to $2,700 applied at quote, no chasing paperwork. 6-year workmanship warranty.",
    h1: "Heat pump hot water, installed properly",
    intro:
      "Nobody wakes up wanting a heat pump. You wake up with a dead tank and a decision to make. Here's the case for making it this one, which brands we'd fit in our own houses and why, and what the job actually looks like — with the rebate already in the number.",
    installPhotos: {
      heading: "Heat pumps we've put in.",
      blurb:
        "Real jobs across the corridor, not catalogue renders. Every one of these is a house within 75 km of the workshop.",
      // ------------------------------------------------------------------
      // ADD MORE HERE. One line per photo: file in /public, an alt that
      // describes what's actually in the frame, and a caption if there's
      // something worth saying. The grid handles the rest.
      // ------------------------------------------------------------------
      shots: [
        { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ split heat pump, tank and outdoor unit against a brick wall", caption: "Reclaim CO₂ split — tank and outdoor unit, separate" },
        { src: "/reclaim-spit-close-up.webp", alt: "Close-up of a Reclaim CO₂ heat pump tank base and pipework on a concrete pad", caption: "New pad poured, pipework re-run and lagged" },
        { src: "/reclaim-split-back.webp", alt: "Reclaim heat pump tank and outdoor unit installed beside a brick wall", caption: "Tight side access, unit still gets its airflow" },
        { src: "/reclaim-split-stand-back-shot-left-side.webp", alt: "Reclaim CO₂ split heat pump viewed from the left side of the house", caption: "Same job, from the other side" },
        { src: "/thermann-heat-pump.webp", alt: "Thermann heat pump hot water system installed on a paved area", caption: "Thermann integrated, all-in-one" },
        { src: "/gas hot water change over same day.webp", alt: "Hot water changeover completed the same day", caption: "Old unit out, new one running, same day" },
      ],
    },
    whyFirst: {
      eyebrow: "Why a heat pump at all",
      heading: "It's the same hot water for about a quarter of the energy.",
      blurb:
        "A heat pump doesn't make heat, it moves it. It pulls warmth out of the outside air and puts it into your tank, which is why it delivers three to four units of heat for every unit of electricity it draws. An electric element gets you one. That gap is the whole argument, and it turns up on every bill for the next fifteen years.",
      stats: [
        { value: "~75%", label: "less energy than an electric element" },
        { value: "$2,605", label: "rebate, owner-occupier, everything stacked" },
        { value: "$0", label: "running cost if you schedule it off your solar" },
        { value: "1 day", label: "on site for most changeovers" },
      ],
      reasons: [
        { t: "The bill drops the first quarter", d: "Hot water is roughly a quarter of the average household energy bill. Cutting that by three-quarters shows up immediately, not eventually." },
        { t: "The rebate is worth the most right now", d: "An old gas or electric tank is exactly what the VEU scheme was written to remove, so the moment your tank is on its way out is the moment the rebate is worth the most." },
        { t: "It pairs with solar better than anything", d: "Schedule the heating for the middle of the day and it runs on power you'd otherwise export for a few cents. That's where the hot water bill goes to almost nothing." },
        { t: "No flue, no gas, no combustion", d: "Nothing burning means no carbon monoxide test, no flue to block and one less gas appliance on the bill. If you're thinking about dropping the gas connection entirely, this is the first thing that has to go." },
      ],
      photo: { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ split heat pump, outdoor unit and tank installed against a brick wall" },
      caveat:
        "The honest part: they're not silent, they need airflow around the outdoor unit, and if your existing tank is under about six years old with a cheap fault we'd fix that instead and tell you to come back in a few years.",
    },
    whyThese: {
      heading: "Why Reclaim, iStore and Thermann, and nothing else.",
      blurb:
        "Hot water is the appliance a household notices only when it fails, which is exactly why the brand matters here. These three are the ones we'd put on our own houses, and each of them answers a different question.",
      points: [
        { t: "Reclaim holds up on a cold morning", d: "CO₂ refrigerant keeps its heating capacity down to about -10 °C. That matters in Emerald, Gembrook and the hills, where a unit built for milder conditions spends July running an element it was supposed to replace." },
        { t: "Stainless tank, no anode to forget", d: "Reclaim's 316-grade stainless option has no sacrificial anode to replace and nothing to rust. Glass-lined costs less up front and does the same job, but somebody has to remember the anode in year five, and nobody does." },
        { t: "iStore, when the rebate decides it", d: "On the VEU numbers the 270 L iStore comes out further ahead than anything else we install. When that is what the decision turns on, that is the one we quote, not the one with the biggest margin on it." },
        { t: "Thermann is Australian-made", d: "Built by Dux in Moss Vale, which qualifies for the $400 Australian-made VEU bonus and means Reece stocks the parts in every Victorian store." },
        { t: "We do the rebate paperwork", d: "Eligibility check, certificates, lodgement, all of it, inside the quote. You sign once at the quote and once on the day. The rebate is already in the price, not something you chase later." },
        { t: "Sized on your actual draw-off", d: "Not a bedroom count. Four fifteen-minute showers is 300 L of hot water before breakfast; two spread across the day is a much smaller tank. We do that sum before we quote a size." },
      ],
    },
    benefits: [
      { t: "VEU rebate applied at quote", d: "Up to $2,700 for a Victorian owner-occupier at current VEEC prices ($60–$75). We handle the paperwork. You don't front the cash then chase it back six months later." },
      { t: "Three brands, three different jobs", d: "iStore when the rebate is what decides it. Reclaim ECO R290 or Thermann Integrated when it all has to fit in one shell with nothing outside. Reclaim CO₂ Split when you are staying in the house and want a stainless tank that outlasts the compressor." },
      { t: "Same tank platform, honest pricing", d: "Reclaim ECO R290 AIO and Thermann Integrated are the same tank + heat-pump platform, Reclaim brand, Thermann brand, identical guts. Pick on brand preference or Reece supply, not spec." },
      { t: "COP holds on a cold morning (Reclaim CO₂)", d: "Reclaim's CO₂ split still makes about 4.5 COP at –10 °C. That is the difference in Emerald, Gembrook and Cockatoo, where an R290 unit spends July leaning on the element it was bought to replace." },
      { t: "Licensed plumbing + tempering valve", d: "Full drainage rework, tempering valve to AS/NZS 3500, isolation valves + electrical connection on a dedicated circuit, done by our licensed plumber, not a sub-contractor." },
      { t: "Old tank taken away same visit", d: "Gas storage, electric storage or old heat pump, off the pad, out the gate and to an ARC-approved recycler on install day. No waiting for hard rubbish." },
    ],
    brands: ["Reclaim Energy", "iStore", "Thermann", "Sanden", "Rheem AmbiHeat"],
    pricing: [
      { tier: "iStore 270 L (all-in-one, VEU applied)", price: "$2,144", includes: "Supply, install, old tank removal, VEU paperwork, 6-yr tank + 3-yr compressor warranty" },
      { tier: "Reclaim ECO R290 AIO 200/285 L (VEU applied)", price: "$2,624", includes: "Supply, install, old tank removal, VEU paperwork, 6-yr tank + 3-yr compressor + 6-yr workmanship" },
      { tier: "Thermann Integrated 200/285 L (VEU applied)", price: "$2,624", includes: "Same platform as Reclaim ECO R290 AIO, Reece stock, Dux warranty" },
      { tier: "Reclaim CO₂ Split · Glass-lined 250/315/400 L", price: "Message for quote", includes: "Split heat pump + separate tank, 10-yr tank + 10-yr heat pump warranty" },
      { tier: "Reclaim CO₂ Split · Stainless 250/315/400 L", price: "Message for quote", includes: "As above, 15-yr stainless tank warranty (no anode to service)" },
    ],
    steps: [
      { title: "Site inspection, no charge", detail: "We walk the existing tank position, check pipe entry, electrical supply, drainage, and outdoor placement for split-system heat pumps. On the same visit we confirm VEU eligibility and photograph the old unit for the rebate application." },
      { title: "Written fixed-price quote in 2 hrs", detail: "Back to you the same business day with model number, capacity, VEU rebate value, tank + heat-pump warranty and the installed price after rebate. No 'from $X', the number on the quote is the number on the invoice." },
      { title: "We lodge the VEU application", detail: "Approved accredited-provider paperwork submitted the day you accept the quote. The rebate is applied to your invoice, not something you chase back six months later." },
      { title: "Install day, usually same-day swap", detail: "AIO swap into an existing electric or gas storage tank position is 3–5 hours. Split heat pump with a new tank position is 5–7 hours. Old tank drained, disconnected, loaded up." },
      { title: "Commission, temper, hand over", detail: "Tempering valve to AS/NZS 3500, isolation valves in, dedicated circuit tested. We wait for hot water at the tap, then walk you through the controller and timer settings." },
      { title: "Compliance certificate + warranty registration", detail: "Plumbing compliance certificate emailed within 24 hours. Tank + heat-pump warranty lodged with the manufacturer in your name at the same time. VEU certificate follows within 2 weeks." },
    ],
    photos: [
      { src: "/270L-istore-heatpump.webp", alt: "iStore 270 L heat pump hot water system", caption: "iStore 270 L, where the VEU rebate goes furthest" },
      { src: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", alt: "Reclaim ECO R290 AIO heat pump", caption: "Reclaim ECO R290 AIO, same platform as Thermann Integrated" },
      { src: "/reclaim-spit-close-up.webp", alt: "Reclaim CO2 split heat pump install", caption: "Reclaim CO₂ Split, 15-year stainless tank" },
      { src: "/thermann_integrated_heat_pump_02.jpg", alt: "Thermann Integrated heat pump", caption: "Thermann Integrated, Australian-made by Dux" },
      { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ heat pump, outdoor unit and tank installed", caption: "Reclaim CO₂ Split, outdoor unit + separate tank" },
      { src: "/gas-hot-water-changeover.webp", alt: "Hot water changeover in progress", caption: "Same-day changeover, old tank out, new heat pump in" },
    ],
    brandPods: [
      { brand: "Reclaim Energy", reason: "The only mainstream CO₂ heat pump in Australia. 15-yr stainless tank on the flagship. Made in Sydney.", href: "/brands/reclaim" },
      { brand: "iStore", reason: "Takes the VEU rebate further than anything else we fit. Widely serviced, healthy parts pipeline.", href: "/brands/istore" },
      { brand: "Thermann", reason: "Australian-made by Dux (Moss Vale). Reece distribution means same-day parts state-wide.", href: "/brands/thermann" },
    ],
    typical: {
      time: "AIO swap · 3–5 hrs. Split heat pump · 5–7 hrs (usually same-day).",
      warranty: "6-year workmanship + manufacturer tank/compressor cover (varies by model: 6–15 yr tank, 3–10 yr heat pump).",
      priceRange: "$2,144 (iStore) → $6,000+ (Reclaim CO₂ Split Stainless 400 L).",
      followUp: "We call at the 4-week mark to check nothing's tripped and the timer's set the way you wanted.",
    },
    included: [
      "Supply of the specified heat pump + all mounting hardware",
      "Full plumbing install to AS/NZS 3500 (drainage, tempering valve, isolation valves)",
      "Electrical connection to a dedicated circuit (new sub-board circuit if required)",
      "Old tank drained, disconnected, removed and disposed of",
      "VEU rebate application lodged with an accredited provider on your behalf",
      "Plumbing compliance certificate emailed inside 24 hours",
      "Manufacturer tank + heat-pump warranty registered in your name",
    ],
    excluded: [
      "Slab / concrete work if the old tank position needs a new pad (~$400)",
      "Relocation of the tank to a new position >2 m from the existing site (charged per metre of pipe rework)",
      "LPG bottle relocation or gas capping (typically ~$220)",
      "Repair to underlying pipework where the old tank has been leaking for months",
      "Solar PV integration (see our PV-diverter kit as an add-on)",
    ],
    faqs: [
      { q: "How much is the VEU rebate right now?", a: "Up to $2,700 for a Victorian owner-occupier at current VEEC prices ($60–$75 per certificate). We calculate your actual rebate at the quote based on your address, existing system, and household size." },
      { q: "How much will I save on my energy bill?", a: "A gas-storage → heat pump swap typically saves $400–$900 a year. Electric storage → heat pump saves $700–$1,400. Payback after the VEU rebate is usually under 2 years." },
      { q: "Does a heat pump work in cold Melbourne mornings?", a: "R290 (propane) units drop noticeably below 0 °C. CO₂ heat pumps (Reclaim) hold full capacity down to −10 °C, worth specifying for hills postcodes like Emerald, Gembrook or Cockatoo." },
      { q: "Is it noisy? Where do you put it?", a: "37–48 dBA at 1 m depending on model, Reclaim CO₂ is the quietest at 37 dBA (safe next to a bedroom wall). Ideally sited on the shady side of the house away from bedrooms." },
      { q: "How long does the install take?", a: "AIO into an existing tank position is 3–5 hours, done in one visit. Split heat pump with a new outdoor unit position is 5–7 hours. Both are usually same-day." },
      { q: "What's the warranty picture?", a: "Reclaim CO₂ Stainless: 15-yr tank + 10-yr heat pump. Reclaim R290 AIO: 6-yr tank + 3-yr compressor. iStore: 6-yr tank + 3-yr compressor. Plus our 6-year workmanship on top of all of them." },
      { q: "Can I combine it with solar PV?", a: "Yes, Reclaim's split range is PV-diverter compatible so the heat pump only runs when your PV is exporting. We can add a diverter kit at install time or later." },
    ],
  },

  "aircon-servicing-repairs": {
    // ------------------------------------------------------------------
    // PHOTOS OF OUR OWN JOBS go here, same shape as the heat pump one
    // above: installPhotos: { heading, blurb, shots: [{ src, alt, caption }] }.
    // Drop the files into /public, add the lines, and a navy photo band
    // appears on this page. Nothing else needs changing.
    // ------------------------------------------------------------------
    metaTitle: "Aircon Service & Repair, All Brands, Same Day",
    metaDescription:
      "Annual aircon service and same-day repairs across Melbourne's south-east, Mitsubishi, Daikin, Fujitsu, Panasonic, Kaden, LG. Fixed pricing, ARCtick-licensed, service records kept.",
    h1: "Aircon service, repair & tune-up across Melbourne's south-east",
    intro:
      "Keep your aircon running efficiently, and your manufacturer warranty valid, with annual servicing from ARCtick-licensed refrigeration technicians. We service every major brand across every postcode within 75 km of Pakenham, splits, multi-head and ducted, with same-day breakdown attendance and fixed-price quotes before any parts are ordered. The service record we file lodges direct with the manufacturer so your warranty stays intact.",
    whyThese: {
      heading: "Why we service brands we'd never sell you.",
      blurb:
        "We install two aircon brands. We service all of them, including the ones we'd have talked you out of buying.",
      points: [
        { t: "Your unit doesn't have to be ours", d: "Daikin, Fujitsu, Panasonic, LG, Samsung, Braemar, if it's on your wall we'll look at it. Refusing to service what we didn't sell is a good way to lose a customer for the one job that matters." },
        { t: "Most January call-outs aren't broken units", d: "They're blocked filters, filthy coils and clogged condensate drains on systems that have never been serviced. That's an afternoon, not a new system, and we'll tell you so." },
        { t: "We'll tell you when to stop spending", d: "If a fifteen-year-old unit needs a compressor, we say so plainly and quote the replacement instead of taking your money for a repair that buys eight months." },
        { t: "Licensed for the refrigerant", d: "ARCtick-certified for any refrigerant handling. It's a legal requirement and plenty of cheaper operators quietly aren't." },
        { t: "Evap gets looked at before summer, not during", d: "Pads, water tray, pump and float. The first 38-degree day is a bad time to find out the pump seized over winter, and everyone rings on the same afternoon." },
        { t: "A report you can actually read", d: "What we found, what we did, what to watch. Emailed the same day, not a scribbled docket." },
      ],
    },
    benefits: [
      { t: "All major brands serviced", d: "Mitsubishi Electric, Daikin, Fujitsu, Panasonic, LG, Kaden, Braemar. Even ones we don't install." },
      { t: "Keeps your warranty valid", d: "Most manufacturers require annual service to keep warranty in force. We lodge a service report direct with the maker in your name." },
      { t: "Same-day breakdown attendance", d: "Aircon down in a heatwave? We aim to be on-site same-day across Pakenham, Berwick, Officer, Cranbourne and out to Warragul." },
      { t: "Fixed pricing before we touch anything", d: "Diagnostic, gas top-up, capacitor swap, board replacement, all quoted in writing before we open a wallet." },
      { t: "Refrigerant leak repair (not just top-up)", d: "If you're losing gas, it's a leak, we find it and fix it. Yearly re-gassing is a bandaid; we'd rather do the job once properly." },
      { t: "Coil clean that actually cleans", d: "Chemical coil clean, full disassembly on the indoor for ducted, condenser wash on the outdoor. Not a wipe-down with a rag." },
    ],
    brands: ["Mitsubishi Electric", "Daikin", "Fujitsu", "Panasonic", "LG", "Kaden", "Braemar", "Samsung"],
    pricing: [
      { tier: "Split system · annual service", price: "$220", includes: "Filter clean, coil chemical clean, refrigerant pressure check, capacitor test, thermistor calibration, drain flush, service report" },
      { tier: "Multi-split bundle service (3+ units)", price: "$140 ea", includes: "Same as above, per additional unit at the same address on the same visit" },
      { tier: "Ducted aircon · annual service", price: "$390", includes: "Return-air filter, coil clean, gas pressure check, zone controller test, damper motor test" },
      { tier: "Standard call-out (business hours)", price: "$120", includes: "Attend site, diagnose, quote repair in writing. Fee WAIVED if repair goes ahead the same day." },
      { tier: "Emergency call-out (after-hours / weekend)", price: "$220 + parts", includes: "Same-day attendance, on-call tradie (not an overseas call-centre)" },
    ],
    steps: [
      { title: "Book the visit, one call, no menu", detail: "Call and book with the person you'll see, Chaz or Jake picks up, quotes the service fee, and books a window that suits you. No press-1 hold music, no third-party dispatcher." },
      { title: "We arrive with the parts", detail: "Common consumables, capacitors, thermistors, PCB relays, refrigerant, filters, live on the truck. Most service jobs are one-visit fixes because we're not driving back for a $12 part." },
      { title: "Service on the day", detail: "Filter clean, coil chemical clean (indoor + outdoor), refrigerant pressure check, capacitor + fan motor test, drain flush, thermistor calibration. Written service report before we leave." },
      { title: "Diagnose + written quote for any repair", detail: "If a component needs replacing we quote it in writing before we touch it. Fixed pricing, no hourly creep. Fee is waived if you accept the repair the same day." },
      { title: "Service record lodged with the manufacturer", detail: "We upload the service report direct to Mitsubishi, Daikin, Fujitsu etc so your warranty record stays clean and any future claim goes through without a fight." },
      { title: "12-month reminder", detail: "We drop you a text 11 months later so the annual is booked before the heatwave. Skip it if you don't want it, it's a one-line opt-out." },
    ],
    systems: [
      {
        id: "evap",
        label: "Evaporative cooler service",
        blurb:
          "A pre-summer service on a roof-mounted evap. Pads, water tray, pump and float all get looked at, because the first hot day is a bad time to find out the pump has seized over winter.",
        photo: { src: "/evap cooler service close ip.jpg", alt: "Evaporative cooler service, cooling pads and water tray" },
        points: [
          "Pads inspected and replaced when they've gone brittle or scaled up",
          "Water tray drained, flushed and checked for leaks",
          "Pump, float valve and bleed rate tested under load",
          "Distributor lines cleared so every pad gets wet, not just the front one",
          "Belt, bearings and fan motor checked before the first hot day",
          "Roof access and safety handled by us, not you",
        ],
        priceFrom: "from $220 + GST",
        intro:
          "A pre-summer service on a roof-mounted evaporative cooler. Pads, water tray, pump and float all get checked and cleaned, because the first 38-degree day is a bad time to discover the pump seized over winter, and it's the day everyone else rings too.",
        bestFor: [
          "Any roof-mounted evap going into summer after a winter sitting idle",
          "Units blowing warm, smelling stale, or dripping",
          "September and October, before the queue forms",
          "Homes where the cooler is the only summer system, so it has to work",
        ],
        watchOut: [
          "Pads have a life. If they've gone brittle or scaled up they get replaced, and that's a parts cost on top of the service",
          "A seized pump or a failed motor is a repair, not a service. We'll quote it separately rather than bury it",
          "Roof access in the wet is a safety call. If it's not safe on the day we'll rebook rather than push it",
        ],
        faqs: [
          { q: "When should I service my evaporative cooler?", a: "Early spring, September or October. Leave it to the first hot day and you're in a queue with everyone else in the south-east." },
          { q: "How often do the pads need replacing?", a: "Typically every three to five years depending on your water and how hard the unit runs. We check them every service and tell you when they're getting close rather than replacing them early." },
          { q: "Why is it blowing warm air?", a: "Usually the pump isn't wetting the pads, a seized pump, a blocked distributor or a water supply that got turned off. All of it is checked in a service." },
        ],
      },
      {
        id: "aircon-service",
        label: "Split & ducted aircon service",
        blurb:
          "Filters, coils and drains on a refrigerated system. Most call-outs we get in January are units that have never been serviced, a blocked drain or a filthy coil, not a dead compressor.",
        photo: { src: "/ducted-split.webp", alt: "Ducted indoor unit in a roof space, where most servicing happens" },
        points: [
          "Indoor and outdoor coils chemically cleaned, not just a filter rinse",
          "Filters washed or replaced, and the return-air path checked",
          "Condensate drain flushed and flow tested",
          "Refrigerant pressures and superheat measured against spec",
          "Capacitor, fan motor and thermistors tested under load",
          "Electrical connections torque-checked and thermal-scanned",
        ],
        priceFrom: "from $190 + GST",
        intro:
          "An annual service on a refrigerated system is filters, coils, drains and pressures. It's unglamorous and it's the difference between a system that lasts fifteen years and one that dies in an eight-year-old heatwave with the whole street ahead of you in the queue.",
        bestFor: [
          "Any split or ducted system that hasn't been looked at in over a year",
          "Systems running weak, smelling musty or dripping inside",
          "Pre-summer, before the first hot day and the two-week wait that comes with it",
          "Rentals, where a service record matters if something goes wrong",
        ],
        watchOut: [
          "A service won't fix a failed compressor or a real refrigerant leak, if that's what it is we'll tell you and quote the repair separately",
          "If the unit is fifteen years old and needs major parts, replacing usually beats repairing and we'll say so plainly",
          "Booked in January you'll wait. Booked in October you won't",
        ],
        faqs: [
          { q: "How often should an aircon be serviced?", a: "Every two years for a lightly used split, annually for ducted or anything running most of the year. If it's never been done, now regardless of age." },
          { q: "Will you service a brand you don't install?", a: "Yes. Daikin, Fujitsu, Panasonic, LG, Samsung, Braemar, if it's on your wall we'll look at it." },
          { q: "My unit smells musty. Is that fixable?", a: "Usually. It's almost always the indoor coil and drain tray rather than anything serious, and it comes out in a proper service." },
        ],
      },
    ],
    photos: [
      { src: "/mitsubishi-msz-ap-series-v2-v3.webp", alt: "Mitsubishi MSZ-AP wall split system", caption: "Mitsubishi MSZ-AP, the split we service most" },
      { src: "/Kaden kdi-v2-Ducted Split System.webp", alt: "Kaden KDI ducted split system", caption: "Kaden ducted split, the indoor unit we service most" },
      { src: "/evap-cooler-service.webp", alt: "Evaporative cooler opened up on a tile roof", caption: "Evap opened up on the roof for a pre-summer service" },
      { src: "/evap cooler service close ip.jpg", alt: "Evaporative cooler pre-summer service, pads and water tray", caption: "Pre-summer evap clean, pump + water lines" },
    ],
    brandPods: [
      { brand: "Mitsubishi Electric", reason: "Parts pipeline is genuinely never a worry, even for units we didn't install, even for units 10+ years old.", href: "/brands/mitsubishi-electric" },
      { brand: "Kaden", reason: "Splits, ducted, gas ducted AND evap under one brand. Emerson-backed parts network in Melbourne, same-day on common boards.", href: "/brands/kaden" },
      { brand: "Brivis", reason: "Rinnai's Melbourne warehouse holds parts for gas and evap units still in the field after 15 years.", href: "/brands/brivis" },
    ],
    typical: {
      time: "Annual service · 60–90 min per unit. Breakdown diagnosis · under 30 min. Most repairs completed same visit.",
      warranty: "12-month warranty on any part we supply + 6-year workmanship on repair labour.",
      priceRange: "$120 diagnosis-only call-out → $390 ducted annual → parts on top.",
      followUp: "Service report lodged direct with the manufacturer + a 12-month reminder text before next summer.",
    },
    included: [
      "All standard consumables (filters, drain flush chemical, chemical coil cleaner)",
      "Refrigerant top-up up to 200 g if pressure is low (bigger charge = leak = separate quote)",
      "Written service report before we leave site",
      "Service record lodged with the manufacturer in your name",
      "12-month recall text so the next service gets booked in time",
    ],
    excluded: [
      "Replacement parts (capacitors, PCBs, fan motors, sensors, quoted in writing before we touch them)",
      "Refrigerant refill beyond 200 g (indicates a leak, leak-find + repair quoted separately)",
      "Roof-scaffold hire for two-storey ducted returns (~$300 typical)",
      "Access to a unit walled-in behind cabinetry that needs demolishing to reach",
    ],
    faqs: [
      { q: "How often should I service my aircon?", a: "Once a year is the manufacturer minimum to keep warranty in force. Heavy commercial use (a shop, a rental short-let) may need 2–4 per year. We text a reminder 11 months out so it's booked in time for summer." },
      { q: "My aircon isn't cooling, what is it?", a: "Top four causes in our service book: (1) dirty filters + coil, (2) low refrigerant from a leak (needs finding, not just topping up), (3) faulty capacitor on the outdoor, (4) blocked drain triggering a safety cut-out. We diagnose in under 30 minutes." },
      { q: "Do you fix all brands?", a: "Yes. We hold spare-parts accounts with Mitsubishi, Daikin, Fujitsu, Panasonic, LG and Kaden. Non-stock parts land within 24–48 hours." },
      { q: "The last mob just kept topping up my gas, is that OK?", a: "No. If it's losing gas, there's a leak. Yearly re-gassing hides the fault while the environmental refund vents into the atmosphere. We'd rather leak-find it once and fix it properly." },
      { q: "Do you honour manufacturer warranties on units you didn't install?", a: "Yes. We're an authorised service partner for Mitsubishi, Kaden and Brivis. If your unit's under warranty we lodge the claim direct and the parts come through the manufacturer's warranty channel." },
    ],
  },

  "gas-plumbing": {
    // ------------------------------------------------------------------
    // PHOTOS OF OUR OWN JOBS go here, same shape as the heat pump one
    // above: installPhotos: { heading, blurb, shots: [{ src, alt, caption }] }.
    // Drop the files into /public, add the lines, and a navy photo band
    // appears on this page. Nothing else needs changing.
    // ------------------------------------------------------------------
    metaTitle: "Gas Plumbing & Ducted Heating, Melbourne SE",
    metaDescription:
      "Licensed gas fitters + plumbers serving Melbourne's south-east, Brivis and Kaden ducted heater retrofit, Thermann continuous-flow hot water, gas leak detection, same-day emergency call-outs. VBA-licensed, full compliance certificates.",
    h1: "Gas heating, hot water & plumbing across Melbourne's south-east",
    intro:
      "From a same-day Brivis Wombat replacement to a Thermann continuous-flow hot water swap, our VBA-licensed gas fitters and plumbers handle the lot across every postcode within 75 km of Pakenham. Same-day emergency call-outs for no-hot-water, gas leaks or CO alarms, fixed-price quotes on planned work back in 2 business hours, and full compliance certificates on every job.",
    whyThese: {
      heading: "Why Brivis and Kaden for gas, and why the star rating matters more than the price.",
      blurb:
        "Gas ducted is still the least expensive way to heat a whole Melbourne home through winter, and the fastest to bring a cold house up. Which one you pick decides what you pay to run it for the next fifteen years.",
      points: [
        { t: "Brivis is what most of these homes were built with", d: "Wombat, Buffalo and Compact Classic drop into the existing cavity, ductwork and controller wiring, so a retrofit is a day rather than a rebuild. Rinnai backs the parts pipeline, even fifteen-year-old units are still serviceable." },
        { t: "Kaden, same job, different supply chain", d: "Reece-exclusive, internal and external, 3 to 6 star, with a universal footprint that drops onto an existing Brivis or Braemar pad. Parts sit in every Reece store in Victoria, and it goes in with the same crew and the same 6-year workmanship as anything else we fit." },
        { t: "We quote the payback, not just the price", d: "A 3-star and a 6-star heat the same house to the same temperature. The 6-star costs more on the day and less every winter after it. We'll show you where the crossover lands on your gas bill, because on a house you're selling in two years the answer is genuinely different from a house you're staying in." },
        { t: "Carbon monoxide testing on every gas job", d: "A cracked heat exchanger has no smell and no warning. Calibrated analyser, results on the report. This is the part of the job that isn't optional and we won't skip it to win a quote." },
        { t: "Thermann G-series for continuous flow", d: "Made by Reece, not Rinnai, whatever the internet tells you. Never runs out, no tank losing heat overnight, and same-day swap on most like-for-like replacements." },
        { t: "Compliance certificate within 24 hours", d: "VBA-licensed gas fitters, paperwork emailed the next business day. Not chased three weeks later when you need it for a sale." },
      ],
    },
    benefits: [
      { t: "VBA-licensed gas fitting", d: "Full Victorian Plumbing Licence + Type-A gas endorsement. Every gas job compliant with AS/NZS 5601." },
      { t: "Gas ducted retrofit, done weekly", d: "The default heater in most homes built 1990–2015 in the corridor. We replace one nearly every week, Brivis Wombat, Buffalo and Kaden gas ducted all covered." },
      { t: "Thermann G-series continuous flow", d: "Our default gas continuous-flow hot water, a Reece-exclusive brand (not Rinnai), Australian-designed, 12-yr heat-exchanger warranty." },
      { t: "Gas leak detection + safe-to-stay", d: "Electronic leak detector, pressure-drop test, safe-to-stay written verification. We don't just tell you 'seems OK'." },
      { t: "Emergency call-outs, on-call tradie", d: "Same-day across the corridor for gas leaks, no hot water, CO alarms. Answered by us, not an overseas call-centre." },
      { t: "Old unit removed same visit", d: "Old Brivis, old Vulcan tank, old Rinnai continuous flow, off the pad and to the metal recycler on install day. No hard-rubbish wait." },
      { t: "Puretec water filtration", d: "Whole-home on the incoming main, a protection filter on the hot water cold inlet, or an under-sink unit for drinking water. Fitted by a licensed plumber, not a handyman." },
    ],
    brands: ["Brivis", "Kaden", "Thermann", "Puretec", "Rinnai", "Rheem", "Bosch", "Dux", "Vulcan"],
    pricing: [
      { tier: "Brivis Wombat replacement (like-for-like)", price: "from $4,800", includes: "Supply, install, controller wiring reuse, compliance cert, old unit removal" },
      { tier: "Brivis Buffalo higher-spec replacement", price: "from $5,600", includes: "As above, quieter fan, longer service life" },
      { tier: "Thermann G-series continuous flow (26 L)", price: "from $2,499", includes: "Supply, install, compliance cert, controller (indoor + outdoor)" },
      { tier: "Gas appliance installation (single point)", price: "from $349", includes: "Connection, pressure test, compliance cert" },
      { tier: "Gas leak detection + report", price: "from $220", includes: "Electronic leak test, pressure test, written safe-to-stay report" },
      { tier: "Emergency call-out (after-hours)", price: "$220 + parts", includes: "Same-day attendance for gas leaks, no hot water, CO alarms" },
    ],
    steps: [
      { title: "Same-day emergency? Call first", detail: "Gas leak, no hot water, CO alarm, call and we'll be on-site same-day. Standard call-out $120 in-hours, $220 after-hours. Fee waived if repair goes ahead on the day." },
      { title: "Planned job? Written quote in 2 hrs", detail: "Send a photo of the existing unit and we'll come back the same business day with the replacement model, capacity, star rating and installed price. Includes VEU eligibility check for the swap." },
      { title: "Old unit assessed on site", detail: "Ducted heater, is the cavity + ductwork reusable? (Usually yes on a like-for-like retrofit.) Hot water, is the existing pad + pipework good, or does it need rework? We tell you before we touch anything." },
      { title: "Install day", detail: "Brivis ducted replacement, 3-4 hours if the ducts + controller wiring reuse cleanly. Continuous flow hot water swap, 3-5 hours. Same-day for both. Old unit off the pad and loaded up." },
      { title: "Commission, pressure test, hand over", detail: "Gas pressure test to AS/NZS 5601, controller programmed, temperature setpoint checked, we run hot water at the tap. You sign the job card when it's running the way you want." },
      { title: "Compliance certificate + warranty registration", detail: "Gas compliance certificate emailed inside 24 hours. Manufacturer warranty registered in your name at the same time." },
    ],
    systems: [
      {
        id: "gas-ducted",
        label: "Gas ducted heating",
        blurb:
          "A gas furnace in the roof or against an outside wall, ducted to vents through the house. Still the least expensive way to heat a whole Melbourne home through winter, and the fastest to bring one up from cold.",
        photo: { src: "/Brivis Wombat Indoor 3 star.jpg", alt: "Brivis Wombat internal gas ducted heater" },
        points: [
          "Brivis Wombat, Compact Classic, Buffalo and StarPro",
          "Kaden internal and external, 3 to 5 star",
          "Internal (roof or cupboard) and external (against the wall) versions",
          "Star rating drives running cost. We quote the payback, not just the price",
          "New flue and cowl to current standards, not the old one refitted",
          "Gas line checked and upsized if the new unit needs it",
          "New return-air filter frame and grille where the old one is past it",
          "Existing ductwork inspected and re-taped, or replaced if it's shot",
        ],
        priceFrom: "from $4,600 installed",
        intro:
          "A gas furnace in the roof or against an outside wall, ducted to vents through the house. It's still the least expensive way to heat a whole Melbourne home through winter, and the fastest to bring a cold house up to temperature, which is why most homes built here since 1990 have one.",
        bestFor: [
          "Whole-home winter heating, fast, in a climate that genuinely gets cold",
          "Like-for-like replacement, the existing cavity, ductwork and controller wiring usually all reuse",
          "Homes with existing gas where the connection is already paid for",
          "Anyone who wants heat now rather than in twenty minutes",
        ],
        watchOut: [
          "Star rating decides your running cost for the next fifteen years. On a house you keep, what a 3-star costs you every winter outruns what it saved you on the day",
          "Heating only. Pair it with evap or refrigerated for summer",
          "Gas prices are moving. If you're weighing gas against a reverse-cycle system long-term, ask us to run both numbers rather than assuming",
          "Any gas heater over ten years old wants a carbon monoxide test, whether or not you replace it",
        ],
        faqs: [
          { q: "Can you replace my old ducted heater with the same footprint?", a: "Nearly always. Brivis and Kaden internal units are built to drop into the existing cavity, and the ducts, return-air grille and controller wiring usually reuse. That's what keeps it a one-day job." },
          { q: "Is a 6-star worth the extra over a 3-star?", a: "On a house you're staying in, generally yes, the efficiency difference shows up every winter. On a house you're selling in two years, probably not. We'll show you where the crossover lands rather than just pushing the dearer one." },
          { q: "How long does a changeover take?", a: "A like-for-like internal swap is usually a single day. External or a first-time install with new ductwork runs longer, and we'll say which at the quote." },
        ],
      },
      {
        id: "continuous-flow",
        label: "Continuous flow gas hot water",
        blurb:
          "Heats water on demand, so it never runs out and there's no tank losing heat overnight. Wall-mounted outside and about the size of a briefcase.",
        photo: { src: "/G-Series_Front_On_View_1200x900.jpg", alt: "Thermann G-series continuous flow gas hot water unit" },
        points: [
          "Thermann G-series (made by Reece) and Rinnai",
          "16, 20 and 26 litre-per-minute sizes",
          "Same-day swap on most like-for-like replacements",
          "Temperature-controlled to 50 °C at the outlets, as required",
          "New copper tails and isolation valves, not reused fittings",
          "New wall bracket, unit levelled and clear of the eave",
          "Tempering valve fitted or replaced to keep outlets at 50 °C",
          "Old unit removed, wall made good, pressure tested before we leave",
        ],
        priceFrom: "from $1,850 installed",
        intro:
          "Continuous flow heats water on demand instead of storing it. There's no tank losing heat overnight and it never runs out, the trade-off is that it's tied to gas, and it heats only as fast as its rating allows.",
        bestFor: [
          "Households that run out of hot water with a tank",
          "Homes tight on space. It's wall-mounted outside, about the size of a briefcase",
          "Like-for-like replacement of an existing continuous flow, often same-day",
          "Anyone staying on gas who wants the simplest possible swap",
        ],
        watchOut: [
          "It's a gas appliance, so it doesn't attract the VEU heat pump rebates, worth comparing total cost against a heat pump before deciding",
          "Flow rate is the limit: a 16 L/min unit won't run two showers and the kitchen at once. We size on outlets, not guesswork",
          "No hot water in a blackout on some models, since the electronics need power",
        ],
        faqs: [
          { q: "What size continuous flow do I need?", a: "16 L/min suits a smaller home with one bathroom, 20 for most family homes, 26 where two showers might run together. We size on how many outlets could realistically run at once." },
          { q: "Is Thermann made by Rinnai?", a: "No, Thermann is Reece's own brand, made by Dux. It's a common mix-up. Parts are stocked in every Reece store in Victoria." },
          { q: "Should I go continuous flow or a heat pump?", a: "If you're staying on gas and want the simplest swap, continuous flow. If you'd take a rebate and lower running costs, a heat pump usually wins on total cost. We'll quote both if you want to compare properly." },
        ],
      },
      {
        id: "gas-service",
        label: "Gas heater service & carbon monoxide test",
        blurb:
          "An annual check of the burner, heat exchanger and flue, with a carbon monoxide test on the running appliance. This is the one that matters, a cracked heat exchanger has no smell and no warning.",
        photo: { src: "/gas-ducted-install.webp", alt: "Gas ducted heater in a roof space, where the service and CO test happen" },
        points: [
          "Full CO test with a calibrated analyser, results on the report",
          "Burner clean, heat exchanger inspection, flue and seal check",
          "Written report emailed the same day",
          "Recommended every 2 years, annually on units over 10 years old",
          "Burner stripped and cleaned, not just visually checked",
          "Heat exchanger inspected for cracking",
          "Flue and seals checked end to end",
          "Calibrated CO analyser reading recorded on the report",
        ],
        priceFrom: "$280 + GST",
        intro:
          "An annual check of the burner, heat exchanger and flue, with a carbon monoxide test on the running appliance. This is the one that actually matters, a cracked heat exchanger has no smell, no noise and no warning, and it vents into the house you sleep in.",
        bestFor: [
          "Any gas heater going into its first winter after a year unused",
          "Units over ten years old, annually, without exception",
          "Before you list a house for sale, when the certificate gets asked for",
          "Anyone who has never had it done and doesn't know when it last was",
        ],
        watchOut: [
          "If the analyser finds carbon monoxide, we shut the appliance down. That's not an upsell, it's the law and the right call",
          "A failed heat exchanger isn't repairable on most units. It's a replacement, and we'll be straight with you about that",
          "Booked in May you'll wait. Booked in March you won't",
        ],
        faqs: [
          { q: "How often should a gas heater be serviced?", a: "Every two years as a minimum, annually once it's over ten years old. Energy Safe Victoria recommends every two years for all gas heaters." },
          { q: "What is a carbon monoxide test?", a: "We run the appliance and measure the flue gases with a calibrated analyser, checking the heat exchanger hasn't cracked and spilled combustion products into your air. The result goes on the report." },
          { q: "What happens if you find carbon monoxide?", a: "We disconnect the appliance and tell you exactly what we found. It's the one part of the job with no negotiation in it." },
        ],
      },
      {
        id: "temporary-hot-water",
        label: "Temporary hot water hire",
        blurb:
          "A temporary unit plumbed in the same day so the house has hot water while you decide what to replace the old one with. $30 a day, and the $350 set-up and removal is waived if we do the replacement.",
        photo: { src: "/gas-hot-water-changeover.webp", alt: "Hot water changeover on site" },
        points: [
          "Connected the same day in most cases",
          "$30 per day while it's on site",
          "$350 set-up and removal, waived if we do the replacement",
          "Buys you time to compare quotes instead of deciding in a panic",
          "Runs the whole house, not just one tap",
          "Disconnected and taken away on the day the new system goes in",
          "Rentals and tenanted properties, keeps you compliant while you sort it",
          "No obligation to use us for the replacement",
        ],
        priceFrom: "$30/day · $350 set-up waived if we do the job",
        intro:
          "When a tank dies you are suddenly being asked to make a three or four thousand dollar decision, today, with cold showers as the deadline. That is the worst possible way to buy a hot water system, and it is exactly how most people end up with the wrong one. A temporary unit takes the deadline off the table: the house has hot water tonight, and you get to choose the replacement properly, at a normal pace, with real quotes in front of you.",
        bestFor: [
          "A tank that has failed and a replacement decision you don't want to rush",
          "Households with kids, shift workers, or anyone who cannot go a day without hot water",
          "Waiting on a specific unit that isn't in stock, or on a rebate approval to come through",
          "Rentals, where the Residential Tenancies minimum standards don't pause while you decide",
          "Anyone who wants to compare three quotes properly rather than take whoever can come today",
        ],
        watchOut: [
          "It's a temporary unit, not a permanent one. It does the job and it isn't pretty, and it isn't meant to live there",
          "The daily rate keeps running until the new system goes in, so it buys time rather than replacing the decision",
          "We need somewhere sensible to put it and a water and power or gas point to run it from. We check that when we quote",
          "If your existing system can be repaired for less than the hire will cost, we'll tell you that instead. It happens more often than you'd think",
        ],
        faqs: [
          {
            q: "How much does temporary hot water cost?",
            a: "$30 a day while it's on site, plus a $350 set-up and removal fee. If we end up doing the replacement, the $350 is waived, so the only thing you pay for is the days you actually used it.",
          },
          {
            q: "Do I have to use you for the new system?",
            a: "No. The hire stands on its own and you're free to go elsewhere for the replacement. You'd pay the $350 in that case, which covers the two trips and the gear. We'd rather you had hot water and chose properly than felt cornered into a decision.",
          },
          {
            q: "How fast can you get one connected?",
            a: "Usually the same day across Pakenham, Officer, Berwick, Beaconsfield, Narre Warren and Cranbourne if you ring in the morning. It goes in on the first visit, at the same time as we look at what failed.",
          },
          {
            q: "Does it run the whole house or just one tap?",
            a: "The whole house. It plumbs into the existing hot water line where the old unit was, so every outlet works the way it normally does.",
          },
          {
            q: "I'm a landlord. Does this keep me compliant?",
            a: "It keeps hot water running at the property while the permanent replacement is arranged, which is the practical problem the Residential Tenancies minimum standards create. Get the permanent fix booked as well; the temporary unit buys time, it isn't the answer on its own.",
          },
          {
            q: "What if the old system can just be fixed?",
            a: "Then we fix it and you don't need this at all. We look at what failed on the same visit, and if it's a component rather than the tank we'll say so. Hiring a temporary unit to sit next to a repairable system would be us taking your money for nothing.",
          },
        ],
      },
    ],
    photos: [
      { src: "/Brivis Wombat Indoor 3 star.jpg", alt: "Brivis Wombat internal gas ducted heater", caption: "Brivis Classic Wombat, the ducted heater we replace most often" },
      { src: "/G-Series_Front_On_View_1200x900.jpg", alt: "Thermann G-series continuous flow", caption: "Thermann G-series, our default continuous-flow gas hot water" },
      { src: "/gas-ducted-install.webp", alt: "Gas ducted heater install in progress", caption: "Gas ducted retrofit, reusing existing cavity + ducts" },
      { src: "/gas-hot-water-changeover.webp", alt: "Same-day gas hot water changeover", caption: "Same-day hot water changeover, old off, new on" },
      { src: "/gas-line.webp", alt: "Excavator trenching for a new gas line", caption: "Trenching a new gas main to the house" },
      { src: "/thermann-continues-flow-close-up.webp", alt: "Thermann continuous flow unit on a brick wall", caption: "Thermann G-series, installed and commissioned" },
    ],
    brandPods: [
      { brand: "Brivis", reason: "The default gas ducted heater in most corridor homes built 1990–2015. Rinnai-backed parts pipeline for legacy Wombat + Buffalo units.", href: "/brands/brivis" },
      { brand: "Kaden Gas Ducted", reason: "3 to 6 star, internal and external, on a universal footprint that drops into a Brivis or Braemar cavity so the ducts and wiring reuse.", href: "/brands/kaden" },
      { brand: "Thermann", reason: "Our default continuous-flow gas hot water. Australian-designed, Reece supply, 12-yr heat-exchanger warranty.", href: "/brands/thermann" },
      { brand: "Puretec", reason: "Australian water filtration. Whole-home on the main, protection on the hot water cold inlet, and under-sink for drinking water.", href: "/water-filtration" },
    ],
    typical: {
      time: "Ducted heater replacement · 3–4 hrs (same day). Continuous flow swap · 3–5 hrs (same day). Emergency call-out · on-site same day.",
      warranty: "6-year workmanship + manufacturer heat-exchanger warranty (Brivis 7-yr, Thermann 12-yr from Reece, Rinnai 12-yr).",
      priceRange: "$220 leak test → $6,000+ premium Brivis Buffalo 6-star",
      followUp: "We ring the following week to check controller + temperature settings and that everything's running clean.",
    },
    included: [
      "Supply of the specified unit + all mounting hardware + gas fittings",
      "Standard install labour (like-for-like retrofit into existing cavity/pad)",
      "Gas pressure test + refrigerant handling where relevant",
      "Old unit drained, disconnected, removed and taken to a metal recycler",
      "Full electrical + gas compliance certificates emailed inside 24 hrs",
      "Manufacturer warranty registered in your name",
    ],
    excluded: [
      "Duct rework or new duct runs (~$180 per metre of new flex duct)",
      "New gas main run to the appliance if the existing line is undersized",
      "LPG bottle relocation (~$220) or gas capping of a decommissioned appliance",
      "Structural rework, cavity re-lining or painting after cutout adjustments",
      "Slab / concrete pad re-pour if the existing pad has failed",
    ],
    faqs: [
      { q: "Do I need a gas-safe certificate?", a: "Yes, every new gas appliance install or replacement in Victoria requires a Type-A compliance certificate from a licensed gas fitter. We issue this on every job and email it to you inside 24 hours." },
      { q: "Can you do same-day emergency call-outs?", a: "Yes, for gas leaks, burst pipes, no hot water and CO alarms across the corridor. Standard call-out is $120 in-hours, $220 after-hours. Fee waived if you accept the repair the same day." },
      { q: "Should I replace my gas hot water with a heat pump?", a: "If the gas unit is over 10 years old, a heat pump often pays back in 2–4 years through energy savings + the VEU rebate. We'll quote both side-by-side so you can see the net-of-rebate numbers before deciding." },
      { q: "My Brivis is 15 years old, replace or repair?", a: "15-year-old Brivis is usually past its economic repair life for anything more than a controller / thermocouple fix. A Wombat replacement reuses your existing ducts and controller wiring, which is what keeps it a one-day job rather than a rebuild." },
      { q: "Can I move from gas to reverse-cycle at the same time?", a: "Yes. We're licensed refrigeration + gas so we can decommission the gas and install a reverse-cycle ducted or splits in the same visit. Usually the cleanest way to do a full swap." },
      { q: "How do I know if my gas line has a leak?", a: "Rotten-egg smell, hissing near the meter, unusually high gas bill, or dizziness / headaches near a burning appliance. Get out of the house, call the emergency gas line (1800 427 532) then call us. We'll be on-site same-day to leak-test and repair." },
      { q: "Do you install water filters?", a: "Yes, Puretec. Whole-home on the incoming main so every tap and appliance runs on filtered water, a protection filter on the cold inlet to your hot water system, and under-sink units for drinking water. Which one is right depends entirely on what you've noticed, so tell us that first and we'll point you at the one that fixes it. There's a full write-up of all three at /water-filtration, including what a filter does not do." },
    ],
  },
};

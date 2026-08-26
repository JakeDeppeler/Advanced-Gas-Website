// Long-form copy for each service page. SEO-optimised, H1 + intro contain
// primary keyword + region, FAQs feed FAQPage schema, internal links flow
// to /quote and suburb pages.

export type ServiceContent = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  /**
   * What's included, as tiles. `line` is the one-liner on the face of
   * the tile; `d` is what opens underneath it. Written per service —
   * a tile with no line is just a heading in a coloured box.
   */
  benefits: { t: string; d: string; line?: string; icon?: string }[];
  /**
   * "How it looks" — the filtration pages' sand band, on the service
   * pages. What the gear actually looks like where it goes, which is
   * the question people are too embarrassed to ask and the one that
   * decides whether they say yes to the quote.
   */
  looks?: {
    heading: string;
    note: string;
    photo: string;
    photoAlt: string;
    photoScene?: boolean;
    /** The figures beside the photo. Four short pairs. */
    facts: { v: string; k: string }[];
  };

  /**
   * "Keeping it working" — the half of the argument that only matters
   * after the sale, and therefore the half worth putting on the page
   * before it. Photo one side, the facts the other.
   */
  servicing?: {
    heading: string;
    photo: string;
    photoAlt: string;
    photoScene?: boolean;
    body: string;
    facts: string[];
  };

  /** Full-bleed header photo, the way the filtration pages lead. */
  heroPhoto?: string;
  heroPhotoAlt?: string;
  /** The figures along the bottom of the header. Four short pairs. */
  heroFacts?: { v: string; k: string }[];
  brands: string[];
  /**
   * Indicative pricing, rendered as cards in the same idiom as the
   * filtration model cards: a product shot, the number, and what the
   * number buys as a list rather than a run-on sentence.
   *
   * `group` is the chip above the name. Gas & plumbing is three trades
   * on one page, so without it the six numbers read as one undivided
   * list and you can't tell which trade a price belongs to.
   *
   * `photo` is a /public path. Optional — where a tier has no obvious
   * product shot (a call-out fee), the card renders without one.
   */
  pricing: {
    tier: string;
    price: string;
    /** What the number buys. Comma-separated, and each item has to stand
     *  on its own — the card renders them as a list, so "As above" or a
     *  trailing clause reads as a broken bullet. */
    includes: string;
    group?: string;
    photo?: string;
    /** True where `photo` is a real scene rather than a product cut-out.
     *  Scenes fill the panel; cut-outs sit inside it with padding. */
    photoScene?: boolean;
    /** The caption above the figure. "Installed" is right for an install
     *  and wrong for a call-out fee, so anything that isn't an install
     *  says what it actually is. */
    priceKey?: string;
  }[];
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
    photo: {
      src: string;
      alt: string;
      /** True where the photo is a real scene rather than a studio cut-out
       *  on white. Only scenes go full bleed behind the header — a
       *  cut-out stretched across a hero reads as a giant letterform. */
      scene?: boolean;
    };
    /** Which of the parent service's brands we actually fit in this
     *  system. Absent means all of them. Split systems are Mitsubishi
     *  Electric and Kaden — the evap brand and the ducted controller are
     *  not things you can buy on that page. */
    brands?: string[];
    /**
     * What's in the price, as tiles rather than a checklist.
     *
     * `points` can't become tiles on their own: they're single statements,
     * so splitting one into a face and a body truncates it mid-thought and
     * the panel just repeats the tile. A tile wants a short claim you can
     * scan and a sentence that earns it, and that has to be written.
     *
     * Where this is present the section renders as the tabs the filtration
     * pages use; where it isn't, `points` render as the checklist.
     */
    benefitTiles?: { t: string; line: string; detail: string; icon?: string }[];
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
    photo: {
      src: string;
      alt: string;
      /** True where the photo is a real scene rather than a studio cut-out
       *  on white. Only scenes go full bleed behind the header — a
       *  cut-out stretched across a hero reads as a giant letterform. */
      scene?: boolean;
    };
    /** Which of the parent service's brands we actually fit in this
     *  system. Absent means all of them. Split systems are Mitsubishi
     *  Electric and Kaden — the evap brand and the ducted controller are
     *  not things you can buy on that page. */
    brands?: string[];
    /**
     * What's in the price, as tiles rather than a checklist.
     *
     * `points` can't become tiles on their own: they're single statements,
     * so splitting one into a face and a body truncates it mid-thought and
     * the panel just repeats the tile. A tile wants a short claim you can
     * scan and a sentence that earns it, and that has to be written.
     *
     * Where this is present the section renders as the tabs the filtration
     * pages use; where it isn't, `points` render as the checklist.
     */
    benefitTiles?: { t: string; line: string; detail: string; icon?: string }[];
    points: string[];
    priceFrom?: string;
    /** Long-form opening for the system's own page at
     *  /services/<service>/<id>. Distinct from `blurb`, which is the
     *  one-paragraph version shown on the parent service page. */
    intro?: string;
    /** "How it looks" and "Keeping it working" for this system's own
     *  page. Same shape as the parent service's, because the system page
     *  runs the same rhythm one level down — but written about the one
     *  system rather than the whole service, which is the point of
     *  having the page at all. */
    looks?: {
      heading: string;
      note: string;
      photo: string;
      photoAlt: string;
      /** True where the photo is a real scene. Scenes fill the panel;
       *  a manufacturer cut-out sits inside it on white instead. */
      photoScene?: boolean;
      facts: { v: string; k: string }[];
    };
    servicing?: {
      heading: string;
      photo: string;
      photoAlt: string;
      /** True where the photo is a real scene. Scenes fill the panel;
       *  a manufacturer cut-out sits inside it on white instead. */
      photoScene?: boolean;
      body: string;
      facts: string[];
    };
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
    looks: {
      heading: "What it actually looks like on the wall.",
      note:
        "Nobody asks this at the quote and everybody thinks it. An indoor head is about the size of a long shoebox and sits high on the wall; the outdoor unit is the part that ends up down the side of the house. What decides whether it looks tidy is the pipework, and that is entirely down to who installs it.",
      photo: "/ducted-condenser.webp",
      photoAlt: "Outdoor condenser on a levelled stand against a brick wall, pipework capped",
      photoScene: true,
      facts: [
        { v: "~80 × 30 cm", k: "A typical indoor head, mounted high" },
        { v: "Colour-matched", k: "Capping over the pipework, not bare lagging" },
        { v: "Levelled + rated", k: "Wall brackets or a ground stand, never bricks" },
        { v: "Cored and sealed", k: "One neat penetration, drop sheets down" },
      ],
    },
    servicing: {
      heading: "It only stays quiet if somebody cleans it.",
      photo: "/ducted-split.webp",
      photoAlt: "A ducted indoor unit on a platform in a roof space",
      photoScene: true,
      body:
        "Almost every January call-out we get is a filthy coil, a blocked filter or a clogged condensate drain on a system nobody has touched since it went in. None of those are faults. All of them look like faults on the hottest day of the year, and all of them are an afternoon rather than a new system.",
      facts: [
        "Annual service is $220 on a split and $390 on a ducted, booked September to November before the rush",
        "Filters, coils, drain, refrigerant pressures and capacitor, with a written report before we leave",
        "We lodge the report with the manufacturer so the warranty record stays clean for any future claim",
        "We text you eleven months later so the next one gets booked rather than forgotten",
        "Ducted indoors go on a platform with a clear path to them, because a unit walled in behind cabinetry is a quote, not a service",
      ],
    },
    // ------------------------------------------------------------------
    // PHOTOS OF OUR OWN JOBS go here, same shape as the heat pump one
    // above: installPhotos: { heading, blurb, shots: [{ src, alt, caption }] }.
    // Drop the files into /public, add the lines, and a navy photo band
    // appears on this page. Nothing else needs changing.
    // ------------------------------------------------------------------
    metaTitle: "Air Conditioning Installation Pakenham & Berwick",
    metaDescription:
      "Licensed split, multi-head and ducted aircon installation across Melbourne's south-east. Mitsubishi Electric, Kaden. Fixed-price quotes in 2 hrs, 6-year workmanship warranty.",
    heroFacts: [
      { v: "Same day", k: "A single wall split, start to finish" },
      { v: "ARCtick", k: "AU59557 — legally required, and we hold it" },
      { v: "6-year", k: "Workmanship, on top of the manufacturer's" },
      { v: "Heat-load first", k: "Room by room, before we quote a size" },
    ],
    h1: "Air conditioning, installed properly",
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
      { t: "ARCtick-licensed refrigeration", d: "All refrigerant handling by ARC-certified technicians. Legally required, and we hold the ticket." , line: "Legally required, and we hold it", icon: "shield" },
      { t: "Mitsubishi Electric default", d: "Under 1% failure rate across the range. We put it in our own homes, which is the only recommendation that really counts." , line: "Under 1% failure rate, and it's what we fit at home", icon: "snowflake" },
      { t: "Right-sized, not oversized", d: "Room-by-room heat-load calc before we quote. Oversized units cycle constantly and cost 20% more to run." , line: "Room-by-room heat load, before a size is quoted", icon: "ruler" },
      { t: "Zonemate zoning for ducted", d: "We install ducted with Zonemate 4/6/8-zone controllers by default. No re-work in year 3 when you want to zone a spare bedroom." , line: "Room by room, on a schedule you set", icon: "clock" },
      { t: "Colour-matched conduit + tidy exit", d: "Drop sheets on the floor, dust extraction in the wall, conduit outside colour-matched to your cladding. It's the details clients remember." , line: "The pipework you'll be looking at for a decade", icon: "ruler" },
      { t: "Compliance cert emailed in 24 hrs", d: "Electrical + refrigeration compliance docs into your inbox the day after we leave, not chased weeks later." , line: "In your inbox inside a day, not chased", icon: "shield" },
    ],
    brands: ["Mitsubishi Electric", "Kaden", "Brivis (evap)", "Zonemate"],
    pricing: [
      { tier: "Single split system (2.5 kW · bedroom)", price: "from $2,199", includes: "Supply, back-to-back install, up to 3 m line-set, compliance cert", group: "Split system", photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp" },
      { tier: "Single split system (5.0 kW · living)", price: "from $2,899", includes: "Supply, install, up to 5 m line-set, compliance cert", group: "Split system", photo: "/Kaden KSI V3 wall split system.jpg" },
      { tier: "Single split system (7.1 kW · large open-plan)", price: "from $3,299", includes: "Supply, install, up to 5 m line-set, compliance cert", group: "Split system", photo: "/mitsubishi-msz-ap-series-v2-v3.webp" },
      { tier: "Multi-head 2-indoor (Mitsubishi MXZ-2F)", price: "from $6,500", includes: "One outdoor, two indoor heads, up to 15 m combined line-set", group: "Multi-head", photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp" },
      { tier: "Multi-head 4-indoor (Mitsubishi MXZ-4F)", price: "from $11,500", includes: "One outdoor, four indoor heads, up to 30 m combined line-set", group: "Multi-head", photo: "/Kaden Multi Head.jpg" },
      { tier: "Ducted reverse-cycle (PEAD-M · 4 zones)", price: "from $12,500", includes: "PEAD-M indoor, PUZ outdoor, 4× Zonemate zones, controller, compliance", group: "Ducted reverse-cycle", photo: "/mitsubishi-pea-m-ducted-v2-v3.webp" },
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
        looks: {
          heading: "A shoebox on the wall and a box outside.",
          note:
            "The indoor head goes high on the wall, usually above a door or a bed. Outside, the condenser sits on brackets or a ground stand down the side of the house. What decides whether it looks tidy is the run between them \u2014 and that is entirely down to who fits it.",
          photo: "/ducted-condenser.webp",
          photoAlt: "The outdoor condenser on a levelled stand beside the house",
          photoScene: true,
          facts: [
            { v: "~80 \u00d7 30 cm", k: "The indoor head, mounted near the ceiling" },
            { v: "Colour-matched", k: "Capping over the pipework, not bare lagging" },
            { v: "Back-to-back", k: "Where we can, so the run is a metre not ten" },
            { v: "19 dBA", k: "On low, on the smallest unit" },
          ],
        },
        servicing: {
          heading: "One clean a year and it stops being a problem.",
          photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
          photoAlt: "Mitsubishi MSZ-AP wall split indoor head",
          body:
            "A split that gets serviced once a year runs at its rated output for fifteen years. One that doesn't loses capacity quietly, and the first anyone notices is the afternoon it can't hold the room. That is not a fault, it's a filter and a coil.",
          facts: [
            "$220 a year, or $140 each where there are three or more at the same address on the same visit",
            "Filter, coil chemical clean, drain flush, refrigerant pressures and the capacitor tested",
            "Booked September to November, before the first heatwave rather than during it",
            "The report goes to the manufacturer so the warranty record stays clean",
            "Five-year manufacturer warranty on the unit and six years from us on the install",
          ],
        },
        label: "Split system air conditioning",
        blurb:
          "One outdoor unit, one indoor head. The right answer for a bedroom, a living room or a granny flat: the simplest system there is, the least to run, and the quickest to get in. Most go in back-to-back in a single morning.",
        photo: { src: "/Kaden Indoor.jpg", alt: "Kaden wall split system installed high on a bedroom wall", scene: true },
        brands: ["Mitsubishi Electric", "Kaden"],
        benefitTiles: [
          {
            t: "Sized to the room",
            line: "2.5, 5.0 or 7.1 kW — not whatever's on the truck",
            detail:
              "2.5 kW for bedrooms, 5.0 kW for living, 7.1 kW for large open-plan. An oversized unit short-cycles: it hits the set point, stops, and never runs long enough to actually dehumidify. It costs more to buy and more to run, so the size is a decision, not a default.",
            icon: "ruler",
          },
          {
            t: "Two brands, both good",
            line: "Mitsubishi Electric MSZ-AP or Kaden KSI",
            detail:
              "Mitsubishi has the lowest failure rate in our install base, and we can still get parts for heads we fitted ten years ago. Kaden is the value pick with the same six-year workmanship behind it. We'll tell you which suits the room and the budget rather than defaulting to the dearer one.",
            icon: "snowflake",
          },
          {
            t: "One morning",
            line: "Back-to-back install in three to four hours",
            detail:
              "Most splits go in back-to-back — the head on the inside of a wall, the outdoor unit directly behind it — which is one core hole and no work in the roof. In and out in a morning, without you taking a day off work.",
            icon: "clock",
          },
          {
            t: "Fresh copper",
            line: "New line-set every time, never the old pipe",
            detail:
              "Reusing an old line-set means old oil and whatever was left in it going into a new compressor. We run new copper, every job. It is the difference you cannot see and the one that decides how long the system lasts.",
            icon: "flow",
          },
          {
            t: "Run it from your phone",
            line: "Wi-Fi on both — MELCloud on Mitsubishi, the Kaden app on Kaden",
            detail:
              "Turn it on from the car on the way home, or check somebody hasn't left it running. Both brands do it: MELCloud on the Mitsubishi, the Kaden app on the Kaden. Either way we set it up and test it on your phone on install day rather than leaving a QR code on the box for you to work out.",
            icon: "remote",
          },
          {
            t: "Mounted properly",
            line: "New wall brackets or a ground stand, rated and levelled",
            detail:
              "The outdoor unit gets new rated brackets or a ground stand, levelled, with the drain falling the right way. Not bolted to whatever the last installer left on the wall.",
            icon: "shield",
          },
          {
            t: "Tidy pipework",
            line: "Colour-matched capping, not bare lagging",
            detail:
              "The pipework between the two units gets ducting capping matched to the wall rather than grey foam left in the weather. It's the part of the job you'll look at every day for the next decade.",
            icon: "ruler",
          },
          {
            t: "We take the mess",
            line: "Cored, sealed, drop sheets down, rubbish gone",
            detail:
              "The wall penetration is core-drilled and sealed rather than hammered through. Drop sheets go down inside, and everything we bring in — including the old unit if there is one — leaves with us.",
            icon: "truck",
          },
        ],
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
          {
            q: "Where does the outdoor unit go?",
            a: "As close to the indoor head as the pipe run allows, on a wall bracket or a ground stand, somewhere it can breathe and somewhere you are not sitting next to it. We walk the outside of the house with you before anything is drilled — it is the decision that is hardest to undo.",
          },
          {
            q: "Will it heat as well as it cools?",
            a: "Yes, and on a Melbourne winter morning it will cost you less to run than gas. A reverse-cycle split is a heat pump; it moves heat rather than burning something to make it, which is why the running cost is a fraction of a gas heater's for the same room.",
          },
          {
            q: "How noisy is it, inside and out?",
            a: "The indoor head on low is quieter than a fridge. The outdoor unit is the one worth thinking about — it is the reason we ask where the bedroom windows are and where the neighbour's are, and why we would rather move it three metres at quote time than have you ring us about it in February.",
          },
          {
            q: "Do I need one per room?",
            a: "One per room you actually want conditioned, yes — a split heats and cools the room it is in and not the one down the hall. If the answer is turning into three or four heads, a multi-head or ducted system is usually the cheaper and tidier way to get there, and we will say so rather than quote you four splits.",
          },
          {
            q: "What happens to my old unit?",
            a: "It comes off the wall, gets de-gassed properly (venting refrigerant is illegal, not just poor form), and goes with us to a metal recycler on the same visit. You do not end up with it on the nature strip.",
          },
        ],
      },
      {
        id: "multi",
        looks: {
          heading: "One box outside instead of four.",
          note:
            "That is the entire visual argument for a multi-head. Four separate splits means four condensers along the side of the house and four sets of holes through the wall; a multi means one larger condenser and one set of penetrations, with the pipework fanned out from there.",
          photo: "/kaden-indoor.webp",
          photoAlt: "One of the indoor heads running off a multi-head system",
          photoScene: true,
          facts: [
            { v: "One condenser", k: "For two to six indoor heads" },
            { v: "Wall or roof", k: "On a levelled, rated stand either way" },
            { v: "Mix the heads", k: "Wall, floor console or bulkhead on one system" },
            { v: "One trench", k: "Of capping, not four separate runs" },
          ],
        },
        servicing: {
          heading: "Six heads, one outdoor unit, one service.",
          photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp",
          photoAlt: "Mitsubishi MXZ multi-head outdoor condenser",
          body:
            "The saving on a multi-head shows up again at service time: one outdoor unit to clean rather than four. The indoor heads still each need doing, which is why the bundle rate exists \u2014 there is no sense charging a full call-out per head when we are already standing in the house.",
          facts: [
            "$220 for the first unit, $140 for each one after it at the same address on the same day",
            "One outdoor coil clean covers every head running off it",
            "Each head gets its own filter, drain and pressure check \u2014 they foul at different rates",
            "A blocked drain on one head is the most common call-out, and it is a fifteen-minute fix at a service",
            "Five-year manufacturer warranty, six years from us on the install",
          ],
        },
        brands: ["Mitsubishi Electric", "Kaden"],
        benefitTiles: [
          {
            t: "One outdoor unit",
            line: "Two to five heads off a single box",
            detail:
              "Two, three, four and five-port Mitsubishi MXZ outdoor units. One thing on the wall or the ground instead of one per room, which is the whole reason people choose a multi-head over separate splits.",
            icon: "snowflake",
          },
          {
            t: "Mix the head types",
            line: "Wall, floor console or bulkhead on the one system",
            detail:
              "The heads don't have to match. A wall unit in the bedrooms, a floor console under a window where there's no wall height, a bulkhead where you'd rather see nothing — all running off the same outdoor unit.",
            icon: "ruler",
          },
          {
            t: "One set of penetrations",
            line: "Not four holes in four walls",
            detail:
              "Every separate split is another core hole and another run of capping. A multi-head brings it back to one route, which is the difference between a tidy house and one that looks like it has been added to four times.",
            icon: "shield",
          },
          {
            t: "Each room, its own control",
            line: "Own remote, own set temperature",
            detail:
              "Nobody has to agree on a temperature. Each head has its own remote and its own setting, and the rooms nobody is in stay off.",
            icon: "remote",
          },
          {
            t: "New copper to every head",
            line: "Individually sized to that indoor unit",
            detail:
              "Each head gets its own line-set, sized for that unit rather than run in whatever was on the truck. Undersized pipe on a long run is the reason a multi-head underperforms in the furthest room.",
            icon: "flow",
          },
          {
            t: "Mounted and isolated",
            line: "Levelled, anti-vibration mounted",
            detail:
              "New brackets or a stand, levelled, on anti-vibration mounts. A multi-head outdoor unit works harder than a single split's and you notice it if it isn't mounted properly.",
            icon: "shield",
          },
          {
            t: "Tidy outside",
            line: "Colour-matched capping on every run",
            detail:
              "Every external run gets ducting capping matched to the wall. On a multi-head that matters more than on a split, because there is more of it.",
            icon: "ruler",
          },
          {
            t: "Drained legally",
            line: "To a proper point, not out the wall",
            detail:
              "Condensate goes to a legal discharge point. Not dribbled down the render, which is how you get the stain under every head.",
            icon: "truck",
          },
        ],
        label: "Multi-head air conditioning",
        blurb:
          "One outdoor unit running two to five indoor heads. Worth it when you want three bedrooms done but only have room, or body-corporate permission, for a single condenser outside.",
        photo: { src: "/Kaden Condesnser.jpg", alt: "Kaden multi-head outdoor condenser on a levelled roof stand", scene: true },
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
        looks: {
          heading: "You see the vents. That's it.",
          note:
            "The whole point of ducted is that there is nothing on the wall. The indoor unit lives in the roof, the ducts run through the cavity, and what you see in each room is a vent in the ceiling and a controller by the hallway. Outside there is one condenser, usually on a slab down the side.",
          photo: "/ducted-split.webp",
          photoAlt: "Ducted indoor unit on a platform in a roof space",
          photoScene: true,
          facts: [
            { v: "Ceiling vents", k: "One per room, nothing on the walls" },
            { v: "In the roof", k: "Indoor unit on a platform, out of the way" },
            { v: "4 – 8 zones", k: "Fitted as standard, not as an upsell" },
            { v: "One controller", k: "Usually by the hallway or the kitchen" },
          ],
        },
        servicing: {
          heading: "Whether we can reach it was decided on install day.",
          photo: "/mitsubishi-pea-m-ducted-v2-v3.webp",
          photoAlt: "Mitsubishi PEAD-M ducted indoor unit",
          body:
            "A ducted indoor unit sits in a roof cavity for fifteen years, and the single thing that decides whether servicing it is an hour or a quote is whether somebody left a path to it. We put ours on a platform with clear access. Not everyone does, and we have crawled far enough to have opinions about it.",
          facts: [
            "$390 a year \u2014 return-air filter, coil clean, gas pressures, zone motors and the controller",
            "Return-air filters are the most-skipped part of a ducted system and the most likely reason it's weak",
            "Zone damper motors fail one at a time and quietly, so they get tested rather than assumed",
            "We fit ours on a platform with a clear path, because a unit walled in behind cabinetry is a quote",
            "Roof-scaffold hire on a two-storey return is quoted separately, and we say so before the day",
          ],
        },
        brands: ["Mitsubishi Electric", "Kaden", "Zonemate"],
        benefitTiles: [
          {
            t: "The duct design first",
            line: "We size the trunk and the branches, not just the unit",
            detail:
              "Most ducted complaints are a duct problem, not a unit problem — the back bedroom gets nothing because the branch feeding it was never sized. We design the run before we quote the box.",
            icon: "ruler",
          },
          {
            t: "Mitsubishi indoor and out",
            line: "PEAD-M / PEA-M with a PUZ outdoor",
            detail:
              "The pairing we fit most, and the one with the parts pipeline that is still open on units we put in years ago.",
            icon: "snowflake",
          },
          {
            t: "Zoning as standard",
            line: "Zonemate 4, 6 or 8 zone, fitted by default",
            detail:
              "Zoning is not an upsell here. Conditioning the whole house to run one room is the single biggest waste in a ducted system, so the controller goes in as part of the job.",
            icon: "remote",
          },
          {
            t: "New duct throughout",
            line: "Insulated flex, sized per branch",
            detail:
              "New insulated flexible duct on every branch, sized individually. Old duct that's been in a roof for twenty years is leaking, and you pay for that leak on every bill.",
            icon: "flow",
          },
          {
            t: "Return air built to suit",
            line: "Box and filter frame made for the house",
            detail:
              "The return-air path is where a lot of ducted systems get strangled. The box and filter frame get built for your house rather than pulled off a shelf.",
            icon: "shield",
          },
          {
            t: "Pressure and vacuum tested",
            line: "New copper between indoor and outdoor",
            detail:
              "New copper, pressure tested and vacuumed down before the charge goes in. It's the step you can't see and the one that decides whether the system is still right in ten years.",
            icon: "gauge",
          },
          {
            t: "Cut clean",
            line: "Grilles level, cavity left tidy",
            detail:
              "Ceiling penetrations cut properly, grilles level, and the roof space left the way we found it. You'll be looking at those grilles from the couch for a long time.",
            icon: "ruler",
          },
          {
            t: "A retrofit, where there's access",
            line: "Into an existing roof cavity",
            detail:
              "Most homes in this corridor can take a retrofit without opening ceilings, provided there's access. We check that on the quote visit rather than discovering it on install day.",
            icon: "clock",
          },
        ],
        label: "Ducted reverse-cycle air conditioning",
        blurb:
          "Whole-home heating and cooling from a single system in the roof. Vents in every room, zoned so you are not paying to condition the bedrooms at 7pm. New builds and retrofits both.",
        photo: { src: "/duct-work.webp", alt: "Insulated flex ductwork run through a roof space", scene: true },
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
        looks: {
          heading: "A box on the roof and vents in the ceiling.",
          note:
            "An evaporative cooler is the unit you can see from the street \u2014 a squat box on the roof, usually toward the back. Inside there is a vent per room and a small controller on the wall. There is no outdoor unit down the side of the house, which is why it suits homes with no room for one.",
          photo: "/classic_evap_product_image.jpg",
          photoAlt: "Evaporative cooler unit and its wall controller",
          facts: [
            { v: "Roof-mounted", k: "Nothing at ground level, nothing on the walls" },
            { v: "Ceiling vents", k: "One per room, same as ducted" },
            { v: "Needs windows", k: "Cracked open — it pushes air through the house" },
            { v: "Water + power", k: "A supply line to the roof and a dedicated circuit" },
          ],
        },
        servicing: {
          heading: "Pads, pump, float \u2014 and the first hot day.",
          photo: "/evap cooler service close ip.jpg",
          photoAlt: "Evaporative cooler opened up on a roof, pads and tray visible",
          photoScene: true,
          body:
            "Evaporative coolers sit on a roof through a Melbourne winter doing nothing, and the pump is the part that decides whether they wake up. The first thirty-degree day is the worst possible time to find out it seized in July, which is why the pre-summer service exists.",
          facts: [
            "$220 + GST, booked September to November before the first run of the season",
            "Pads checked and replaced where they have gone brittle or scaled up",
            "Water tray drained and flushed, and checked for leaks while it is empty",
            "Pump and float tested under load, with the bleed rate measured rather than eyeballed",
            "Distributor lines cleared so every pad gets wet \u2014 a dry pad is a third of your cooling gone",
          ],
        },
        brands: ["Brivis", "Kaden"],
        benefitTiles: [
          {
            t: "Cheap to run",
            line: "A fraction of refrigerated cooling",
            detail:
              "Evaporative uses a fan and a water pump rather than a compressor, so the running cost is a fraction of a refrigerated system's. On the right day it's the cheapest cooling there is.",
            icon: "flow",
          },
          {
            t: "Right for dry heat",
            line: "Best in the drier north and east",
            detail:
              "It cools by evaporating water into the air, which works beautifully on a dry 38° day and much less well on a humid one. We'd rather tell you that than sell you one for the wrong climate.",
            icon: "snowflake",
          },
          {
            t: "Cooling only",
            line: "Pair it with gas ducted for winter",
            detail:
              "There's no heating side to an evaporative unit. If you want one system for both, this isn't it — a ducted reverse-cycle is, and we'll price that instead.",
            icon: "flame",
          },
          {
            t: "Brivis and Kaden",
            line: "Roof-mounted units we fit most",
            detail:
              "The two brands we install across the corridor, both with parts availability that doesn't disappear a few years in.",
            icon: "shield",
          },
          {
            t: "Roof made good",
            line: "New flashing and weatherproofing",
            detail:
              "The penetration gets new flashing and is weatherproofed properly. A roof leak from a badly flashed evap unit costs more than the unit.",
            icon: "shield",
          },
          {
            t: "Its own water line",
            line: "New supply and isolation tap",
            detail:
              "A new water supply line and an isolation tap at the unit, so it can be shut off for winter or for service without turning the house off.",
            icon: "valve",
          },
          {
            t: "Ducts sized, not just joined",
            line: "Sized to the unit",
            detail:
              "Evaporative moves a lot of air and it needs somewhere for that air to go. Undersized ducts or not enough open windows and it does nothing but make noise.",
            icon: "ruler",
          },
          {
            t: "Old unit gone",
            line: "Roof made good, nothing left up there",
            detail:
              "The old unit comes off and leaves with us, and the roof is patched properly rather than having a dead cooler abandoned next to the new one.",
            icon: "truck",
          },
        ],
        label: "Evaporative cooling",
        blurb:
          "Roof-mounted, runs on water and a fan rather than refrigerant. Cheap to run and moves a lot of air, which suits the drier inland suburbs. Needs windows cracked to work, and it struggles on humid days.",
        photo: { src: "/evap-cooler-service.webp", alt: "Evaporative cooler mounted on a tiled roof", scene: true },
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
      { brand: "Mitsubishi Electric", reason: "The lowest failure rate in our install base, and parts still available for the ones we fitted ten years ago.", href: "/brands/mitsubishi-electric" },
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
    looks: {
      heading: "What it looks like against the house.",
      note:
        "An all-in-one is one tall cylinder standing where the old tank stood, with the compressor in a shroud on top. A split is a slimmer tank against the wall and a compressor about the size of an aircon outdoor unit beside it. Neither is invisible, and anyone telling you otherwise has not carried one.",
      photo: "/reclaim-split-stand-back-shot.webp",
      photoAlt: "Reclaim CO₂ split heat pump, tank and compressor against a brick wall",
      photoScene: true,
      facts: [
        { v: "~1.8 m tall", k: "A 270 L all-in-one, on the old tank's slab" },
        { v: "Two pieces", k: "On a split — tank on the wall, compressor beside it" },
        { v: "37 dBA", k: "The Reclaim CO₂, quiet enough for a bedroom wall" },
        { v: "Shady side", k: "Sited away from bedrooms and the neighbour's fence" },
      ],
    },
    servicing: {
      heading: "What happens in year ten.",
      photo: "/reclaim-spit-close-up.webp",
      photoAlt: "Reclaim CO₂ heat pump compressor and pipework, close up",
      photoScene: true,
      body:
        "A heat pump is a fridge running backwards into a tank, and the tank is the part that decides how long you own it. Glass-lined tanks carry a sacrificial anode that has to be replaced or the tank goes; stainless has no anode and nothing to rust. That one difference is most of the gap between a ten-year system and a twenty-year one.",
      facts: [
        "Glass-lined tanks need the anode checked at five years and usually replaced — we book it rather than wait for the leak",
        "Stainless has no anode to service, which is what the fifteen-year warranty on the Reclaim is actually about",
        "The tempering valve is the part that fails quietly, and it is a cheap fix if it is caught at a service",
        "CO₂ units hold their output to -10°, so a cold snap is not the thing that puts you on the element",
        "Warranty and the VEU certificate both go in under your name the week we install, not six months later",
      ],
    },
    metaTitle: "Heat Pump Hot Water Installation, VEU Applied",
    metaDescription:
      "Reclaim, iStore and Thermann heat pump hot water installed across Melbourne's south-east. VEU rebate up to $2,700 applied at quote, no chasing paperwork. 6-year workmanship warranty.",
    heroPhoto: "/reclaim-split-stand-back-shot.webp",
    heroPhotoAlt: "Reclaim CO2 split heat pump installed against a brick wall",
    heroFacts: [
      { v: "Up to $2,700", k: "VEU rebate, applied at the quote" },
      { v: "3–7 hours", k: "On site, and usually the same day" },
      { v: "Three brands", k: "iStore, Reclaim and Thermann, for three different jobs" },
      { v: "6-year", k: "Workmanship, plus the tank and compressor cover" },
    ],
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
      photo: { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ split heat pump, outdoor unit and tank installed against a brick wall" , scene: true },
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
      { t: "VEU rebate applied at quote", d: "Up to $2,700 for a Victorian owner-occupier at current VEEC prices ($60–$75). We handle the paperwork. You don't front the cash then chase it back six months later." , line: "Not claimed back six months later", icon: "tag" },
      { t: "Three brands, three different jobs", d: "iStore when the rebate is what decides it. Reclaim ECO R290 or Thermann Integrated when it all has to fit in one shell with nothing outside. Reclaim CO₂ Split when you are staying in the house and want a stainless tank that outlasts the compressor." , line: "iStore, Reclaim and Thermann do different ones", icon: "heatpump" },
      { t: "Same tank platform, honest pricing", d: "Reclaim ECO R290 AIO and Thermann Integrated are the same tank + heat-pump platform, Reclaim brand, Thermann brand, identical guts. Pick on brand preference or Reece supply, not spec." , line: "Two brands, identical guts, priced honestly", icon: "tank" },
      { t: "COP holds on a cold morning (Reclaim CO₂)", d: "Reclaim's CO₂ split still makes about 4.5 COP at –10 °C. That is the difference in Emerald, Gembrook and Cockatoo, where an R290 unit spends July leaning on the element it was bought to replace." , line: "Where a cheap unit quietly stops working", icon: "flow" },
      { t: "Licensed plumbing + tempering valve", d: "Full drainage rework, tempering valve to AS/NZS 3500, isolation valves + electrical connection on a dedicated circuit, done by our licensed plumber, not a sub-contractor." , line: "A plumbing job, done by plumbers", icon: "shield" },
      { t: "Old tank taken away same visit", d: "Gas storage, electric storage or old heat pump, off the pad, out the gate and to an ARC-approved recycler on install day. No waiting for hard rubbish." , line: "Disconnected, removed and gone", icon: "truck" },
    ],
    brands: ["Reclaim Energy", "iStore", "Thermann", "Sanden", "Rheem AmbiHeat"],
    /**
     * Empty on purpose. Every heat pump price is a per-system row in
     * lib/systemDetail.ts now, and the cards in "Choose your system"
     * render them. The five rows that used to live here restated the
     * same products less precisely — they had one line for "iStore
     * 270 L" where the system rows have 180 and 270 separately.
     *
     * NOTE: those two sources disagreed on the 270. This list said
     * $2,144 for it; the system rows say $2,144 for the 180 and $2,590
     * for the 270. The system rows are kept because they are the more
     * specific of the two, but the number wants confirming.
     */
    pricing: [],
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
    /**
     * The two heat pump families, split out because they are a genuinely
     * different decision and the catalogue already treats them that way:
     * twenty-one split models against six all-in-ones.
     *
     * Split = compressor outside, tank against the wall. All-in-one = one
     * shell, nothing separate to place. Everything else — rebate, running
     * cost, warranty — follows from that first choice, which is why it
     * gets a page each rather than a paragraph on a shared one.
     */
    systems: [
      {
        id: "split-heat-pump",
        looks: {
          heading: "Two pieces, and the tank is the tall one.",
          note:
            "The compressor is about the size of an aircon outdoor unit and sits on a slab or brackets. The tank stands against the wall beside it, slimmer than an all-in-one because it is not carrying a compressor on its head. A pair of insulated lines runs between them.",
          photo: "/reclaim-split-back.webp",
          photoAlt: "Reclaim split heat pump tank and compressor from behind",
          photoScene: true,
          facts: [
            { v: "Two pieces", k: "Compressor on the ground, tank against the wall" },
            { v: "160 – 400 L", k: "Tank sizes, so the footprint follows the household" },
            { v: "37 dBA", k: "Quiet enough to sit near a bedroom wall" },
            { v: "Shady side", k: "Sited away from bedrooms and the neighbour's fence" },
          ],
        },
        servicing: {
          heading: "The tank decides how long you own it.",
          photo: "/reclaim-spit-close-up.webp",
          photoAlt: "Reclaim CO₂ heat pump compressor and pipework, close up",
          photoScene: true,
          body:
            "Glass-lined tanks carry a sacrificial anode that corrodes so the steel doesn't. Replace it around year five and the tank lasts; skip it and the tank goes. Stainless has no anode at all, which is what the fifteen-year warranty is actually about \u2014 not a better weld, an absent failure mode.",
          facts: [
            "Glass-lined: anode checked at five years and usually replaced \u2014 we book it rather than wait for the leak",
            "Stainless: nothing to service on the tank, which is most of the reason it costs more up front",
            "The tempering valve is the part that fails quietly, and it is cheap when it's caught at a service",
            "CO₂ holds output to -10\u00b0, so a cold snap doesn't quietly put you on the backup element",
            "Warranty and the VEU certificate both lodged in your name the week we install",
          ],
        },
        label: "Split heat pump hot water",
        blurb:
          "Compressor outside, tank against the wall, a pair of lines between them. It is the better performer in the cold and the one with the tank options — stainless or glass-lined, 160 to 400 litres — because the tank isn't carrying a compressor on top of it.",
        photo: { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ split heat pump, compressor and tank against a brick wall", scene: true },
        brands: ["Reclaim Energy"],
        benefitTiles: [
          {
            t: "CO₂, not R32 or R134a",
            line: "A natural refrigerant with zero global-warming potential",
            detail:
              "Reclaim runs CO₂ (R744) where almost everyone else runs a synthetic. It matters here rather than on a spec sheet because CO₂ keeps pulling heat out of the air on a cold Pakenham morning, which is exactly when other heat pumps are working hardest for the least.",
            icon: "snowflake",
          },
          {
            t: "Holds down to -10°",
            line: "Where a cheaper unit quietly stops keeping up",
            detail:
              "Heating capacity holds to -10° ambient. That's the difference between a system that makes hot water through a Gembrook winter and one that falls back on an element and quietly hands you the power bill.",
            icon: "gauge",
          },
          {
            t: "Tank choices",
            line: "Stainless or glass-lined, 160 to 400 litres",
            detail:
              "Stainless has no anode to swap and nothing to rust — the duplex tank steps up to 2205 duplex or 316-grade for the hardest water. Glass-lined is the cheaper way in. Sizes from 160 up to 400 litres, so a couple and a family of six both get the right one.",
            icon: "tank",
          },
          {
            t: "Two compressors to pick from",
            line: "Reclaim's own 5 kW, or the Panasonic 4 and 6 kW",
            detail:
              "Reclaim's own CO₂ heat pump is 5 kW. The Panasonic pairing comes in 4 kW and 6 kW, which is what you want when recovery speed is the deciding factor rather than tank volume — a big household running the tank down twice a day.",
            icon: "heatpump",
          },
          {
            t: "Runs on your solar",
            line: "PV-diverter kit fires it on surplus",
            detail:
              "The diverter kit starts the compressor on solar surplus, so a house with panels heats its water on power it was exporting for a few cents. It is as close to free hot water as this gets, and it only works on a heat pump.",
            icon: "flow",
          },
          {
            t: "Quiet enough for a bedroom wall",
            line: "37 dBA at a metre",
            detail:
              "The compressor is the only thing that makes noise and it sits outside. At 37 dBA at one metre it can go next to a bedroom window without an argument, which matters because where it goes is usually decided by where it fits.",
            icon: "shield",
          },
          {
            t: "Rebate at the quote",
            line: "Up to $2,700 off, applied before you pay",
            detail:
              "The VEU rebate comes off the quoted price. You don't front the full amount and chase it back six months later, and the number you see is the number you pay.",
            icon: "tag",
          },
          {
            t: "A plumbing job",
            line: "Tempering valve, licensed, old unit gone",
            detail:
              "Hot water is plumbing, not just an appliance swap. Tempering valve to hold the outlets at 50°, the old unit drained, disconnected and taken to a metal recycler on the same visit.",
            icon: "truck",
          },
        ],
        points: [
          "Reclaim CO₂ split in stainless, glass-lined, Earthworker stainless and squat variants",
          "Panasonic CO₂ pairing in 4 kW and 6 kW where recovery speed decides it",
          "Tank sizes 160 / 250 / 315 / 400 L",
          "Compressor outside, tank against the wall — needs both spots",
          "PV-diverter kit available for houses with solar",
          "VEU rebate applied at the quote, up to $2,700",
          "Tempering valve fitted, outlets held at 50 °C",
          "Old unit drained, disconnected and taken to a metal recycler",
        ],
        priceFrom: "from $4,200",
        intro:
          "A split heat pump puts the compressor outside and the tank against the wall, with a pair of lines between them. It is the better performer on a cold morning and the one with the tank options, because the tank isn't carrying a compressor on its head. It's also the one that needs two spots rather than one, which is the trade.",
        faqs: [
          {
            q: "What's the difference between split and all-in-one?",
            a: "A split has the compressor outside and the tank separate, so the tank can be any size and any material and the compressor can go where it has air. An all-in-one is a single shell — simpler to place, fewer options, and the compressor sits on top of the tank. If you have room for both parts, a split is usually the better system.",
          },
          {
            q: "Why CO₂ instead of R32 or R290?",
            a: "CO₂ (R744) is a natural refrigerant with zero global-warming potential, and it holds heating capacity further down the temperature range. On a Melbourne winter morning that's the difference between making hot water and falling back on an element. It's also the reason Reclaim costs more than a budget unit.",
          },
          {
            q: "Stainless or glass-lined?",
            a: "Stainless has no sacrificial anode to replace and nothing to rust, so it's the one to pick if you'd rather not think about it again. Glass-lined is cheaper up front and needs the anode checked. On hard or bore water, stainless — and the 2205 duplex tank for the worst of it.",
          },
          {
            q: "How big a tank do I need?",
            a: "Roughly: 160–250 L for one or two people, 250–315 L for a family of three or four, 315–400 L for five or more. Recovery rate matters as much as volume though, which is where the Panasonic 6 kW pairing earns its place — a smaller tank that refills fast can beat a bigger one that doesn't.",
          },
          {
            q: "Will it work with my solar?",
            a: "Yes, and it's the best pairing on this site. The PV-diverter kit fires the compressor on solar surplus, so the water gets heated on power you'd otherwise export for a few cents. Without the kit you can still just time it for the middle of the day.",
          },
          {
            q: "How loud is it?",
            a: "37 dBA at one metre on the Reclaim compressor — quieter than a fridge. It can sit near a bedroom window without being the reason somebody rings us in February.",
          },
          {
            q: "What's the warranty?",
            a: "It varies by tank: the stainless tanks carry the longest cover and the glass-lined ones less. We put the exact figure for the model you're quoted in writing rather than quoting a headline number that only applies to the flagship.",
          },
        ],
      },
      {
        id: "all-in-one",
        looks: {
          heading: "One cylinder where the old tank stood.",
          note:
            "An all-in-one is a single unit: tank below, compressor in a shroud on top. It goes back on the slab the old electric or gas tank came off, which is why it is the simplest swap there is. It is taller than what it replaces, and that is the one thing worth checking before the day.",
          photo: "/270L-istore-heatpump.webp",
          photoAlt: "iStore 270 L all-in-one heat pump",
          facts: [
            { v: "~1.8 m tall", k: "On a 270 L — taller than the tank it replaces" },
            { v: "One footprint", k: "Nothing separate to place or plumb" },
            { v: "180 – 285 L", k: "The sizes that cover most households" },
            { v: "Existing slab", k: "Where it will take the weight — we check on the day" },
          ],
        },
        servicing: {
          heading: "Simpler to fit, and simpler to keep.",
          photo: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp",
          photoAlt: "Reclaim ECO R290 all-in-one heat pump",
          body:
            "There is less to an all-in-one than to a split, and that cuts both ways: fewer things to go wrong, and one shell to replace when the tank eventually does. The anode rule is the same as anywhere else, and it is still the thing most owners have never heard of.",
          facts: [
            "Anode checked at five years on every unit that has one \u2014 that is most of the all-in-one range",
            "R290 is a hydrocarbon refrigerant, so the unit needs clear air around it rather than a sealed cupboard",
            "Below about 5\u00b0 an R290 unit leans on its element more, which shows up on a July bill rather than as a fault",
            "Tempering valve and isolation valves checked at the same visit",
            "Six-year tank and three-year compressor from the manufacturer, six years from us on the install",
          ],
        },
        label: "All-in-one heat pump hot water",
        blurb:
          "Compressor and tank in a single shell. One thing to place, one thing to plumb, and the simplest way into a heat pump — which is why it's where the rebate goes furthest and where most straight electric swaps end up.",
        photo: { src: "/thermann-heat-pump.webp", alt: "Thermann all-in-one heat pump hot water unit against a brick wall", scene: true },
        brands: ["Reclaim Energy", "iStore", "Thermann"],
        benefitTiles: [
          {
            t: "One thing on the wall",
            line: "Compressor and tank in a single shell",
            detail:
              "Nothing separate to find a spot for. If the old tank's position is the only place a hot water unit can go at your place, this is the one that fits it — a split needs somewhere for the compressor as well.",
            icon: "tank",
          },
          {
            t: "Where the rebate goes furthest",
            line: "iStore takes the VEU further than anything else we fit",
            detail:
              "The VEU rebate is calculated on what you're replacing and what you're putting in. On a straight electric-storage swap to an iStore, it takes the biggest bite out of the install of anything on this site.",
            icon: "tag",
          },
          {
            t: "Two brands, identical guts",
            line: "Reclaim ECO R290 and Thermann ECO R290",
            detail:
              "These are the same tank and heat-pump platform with two badges on it. Pick on brand preference or on which one Reece can get you this week — not on spec, because there isn't a difference to find.",
            icon: "heatpump",
          },
          {
            t: "R290 propane",
            line: "Natural refrigerant, very low global-warming potential",
            detail:
              "R290 is propane — a natural refrigerant with a global-warming potential in the single digits, against several hundred for the synthetics it replaces. Efficient, and the right side of where the regulations are heading.",
            icon: "flow",
          },
          {
            t: "200 or 285 litres",
            line: "Plus iStore at 180 and 270",
            detail:
              "Four sizes across the two platforms. 180–200 L suits one or two people, 270–285 L a family of three or four. Past that a split with a bigger tank is the better answer and we'll say so.",
            icon: "ruler",
          },
          {
            t: "Timed for the cheap tariff",
            line: "Set up before we leave",
            detail:
              "Set to heat on the cheap part of your tariff, or in the middle of the day if you have solar. Configured and tested on install day rather than left on the factory default for you to work out.",
            icon: "clock",
          },
          {
            t: "3–5 hours, usually same day",
            line: "A straight swap in a morning",
            detail:
              "An all-in-one replacing an existing tank in the same spot is usually a same-day job, so you're not without hot water overnight.",
            icon: "clock",
          },
          {
            t: "Old unit gone",
            line: "Drained, disconnected, taken away",
            detail:
              "Drained, disconnected and to a metal recycler on the same visit. Tempering valve fitted so the outlets sit at 50°, and the compliance paperwork emailed.",
            icon: "truck",
          },
        ],
        points: [
          "Reclaim ECO R290 and Thermann ECO R290 — same platform, two badges",
          "iStore 180 L and 270 L, where the VEU rebate reaches furthest",
          "200 L and 285 L on the R290 platform",
          "One shell: nothing separate to place or plumb",
          "R290 natural refrigerant, single-digit global-warming potential",
          "3–5 hours on site, usually same day on a like-for-like swap",
          "Timer set to the cheap tariff or to your solar before we leave",
          "Old unit drained, disconnected and taken to a metal recycler",
        ],
        priceFrom: "from $2,144",
        intro:
          "An all-in-one puts the compressor on top of the tank in a single shell. There is one thing to place and one thing to plumb, which makes it the simplest way into a heat pump and the cheapest — and it's where the VEU rebate reaches furthest on a straight electric swap.",
        faqs: [
          {
            q: "Is an all-in-one worse than a split?",
            a: "Not worse, different. A split performs better in the cold and gives you the tank options; an all-in-one is simpler, cheaper and only needs one spot. If your old tank's position is the only place a unit can go, the all-in-one is the right system and the split isn't an option at all.",
          },
          {
            q: "Reclaim ECO or Thermann ECO — which one?",
            a: "They are the same tank and heat-pump platform with different badges on them. Identical guts. Pick on brand preference or on which one Reece has in stock, and don't let anyone tell you one out-specs the other.",
          },
          {
            q: "Why is iStore cheaper?",
            a: "It's a more basic unit, and it takes the VEU rebate further than anything else we fit — which is what makes the installed number so low. It's the right call when the rebate is what decides the job. It won't hold output on a cold morning the way a CO₂ split will.",
          },
          {
            q: "Is R290 propane safe?",
            a: "Yes. The charge is small, it's sealed in the unit, and it's outside. R290 is used in heat pumps across Europe and it's where the industry is going, because the synthetic refrigerants it replaces have global-warming potentials in the hundreds.",
          },
          {
            q: "What size do I need?",
            a: "180–200 L for one or two people, 270–285 L for three or four. Five or more and you're better off on a split with a bigger tank and a faster recovery rate — we'll tell you that rather than sell you an undersized all-in-one.",
          },
          {
            q: "How long does it take?",
            a: "Three to five hours for a straight swap in the same spot, and usually the same day. If it's moving position or needs an electrical circuit run, that's a longer job and it's on the quote before we start.",
          },
        ],
      },
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
    looks: {
      heading: "What a service visit actually looks like.",
      note:
        "Sixty to ninety minutes, one van, one person you have met before. We are not there to sell you a system — most of the time the answer is that it is dirty rather than dying, and we would rather tell you that and be the people you ring in five years.",
      photo: "/evap cooler service close ip.jpg",
      photoAlt: "Evaporative cooler opened up on a roof, pads and tray visible",
      photoScene: true,
      facts: [
        { v: "60 – 90 min", k: "Per unit, on site" },
        { v: "Parts on the truck", k: "Capacitors, thermistors, relays, refrigerant" },
        { v: "Written report", k: "Before we leave, not emailed next week" },
        { v: "Sept – Nov", k: "The window to book, before the first heatwave" },
      ],
    },
    servicing: {
      heading: "The record matters as much as the clean.",
      photo: "/ducted-split.webp",
      photoAlt: "Ducted indoor unit in a roof space, ready for service access",
      photoScene: true,
      body:
        "A service is worth having twice over: once because the machine runs better, and once because there is now a document saying somebody competent looked at it. That second one is what a manufacturer asks for when you make a warranty claim in year four, and it is the reason a cheap cash-in-hand clean is worth less than it looks.",
      facts: [
        "The report goes straight to the manufacturer — Mitsubishi, Brivis, Kaden — so your warranty record stays intact",
        "Any repair is quoted in writing before we touch it, at a fixed price rather than an hourly creep",
        "The call-out fee is waived if the repair goes ahead the same day",
        "Twelve-month warranty on any part we supply, plus six years on the labour",
        "A reminder text at eleven months, with a one-line opt-out if you would rather we did not",
      ],
    },
    // ------------------------------------------------------------------
    // PHOTOS OF OUR OWN JOBS go here, same shape as the heat pump one
    // above: installPhotos: { heading, blurb, shots: [{ src, alt, caption }] }.
    // Drop the files into /public, add the lines, and a navy photo band
    // appears on this page. Nothing else needs changing.
    // ------------------------------------------------------------------
    metaTitle: "Aircon Service & Repair, All Brands, Same Day",
    metaDescription:
      "Annual aircon service and same-day repairs across Melbourne's south-east, Mitsubishi, Daikin, Fujitsu, Panasonic, Kaden, LG. Fixed pricing, ARCtick-licensed, service records kept.",
    heroPhoto: "/evap-cooler-service.webp",
    heroPhotoAlt: "Evaporative cooler being serviced on a roof",
    heroFacts: [
      { v: "Same day", k: "Breakdowns, across the corridor" },
      { v: "Under 30 min", k: "To diagnose most faults" },
      { v: "Every brand", k: "Including the ones we don't install" },
      { v: "12 months", k: "On any part we supply" },
    ],
    h1: "Aircon service, repair & tune-up",
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
      { t: "All major brands serviced", d: "Mitsubishi Electric, Daikin, Fujitsu, Panasonic, LG, Kaden, Braemar. Even ones we don't install." , line: "Including the ones we don't install", icon: "snowflake" },
      { t: "Keeps your warranty valid", d: "Most manufacturers require annual service to keep warranty in force. We lodge a service report direct with the maker in your name." , line: "We lodge the report in your name", icon: "shield" },
      { t: "Same-day breakdown attendance", d: "Aircon down in a heatwave? We aim to be on-site same-day across Pakenham, Berwick, Officer, Cranbourne and out to Warragul." , line: "Across the corridor, in a heatwave", icon: "clock" },
      { t: "Fixed pricing before we touch anything", d: "Diagnostic, gas top-up, capacitor swap, board replacement, all quoted in writing before we open a wallet." , line: "You know the number before we start", icon: "tag" },
      { t: "Refrigerant leak repair (not just top-up)", d: "If you're losing gas, it's a leak, we find it and fix it. Yearly re-gassing is a bandaid; we'd rather do the job once properly." , line: "Find the leak, not just refill it", icon: "gauge" },
      { t: "Coil clean that actually cleans", d: "Chemical coil clean, full disassembly on the indoor for ducted, condenser wash on the outdoor. Not a wipe-down with a rag." , line: "Pulled apart and washed, not wiped", icon: "wrench" },
    ],
    brands: ["Mitsubishi Electric", "Daikin", "Fujitsu", "Panasonic", "LG", "Kaden", "Braemar", "Samsung"],
    pricing: [
      { tier: "Split system · annual service", price: "$220", includes: "Filter clean, coil chemical clean, refrigerant pressure check, capacitor test, thermistor calibration, drain flush, service report", group: "Annual service", photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp", priceKey: "Per visit" },
      { tier: "Multi-split bundle service (3+ units)", price: "$140 ea", includes: "Everything in the split system service, Charged per extra unit at the same address, One visit rather than a second call-out", group: "Annual service", photo: "/mitsubishi-mxz-multi-split-condenser-v2.webp", priceKey: "Per extra unit" },
      { tier: "Ducted aircon · annual service", price: "$390", includes: "Return-air filter, coil clean, gas pressure check, zone controller test, damper motor test", group: "Annual service", photo: "/ducted-split.webp", priceKey: "Per visit", photoScene: true },
      { tier: "Standard call-out (business hours)", price: "$120", includes: "Attend site, Diagnose the fault, Repair quoted in writing before we touch it, Fee waived if the repair goes ahead the same day", group: "Call-out", priceKey: "Call-out fee" },
      { tier: "Emergency call-out (after-hours / weekend)", price: "$220 + parts", includes: "Same-day attendance, An on-call tradie rather than an overseas call-centre, Diagnosis and a written repair quote on the spot", group: "Call-out", priceKey: "Call-out fee" },
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
        looks: {
          heading: "Everything happens on the roof.",
          note:
            "You will not see much of an evap service from inside the house. We are on the roof with the lid off, in the tray and the pad frames. What you get at the end is a written report and, if we found something, a price before we touch it.",
          photo: "/evap-cooler-service.webp",
          photoAlt: "Evaporative cooler mounted on a tiled roof",
          photoScene: true,
          facts: [
            { v: "60 – 90 min", k: "On the roof, one visit" },
            { v: "Roof access", k: "Ours to worry about, not yours" },
            { v: "3 – 5 years", k: "How long a set of pads usually lasts" },
            { v: "Sept – Nov", k: "The window, before the first hot day" },
          ],
        },
        servicing: {
          heading: "Winter is what breaks them.",
          photo: "/Kaden classic_evap cooler .jpg",
          photoAlt: "Evaporative cooler unit, pads and housing",
          body:
            "Nothing about an evaporative cooler wears out in summer. It wears out sitting still through winter, with a dry pump, scale drying onto the pads and a tray full of whatever came off the roof. The service is really about undoing eight months of standing idle.",
          facts: [
            "Pads replaced when they have gone brittle or scaled \u2014 usually every three to five years, not annually",
            "Tray drained, flushed and checked for leaks while there is nothing in it",
            "Pump and float tested under load; a seized pump is the single most common no-cool call",
            "Distributor lines cleared so all the pads get wet, not just the ones nearest the feed",
            "Winter shutdown available at the same visit if you would rather it was drained down properly",
          ],
        },
        brands: ["Brivis", "Kaden"],
        benefitTiles: [
          {
            t: "Pads, checked and replaced",
            line: "When they've gone brittle or scaled up",
            detail:
              "The pads are what does the cooling. Once they're scaled or brittle the water runs past them instead of through them, and the unit becomes an expensive fan. They're inspected every service and replaced when they're done.",
            icon: "flow",
          },
          {
            t: "Tray drained and flushed",
            line: "Checked for leaks while it's empty",
            detail:
              "A winter's worth of sediment comes out of the tray, and it gets checked for leaks while it's empty — which is the only time you can see one before it finds your ceiling.",
            icon: "valve",
          },
          {
            t: "Pump and float under load",
            line: "Bleed rate tested, not just switched on",
            detail:
              "The pump, the float valve and the bleed rate all tested running. A float that sticks after twenty minutes tests fine in the first thirty seconds.",
            icon: "gauge",
          },
          {
            t: "Every pad gets wet",
            line: "Distributor lines cleared",
            detail:
              "Blocked distributor lines are why one side of the unit cools and the other doesn't. They get cleared so water reaches all of them rather than the front one only.",
            icon: "flow",
          },
          {
            t: "Checked before the heat",
            line: "Belt, bearings and fan motor",
            detail:
              "The mechanical parts get looked at before the first hot day rather than during it. A bearing that's about to go is obvious in October and a five-day wait in February.",
            icon: "wrench",
          },
          {
            t: "We go on the roof",
            line: "Access and safety handled by us",
            detail:
              "It's a roof-mounted unit and getting to it safely is our problem, not yours. Nobody should be up a ladder in January to look at their own cooler.",
            icon: "shield",
          },
        ],
        label: "Evaporative cooler service",
        blurb:
          "A pre-summer service on a roof-mounted evap. Pads, water tray, pump and float all get looked at, because the first hot day is a bad time to find out the pump has seized over winter.",
        photo: { src: "/evap cooler service close ip.jpg", alt: "Evaporative cooler service, cooling pads and water tray" , scene: true },
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
        looks: {
          heading: "What we actually open up.",
          note:
            "A refrigerated service is not a wipe-down. The indoor unit comes apart far enough to get at the coil, the outdoor unit gets the same, and the drain gets flushed rather than poked. On a ducted system most of that happens in the roof, which is where the filter has usually been ignored.",
          photo: "/ducted-condenser.webp",
          photoAlt: "Outdoor condenser on a levelled stand, ready for a coil clean",
          photoScene: true,
          facts: [
            { v: "60 – 90 min", k: "Per unit, on site" },
            { v: "Coils, both", k: "Indoor and outdoor, chemically cleaned" },
            { v: "Measured", k: "Superheat against spec, not guessed" },
            { v: "On the truck", k: "Capacitors, thermistors, relays, refrigerant" },
          ],
        },
        servicing: {
          heading: "The paperwork is half of what you're buying.",
          photo: "/mitsubishi-msz-ap-wall-split-v2-v3.webp",
          photoAlt: "Wall split indoor head, opened for a filter and coil clean",
          body:
            "A service is worth having twice over: the machine runs better, and there is now a document saying somebody competent looked at it. The second one is what a manufacturer asks for when you claim in year four \u2014 and it is why a cash-in-hand clean is worth less than it looks.",
          facts: [
            "The report goes straight to the manufacturer, so the warranty record stays intact",
            "Any repair is quoted in writing before we touch it, fixed price rather than hourly creep",
            "The call-out fee is waived if the repair goes ahead the same day",
            "Twelve months on any part we supply, plus six years on the labour",
            "A reminder text at eleven months, with a one-line opt-out if you would rather not",
          ],
        },
        brands: ["Mitsubishi Electric", "Kaden", "Brivis"],
        benefitTiles: [
          {
            t: "Coils chemically cleaned",
            line: "Not a filter rinse and a wipe",
            detail:
              "Indoor and outdoor coils cleaned with proper coil chemical and rinsed. A dirty coil is the most common reason a system stops cooling the way it used to, and it can't be fixed by washing the filter.",
            icon: "wrench",
          },
          {
            t: "Filters and return air",
            line: "Washed or replaced, path checked",
            detail:
              "Filters washed or replaced, and the return-air path checked — a strangled return does the same damage as a blocked filter and nobody ever looks at it.",
            icon: "flow",
          },
          {
            t: "Drain flushed and tested",
            line: "Flow tested, not just poked at",
            detail:
              "The condensate drain gets flushed and flow tested. A blocked drain is what puts water through your ceiling in February.",
            icon: "valve",
          },
          {
            t: "Pressures measured",
            line: "Superheat against spec, not guessed",
            detail:
              "Refrigerant pressures and superheat measured and compared against the manufacturer's figures. That's how you find a leak rather than topping it up every summer.",
            icon: "gauge",
          },
          {
            t: "Electricals under load",
            line: "Capacitor, fan motor, thermistors",
            detail:
              "The parts that fail on a hot day get tested under load, not just looked at. A capacitor reads fine cold and drops out at 40°.",
            icon: "shield",
          },
          {
            t: "Connections thermal-scanned",
            line: "Torque-checked as well",
            detail:
              "Electrical connections torque-checked and thermal-scanned. A loose terminal shows up as heat long before it shows up as a fault.",
            icon: "gauge",
          },
        ],
        label: "Split & ducted aircon service",
        blurb:
          "Filters, coils and drains on a refrigerated system. Most call-outs we get in January are units that have never been serviced, a blocked drain or a filthy coil, not a dead compressor.",
        photo: { src: "/ducted-split.webp", alt: "Ducted indoor unit in a roof space, where most servicing happens" , scene: true },
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
    looks: {
      heading: "Where the heater actually goes.",
      note:
        "A gas ducted heater lives in one of three places: a cupboard inside, a slab against an outside wall, or up in the roof. Which one you have already been decided years ago by whoever built the house, and a like-for-like replacement goes back where the old one came out. Hot water is simpler — the unit is about the size of a briefcase, on an outside wall.",
      photo: "/gas-ducted-install.webp",
      photoAlt: "Gas ducted heater installed in a roof space with flue and ductwork",
      photoScene: true,
      facts: [
        { v: "Three positions", k: "Internal cupboard, external slab, or in the roof" },
        { v: "Like-for-like", k: "Back where the old one was, ducts and wiring reused" },
        { v: "Briefcase-sized", k: "A continuous flow unit on an outside wall" },
        { v: "3 – 4 hours", k: "A straight ducted swap, same day" },
      ],
    },
    servicing: {
      heading: "The one that has no smell and no warning.",
      photo: "/gas-line-safe.webp",
      photoAlt: "Gas line work in progress on a residential property",
      photoScene: true,
      body:
        "A cracked heat exchanger puts carbon monoxide into the air your house is breathing, and it does it silently. There is no smell, no alarm on most homes, and the early symptoms read as a bad night's sleep. This is the single reason we will not let a gas heater over ten years old go unserviced without saying something about it.",
      facts: [
        "$280 + GST for a full service with a combustion analysis on a calibrated CO analyser",
        "Every two years while it is young, annually once it is past ten",
        "Spillage test, gas pressure test to AS/NZS 5601 and every safety control checked",
        "A written report with the actual readings on it, not a sticker saying it passed",
        "If we find a cracked exchanger we condemn it on the spot and tell you why — that is not a sales tactic, it is the law",
      ],
    },
    // ------------------------------------------------------------------
    // PHOTOS OF OUR OWN JOBS go here, same shape as the heat pump one
    // above: installPhotos: { heading, blurb, shots: [{ src, alt, caption }] }.
    // Drop the files into /public, add the lines, and a navy photo band
    // appears on this page. Nothing else needs changing.
    // ------------------------------------------------------------------
    metaTitle: "Gas Plumbing & Ducted Heating, Melbourne SE",
    metaDescription:
      "Licensed gas fitters + plumbers serving Melbourne's south-east, Brivis and Kaden ducted heater retrofit, Thermann continuous-flow hot water, gas leak detection, same-day emergency call-outs. VBA-licensed, full compliance certificates.",
    heroPhoto: "/gas-ducted-install.webp",
    heroPhotoAlt: "Gas ducted heater installed in a roof space",
    heroFacts: [
      { v: "Type-A endorsed", k: "Full Victorian plumbing licence 46828" },
      { v: "AS/NZS 5601", k: "Every gas job to the standard" },
      { v: "Same day", k: "Ducted swaps and continuous flow changeovers" },
      { v: "24/7", k: "Gas leaks, no hot water, CO alarms" },
    ],
    h1: "Gas heating, hot water & plumbing",
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
      { t: "VBA-licensed gas fitting", d: "Full Victorian Plumbing Licence + Type-A gas endorsement. Every gas job compliant with AS/NZS 5601." , line: "Full licence and Type-A endorsement, both current", icon: "shield" },
      { t: "Gas ducted retrofit, done weekly", d: "The default heater in most homes built 1990–2015 in the corridor. We replace one nearly every week, Brivis Wombat, Buffalo and Kaden gas ducted all covered." , line: "We replace one most weeks in this corridor", icon: "flame" },
      { t: "Thermann G-series continuous flow", d: "Our default gas continuous-flow hot water, a Reece-exclusive brand (not Rinnai), Australian-designed, 12-yr heat-exchanger warranty." , line: "12-year heat exchanger, through Reece", icon: "tank" },
      { t: "Gas leak detection + safe-to-stay", d: "Electronic leak detector, pressure-drop test, safe-to-stay written verification. We don't just tell you 'seems OK'." , line: "Tested and made safe, not sniffed at", icon: "alarm" },
      { t: "Emergency call-outs, on-call tradie", d: "Same-day across the corridor for gas leaks, no hot water, CO alarms. Answered by us, not an overseas call-centre." , line: "Nights and weekends, a real person", icon: "phone" },
      { t: "Old unit removed same visit", d: "Old Brivis, old Vulcan tank, old Rinnai continuous flow, off the pad and to the metal recycler on install day. No hard-rubbish wait." , line: "Disconnected, removed and gone", icon: "truck" },
      { t: "Puretec water filtration", d: "Whole-home on the incoming main, a protection filter on the hot water cold inlet, or an under-sink unit for drinking water. Fitted by a licensed plumber, not a handyman." , line: "Whole house, under sink, softeners and tank", icon: "tap" },
    ],
    brands: ["Brivis", "Kaden", "Thermann", "Puretec", "Rinnai", "Rheem", "Bosch", "Dux", "Vulcan"],
    pricing: [
      { tier: "Brivis Wombat replacement (like-for-like)", price: "from $4,800", includes: "Supply, install, controller wiring reuse, compliance cert, old unit removal", group: "Gas ducted heating", photo: "/Brivis Wombat Indoor 3 star.jpg" },
      { tier: "Brivis Buffalo higher-spec replacement", price: "from $5,600", includes: "Everything in the Wombat replacement, A quieter fan, A longer service life", group: "Gas ducted heating", photo: "/Brivis Buffalo Outdorr.jpg" },
      { tier: "Thermann G-series continuous flow (26 L)", price: "from $2,499", includes: "Supply, install, compliance cert, controller (indoor + outdoor)", group: "Gas hot water", photo: "/G-Series_Front_On_View_1200x900.jpg" },
      { tier: "Gas appliance installation (single point)", price: "from $349", includes: "Connection, pressure test, compliance cert", group: "Gas fitting", photo: "/gas-ducted-install.webp", photoScene: true },
      { tier: "Gas leak detection + report", price: "from $220", includes: "Electronic leak test, pressure test, written safe-to-stay report", group: "Gas fitting", photo: "/gas-line-safe.webp", priceKey: "Price", photoScene: true },
      { tier: "Emergency call-out (after-hours)", price: "$220 + parts", includes: "Same-day attendance for a gas leak or a CO alarm, No hot water sorted the same day where we can, Diagnosis and a written repair quote on the spot", group: "Emergency", priceKey: "Call-out fee" },
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
        looks: {
          heading: "It lives where the old one lived.",
          note:
            "A gas ducted heater goes in one of three places, and which one you have was decided when the house was built: a cupboard inside, a slab against an outside wall, or up in the roof. A like-for-like replacement goes straight back into the same spot, on the same ducts, with the same controller wiring.",
          photo: "/gas-ducted-install.webp",
          photoAlt: "Gas ducted heater installed in a roof space with flue and ductwork",
          photoScene: true,
          facts: [
            { v: "Three positions", k: "Internal cupboard, external slab, or in the roof" },
            { v: "Ceiling vents", k: "One per room, usually the existing ones" },
            { v: "3 – 4 hours", k: "A straight swap, same day" },
            { v: "Ducts reused", k: "Where they're sound — we check before we quote" },
          ],
        },
        servicing: {
          heading: "The failure with no smell and no warning.",
          photo: "/Brivis Wombat Indoor 3 star.jpg",
          photoAlt: "Brivis Wombat internal gas ducted heater",
          body:
            "A cracked heat exchanger puts carbon monoxide into the air the house is breathing, silently. No smell, no alarm in most homes, and early symptoms that read as a bad night's sleep. It is the one reason we will not quietly let a heater past ten years go unserviced.",
          facts: [
            "$280 + GST for a full service with combustion analysis on a calibrated CO analyser",
            "Every two years while it is young, annually once it is past ten",
            "Spillage test, gas pressure test to AS/NZS 5601, and every safety control checked",
            "A written report with the actual readings on it, not a sticker saying it passed",
            "A cracked exchanger gets condemned on the spot \u2014 that is the law, not a sales tactic",
          ],
        },
        brands: ["Brivis", "Kaden"],
        benefitTiles: [
          {
            t: "Star rating is the number",
            line: "We quote the payback, not just the price",
            detail:
              "The difference between a 3-star and a 5-star unit is a running cost you pay every winter for fifteen years. We'll show you both prices and what the gap actually pays back in.",
            icon: "tag",
          },
          {
            t: "Brivis and Kaden",
            line: "Wombat, Compact Classic, Buffalo, StarPro",
            detail:
              "The heaters in most homes built in this corridor between 1990 and 2015, and the ones we replace nearly every week.",
            icon: "flame",
          },
          {
            t: "Internal or external",
            line: "Roof, cupboard, or against the wall",
            detail:
              "Internal units go in the roof or a cupboard; external ones sit against an outside wall. Which one you can have depends on the house, and we work that out before quoting.",
            icon: "ruler",
          },
          {
            t: "New flue to standard",
            line: "Not the old one refitted",
            detail:
              "A new flue and cowl to current standards. Refitting the old flue to a new heater is how carbon monoxide problems start, and it isn't something we do.",
            icon: "shield",
          },
          {
            t: "Gas line checked",
            line: "Upsized if the new unit needs it",
            detail:
              "A newer, bigger heater can want more gas than the existing line carries. We check that at the quote so the number doesn't move on install day.",
            icon: "gauge",
          },
          {
            t: "Ductwork inspected",
            line: "Re-taped, or replaced if it's shot",
            detail:
              "Old ductwork gets inspected and re-taped, or replaced where it's past it. A new heater blowing into leaking ducts is money going into the roof space.",
            icon: "flow",
          },
          {
            t: "Return air sorted",
            line: "New filter frame and grille where it's needed",
            detail:
              "The return-air filter frame and grille get replaced where the old one is past it, because that's what the new heater has to breathe through.",
            icon: "ruler",
          },
          {
            t: "CO tested before we leave",
            line: "Every gas heater we touch",
            detail:
              "A carbon monoxide test on the running unit, every time, whether you asked for one or not. The result goes on the report.",
            icon: "alarm",
          },
        ],
        label: "Gas ducted heating",
        blurb:
          "A gas furnace in the roof or against an outside wall, ducted to vents through the house. Still the least expensive way to heat a whole Melbourne home through winter, and the fastest to bring one up from cold.",
        photo: { src: "/duct-work.webp", alt: "Insulated flex ductwork run through a roof space to the vents", scene: true },
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
        looks: {
          heading: "About the size of a briefcase.",
          note:
            "A continuous flow unit hangs on an outside wall and is roughly the size of a briefcase \u2014 which is the whole point, because it replaces a tank the size of a person. There are two controllers, one inside and one out, and they are the only part of it you interact with.",
          photo: "/thermann-contineues-flow-standing-back.webp",
          photoAlt: "Thermann continuous flow unit on an outside wall, stood back",
          photoScene: true,
          facts: [
            { v: "~60 × 35 cm", k: "On an outside wall, off the ground" },
            { v: "No tank", k: "So nothing standing there losing heat overnight" },
            { v: "Two controllers", k: "One indoors, one out, both included" },
            { v: "3 – 5 hours", k: "A tank-to-continuous-flow swap" },
          ],
        },
        servicing: {
          heading: "Nothing stored, so nothing to corrode.",
          photo: "/G-Series_Front_On_View_1200x900.jpg",
          photoAlt: "Thermann G-series continuous flow gas hot water unit",
          body:
            "A continuous flow unit has no tank, which removes the failure that ends most storage systems: there is no anode to replace and nothing standing full of water for fifteen years. What it does have is a heat exchanger and a burner, and those want looking at like any gas appliance.",
          facts: [
            "No anode, no tank, and no overnight standing loss \u2014 the three things that kill storage units",
            "Twelve-year heat exchanger warranty on the Thermann G-series",
            "A service is a burner and exchanger check with a gas pressure test, same as a heater",
            "Scale is the thing that shortens them in hard-water areas, and a filter on the cold feed prevents it",
            "26 L/min covers two showers and a tap at once — beyond that the flow, not the gas, is the limit",
          ],
        },
        brands: ["Thermann"],
        benefitTiles: [
          {
            t: "No tank losing heat",
            line: "Heats on demand instead of storing",
            detail:
              "There's no cylinder sitting there keeping water hot all night for nobody. That standing loss is the reason a storage unit costs more to run than the hot water you actually use.",
            icon: "flow",
          },
          {
            t: "Sized by outlets",
            line: "16, 20 and 26 litres a minute",
            detail:
              "The size is about how many hot taps run at once, not how many people live there. Two bathrooms in the morning is a 26; a unit and a single bathroom is a 16.",
            icon: "ruler",
          },
          {
            t: "Thermann or Rinnai",
            line: "G-series made for Reece, or Rinnai",
            detail:
              "Thermann G-series is our default — Australian-designed, Reece distribution, 12-year heat exchanger. Rinnai where you'd rather stay with what's there.",
            icon: "flame",
          },
          {
            t: "Same-day on a swap",
            line: "Most like-for-like replacements",
            detail:
              "A straight replacement in the same spot usually goes in the same day, so you're not without hot water overnight.",
            icon: "clock",
          },
          {
            t: "50° at the outlets",
            line: "Tempering valve fitted or replaced",
            detail:
              "Outlets are temperature-controlled to 50°, as required. The tempering valve gets fitted or replaced rather than the old one being left to keep weeping.",
            icon: "valve",
          },
          {
            t: "New tails and valves",
            line: "Not reused fittings",
            detail:
              "New copper tails and isolation valves. Reusing twenty-year-old fittings on a new unit is where the callback comes from.",
            icon: "shield",
          },
          {
            t: "Mounted clear",
            line: "Levelled, clear of the eave",
            detail:
              "New wall bracket, unit levelled, and enough clearance from the eave for the flue. Not wedged where the old one happened to sit.",
            icon: "ruler",
          },
          {
            t: "Pressure tested, wall made good",
            line: "Old unit removed",
            detail:
              "Old unit off and gone, the wall made good, and the gas pressure tested before we leave.",
            icon: "truck",
          },
        ],
        label: "Continuous flow gas hot water",
        blurb:
          "Heats water on demand, so it never runs out and there's no tank losing heat overnight. Wall-mounted outside and about the size of a briefcase.",
        photo: { src: "/thermann-continues-flow-close-up.webp", alt: "Thermann continuous flow gas hot water unit on an outside wall", scene: true },
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
        looks: {
          heading: "An hour and a half, and a calibrated analyser.",
          note:
            "Most of a gas heater service happens at the unit \u2014 in the cupboard, on the slab or up in the roof. The part that matters is the combustion test: a probe in the flue and a calibrated analyser reading what is actually coming out, rather than a look at the flame and a guess.",
          photo: "/Brivis Compact Classic Indoor Gas Heater.jpg",
          photoAlt: "Brivis Compact Classic internal gas ducted heater",
          facts: [
            { v: "60 – 90 min", k: "On site, one visit" },
            { v: "Calibrated", k: "A real CO analyser, not a sniff test" },
            { v: "March – May", k: "The window, before the first cold snap" },
            { v: "Written report", k: "With the actual readings on it" },
          ],
        },
        servicing: {
          heading: "Every two years, and annually past ten.",
          photo: "/gas-line-safe.webp",
          photoAlt: "Gas line work in progress on a residential property",
          photoScene: true,
          body:
            "That interval is not ours \u2014 it is what the manufacturers and the regulator both say, and it exists because heat exchangers crack with age and thermal cycling. A heater that has run twenty Melbourne winters has earned an annual look at it.",
          facts: [
            "$280 + GST, with the combustion analysis included rather than quoted as an extra",
            "Spillage test and a full gas pressure test to AS/NZS 5601",
            "Every safety control checked \u2014 overheat, flame failure, fan proving",
            "If we condemn it we tell you exactly what we found and why, in writing",
            "Standard call-out $120 in hours, waived if the repair goes ahead the same day",
          ],
        },
        brands: ["Brivis", "Kaden"],
        benefitTiles: [
          {
            t: "A calibrated analyser",
            line: "Reading recorded on the report",
            detail:
              "The carbon monoxide test is done with a calibrated analyser and the actual reading goes on the report. Not a sniff and an assurance.",
            icon: "alarm",
          },
          {
            t: "Burner stripped",
            line: "Cleaned, not visually checked",
            detail:
              "The burner comes apart and gets cleaned. A visual check tells you nothing about what's built up inside it over three winters.",
            icon: "wrench",
          },
          {
            t: "Heat exchanger inspected",
            line: "Looked at for cracking",
            detail:
              "The heat exchanger is what separates combustion gases from the air you breathe. A crack in it is the reason CO tests exist, and it's inspected every service.",
            icon: "shield",
          },
          {
            t: "Flue end to end",
            line: "Seals checked the whole way",
            detail:
              "The flue and its seals are checked along their whole length, not just where they're easy to see. Most CO problems we find are a flue problem.",
            icon: "flow",
          },
          {
            t: "Report the same day",
            line: "Written, emailed, yours to keep",
            detail:
              "The written report is emailed the same day, with the readings on it. Useful for a landlord, a sale, or just for knowing.",
            icon: "clock",
          },
          {
            t: "Every two years, or yearly",
            line: "Annually once it's over ten",
            detail:
              "Every two years on a healthy unit, annually once it's past ten. If we think you can stretch it we'll say so rather than booking you in.",
            icon: "tag",
          },
        ],
        label: "Gas heater service & carbon monoxide test",
        blurb:
          "An annual check of the burner, heat exchanger and flue, with a carbon monoxide test on the running appliance. This is the one that matters, a cracked heat exchanger has no smell and no warning.",
        photo: { src: "/gas-ducted-install.webp", alt: "Gas ducted heater in a roof space, where the service and CO test happen" , scene: true },
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
        looks: {
          heading: "A unit on the ground and a hose to the house.",
          note:
            "A temporary unit is not pretty and does not pretend to be. It sits near where the old system was, plumbed into the house hot water line, and it runs the whole house rather than one tap. It is there so you are not choosing a five-thousand-dollar system in a panic on a Tuesday.",
          photo: "/gas hot water change over same day.webp",
          photoAlt: "Hot water changeover completed the same day",
          photoScene: true,
          facts: [
            { v: "Same day", k: "Connected on the day in most cases" },
            { v: "Whole house", k: "Not one tap — every outlet works" },
            { v: "$30 / day", k: "While it is on site" },
            { v: "$350", k: "Set-up and removal, waived if we do the job" },
          ],
        },
        servicing: {
          heading: "It is our unit, so it is our problem.",
          photo: "/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg",
          photoAlt: "Thermann gas storage hot water unit",
          body:
            "Nothing about a hire unit is yours to look after. If it stops we come out and sort it at no charge, and when the new system goes in we disconnect it and take it away on the same day. There is no obligation to use us for the replacement, and we mean that \u2014 it is a different conversation.",
          facts: [
            "If it faults while it is on site we fix or swap it, at no charge",
            "Disconnected and collected on the day the new system is commissioned",
            "Rentals and tenanted properties \u2014 it keeps you compliant while you sort the replacement",
            "$350 set-up and removal, waived entirely if we install the replacement",
            "No obligation to use us for the new system, and no pressure if you don't",
          ],
        },
        brands: ["Thermann"],
        label: "Temporary hot water hire",
        blurb:
          "A temporary unit plumbed in the same day so the house has hot water while you decide what to replace the old one with. $30 a day, and the $350 set-up and removal is waived if we do the replacement.",
        photo: { src: "/gas-hot-water-changeover.webp", alt: "Hot water changeover on site" , scene: true },
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
        priceFrom: "$30/day hire",
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

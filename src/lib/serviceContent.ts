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
  }[];
};

export const serviceContent: Record<string, ServiceContent> = {
  "air-conditioning-installation": {
    metaTitle: "Air Conditioning Installation Pakenham, Berwick, Officer | Advanced Gas & Aircon",
    metaDescription:
      "Licensed split, multi-head and ducted aircon installation across Melbourne's south-east. Mitsubishi Electric, Kaden. Fixed-price quotes in 2 hrs, 6-year workmanship warranty.",
    h1: "Air conditioning installation across Melbourne's south-east",
    intro:
      "Licensed refrigeration technicians installing split-system, multi-head and ducted air conditioning across every postcode within 75 km of Pakenham. Fixed-price quotes back in 2 business hours, most single-split installs done the same visit, and a 6-year workmanship warranty on every job. We spec Mitsubishi Electric first (Diamond Dealer accreditation in progress) and Kaden as the value alternative — same install team, same warranty, same finish.",
    benefits: [
      { t: "ARCtick-licensed refrigeration", d: "All refrigerant handling by ARC-certified technicians. Legally required, and we hold the ticket." },
      { t: "Mitsubishi Electric default", d: "Diamond Dealer accreditation in progress — that unlocks the extended 7-year manufacturer warranty on top of our 6-year workmanship." },
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
      { title: "Room-by-room heat-load calc", detail: "We walk the home, check ceiling height, window aspect and insulation, then compute the actual kW load. Nothing gets guessed — a 5 kW room quote sizes to a 5 kW unit, not a 7." },
      { title: "Written fixed-price quote in 2 hrs", detail: "Back to you inside 2 business hours with the model number, capacity, line-set length, controller spec, warranty position and total installed price. No 'from $X' bait." },
      { title: "Order stock, book install day", detail: "Mitsubishi warehouse in Melbourne is same-day on common stock. We confirm your install day the moment the unit lands with us." },
      { title: "Install day — usually one visit", detail: "Single-split back-to-back is 3-4 hours on site. Multi-head or ducted is a full day. Drop sheets down, dust extraction on the wall cut, conduit colour-matched outside." },
      { title: "Test, commission, walk-through", detail: "We run it up, check refrigerant pressures, walk you through the remote and MELCloud Wi-Fi setup. You sign the job card when you're satisfied — not before." },
      { title: "Compliance certificate emailed in 24 hrs", detail: "Electrical and refrigeration compliance docs into your inbox by end of business the next day. Warranty registered with Mitsubishi in your name at the same time." },
    ],
    systems: [
      {
        id: "split",
        label: "Split system air conditioning",
        blurb:
          "One outdoor unit, one indoor head. The right answer for a bedroom, a living room or a granny flat — cheapest to buy, cheapest to run, and the quickest to get in. Most go in back-to-back in a single morning.",
        photo: { src: "/Mitsubishi Electric Wall Mounted Air Conditioners  MSZ-AP Series.png", alt: "Mitsubishi Electric MSZ-AP wall-mounted split system" },
        points: [
          "2.5 kW for bedrooms, 5.0 kW for living, 7.1 kW for large open-plan",
          "Mitsubishi Electric MSZ-AP as standard, Kaden KSI as the value pick",
          "Back-to-back install in 3-4 hours, one visit",
          "Wi-Fi via MELCloud so you can run it from the phone",
        ],
        priceFrom: "from $2,199 installed",
      },
      {
        id: "multi",
        label: "Multi-head air conditioning",
        blurb:
          "One outdoor unit running two to five indoor heads. Worth it when you want three bedrooms done but only have room — or body-corporate permission — for a single condenser outside.",
        photo: { src: "/Mitsubishi Electric Multi Rooms Air Conditioner  6-Port Multi-Split condenser.webp", alt: "Mitsubishi Electric multi-split outdoor condenser" },
        points: [
          "2, 3, 4 and 5-port outdoor units — Mitsubishi MXZ series",
          "Mix head types: wall, floor console or bulkhead on the one system",
          "One set of pipe penetrations instead of four",
          "Each room keeps its own remote and its own set temperature",
        ],
        priceFrom: "from $6,500 installed",
      },
      {
        id: "ducted",
        label: "Ducted reverse-cycle air conditioning",
        blurb:
          "Whole-home heating and cooling from a single system in the roof. Vents in every room, zoned so you are not paying to condition the bedrooms at 7pm. New builds and retrofits both.",
        photo: { src: "/Mitsubishi Electric Ducted Split System PEA-M-HAA Series.png", alt: "Mitsubishi Electric PEA-M ducted indoor fan coil" },
        points: [
          "Mitsubishi PEAD-M / PEA-M indoor with PUZ outdoor",
          "Zonemate 4, 6 and 8-zone control fitted by default",
          "Full duct design — we size the trunk and branches, not just the unit",
          "Retrofit into an existing roof cavity where there's access",
        ],
        priceFrom: "from $12,500 installed",
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
          "Best in the drier north and east — less suited to humid days",
          "Cooling only; pair with gas ducted for winter",
        ],
        priceFrom: "from $3,900 installed",
      },
    ],
    photos: [
      { src: "/AP_70-80HP_front-1920x1440-1.png", alt: "Mitsubishi MSZ-AP wall split installed", caption: "Mitsubishi MSZ-AP · our default living-zone split" },
      { src: "/Kaden KSI V3 wall split system.jpg", alt: "Kaden KSI V3 wall split system", caption: "Brick-veneer install, colour-matched conduit" },
      { src: "/Mitsubishi Electric Multi Rooms Air Conditioner  6-Port Multi-Split condenser.webp", alt: "Mitsubishi Electric multi-split outdoor condenser", caption: "Multi-head — one outdoor, up to 5 indoor heads" },
      { src: "/Mitsubishi Electric Ducted Split System PEA-M-HAA Series.png", alt: "Mitsubishi Electric PEA-M ducted indoor fan coil", caption: "PEAD-M ducted retrofit into a family home" },
    ],
    brandPods: [
      { brand: "Mitsubishi Electric", reason: "The lowest failure rate in our install base. Decade-old MSZ-AP still runs to spec.", href: "/brands/mitsubishi-electric" },
      { brand: "Kaden", reason: "Splits, ducted, gas ducted AND evap under one brand. ~$600–700 cheaper installed than the Mitsubishi equivalent, same 6-year warranty.", href: "/brands/kaden" },
      { brand: "Brivis (evap)", reason: "The default evap brand in the corridor — Contour + Advance roof units for dry-summer suburbs like Cranbourne, Clyde and Officer.", href: "/brands/brivis" },
      { brand: "Zonemate", reason: "Our default ducted controller — 4/6/8-zone Touch panel with Wi-Fi and per-room temp sensors.", href: "/brands/zonemate" },
    ],
    typical: {
      time: "Single split · same day. Multi-head · 1 day. Ducted · 1–2 days.",
      warranty: "6-year workmanship + 5-year Mitsubishi manufacturer (7-year Diamond Dealer extension pending).",
      priceRange: "$2,199 wall split → $18,500 large ducted with 6 zones.",
      followUp: "We ring the week after install to check it's running the way you expected. Not a marketing call — a genuine one.",
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
      { q: "Do I need a separate electrician?", a: "No — we handle all electrical work in the same visit. Our team holds refrigeration + electrical + gas tickets so nothing gets subbed out." },
      { q: "What size aircon do I need?", a: "Rough rule: ~125-150 W per m² for standard 2.4 m ceilings. Rooms with big north-facing glass, cathedral ceilings or minimal insulation push higher. We do a proper heat-load calc in the quote, not a guess." },
      { q: "Reverse-cycle vs evap for Pakenham?", a: "Reverse-cycle wins for anywhere in the south-east except the driest hot days. Evap is cheaper to run but ineffective when humidity climbs (Melbourne summers get both dry and humid days). Ducted RC is our default for whole-home." },
      { q: "Can you install on a rental?", a: "Yes — we provide a written quote you can share with your property manager, and we lodge the manufacturer warranty in the owner's name. Compliance certs included as standard." },
      { q: "Do you install brands we haven't quoted?", a: "We install every major brand for repair + service, but for a new install we prefer to quote Mitsubishi or Kaden. If you've bought a Daikin or Panasonic and need it installed, we'll do it as a supply-not-included job." },
    ],
  },

  "heat-pump-installation": {
    metaTitle: "Heat Pump Hot Water Installation Melbourne South-East | From $900 net after VEU",
    metaDescription:
      "Reclaim, iStore and Thermann heat pump hot water installed across Melbourne's south-east. VEU rebate up to $2,700 applied at quote — no chasing paperwork. 6-year workmanship warranty.",
    h1: "Heat pump hot water installation across Melbourne's south-east",
    intro:
      "Reclaim, iStore and Thermann heat pump hot water systems installed by licensed plumbers across every postcode within 75 km of Pakenham. The VEU rebate (up to $2,700) is applied at quote — you don't pay it up-front and chase it back. Old tank removed and responsibly disposed, licensed plumbing to AS/NZS 3500, and a 6-year workmanship warranty on top of the manufacturer's tank + heat-pump cover.",
    benefits: [
      { t: "VEU rebate applied at quote", d: "Up to $2,700 for a Victorian owner-occupier at current VEEC prices ($60–$75). We handle the paperwork — you don't front the cash then chase it back six months later." },
      { t: "Three-brand line-up", d: "iStore 270 L for cheapest-post-rebate ($2,144 installed), Reclaim ECO R290 AIO / Thermann Integrated for AIO mid-range ($2,624), Reclaim CO₂ Split for long-life stainless." },
      { t: "Same tank platform, honest pricing", d: "Reclaim ECO R290 AIO and Thermann Integrated are the same tank + heat-pump platform — Reclaim brand, Thermann brand, identical guts. Pick on brand preference or Reece supply, not spec." },
      { t: "COP holds in cold mornings (Reclaim CO₂)", d: "Reclaim's CO₂ split maintains ~4.5 COP down to –10 °C. Worth the step-up for hills postcodes (Emerald, Gembrook, Cockatoo) where R290 units struggle." },
      { t: "Licensed plumbing + tempering valve", d: "Full drainage rework, tempering valve to AS/NZS 3500, isolation valves + electrical connection on a dedicated circuit — done by our licensed plumber, not a sub-contractor." },
      { t: "Old tank taken away same visit", d: "Gas storage, electric storage or old heat pump — off the pad, out the gate and to an ARC-approved recycler on install day. No waiting for hard rubbish." },
    ],
    brands: ["Reclaim Energy", "iStore", "Thermann", "Sanden", "Rheem AmbiHeat"],
    pricing: [
      { tier: "iStore 270 L (all-in-one, VEU applied)", price: "$2,144", includes: "Supply, install, old tank removal, VEU paperwork, 6-yr tank + 3-yr compressor warranty" },
      { tier: "Reclaim ECO R290 AIO 200/300 L (VEU applied)", price: "$2,624", includes: "Supply, install, old tank removal, VEU paperwork, 6-yr tank + 3-yr compressor + 6-yr workmanship" },
      { tier: "Thermann Integrated 200/285 L (VEU applied)", price: "$2,624", includes: "Same platform as Reclaim ECO R290 AIO — Reece stock, Dux warranty" },
      { tier: "Reclaim CO₂ Split · Glass-lined 250/315/400 L", price: "Message for quote", includes: "Split heat pump + separate tank, 10-yr tank + 10-yr heat pump warranty" },
      { tier: "Reclaim CO₂ Split · Stainless 250/315/400 L", price: "Message for quote", includes: "As above, 15-yr stainless tank warranty (no anode to service)" },
    ],
    steps: [
      { title: "Site inspection — no charge", detail: "We walk the existing tank position, check pipe entry, electrical supply, drainage, and outdoor placement for split-system heat pumps. On the same visit we confirm VEU eligibility and photograph the old unit for the rebate application." },
      { title: "Written fixed-price quote in 2 hrs", detail: "Back to you the same business day with model number, capacity, VEU rebate value, tank + heat-pump warranty and the installed price after rebate. No 'from $X' — the number on the quote is the number on the invoice." },
      { title: "We lodge the VEU application", detail: "Approved accredited-provider paperwork submitted the day you accept the quote. The rebate is applied to your invoice, not something you chase back six months later." },
      { title: "Install day — usually same-day swap", detail: "AIO swap into an existing electric or gas storage tank position is 3–5 hours. Split heat pump with a new tank position is 5–7 hours. Old tank drained, disconnected, loaded up." },
      { title: "Commission, temper, hand over", detail: "Tempering valve to AS/NZS 3500, isolation valves in, dedicated circuit tested. We wait for hot water at the tap, then walk you through the controller and timer settings." },
      { title: "Compliance certificate + warranty registration", detail: "Plumbing compliance certificate emailed within 24 hours. Tank + heat-pump warranty lodged with the manufacturer in your name at the same time. VEU certificate follows within 2 weeks." },
    ],
    photos: [
      { src: "/270L-istore-heatpump.webp", alt: "iStore 270L heat pump on install day", caption: "iStore 270 L — cheapest post-rebate" },
      { src: "/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp", alt: "Reclaim ECO R290 AIO heat pump", caption: "Reclaim ECO R290 AIO — same platform as Thermann Integrated" },
      { src: "/reclaim-spit-close-up.webp", alt: "Reclaim CO2 split heat pump install", caption: "Reclaim CO₂ Split — 15-year stainless tank" },
      { src: "/thermann_integrated_heat_pump_02.jpg", alt: "Thermann Integrated heat pump", caption: "Thermann Integrated — Australian-made by Dux" },
      { src: "/reclaim-split-stand-back-shot.webp", alt: "Reclaim CO₂ heat pump — outdoor unit and tank installed", caption: "Reclaim CO₂ Split — outdoor unit + separate tank" },
      { src: "/gas-hot-water-changeover.webp", alt: "Hot water changeover in progress", caption: "Same-day changeover — old tank out, new heat pump in" },
    ],
    brandPods: [
      { brand: "Reclaim Energy", reason: "The only mainstream CO₂ heat pump in Australia. 15-yr stainless tank on the flagship. Made in Sydney.", href: "/brands/reclaim" },
      { brand: "iStore", reason: "Cheapest heat pump post-rebate — often under $900 net. Widely serviced, healthy parts pipeline.", href: "/brands/istore" },
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
      { q: "Does a heat pump work in cold Melbourne mornings?", a: "R290 (propane) units drop noticeably below 0 °C. CO₂ heat pumps (Reclaim) hold full capacity down to −10 °C — worth specifying for hills postcodes like Emerald, Gembrook or Cockatoo." },
      { q: "Is it noisy? Where do you put it?", a: "37–48 dBA at 1 m depending on model — Reclaim CO₂ is the quietest at 37 dBA (safe next to a bedroom wall). Ideally sited on the shady side of the house away from bedrooms." },
      { q: "How long does the install take?", a: "AIO into an existing tank position is 3–5 hours, done in one visit. Split heat pump with a new outdoor unit position is 5–7 hours. Both are usually same-day." },
      { q: "What's the warranty picture?", a: "Reclaim CO₂ Stainless: 15-yr tank + 10-yr heat pump. Reclaim R290 AIO: 6-yr tank + 3-yr compressor. iStore: 6-yr tank + 3-yr compressor. Plus our 6-year workmanship on top of all of them." },
      { q: "Can I combine it with solar PV?", a: "Yes — Reclaim's split range is PV-diverter compatible so the heat pump only runs when your PV is exporting. We can add a diverter kit at install time or later." },
    ],
  },

  "aircon-servicing-repairs": {
    metaTitle: "Air Conditioning Service & Repair Melbourne South-East | All Brands, Same-Day Call-outs",
    metaDescription:
      "Annual aircon service and same-day repairs across Melbourne's south-east — Mitsubishi, Daikin, Fujitsu, Panasonic, Kaden, LG. Fixed pricing, ARCtick-licensed, service records kept.",
    h1: "Aircon service, repair & tune-up across Melbourne's south-east",
    intro:
      "Keep your aircon running efficiently — and your manufacturer warranty valid — with annual servicing from ARCtick-licensed refrigeration technicians. We service every major brand across every postcode within 75 km of Pakenham, splits, multi-head and ducted, with same-day breakdown attendance and fixed-price quotes before any parts are ordered. The service record we file lodges direct with the manufacturer so your warranty stays intact.",
    benefits: [
      { t: "All major brands serviced", d: "Mitsubishi Electric, Daikin, Fujitsu, Panasonic, LG, Kaden, Braemar. Even ones we don't install." },
      { t: "Keeps your warranty valid", d: "Most manufacturers require annual service to keep warranty in force. We lodge a service report direct with the maker in your name." },
      { t: "Same-day breakdown attendance", d: "Aircon down in a heatwave? We aim to be on-site same-day across Pakenham, Berwick, Officer, Cranbourne and out to Warragul." },
      { t: "Fixed pricing before we touch anything", d: "Diagnostic, gas top-up, capacitor swap, board replacement — all quoted in writing before we open a wallet." },
      { t: "Refrigerant leak repair (not just top-up)", d: "If you're losing gas, it's a leak — we find it and fix it. Yearly re-gassing is a bandaid; we'd rather do the job once properly." },
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
      { title: "Book the visit — one call, no menu", detail: "Call and book with the person you'll see — Chaz or Jake picks up, quotes the service fee, and books a window that suits you. No press-1 hold music, no third-party dispatcher." },
      { title: "We arrive with the parts", detail: "Common consumables — capacitors, thermistors, PCB relays, refrigerant, filters — live on the truck. Most service jobs are one-visit fixes because we're not driving back for a $12 part." },
      { title: "Service on the day", detail: "Filter clean, coil chemical clean (indoor + outdoor), refrigerant pressure check, capacitor + fan motor test, drain flush, thermistor calibration. Written service report before we leave." },
      { title: "Diagnose + written quote for any repair", detail: "If a component needs replacing we quote it in writing before we touch it. Fixed pricing, no hourly creep. Fee is waived if you accept the repair the same day." },
      { title: "Service record lodged with the manufacturer", detail: "We upload the service report direct to Mitsubishi, Daikin, Fujitsu etc so your warranty record stays clean and any future claim goes through without a fight." },
      { title: "12-month reminder", detail: "We drop you a text 11 months later so the annual is booked before the heatwave. Skip it if you don't want it — it's a one-line opt-out." },
    ],
    systems: [
      {
        id: "evap",
        label: "Evaporative cooler service",
        blurb:
          "A pre-summer service on a roof-mounted evap. Pads, water tray, pump and float all get looked at, because the first hot day is a bad time to find out the pump has seized over winter.",
        photo: { src: "/evap cooler service close ip.jpg", alt: "Evaporative cooler service — cooling pads and water tray" },
        points: [
          "Cooling pads inspected and replaced where they've gone brittle",
          "Water tray drained, flushed and checked for leaks",
          "Pump, float valve and bleed rate tested under load",
          "Roof-side access and safety handled by us",
        ],
        priceFrom: "from $220 + GST",
      },
      {
        id: "aircon-service",
        label: "Split & ducted aircon service",
        blurb:
          "Filters, coils and drains on a refrigerated system. Most call-outs we get in January are units that have never been serviced — a blocked drain or a filthy coil, not a dead compressor.",
        photo: { src: "/Mitsubishi Electric Wall Mounted Air Conditioners  MSZ-AP Series.png", alt: "Mitsubishi MSZ-AP wall split system" },
        points: [
          "Filter clean, indoor and outdoor coil check",
          "Condensate drain cleared and flow tested",
          "Refrigerant pressures and superheat checked against spec",
          "Electrical connections torque-checked",
        ],
        priceFrom: "from $190 + GST",
      },
    ],
    photos: [
      { src: "/Mitsubishi Electric Wall Mounted Air Conditioners  MSZ-AP Series.png", alt: "Mitsubishi MSZ-AP wall split — the unit we service most", caption: "Split system chemical coil clean" },
      { src: "/Kaden kdi-v2-Ducted Split System.webp", alt: "Kaden ducted indoor unit — service access panel", caption: "Ducted return-air access + filter swap" },
      { src: "/evap-cooler-service.webp", alt: "Evaporative cooler service — roof-side access", caption: "ARCtick-licensed — every refrigerant job by a certified tech" },
      { src: "/evap cooler service close ip.jpg", alt: "Evaporative cooler pre-summer service — pads and water tray", caption: "Pre-summer evap clean — pump + water lines" },
    ],
    brandPods: [
      { brand: "Mitsubishi Electric", reason: "Parts pipeline is genuinely never a worry — even for units we didn't install, even for units 10+ years old.", href: "/brands/mitsubishi-electric" },
      { brand: "Kaden", reason: "Splits, ducted, gas ducted AND evap under one brand. Emerson-backed parts network in Melbourne — same-day on common boards.", href: "/brands/kaden" },
      { brand: "Brivis & Braemar", reason: "Rinnai Melbourne warehouse holds parts for legacy Brivis + Braemar gas + evap units still in the field.", href: "/brands/brivis" },
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
      "Replacement parts (capacitors, PCBs, fan motors, sensors — quoted in writing before we touch them)",
      "Refrigerant refill beyond 200 g (indicates a leak — leak-find + repair quoted separately)",
      "Roof-scaffold hire for two-storey ducted returns (~$300 typical)",
      "Access to a unit walled-in behind cabinetry that needs demolishing to reach",
    ],
    faqs: [
      { q: "How often should I service my aircon?", a: "Once a year is the manufacturer minimum to keep warranty in force. Heavy commercial use (a shop, a rental short-let) may need 2–4 per year. We text a reminder 11 months out so it's booked in time for summer." },
      { q: "My aircon isn't cooling — what is it?", a: "Top four causes in our service book: (1) dirty filters + coil, (2) low refrigerant from a leak (needs finding, not just topping up), (3) faulty capacitor on the outdoor, (4) blocked drain triggering a safety cut-out. We diagnose in under 30 minutes." },
      { q: "Do you fix all brands?", a: "Yes — we hold spare-parts accounts with Mitsubishi, Daikin, Fujitsu, Panasonic, LG and Kaden. Non-stock parts land within 24–48 hours." },
      { q: "The last mob just kept topping up my gas — is that OK?", a: "No. If it's losing gas, there's a leak. Yearly re-gassing hides the fault while the environmental refund vents into the atmosphere. We'd rather leak-find it once and fix it properly." },
      { q: "Do you honour manufacturer warranties on units you didn't install?", a: "Yes — we're an authorised service partner for Mitsubishi, Kaden and Brivis. If your unit's under warranty we lodge the claim direct and the parts come through the manufacturer's warranty channel." },
    ],
  },

  "gas-plumbing": {
    metaTitle: "Gas Plumbing & Ducted Heating Melbourne South-East | Brivis, Rinnai, Thermann",
    metaDescription:
      "Licensed gas fitters + plumbers serving Melbourne's south-east — Brivis / Braemar ducted heater retrofit, Thermann continuous-flow hot water, gas leak detection, same-day emergency call-outs. VBA-licensed, full compliance certificates.",
    h1: "Gas heating, hot water & plumbing across Melbourne's south-east",
    intro:
      "From a same-day Brivis Wombat replacement to a Thermann continuous-flow hot water swap, our VBA-licensed gas fitters and plumbers handle the lot across every postcode within 75 km of Pakenham. Same-day emergency call-outs for no-hot-water, gas leaks or CO alarms, fixed-price quotes on planned work back in 2 business hours, and full compliance certificates on every job.",
    benefits: [
      { t: "VBA-licensed gas fitting", d: "Full Victorian Plumbing Licence + Type-A gas endorsement. Every gas job compliant with AS/NZS 5601." },
      { t: "Brivis / Braemar specialists", d: "The default gas ducted heater in most homes built 1990–2015 in the corridor. We replace one nearly every week — Wombat, Buffalo, Kaden gas ducted all covered." },
      { t: "Thermann G-series continuous flow", d: "Our default gas continuous-flow hot water — a Reece-exclusive brand (not Rinnai), Australian-designed, 12-yr heat-exchanger warranty." },
      { t: "Gas leak detection + safe-to-stay", d: "Electronic leak detector, pressure-drop test, safe-to-stay written verification. We don't just tell you 'seems OK'." },
      { t: "Emergency call-outs, on-call tradie", d: "Same-day across the corridor for gas leaks, no hot water, CO alarms. Answered by us, not an overseas call-centre." },
      { t: "Old unit removed same visit", d: "Old Brivis, old Vulcan tank, old Rinnai continuous flow — off the pad and to the metal recycler on install day. No hard-rubbish wait." },
    ],
    brands: ["Brivis", "Kaden", "Thermann", "Rinnai", "Rheem", "Bosch", "Dux", "Vulcan"],
    pricing: [
      { tier: "Brivis Wombat replacement (like-for-like)", price: "from $4,800", includes: "Supply, install, controller wiring reuse, compliance cert, old unit removal" },
      { tier: "Brivis Buffalo higher-spec replacement", price: "from $5,600", includes: "As above, quieter fan, longer service life" },
      { tier: "Thermann G-series continuous flow (26 L)", price: "from $2,499", includes: "Supply, install, compliance cert, controller (indoor + outdoor)" },
      { tier: "Gas appliance installation (single point)", price: "from $349", includes: "Connection, pressure test, compliance cert" },
      { tier: "Gas leak detection + report", price: "from $220", includes: "Electronic leak test, pressure test, written safe-to-stay report" },
      { tier: "Emergency call-out (after-hours)", price: "$220 + parts", includes: "Same-day attendance for gas leaks, no hot water, CO alarms" },
    ],
    steps: [
      { title: "Same-day emergency? Call first", detail: "Gas leak, no hot water, CO alarm — call and we'll be on-site same-day. Standard call-out $120 in-hours, $220 after-hours. Fee waived if repair goes ahead on the day." },
      { title: "Planned job? Written quote in 2 hrs", detail: "Send a photo of the existing unit and we'll come back the same business day with the replacement model, capacity, star rating and installed price. Includes VEU eligibility check for the swap." },
      { title: "Old unit assessed on site", detail: "Ducted heater — is the cavity + ductwork reusable? (Usually yes for Brivis/Braemar retrofit.) Hot water — is the existing pad + pipework good, or does it need rework? We tell you before we touch anything." },
      { title: "Install day", detail: "Brivis ducted replacement — 3-4 hours if the ducts + controller wiring reuse cleanly. Continuous flow hot water swap — 3-5 hours. Same-day for both. Old unit off the pad and loaded up." },
      { title: "Commission, pressure test, hand over", detail: "Gas pressure test to AS/NZS 5601, controller programmed, temperature setpoint checked, we run hot water at the tap. You sign the job card when it's running the way you want." },
      { title: "Compliance certificate + warranty registration", detail: "Gas compliance certificate emailed inside 24 hours. Manufacturer warranty registered in your name at the same time." },
    ],
    systems: [
      {
        id: "gas-ducted",
        label: "Gas ducted heating",
        blurb:
          "A gas furnace in the roof or outside the wall, ducted to vents through the house. Still the cheapest way to heat a whole Melbourne home through winter, and the fastest to warm up from cold.",
        photo: { src: "/Brivis Wombat Indoor 3 star.jpg", alt: "Brivis Wombat internal gas ducted heater" },
        points: [
          "Brivis Wombat, Compact Classic, Buffalo and StarPro",
          "Kaden internal and external, 3 to 5 star",
          "Internal (roof or cupboard) and external (against the wall) versions",
          "Star rating drives running cost — we quote the payback, not just the price",
        ],
        priceFrom: "from $4,600 installed",
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
        ],
        priceFrom: "from $1,850 installed",
      },
      {
        id: "gas-service",
        label: "Gas heater service & carbon monoxide test",
        blurb:
          "An annual check of the burner, heat exchanger and flue, with a carbon monoxide test on the running appliance. This is the one that matters — a cracked heat exchanger has no smell and no warning.",
        photo: { src: "/gas-line-safe.webp", alt: "Gas appliance service and carbon monoxide testing on site" },
        points: [
          "Full CO test with a calibrated analyser, results on the report",
          "Burner clean, heat exchanger inspection, flue and seal check",
          "Written report emailed the same day",
          "Recommended every 2 years, annually on units over 10 years old",
        ],
        priceFrom: "$280 + GST",
      },
    ],
    photos: [
      { src: "/Brivis Wombat Indoor 3 star.jpg", alt: "Brivis Wombat internal gas ducted heater", caption: "Brivis Classic Wombat — the ducted heater we replace most often" },
      { src: "/G-Series_Front_On_View_1200x900.jpg", alt: "Thermann G-series continuous flow", caption: "Thermann G-series — our default continuous-flow gas hot water" },
      { src: "/gas-ducted-install.webp", alt: "Gas ducted heater install in progress", caption: "Gas ducted retrofit — reusing existing cavity + ducts" },
      { src: "/gas-hot-water-changeover.webp", alt: "Same-day gas hot water changeover", caption: "Same-day hot water changeover — old off, new on" },
      { src: "/gas-line.webp", alt: "Gas line pressure test", caption: "Gas pressure test to AS/NZS 5601" },
      { src: "/gas-line-safe.webp", alt: "Gas fitter on site", caption: "VBA-licensed + Type-A gas endorsement" },
    ],
    brandPods: [
      { brand: "Brivis", reason: "The default gas ducted heater in most corridor homes built 1990–2015. Rinnai-backed parts pipeline for legacy Wombat + Buffalo units.", href: "/brands/brivis" },
      { brand: "Kaden Gas Ducted", reason: "Value tier — 6-star Advance model is the most efficient in the value price point. Same footprint as a Brivis retrofit.", href: "/brands/kaden" },
      { brand: "Thermann", reason: "Our default continuous-flow gas hot water. Australian-designed, Reece supply, 12-yr heat-exchanger warranty.", href: "/brands/thermann" },
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
      { q: "Do I need a gas-safe certificate?", a: "Yes — every new gas appliance install or replacement in Victoria requires a Type-A compliance certificate from a licensed gas fitter. We issue this on every job and email it to you inside 24 hours." },
      { q: "Can you do same-day emergency call-outs?", a: "Yes — for gas leaks, burst pipes, no hot water and CO alarms across the corridor. Standard call-out is $120 in-hours, $220 after-hours. Fee waived if you accept the repair the same day." },
      { q: "Should I replace my gas hot water with a heat pump?", a: "If the gas unit is over 10 years old, a heat pump often pays back in 2–4 years through energy savings + the VEU rebate. We'll quote both side-by-side so you can see the net-of-rebate numbers before deciding." },
      { q: "My Brivis is 15 years old — replace or repair?", a: "15-year-old Brivis is usually past its economic repair life for anything more than a controller / thermocouple fix. A Wombat replacement is typically $4,800 fully installed and reuses your existing ducts + wiring, so the swap is cheap and clean." },
      { q: "Can I move from gas to reverse-cycle at the same time?", a: "Yes — we're licensed refrigeration + gas so we can decommission the gas and install a reverse-cycle ducted or splits in the same visit. Usually the cleanest way to do a full swap." },
      { q: "How do I know if my gas line has a leak?", a: "Rotten-egg smell, hissing near the meter, unusually high gas bill, or dizziness / headaches near a burning appliance. Get out of the house, call the emergency gas line (1800 427 532) then call us — we'll be on-site same-day to leak-test and repair." },
    ],
  },
};

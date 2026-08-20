/**
 * Per-system content for /services/<service>/<system>.
 *
 * Why this exists: those ten pages were rendering the parent service's
 * benefits, the parent service's process steps and — whenever no pricing
 * row happened to match on a keyword — the parent service's entire price
 * table. Four of the nine sections on a "split system" page were
 * identical to the "ducted air conditioning" page sitting next to it.
 * They were sub-pages of a service rather than pages about a system.
 *
 * So each system now brings its own facts strip, its own spotlight
 * section, its own process and its own prices. The spotlight is the
 * important one: it's the single thing that actually distinguishes this
 * system from its siblings, and it gets a layout suited to the argument
 * rather than the same card grid every time. Zoning wants a stepped
 * explanation. Evap versus refrigerated wants two columns. Where a split
 * head goes wants cards.
 *
 * Anything absent here falls back to the parent service, so a new system
 * can ship before its detail is written without breaking.
 *
 * Keyed "service-slug/system-id" to match the route.
 */

export type SystemSpec = { label: string; value: string };

export type SystemSpotlight = {
  eyebrow: string;
  heading: string;
  blurb?: string;
  /** How the items render. Picked per system so no two pages read the same. */
  layout: "cards" | "split" | "table" | "steps";
  items: { t: string; d: string }[];
  /** `table` only: the two column headings the items sit under. */
  columns?: [string, string];
  /** `split` only: sits beside the list. */
  photo?: { src: string; alt: string };
  note?: string;
};

export type SystemDetail = {
  /** Quick facts strip under the hero. */
  specs?: SystemSpec[];
  spotlight?: SystemSpotlight;
  /** Process for this system, not the parent service's. */
  steps?: { title: string; detail: string }[];
  /** Price rows for this system only. */
  pricing?: { tier: string; price: string; includes: string }[];
  /** One-line note under the price table where the numbers need context. */
  pricingNote?: string;
};

export const SYSTEM_DETAIL: Record<string, SystemDetail> = {
  /* ------------------------------------------------------------------
   * Air conditioning installation
   * ---------------------------------------------------------------- */
  "air-conditioning-installation/split": {
    specs: [
      { label: "Capacity", value: "2.5 – 7.1 kW" },
      { label: "Time on site", value: "3 – 4 hours" },
      { label: "Line-set included", value: "Up to 3 – 5 m" },
      { label: "Warranty", value: "5-yr manufacturer + 6-yr workmanship" },
      { label: "Rooms covered", value: "One" },
    ],
    spotlight: {
      eyebrow: "The part that decides the job",
      heading: "Where the head goes decides everything else.",
      blurb:
        "A split system is a simple install with one genuinely difficult decision in it, and it happens before anyone picks up a drill. Get the position right and a 2.5 kW unit holds a bedroom comfortably. Get it wrong and a 5 kW unit annoys you for fifteen years.",
      layout: "cards",
      items: [
        {
          t: "Back-to-back is cheapest, and not always right",
          d: "Indoor unit on an external wall, outdoor unit directly behind it, shortest possible pipe run. It's the quickest install and the one most quotes assume. It's also how heads end up above a bed or blowing at a lounge from two metres away. We'll price the better position as well and let you choose.",
        },
        {
          t: "Height and throw",
          d: "A wall split throws air along the ceiling and lets it fall. It needs clear run in front of it — no bulkhead, no tall wardrobe, no pelmet in the way. Mounted too low it short-cycles against its own return air and reads the room wrong.",
        },
        {
          t: "Not directly over the bed",
          d: "It's the most common regret we hear about somebody else's install. Even on low fan, air moving over you all night is the difference between a system you use and one you switch off in July.",
        },
        {
          t: "Where the outdoor unit lands",
          d: "Setbacks, the neighbour's bedroom window, and whether there's anywhere for it to breathe. Boxed into a side passage with a fence 300 mm away, it recirculates its own hot air and loses capacity on exactly the days you need it.",
        },
        {
          t: "The condensate drain",
          d: "A split makes water when it cools, and that water has to go somewhere with fall the whole way. Draining onto a path is a slip hazard, draining into a garden bed is fine, and draining into the wall cavity is what we get called out to fix on other people's work.",
        },
        {
          t: "Core hole and conduit",
          d: "One hole through the wall, sealed properly, with the pipework in colour-matched conduit run straight and level. It's the part everyone sees from the driveway for the next decade and the part cheap installs give away first.",
        },
      ],
    },
    steps: [
      { title: "Site visit, and we walk the room", detail: "We look at the wall you want it on, the wall it should probably go on, and where the outdoor unit can sit. Ten minutes, and it's the difference between a good install and a cheap one." },
      { title: "Fixed price in writing", detail: "The unit, the position, the line-set length, and anything extra the site needs — a longer run, a dedicated circuit, a bracket instead of a slab. No day-of surprises." },
      { title: "Drop sheets, then the bracket", detail: "Floor covered before anything else. Indoor bracket levelled and fixed into studs, not just plasterboard anchors." },
      { title: "Core hole and line-set", detail: "One clean core through the wall on a slight fall, insulated line-set, drain and cable through together, conduit colour-matched outside." },
      { title: "Vacuum, charge, commission", detail: "Pulled down to a proper vacuum and held, not just flashed. Charge checked against the data plate, superheat and subcool measured, and it runs while we watch it." },
      { title: "Handover and clean-up", detail: "We show you the remote, set the timer if you want one, sweep up and take the packaging with us. Compliance paperwork emailed the next business day." },
    ],
    pricing: [
      { tier: "Single split system (2.5 kW · bedroom)", price: "from $2,199", includes: "Supply, back-to-back install, up to 3 m line-set, compliance cert" },
      { tier: "Single split system (5.0 kW · living)", price: "from $2,899", includes: "Supply, install, up to 5 m line-set, compliance cert" },
      { tier: "Single split system (7.1 kW · large open-plan)", price: "from $3,299", includes: "Supply, install, up to 5 m line-set, compliance cert" },
    ],
    pricingNote:
      "Longer line-sets, a bracket instead of a ground slab, or a new dedicated circuit are the three things that most often add to a split install. All three get quoted before the day, not on it.",
  },

  "air-conditioning-installation/multi": {
    specs: [
      { label: "Indoor heads", value: "2 – 5 off one outdoor" },
      { label: "Outdoor capacity", value: "5 – 10 kW typical" },
      { label: "Time on site", value: "1 – 2 days" },
      { label: "Line-set included", value: "Up to 15 – 30 m combined" },
      { label: "Best for", value: "Homes with no roof space" },
    ],
    spotlight: {
      eyebrow: "The trade-off nobody mentions",
      heading: "One outdoor unit is the whole point, and the whole compromise.",
      blurb:
        "Multi-head exists because some houses can't take ducted and can't take four separate outdoor units either. It solves a real problem well. It also has behaviour that surprises people who weren't told about it, so here it is before you buy rather than after.",
      layout: "split",
      photo: { src: "/mitsubishi-mxz-multi-split-condenser-v2.webp", alt: "Mitsubishi MXZ multi-head outdoor condenser" },
      items: [
        {
          t: "One head calling means the compressor runs",
          d: "Turn on the bedroom at 2 am and the outdoor unit starts for that one room. It modulates down, so it isn't running flat out, but it is running. On a single split serving the same room the situation is identical — the difference is that people expect more independence from a multi than it actually gives.",
        },
        {
          t: "Capacity is shared, not multiplied",
          d: "A 10 kW outdoor unit with four 3.5 kW heads on it does not deliver 14 kW. Run everything at once on the hottest day and each room gets less than its head is rated for. We size for how you'll actually use it, which is usually two or three rooms at a time, not all of them.",
        },
        {
          t: "Heating and cooling at once isn't possible",
          d: "On a standard multi the whole system is in one mode. You cannot cool the west-facing living room and heat the south bedroom simultaneously. In autumn that occasionally matters and it's worth knowing now.",
        },
        {
          t: "One unit on the wall instead of four",
          d: "This is the payoff. One outdoor unit, one set of brackets, one power supply, one thing to look at and one thing to service. On a townhouse with a two-metre side setback it's often the only workable answer.",
        },
        {
          t: "Head types can be mixed",
          d: "Wall units in the bedrooms, a floor console under a window where a wall unit won't fit, a bulkhead unit in a hallway. They all run off the same outdoor unit, which is something a set of single splits can't do.",
        },
      ],
      note:
        "If the house has usable roof space and you want genuinely independent rooms, ducted with proper zoning is the better answer and we'll say so. Multi-head is for the houses where that isn't on the table.",
    },
    steps: [
      { title: "Room-by-room walk-through", detail: "Every room that's getting a head, plus how you actually live in the house — which rooms run together, which are used at night. That decides the outdoor unit size more than floor area does." },
      { title: "Outdoor unit position, first", detail: "A multi outdoor unit is bigger and heavier than a single, and everything runs back to it. Where it can legally and sensibly sit sets the pipe routes for the whole job, so we settle it before anything else." },
      { title: "Fixed price, per head and total", detail: "You see what each head costs and what the outdoor unit costs, so if the fifth bedroom can wait a year you can make that call with real numbers." },
      { title: "Day one, pipe runs", detail: "The bulk of a multi install is pipework. Runs get set out, cored and insulated, usually with the outdoor unit set and the heads bracketed by the end of the day." },
      { title: "Day two, heads and commissioning", detail: "Indoor units hung, connections made, whole system pulled into vacuum as one, charged and commissioned. Every head tested individually and then together." },
      { title: "Handover, one remote at a time", detail: "Each head has its own controller and they're easy to mix up. We label them, run through each one with you, and email the compliance paperwork the next business day." },
    ],
    pricing: [
      { tier: "Multi-head 2-indoor (Mitsubishi MXZ-2F)", price: "from $6,500", includes: "One outdoor, two indoor heads, up to 15 m combined line-set" },
      { tier: "Multi-head 4-indoor (Mitsubishi MXZ-4F)", price: "from $11,500", includes: "One outdoor, four indoor heads, up to 30 m combined line-set" },
    ],
    pricingNote:
      "Three and five-head configurations sit between and above these. Combined line-set length is the number that moves the price most on a multi, so it's worth measuring properly at the quote.",
  },

  "air-conditioning-installation/ducted": {
    specs: [
      { label: "Capacity", value: "10 – 18 kW" },
      { label: "Zones", value: "4 – 12" },
      { label: "Time on site", value: "2 – 3 days" },
      { label: "Needs", value: "Roof space + access" },
      { label: "Warranty", value: "5-yr manufacturer + 6-yr workmanship" },
    ],
    spotlight: {
      eyebrow: "Zoning is the whole job",
      heading: "A ducted system without zoning is an expensive way to heat a hallway.",
      blurb:
        "Almost every ducted complaint we get called to is a zoning problem wearing a capacity costume. The house isn't under-sized. It's conditioning all of itself all of the time, so no part of it is ever quite right and the bill is enormous. Here's how zoning actually works and why we set it up on day one rather than selling it to you later.",
      layout: "steps",
      items: [
        {
          t: "A zone is a motorised damper in the duct",
          d: "Not a closed vent. A vent you shut by hand just pushes the same air somewhere else and raises static pressure across the whole system. A zone motor tells the unit that section is off, and the unit adjusts what it's producing to match.",
        },
        {
          t: "Zones get grouped by how you live, not by room",
          d: "Living and kitchen together. Bedrooms together. Master on its own if it's used at different times. A common four-zone layout in a corridor house is living, bedrooms, master, and the rumpus or study. Twelve zones sounds better than it is if the grouping is wrong.",
        },
        {
          t: "Sensors go where the people are",
          d: "A return-air sensor in a hallway reads a hallway. Zone sensors in the rooms that matter mean the system holds the temperature you're actually sitting in, and it's the single upgrade that changes how a ducted system feels to live with.",
        },
        {
          t: "The system needs somewhere to push air",
          d: "Close too many zones at once and static pressure climbs, the fan strains and efficiency drops. That's why a properly designed system keeps a constant or bypass zone, and why we size the ductwork rather than reusing whatever's up there because it's already there.",
        },
        {
          t: "Then you only condition what you're using",
          d: "Bedrooms off during the day, living off overnight. That's where the running-cost difference comes from — not from the star rating on the box, from the system spending its day heating three rooms instead of nine.",
        },
      ],
      note:
        "Retrofitting zoning into an existing single-zone ducted system is usually cheaper than people expect, and it's often a better spend than replacing a unit that's working fine.",
    },
    steps: [
      { title: "Roof space check, before anything else", detail: "How much clearance there is, where the indoor unit can sit, whether we can get duct runs to the far bedrooms. On some houses this conversation ends with us recommending multi-head instead, and that's a better outcome than finding out on install day." },
      { title: "Heat load and zone plan", detail: "Room by room, with orientation, glazing and ceiling height in it. You get a zone layout drawn up and the reasoning behind the grouping before you commit to anything." },
      { title: "Fixed price with the zoning in it", detail: "Zones are quoted as part of the system, not as an upsell after you've signed. If the budget only stretches to four zones today we'll design the system so more can be added later." },
      { title: "Day one, indoor unit and trunk duct", detail: "Indoor unit set and hung in the roof, main trunk duct run, outdoor condenser positioned and set. The heavy part of the job." },
      { title: "Day two, branches, outlets and zone motors", detail: "Branch runs to each outlet, ceiling grilles cut in and fitted square, zone motors installed and wired back to the controller." },
      { title: "Commission, balance and set the zones up", detail: "Airflow balanced across the outlets so the far bedroom gets what it's supposed to. Controller programmed, each zone tested, and we walk you through the schedule so it's running your way before we leave." },
    ],
    pricing: [
      { tier: "Ducted reverse-cycle (PEAD-M · 4 zones)", price: "from $12,500", includes: "PEAD-M indoor, PUZ outdoor, 4× Zonemate zones, controller, compliance" },
    ],
    pricingNote:
      "Additional zones, longer duct runs and difficult roof access are the three variables. A double-storey with a second system upstairs is a different quote again, and we'll price both options if that's the honest answer.",
  },

  "air-conditioning-installation/evap": {
    specs: [
      { label: "Mounted", value: "On the roof" },
      { label: "Needs", value: "Water supply + power" },
      { label: "Covers", value: "Whole home" },
      { label: "Time on site", value: "1 day" },
      { label: "Running cost", value: "Lowest of anything we fit" },
    ],
    spotlight: {
      eyebrow: "Evap vs refrigerated",
      heading: "Evap is brilliant here about eighty per cent of the time.",
      blurb:
        "Evaporative cooling gets dismissed by people selling refrigerated and oversold by people selling evap. The truth is it depends entirely on the weather and the house, and Melbourne's south-east is genuinely good evap country — right up until a humid February week when it isn't.",
      layout: "table",
      columns: ["Evaporative", "Refrigerated"],
      items: [
        { t: "Running cost", d: "A fraction of refrigerated. A fan and a water pump against a compressor. || Several times the power draw, though inverters have narrowed the gap." },
        { t: "Humid days", d: "Struggles. It cools by evaporating water, so when the air is already wet it has less to give. || Unaffected. Actively dehumidifies, which is why it wins the worst four or five days of summer." },
        { t: "Fresh air", d: "Constant. It pushes filtered outside air through the house and out open windows. Good for allergies and for a house full of people. || Recirculates. Sealed house, same air, no window open." },
        { t: "Heating", d: "None. Cooling only, so you need a separate heater. || Reverse cycle heats as well, often more cheaply than gas." },
        { t: "The house itself", d: "Needs windows or a door open to let air out. Not suited to a house you want sealed. || Works in a closed house, which suits apartments and townhouses." },
        { t: "On the roof", d: "Visible unit on the roofline, and it lives in the weather. || Outdoor unit at ground level, indoor unit in the roof." },
      ],
      note:
        "If you're in Pakenham, Officer, Bunyip or out through the hills and you already have gas ducted for winter, evap is often the cheapest sensible way to make summer bearable. If you want one system for both seasons, reverse-cycle ducted is the answer and we'll quote that instead.",
    },
    steps: [
      { title: "Roof and ceiling check", detail: "Pitch, structure, where the unit can be supported and where the drops can land. Also whether there's an existing evap penetration we can reuse, which saves a lot on a changeover." },
      { title: "Sizing on air changes, not kilowatts", detail: "Evap is sized by how many times an hour it can replace the air in the house. That's a different calculation from refrigerated and it's why an undersized evap feels like a fan rather than a cooler." },
      { title: "Fixed price, including the water connection", detail: "Water supply to the roof and the drain-down line are part of the job and part of the number, not an extra discovered on the day." },
      { title: "Install day", detail: "Unit set and flashed into the roof, ductwork and drops run, ceiling outlets cut and fitted, water and power connected. Most changeovers are a single day." },
      { title: "Commission and set the controller", detail: "Water level and bleed rate set, pump and fan checked through the speed range, controller programmed. We run it with you and show you what open windows do to it, because that's the part people get wrong." },
      { title: "Winter shutdown talk", detail: "Evap units want draining and covering for winter, and starting up before summer rather than during it. We tell you what to do and when, and we'll do it as a pre-summer service if you'd rather not go up there." },
    ],
    pricingNote:
      "Evap pricing depends heavily on the roof, the number of outlets and whether we're reusing an existing penetration, so it's quoted after a site visit rather than off a price list. Changeovers into an existing evap footprint are usually the cheapest cooling in this catalogue.",
  },

  /* ------------------------------------------------------------------
   * Aircon servicing & repairs
   * ---------------------------------------------------------------- */
  "aircon-servicing-repairs/aircon-service": {
    specs: [
      { label: "Split system", value: "$220" },
      { label: "Ducted", value: "$390" },
      { label: "Time on site", value: "60 – 90 minutes" },
      { label: "Best booked", value: "Sept – Nov, before the rush" },
      { label: "You get", value: "A written service report" },
    ],
    spotlight: {
      eyebrow: "What you're actually paying for",
      heading: "A service is eight measurements and a chemical clean.",
      blurb:
        "\"Service\" covers everything from a genuine hour of work to somebody hosing the outdoor unit and leaving. Here's exactly what we do, in the order we do it, so you can compare a quote against something real.",
      layout: "steps",
      items: [
        { t: "Filters out and cleaned", d: "The one thing you could do yourself, and the one that causes the most call-outs when nobody does. We clean them, and we show you how so you can do it between services." },
        { t: "Indoor coil chemical clean", d: "Not a wipe. A proper coil cleaner through the fins, which is where the black dust and the smell live. A blocked coil is the most common reason a system that used to be fine has stopped cooling properly." },
        { t: "Blower wheel and drain", d: "Blower wheel checked and cleaned, condensate tray and drain flushed. A blocked drain is what turns into water down the wall in January." },
        { t: "Refrigerant pressures, both sides", d: "Measured against ambient, not glanced at. Low pressure means a leak, because aircon doesn't consume gas — and finding the leak matters more than topping it up." },
        { t: "Electricals under load", d: "Capacitor tested, contactor checked, current draw compared to the data plate. A capacitor drifting out of spec is cheap to replace now and a dead compressor later." },
        { t: "Thermistors and controls", d: "Sensor readings checked against actual temperature. A thermistor reading two degrees out makes a perfectly healthy system behave like a faulty one." },
        { t: "Outdoor coil and clearances", d: "Coil washed down, fins checked, and we clear whatever has grown or been stacked around it. A condenser that can't breathe loses capacity on exactly the days you need it." },
        { t: "Written report", d: "What we measured, what we cleaned, and anything we'd watch. If something is heading for failure you get told in spring rather than discovering it in February." },
      ],
    },
    steps: [
      { title: "Book it in the shoulder season", detail: "September to November for cooling, March to May for heating. Booked in the middle of a heatwave you'll wait, and so will everyone else." },
      { title: "We arrive with the gear on the van", detail: "Coil cleaner, gauges, meter, spare capacitors and common thermistors. Most faults we find get fixed on the same visit rather than becoming a second appointment." },
      { title: "Drop sheets, then the indoor unit", detail: "Furniture covered under the head. Filters, coil, blower and drain, in that order." },
      { title: "Outdoor unit and electricals", detail: "Coil washed, clearances cleared, capacitor and contactor tested, current draw measured." },
      { title: "Run it and measure it", detail: "System run through a full cycle with gauges on, temperatures across the coil recorded, and the numbers written down rather than remembered." },
      { title: "Report, and honest advice", detail: "You get the report and a straight answer about where the system is in its life. If it's twelve years old and the compressor is drawing high, we'll say that rather than book you in again next year." },
    ],
    pricing: [
      { tier: "Split system · annual service", price: "$220", includes: "Filter clean, coil chemical clean, refrigerant pressure check, capacitor test, thermistor calibration, drain flush, service report" },
      { tier: "Multi-split bundle service (3+ units)", price: "$140 ea", includes: "Same as above, per additional unit at the same address on the same visit" },
      { tier: "Ducted aircon · annual service", price: "$390", includes: "Return-air filter, coil clean, gas pressure check, zone controller test, damper motor test" },
      { tier: "Standard call-out (business hours)", price: "$120", includes: "Attend site, diagnose, quote repair in writing. Fee WAIVED if repair goes ahead the same day." },
    ],
  },

  "aircon-servicing-repairs/evap": {
    specs: [
      { label: "Best booked", value: "Sept – Nov" },
      { label: "Time on site", value: "60 – 90 minutes" },
      { label: "Access", value: "Roof, so leave it to us" },
      { label: "Pads last", value: "Roughly 3 – 5 years" },
      { label: "Also covers", value: "Winter shutdown" },
    ],
    spotlight: {
      eyebrow: "It lives on the roof",
      heading: "An evap unit spends every winter in the weather doing nothing.",
      blurb:
        "That's the whole reason evap servicing is a different job from aircon servicing. A split system sits in a wall being mildly ignored. An evap unit sits on a roof through eight months of rain, sun and leaf litter with water in it, and then you ask it to start on the first hot day.",
      layout: "cards",
      items: [
        { t: "Pads, and what's grown in them", d: "Cooling pads collect mineral scale from the water and organic growth from everything else. Scaled pads cool less and smell, and there's a point where cleaning stops helping and they need replacing — usually every three to five years." },
        { t: "The water distribution system", d: "Pump, spreaders and the small holes that spread water evenly across the pads. Blocked spreaders mean dry patches, dry patches mean warm air straight through, and it's the most common reason an evap 'stopped working properly'." },
        { t: "Reservoir, float and bleed", d: "The tank drained and cleaned out, float valve set to the right level, and the bleed rate checked. Bleed too little and it scales up; bleed too much and you're pouring water down the drain all summer." },
        { t: "Fan, bearings and belt", d: "The bit that sat still all winter. Bearings, belt tension where there is one, and current draw. A motor that's straining in November is a motor that fails in January." },
        { t: "Ductwork and ceiling outlets", d: "Checked for disconnected runs and closed-up outlets. Evap needs a clear path out of the house as much as into it." },
        { t: "Winter shutdown, if you want it", d: "Drained down, covered and isolated at the end of the season. It's the cheapest thing you can do to make an evap unit last, and it's the thing nobody remembers." },
      ],
    },
    steps: [
      { title: "Book before the season, not during it", detail: "September and October. Once the first 35-degree day arrives, every evap in the corridor wants attention in the same week." },
      { title: "Safe roof access", detail: "Harness and ladder work, and it's the main reason not to do this yourself. Most evap units sit on a pitched tile or Colorbond roof that is genuinely dangerous when wet." },
      { title: "Drain, strip and inspect", detail: "Reservoir drained, pads out, and we look at what's actually going on in there before deciding what it needs." },
      { title: "Clean or replace pads", detail: "Cleaned where cleaning still helps, replaced when it doesn't. We'll tell you which and why, and show you the old ones." },
      { title: "Water system and mechanicals", detail: "Pump, spreaders, float, bleed rate. Fan, bearings, belt, current draw. All set and measured rather than eyeballed." },
      { title: "Run it and check the outlets", detail: "System run up and airflow checked at the ceiling outlets, so you know the cooling actually reaches the rooms rather than just the roof space." },
    ],
    pricingNote:
      "Evap servicing is quoted on the unit and the roof rather than off a fixed list — pad replacement and roof access are the two things that move it. Ask when you book and you'll get a number before we come out.",
  },

  /* ------------------------------------------------------------------
   * Gas, heating and hot water
   * ---------------------------------------------------------------- */
  "gas-plumbing/gas-ducted": {
    specs: [
      { label: "Star rating", value: "3 – 6 star" },
      { label: "Position", value: "Internal cupboard or external slab" },
      { label: "Time on site", value: "3 – 4 hours (like-for-like)" },
      { label: "Warranty", value: "7-yr heat exchanger + 6-yr workmanship" },
      { label: "Always included", value: "Carbon monoxide test" },
    ],
    spotlight: {
      eyebrow: "Stars are the whole decision",
      heading: "A 3-star and a 6-star heat the same house to the same temperature.",
      blurb:
        "The difference is what they burn to do it, every winter, for the next fifteen years. That makes the star rating a payback calculation rather than a preference — and the answer genuinely changes depending on how long you're staying in the house.",
      layout: "table",
      columns: ["3-star", "6-star"],
      items: [
        { t: "Up-front", d: "The cheapest ducted heater we'll quote, and a real saving on the day. || Meaningfully more, and the gap is the whole argument." },
        { t: "Gas burned", d: "Roughly a third more for the same heat delivered. || Roughly a third less, every hour it runs." },
        { t: "Where it pays back", d: "Never, on running cost. It pays back only if you're selling soon. || Over the years you stay, and faster in a house that runs the heater a lot." },
        { t: "House you're selling in two years", d: "Usually the right call. You won't be paying the bills. || Hard to justify — you're buying savings for the next owner." },
        { t: "House you're staying in", d: "The expensive option wearing a cheap price tag. || Usually the right call, and it's the one we'd fit in our own place." },
        { t: "Comfort", d: "Identical. Same output, same warm house. || Identical. Quieter fans on the higher models, but that's a spec thing rather than a star thing." },
      ],
      note:
        "We'll put both on the quote with your actual gas usage against them, so it's a decision you make with numbers rather than a recommendation you take on faith. And if the existing unit is past ten years, the carbon monoxide test result may make the decision for us both.",
    },
    steps: [
      { title: "Photo of the existing unit gets you a same-day price", detail: "Send us a picture of the data plate and the cupboard or slab it's sitting on. Most like-for-like ducted replacements can be quoted properly off that without anyone driving out." },
      { title: "Cavity, ducts and controller assessed", detail: "On a like-for-like the existing cavity, ductwork and controller wiring usually all reuse, which is what keeps it a day rather than a rebuild. We check rather than assume, because a collapsed duct in the roof changes the job." },
      { title: "Both star ratings quoted", detail: "3-star and 6-star side by side with your gas usage against them. You get the payback maths, not just a recommendation." },
      { title: "Old unit out, new unit in", detail: "Old heater disconnected, drained where relevant, off the pad and onto the truck for the metal recycler. New unit set, connected and sealed." },
      { title: "Gas pressure test and commissioning", detail: "Pressure tested to AS/NZS 5601 standing and working, burner checked through its range, controller programmed and the house brought up to temperature while we're still there." },
      { title: "Carbon monoxide test and certificate", detail: "Calibrated analyser on the new unit, result written on the report, and the gas compliance certificate emailed inside 24 hours rather than chased three weeks later." },
    ],
    pricing: [
      { tier: "Brivis Wombat replacement (like-for-like)", price: "from $4,800", includes: "Supply, install, controller wiring reuse, compliance cert, old unit removal" },
      { tier: "Brivis Buffalo higher-spec replacement", price: "from $5,600", includes: "As above, quieter fan, longer service life" },
    ],
    pricingNote:
      "Kaden gas ducted drops onto an existing Brivis or Braemar footprint and prices similarly. Duct rework, a new gas run where the existing line is undersized, and cavity alterations are the three things that add — all quoted before the day.",
  },

  "gas-plumbing/continuous-flow": {
    specs: [
      { label: "Flow rate", value: "Typically 26 L/min" },
      { label: "Tank losses", value: "None — there's no tank" },
      { label: "Time on site", value: "3 – 5 hours" },
      { label: "Warranty", value: "12-yr heat exchanger (Thermann)" },
      { label: "Controllers", value: "Indoor + outdoor included" },
    ],
    spotlight: {
      eyebrow: "What it does and doesn't do",
      heading: "Endless hot water is true. Instant hot water isn't.",
      blurb:
        "Continuous flow is a genuinely good bit of gear and it gets sold with one claim that isn't quite right. Knowing the difference before you buy is the difference between being pleased with it and being mildly annoyed by it every morning.",
      layout: "cards",
      items: [
        {
          t: "It never runs out",
          d: "This part is completely true and it's the main reason people switch. Four showers back to back, a bath after, dishes at the same time — the unit heats water as it passes through, so there's no tank to empty. On a full house it's transformative.",
        },
        {
          t: "There's still a delay at the tap",
          d: "The unit fires when you open the tap, and the water already sitting in the pipe between it and you has to clear first. That's plumbing, not the appliance, and it's identical to a tank. A unit mounted close to the bathroom cuts it; one mounted at the far corner of the house doesn't.",
        },
        {
          t: "The cold water sandwich",
          d: "Turn the tap off and straight back on and you can get a short slug of cooler water. It's brief and modern units manage it well, but it exists and you should hear it from us rather than discover it.",
        },
        {
          t: "Flow rate is shared",
          d: "26 litres a minute is the total. Two showers and a kitchen tap at once will split it. It won't run cold, but the pressure at each outlet drops, so on a big household we size on simultaneous outlets rather than on bedroom count.",
        },
        {
          t: "No standing losses",
          d: "A storage tank keeps 170 litres hot around the clock whether you're home or not. Continuous flow heats nothing until you ask for it, which is why it suits households that are out all day and holiday houses that sit empty.",
        },
        {
          t: "It needs decent gas supply",
          d: "These units draw hard when they fire. On a line already feeding a cooktop and a ducted heater the existing pipe is sometimes undersized, and that gets found at the quote rather than when your shower goes lukewarm because someone turned the heater on.",
        },
      ],
      note:
        "If nobody's home during the day and you've got solar on the roof, a heat pump usually beats continuous flow on running cost and takes the VEU rebate as well. We'll quote both if it's a genuine question.",
    },
    steps: [
      { title: "Photo of the existing unit and the wall", detail: "Most continuous-flow swaps can be priced from a picture of what's there now and where it's mounted. Send it through and you'll have a number the same business day." },
      { title: "Gas line and outlets checked", detail: "What else is on the gas run, and how many outlets you use at once. Those two things decide the unit size and whether the existing line is up to it — both worked out before you commit." },
      { title: "Fixed price with both controllers in it", detail: "Indoor and outdoor controllers are part of the quote, not an accessory added later. So is the old unit's removal." },
      { title: "Old unit off, new unit on", detail: "Old tank drained and disconnected, or old continuous-flow unit removed. New unit bracketed, plumbed and gas-connected. Where a tank is being replaced, the pipework usually needs a small rework to suit." },
      { title: "Gas pressure test, then hot water at the tap", detail: "Pressure tested to AS/NZS 5601, unit commissioned, temperature set, and we run hot water at the actual taps rather than declaring it done at the unit." },
      { title: "Certificate and warranty registration", detail: "Gas compliance certificate emailed within 24 hours and the manufacturer warranty registered in your name at the same time." },
    ],
    pricing: [
      { tier: "Thermann G-series continuous flow (26 L)", price: "from $2,499", includes: "Supply, install, compliance cert, controller (indoor + outdoor)" },
    ],
    pricingNote:
      "Swapping from a storage tank to continuous flow usually needs a short pipework rework and occasionally a larger gas line, which are the two things that move this number. Both get quoted before install day.",
  },

  "gas-plumbing/gas-service": {
    specs: [
      { label: "Price", value: "$280 + GST" },
      { label: "How often", value: "Every 2 years, annually past 10" },
      { label: "Time on site", value: "60 – 90 minutes" },
      { label: "Includes", value: "Calibrated CO analyser test" },
      { label: "Best booked", value: "March – May" },
    ],
    spotlight: {
      eyebrow: "The part that isn't optional",
      heading: "A cracked heat exchanger has no smell and no warning.",
      blurb:
        "This is the one service on the site we won't discount and won't skip a step on. Carbon monoxide from a failed gas heater is colourless, odourless, and kills people in Victoria. The test takes minutes. Here's exactly what it involves.",
      layout: "steps",
      items: [
        { t: "Visual inspection, cold", d: "Burner, heat exchanger, flue and seals looked at before anything is lit. A fair proportion of problems are visible at this stage to someone who knows what they're looking at." },
        { t: "Flue and terminal checked", d: "Blockages, bird nesting, corrosion and separation at the joints. A flue that isn't taking combustion products outside is the other way this goes wrong." },
        { t: "Burner and igniter serviced", d: "Cleaned, checked and adjusted. Flame sense rod cleaned, because a dirty one is the most common no-heat call-out we get and it's five minutes at a service." },
        { t: "Gas pressure, standing and working", d: "Measured at the appliance against the data plate, both with the burner off and under load. Wrong pressure burns wrong, and burning wrong is what makes carbon monoxide." },
        { t: "Combustion analysis with a calibrated analyser", d: "This is the test. The analyser samples the flue gases while the unit runs and reads what's actually coming out. Calibrated, and the calibration date is on our gear." },
        { t: "Spillage test", d: "Checking combustion products are going up the flue rather than into the room. Done under the conditions that make spillage worst — exhaust fans on, house closed up." },
        { t: "Safety controls tested", d: "Overheat switches, roll-out sensor and the fan proving circuit. These are the parts that shut the heater down before it hurts anyone, and they're worth knowing still work." },
        { t: "Written report, with the numbers on it", d: "The actual readings, not a tick. If we find carbon monoxide we disconnect the appliance and tell you exactly what we found — that isn't an upsell, it's the law and the right call." },
      ],
      note:
        "Energy Safe Victoria recommends every gas heater is serviced at least every two years. Past ten years old we'd say annually, because that's the age where heat exchangers start to fail.",
    },
    steps: [
      { title: "Book in autumn", detail: "March to May. Booked in June you'll wait, and you'll be waiting in a cold house. It's the single easiest thing to get right about gas heater servicing." },
      { title: "We come to the unit, wherever it lives", detail: "Internal cupboard, external slab, roof-mounted. Same service either way, and we bring drop sheets for the internal ones." },
      { title: "Service, then test", detail: "Clean and adjust first, then measure. Testing a dirty burner tells you about the dirt rather than about the heater." },
      { title: "Common parts on the van", detail: "Igniters, flame sense rods, thermocouples and the usual sensors. Most of what a service turns up gets fixed on the same visit rather than becoming a return trip." },
      { title: "The result, straight", detail: "Clean result, you get the numbers and a date to book the next one. Bad result, we disconnect it and explain exactly what we found and what your options are, including the ones that don't involve us." },
      { title: "Report emailed", detail: "Readings, what was done, and anything we'd watch. Useful at sale time, and useful for a landlord who needs to show the heater has been maintained." },
    ],
    pricing: [
      { tier: "Gas ducted heater service + CO test", price: "$280 + GST", includes: "Full service, gas pressure test, combustion analysis with calibrated analyser, spillage test, safety controls, written report" },
      { tier: "Standard call-out (business hours)", price: "$120", includes: "Attend site, diagnose, quote repair in writing. Fee waived if the repair goes ahead the same day." },
      { tier: "Emergency call-out (after-hours)", price: "$220 + parts", includes: "Same-day attendance for gas leaks, no heat, CO alarms" },
    ],
  },

  "gas-plumbing/temporary-hot-water": {
    specs: [
      { label: "Daily rate", value: "$30 per day" },
      { label: "Set-up + removal", value: "$350, waived if we do the job" },
      { label: "Connected", value: "Usually same day" },
      { label: "Covers", value: "The whole house" },
      { label: "Obligation", value: "None" },
    ],
    spotlight: {
      eyebrow: "What it actually buys you",
      heading: "It takes the deadline off a four thousand dollar decision.",
      blurb:
        "When a tank dies you're suddenly being asked to spend serious money today, with cold showers as the deadline. That's the worst possible way to buy a hot water system and it's exactly how people end up with the wrong one. Here's how the week goes instead.",
      layout: "steps",
      items: [
        { t: "Day 0 — it fails", d: "You ring us. We come out, look at what's actually gone, and tell you whether it's repairable. If it's a component rather than the cylinder, we fix it and none of the rest of this applies." },
        { t: "Day 0 — temporary unit connected", d: "Same visit, in most cases. It plumbs into the existing hot water line where the old unit was, so every outlet in the house works normally again. Hot showers tonight." },
        { t: "Days 1–3 — you actually compare", d: "Three real quotes, read properly, at a normal pace. Heat pump versus gas, what the VEU rebate is worth on each, what your roof and your household actually suit. The comparison you'd never make standing in a cold bathroom." },
        { t: "Days 3–7 — the right unit, not the available one", d: "This is the bit the hire really pays for. Without it you take whoever can come today with whatever is on the truck. With it you can wait for the unit that suits the house, or for a rebate approval to come through." },
        { t: "Install day — temporary unit goes with us", d: "Disconnected and taken away the same day the new system goes in. If we're doing the replacement, the $350 set-up and removal is waived, so all you've paid is the days you actually used." },
        { t: "If you go elsewhere", d: "You pay the $350, which covers the two trips and the gear, and we take it away with no hard feelings. We'd rather you had hot water and chose properly than felt cornered." },
      ],
      note:
        "The daily rate keeps running until the new system goes in, so this buys time rather than replacing the decision. If your existing system can be repaired for less than the hire will cost, we'll tell you that instead — it happens more often than you'd think.",
    },
    steps: [
      { title: "Ring us — same day across the corridor", detail: "Pakenham, Officer, Berwick, Beaconsfield, Narre Warren and Cranbourne, usually same day if you ring in the morning." },
      { title: "We diagnose what failed first", detail: "Before anything gets hired. An element, a thermostat or a valve on a young tank is a repair, and hiring a temporary unit to stand next to a fixable system would be us taking your money for nothing." },
      { title: "Somewhere sensible to put it", detail: "It needs a spot and a water and power or gas point to run from. We check that on the same visit rather than turning up with it and improvising." },
      { title: "Connected to the house line", detail: "Plumbed into the existing hot water line where the old unit was, so it feeds every outlet rather than one tap. It's a temporary unit — it does the job, and it isn't pretty." },
      { title: "You decide, at your own pace", detail: "No pressure and no deadline. Ask us for the comparison and you'll get gas and heat pump side by side with the rebate applied, and an honest steer on which suits your house." },
      { title: "Swap day", detail: "New system installed, temporary unit disconnected and loaded up the same day. Set-up and removal fee waived if the replacement is ours." },
    ],
    pricing: [
      { tier: "Temporary hot water · daily hire", price: "$30 / day", includes: "Unit on site, connected to the house hot water line, whole-home supply" },
      { tier: "Set-up and removal", price: "$350", includes: "Delivery, connection, disconnection and collection. WAIVED if we install the replacement." },
    ],
    pricingNote:
      "There's no minimum hire and no lock-in. If the new system goes in three days later, you've paid for three days.",
  },
};

export function systemDetail(serviceSlug: string, systemId: string): SystemDetail | undefined {
  return SYSTEM_DETAIL[`${serviceSlug}/${systemId}`];
}

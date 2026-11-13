/**
 * The teaching half of a /find product page: how each kind of system works,
 * and who it suits. Keyed by system slug so a gas storage tank and a
 * continuous-flow unit, which share an FAQ set, can still explain themselves
 * differently.
 *
 * No figures in here. Sizes, ratings and noise come from the catalogue model
 * on the page; anything said here has to hold for every model of the type.
 */

export type HowStep = { t: string; d: string };
/** "Look elsewhere if…", pointing at the system that answers it. */
export type Alt = { if: string; go: string; label: string };
/** Which drawing explains it (components/homepage/how). */
export type DiagramKind =
  | "split" | "split-heat" | "multi" | "ducted" | "evap" | "gas-ducted" | "zoning"
  | "hp" | "hp-aio" | "hp-co2" | "gas-cf" | "gas-storage";
export type Learn = { how: HowStep[]; good: string[]; alt: Alt[]; title?: string; diagram: DiagramKind };

const SPLIT: Learn = {
  diagram: "split",
  how: [
    { t: "The indoor unit", d: "Sits high on the wall and blows cool or warm air into the room." },
    { t: "The pipes between", d: "Two copper pipes through the wall. Cold refrigerant comes in to the indoor unit along one; the heat it took from the room goes back out to the outdoor unit as hot gas along the other." },
    { t: "The outdoor unit", d: "Moves the heat out of the house in summer, and brings heat in during winter." },
    { t: "Inverter control", d: "It speeds up and slows down rather than switching on and off, so it's quiet and cheap to run." },
  ],
  good: [
    "One room you use most: a bedroom, study or living area",
    "You want heating and cooling from the one unit",
    "You'd rather not open up the ceiling or roof",
    "You want the lowest cost per room",
  ],
  alt: [
    { if: "you want every room evenly comfortable", go: "ducted", label: "Ducted split" },
    { if: "several rooms need their own unit", go: "multi-head", label: "Multi-head" },
  ],
};

export const LEARN: Record<string, Learn> = {
  "split-system": SPLIT,
  // The Dominator: a ducted reverse-cycle unit built for a gas heater's spot.
  // The return-air box and the duct check come from our own quote wording.
  dominator: {
    diagram: "ducted",
    how: [
      { t: "Out with the gas heater", d: "The old gas ducted heater comes out, and the gas to it is capped off." },
      { t: "In the same spot", d: "The Dominator goes where the heater was, on the ducts and vents already in the house." },
      { t: "An outdoor unit", d: "A new outdoor unit does the heating in winter and the cooling in summer." },
      { t: "A new return air box", d: "It moves more air than a gas heater, so we fit a new return air box and grille." },
    ],
    good: [
      "You have gas ducted heating and want to get off gas",
      "The ducts and vents in the roof are in good condition",
      "You want cooling as well as heating, from one system",
    ],
    alt: [
      { if: "the ducts are tired, damaged or too small", go: "reverse-cycle-ducted", label: "Ducted split" },
      { if: "you'd rather stay on gas", go: "gas-ducted-heating", label: "Gas ducted heating" },
    ],
  },
  // Heating runs the same pipes the other way round, so step two says so.
  "reverse-cycle-split": {
    ...SPLIT,
    diagram: "split-heat",
    how: SPLIT.how.map((x, i) => (i === 1 ? { ...x, d: "Two copper pipes through the wall. In winter it runs backwards: hot gas comes in to the indoor unit to warm the room, and goes back out to the outdoor unit cooled." } : x)),
  },
  "multi-head": {
    diagram: "multi",
    how: [
      { t: "One outdoor unit", d: "One box outside runs every indoor unit." },
      { t: "A head in each room", d: "Each room has its own indoor unit and its own remote." },
      { t: "Its own pipe run", d: "Each indoor unit is piped back to the outdoor unit on its own." },
      { t: "Sized for how you live", d: "Sized for the rooms you use at the same time, not every room at once." },
    ],
    good: [
      "Two or more rooms that each want their own control",
      "Not much space outside for several outdoor units",
      "Rooms on different sides of the house",
    ],
    alt: [
      { if: "it's only one room", go: "split-system", label: "Split system" },
      { if: "you'd rather have slim ceiling vents than wall units", go: "ducted", label: "Ducted split" },
    ],
  },
  ducted: {
    diagram: "ducted",
    how: [
      { t: "The outdoor unit", d: "Makes the heating or the cooling." },
      { t: "The unit in the roof", d: "Blows that air through the ducts." },
      { t: "Vents and zones", d: "A vent in each ceiling. Turn each zone on or off from the wall." },
    ],
    good: [
      "Whole-home heating and cooling from one system",
      "Nothing on the walls, just ceiling vents",
      "A roof space with room to work in",
    ],
    alt: [
      { if: "there's no usable roof space", go: "multi-head", label: "Multi-head" },
      { if: "only one or two rooms need it", go: "split-system", label: "Split system" },
    ],
  },
  evaporative: {
    diagram: "evap",
    how: [
      { t: "Water-soaked pads", d: "On the roof, water runs over thick pads." },
      { t: "Air drawn through", d: "A fan pulls outside air through the wet pads, which cools it." },
      { t: "Through the house", d: "Ducts carry the cool, fresh air to each room." },
      { t: "A window open", d: "Leave a window open so the warm air has somewhere to go." },
    ],
    good: [
      "Cooling only, with fresh air all day",
      "Dry summer heat",
      "Running costs matter more than a sealed-up house",
    ],
    alt: [
      { if: "you want heating from it too", go: "ducted", label: "Ducted split" },
      { if: "you'd rather keep the windows shut on humid days", go: "ducted", label: "Ducted split" },
    ],
  },
  "heat-pump": {
    diagram: "hp",
    how: [
      { t: "Heat from the air", d: "A fan pulls outside air over a coil that soaks up its heat, even on a cool day." },
      { t: "Compressed", d: "The compressor squeezes that heat up to a much higher temperature." },
      { t: "Into the tank", d: "The heat goes into the water in the tank, ready for your taps." },
      { t: "Run when power is cheap", d: "Run it off your solar in the day, or on off-peak power." },
    ],
    good: [
      "Replacing an old gas or electric tank, with the VEU rebate",
      "You have solar panels, or plan to",
      "You want to get off gas",
    ],
    alt: [
      { if: "you want to stay on gas and never run out", go: "gas-continuous-flow", label: "Gas continuous flow" },
      { if: "you want a like-for-like gas tank swap", go: "gas-storage", label: "Gas storage" },
    ],
  },
  "gas-continuous-flow": {
    diagram: "gas-cf",
    how: [
      { t: "Turn on a tap", d: "Water starts to flow and the burner lights." },
      { t: "Heated as it passes", d: "The water is heated as it runs through the unit." },
      { t: "No tank to run out", d: "It only heats what you use, so it doesn't run out." },
      { t: "Off when you're done", d: "Turn the tap off and the burner goes out." },
    ],
    good: [
      "Busy households with back-to-back showers",
      "Not much space: it hangs on an outside wall",
      "You want to set the water temperature",
    ],
    alt: [
      { if: "you want to get off gas", go: "heat-pump", label: "Heat pump" },
      { if: "you want the simplest swap for an old tank", go: "gas-storage", label: "Gas storage" },
    ],
  },
  "gas-storage": {
    diagram: "gas-storage",
    how: [
      { t: "An insulated tank", d: "Holds hot water, ready to use." },
      { t: "A burner underneath", d: "A gas flame under the tank keeps the water hot." },
      { t: "Recovery", d: "After a lot of use it refills and heats back up." },
      { t: "A simple swap", d: "A new one usually connects to the same gas, water and flue." },
    ],
    good: [
      "A straight swap for an old gas tank",
      "The lowest upfront cost",
      "Simple, proven and easy to service",
    ],
    alt: [
      { if: "you run out with back-to-back showers", go: "gas-continuous-flow", label: "Gas continuous flow" },
      { if: "you want to get off gas", go: "heat-pump", label: "Heat pump" },
    ],
  },
  "gas-ducted-heating": {
    diagram: "gas-ducted",
    how: [
      { t: "The heater", d: "A gas heater in the roof warms the air." },
      { t: "Ducts and vents", d: "A fan pushes the warm air through ducts to a vent in each room." },
      { t: "Return air", d: "Air comes back through a big grille to be warmed again." },
      { t: "Safety tested", d: "We test for carbon monoxide on every gas heater we fit or service." },
    ],
    good: [
      "Whole-home heating through a Victorian winter",
      "You already have ducts and vents",
      "Fast, even warmth in every room",
    ],
    alt: [
      { if: "you want cooling from the same system", go: "reverse-cycle-ducted", label: "Ducted split" },
      { if: "you want off gas but to keep these ducts", go: "dominator", label: "Braemar Dominator" },
      { if: "only one room needs heating", go: "reverse-cycle-split", label: "Reverse-cycle split" },
    ],
  },
  zoning: {
    diagram: "zoning",
    how: [
      { t: "Dampers in the ducts", d: "A motor in each duct opens or closes that zone." },
      { t: "A controller", d: "Turn zones on and off from the wall controller." },
      { t: "Only the rooms you use", d: "Closed zones get no air, so the open ones get all of it." },
      { t: "On your ducted system", d: "Works with ducted gas heating or ducted reverse-cycle air." },
    ],
    good: [
      "A ducted system heating the whole house when you use half of it",
      "Bedrooms at night, living areas by day",
      "Replacing an old, tired wall controller",
    ],
    alt: [
      { if: "you don't have a ducted system yet", go: "ducted", label: "Ducted split" },
    ],
  },
};

// The ducted split under Heating is the same system as under Cooling.
LEARN["reverse-cycle-ducted"] = {
  ...LEARN.ducted,
  alt: [{ if: "you have gas ducted now and the ducts are sound", go: "dominator", label: "Braemar Dominator" }, ...LEARN.ducted.alt],
};

/**
 * Where one option works differently from the rest of its system, its own
 * "how it works". An all-in-one heat pump and a CO₂ split both make hot
 * water from the air, but one is a single unit and the other is two, and
 * the page about each has to say which.
 */
const ALL_IN_ONE: Pick<Learn, "how" | "title" | "diagram"> = {
  diagram: "hp-aio",
  title: "How an all-in-one heat pump works.",
  how: [
    { t: "One unit", d: "The heat pump sits on top of the tank, all in one." },
    { t: "Heat from the air", d: "A fan pulls outside air over a coil that soaks up its heat, even on a cool day." },
    { t: "Into the water", d: "The compressor heats that up and passes it into the water in the tank." },
    { t: "Run when power is cheap", d: "Run it off your solar in the day, or on off-peak power." },
  ],
};
export const LEARN_TIER: Record<string, Pick<Learn, "how" | "title" | "diagram">> = {
  "heat-pump.essential": ALL_IN_ONE,
  "heat-pump.premium": ALL_IN_ONE,
  "heat-pump.german": ALL_IN_ONE,
  "heat-pump.signature": {
    diagram: "hp-co2",
    title: "How a CO₂ split heat pump works.",
    how: [
      { t: "Two parts", d: "A heat pump outside and a separate tank, joined by water pipes." },
      { t: "CO₂ as the refrigerant", d: "CO₂ keeps making hot water even on frosty mornings." },
      { t: "Heated in one pass", d: "Cold water goes out to the heat pump and comes back hot in one go." },
      { t: "Run when power is cheap", d: "Run it off your solar in the day, or on off-peak power." },
    ],
  },
};

/** The system's own "how it works", with an option's where it differs. */
export const learnFor = (sys: string, tier: string): Learn | undefined => {
  const base = LEARN[sys];
  const own = LEARN_TIER[`${sys}.${tier}`];
  return base && own ? { ...base, ...own } : base;
};

/** The opening paragraph of a system's own page: what it is, in plain words. */
export const SYS_INTRO: Record<string, string> = {
  "split-system": "A split system is an indoor unit on the wall and an outdoor unit outside, joined by two copper pipes. It heats and cools one room, and it's the cheapest way to make one room comfortable all year.",
  "reverse-cycle-split": "A reverse-cycle split is a split system doing the heating. It pulls warmth out of the outside air and brings it into the room, so it heats a room for a fraction of the power a plug-in heater uses, and cools it in summer too.",
  "multi-head": "A multi-head system runs two or more indoor units off one outdoor unit. Each room gets its own head and its own remote, with only one box on the outside wall.",
  ducted: "A ducted split heats and cools the whole house from one unit hidden in the roof. Air comes out of slim vents in the ceiling, and zones let you run only the rooms you're using.",
  "reverse-cycle-ducted": "A ducted split heats the whole house in winter and cools it in summer, from one unit hidden in the roof. It takes its heat from the outside air, so there's no gas, and zones let you run only the rooms you're using.",
  dominator: "The Braemar Dominator is a ducted reverse-cycle system made to go where a gas ducted heater sits now, on the same ducts and vents. The gas comes off, and the house gets heating and cooling from one all-electric system, usually in a day.",
  evaporative: "An evaporative cooler sits on the roof and cools the house with outside air drawn through water-soaked pads. It's the cheapest way to cool a whole home on dry, hot days.",
  "gas-ducted-heating": "Gas ducted heating warms the whole house from one heater, pushing warm air through ducts to a vent in each room. It's quick, even warmth through a Victorian winter.",
  zoning: "Zoning splits a ducted system into areas you can turn on and off, so you heat or cool the rooms you're in instead of the whole house.",
  "heat-pump": "A heat pump hot water system heats water with heat taken from the outside air, using a fraction of the power of an electric tank. The VEU rebate comes off the price at the quote.",
  "gas-continuous-flow": "A gas continuous-flow unit heats water as it runs through, so it never runs out. It hangs on an outside wall and only fires up when a tap is on.",
  "gas-storage": "A gas storage system keeps a tank of water hot with a gas burner, ready when you turn on a tap. It's the simplest, cheapest swap for an old gas tank.",
};

/** The kind of system's strengths and limits, for its own page. Each option's own are in PROS. */
export const SYS_PROS: Record<string, { pros: string[]; cons: string[] }> = {
  "split-system": {
    pros: ["The lowest cost to heat and cool one room", "Heats and cools from the one unit", "Usually installed in half a day", "No roof or ceiling work"],
    cons: ["One room per indoor unit", "An indoor unit on the wall and an outdoor unit outside", "Several rooms means several systems, or a multi-head"],
  },
  "reverse-cycle-split": {
    pros: ["Heats for a fraction of the power of a plug-in heater", "Cools the same room in summer", "No gas connection needed", "Usually installed in half a day"],
    cons: ["Heats one room, not the house", "Warm air comes from high on the wall", "Ordinary models lose some heat on the coldest mornings"],
  },
  "multi-head": {
    pros: ["One outdoor unit for several rooms", "Every room set to its own temperature", "Less clutter on the outside wall"],
    cons: ["If the outdoor unit stops, every room stops", "Each head needs its own pipe run back outside", "A full day's install, sometimes more"],
  },
  ducted: {
    pros: ["Heats and cools the whole home", "Hidden in the roof: only slim vents show", "Zones let you run only the rooms you use"],
    cons: ["Needs a usable roof space", "The biggest upfront cost of our cooling", "Usually two to three days to install"],
  },
  evaporative: {
    pros: ["The cheapest whole-home cooling to run", "Fresh outside air through the house", "Works well through dry summer heat"],
    cons: ["Cooling only, no heating", "Less effective on humid days", "A window or door has to be open", "Best serviced before each summer"],
  },
  "reverse-cycle-ducted": {
    pros: ["Heats in winter and cools in summer", "No gas: heat taken from the outside air", "Hidden in the roof: only slim vents show", "Zones let you heat only the rooms you use"],
    cons: ["Needs a usable roof space", "Costs more upfront than a gas heater", "Usually two to three days to install"],
  },
  dominator: {
    pros: ["Off gas, onto one electric system", "Reuses the ducts and vents you already have", "Heats and cools", "Usually a one-day changeover"],
    cons: ["Only suits ducts that are sound and the right size, so we check them first", "Needs room outside for an outdoor unit", "Costs more upfront than another gas heater"],
  },
  "gas-ducted-heating": {
    pros: ["Fast, even warmth in every room", "Strong on the coldest nights", "Usually reuses the ducts and vents already there"],
    cons: ["Heating only, no cooling", "Stays on gas", "Needs regular servicing and a CO safety test"],
  },
  zoning: {
    pros: ["Cuts what a ducted system costs to run", "Bedrooms at night, living areas by day", "Added to the ducted system you already have"],
    cons: ["Needs a ducted system", "Dampers are fitted in the ducts in the roof"],
  },
  "heat-pump": {
    pros: ["Uses a fraction of the power of an electric tank", "The VEU rebate comes off the price at the quote", "Can run on your solar during the day", "Gets your hot water off gas"],
    cons: ["Costs more upfront than another gas tank", "A fan and compressor that hum quietly outside", "Needs outdoor space with air around it"],
  },
  "gas-continuous-flow": {
    pros: ["Hot water that doesn't run out", "Small and wall-hung, with no tank", "Only uses gas while a tap is on"],
    cons: ["Stays on gas, so no VEU rebate", "Big households may need a bigger gas line", "Needs power to run"],
  },
  "gas-storage": {
    pros: ["The lowest upfront cost", "A like-for-like swap, often the same day", "Simple, proven and easy to service"],
    cons: ["Can run out with back-to-back showers", "Keeps a tank hot all day", "Stays on gas"],
  },
};

/**
 * "Which one?": when we'd recommend each size of an option, and when we'd
 * point someone to a different option altogether. Keyed by "system.tier";
 * `sizes` by the size's label in the size bar. A room-by-room system with no
 * entry for a size reads its rooms from the size question instead.
 *
 * Every reason is one we'd give across the kitchen table, from what the
 * catalogue and the size questions already say. No new figures.
 */
export type Choice = { sizes?: Record<string, string>; instead: { go: string; label: string; when: string }[] };
const SPLIT_CHOOSE: Record<string, Choice> = {
  essential: { instead: [
    { go: "premium", label: "Mitsubishi Electric MSZ-AP", when: "It's for a bedroom and you want it as quiet as it gets, or you want the longest track record we install." },
    { go: "multi-head.essential", label: "A multi-head system", when: "Several rooms need one, and there isn't space outside for an outdoor unit each." },
  ] },
  premium: { instead: [
    { go: "essential", label: "Kaden KSI", when: "Cost decides it, or it's a room you only use now and then." },
    { go: "multi-head.premium", label: "Mitsubishi Electric MXZ multi-head", when: "Several rooms need one, and there's only room outside for one outdoor unit." },
  ] },
};
const rooms = (n: number) => `${n} rooms off the one outdoor unit.`;
/** The PEAD-M's six outputs. The heat load at the site check has the final say. */
const PEAD_SIZES: Record<string, string> = {
  "10 kW": "Smaller homes, around three bedrooms.",
  "12.5 kW": "Three to four-bedroom homes.",
  "14 kW": "Most four-bedroom homes.",
  "16 kW": "Larger homes, or long duct runs.",
  "18 kW": "Five bedrooms or more, or a double-storey.",
  "20 kW · 3-phase": "The biggest homes. Needs three-phase power.",
};
/** What each Brivis output suits. The heat load at the site check has the final say. */
const HEATER_SIZES: Record<string, string> = {
  "15 kW": "Smaller homes and units, or a heater serving part of a house.",
  "20 kW": "Most three and four bedroom homes around here.",
  "26 kW": "Larger family homes, or more rooms on the one heater.",
  "30 kW": "Big homes, two living areas, or long duct runs.",
};

export const CHOOSE: Record<string, Choice> = {
  "dominator.essential": {
    instead: [
      { go: "reverse-cycle-ducted.essential", label: "A new ducted split", when: "The ducts are tired, damaged or too small to reuse, or the house has none." },
      { go: "gas-ducted-heating.4-star", label: "Another gas ducted heater", when: "You'd rather stay on gas, or only need heating." },
    ],
  },
  ...Object.fromEntries(["split-system", "reverse-cycle-split"].flatMap((sys) => Object.entries(SPLIT_CHOOSE).map(([tier, c]) => [
    `${sys}.${tier}`, { ...c, instead: c.instead.map((x) => ({ ...x, go: x.go.includes(".") ? x.go : `${sys}.${x.go}` })) },
  ]))),
  "multi-head.essential": {
    sizes: { "2 heads": "Two rooms, say the main bedroom and the living area.", "4 heads": "Up to four rooms off the one outdoor unit.", "5 heads · 12 kW": "Five rooms in a bigger home.", "6 heads · 18 kW": "Six rooms: most of the house." },
    instead: [
      { go: "multi-head.premium", label: "Mitsubishi Electric MXZ", when: "You want Mitsubishi's quiet and track record, or a mix of wall and floor heads." },
      { go: "ducted.essential", label: "A ducted system", when: "You want every room done with nothing on the walls, and there's room to work in the roof." },
    ],
  },
  "multi-head.premium": {
    sizes: { "2 heads": rooms(2), "3 heads": rooms(3), "4 heads": rooms(4), "5 heads": rooms(5), "6 heads": rooms(6) },
    instead: [
      { go: "multi-head.signature", label: "MXZ with floor consoles", when: "Heating matters most, or there's no good spot high on the wall: a console sits low, under a window." },
      { go: "multi-head.essential", label: "Kaden multi-head", when: "Cost decides it." },
    ],
  },
  "multi-head.signature": {
    sizes: { "Floor console": "A room where heat at floor level matters, or where a unit high on the wall would spoil a feature wall." },
    instead: [{ go: "multi-head.premium", label: "MXZ with wall heads", when: "It's mostly for cooling, or wall space isn't a problem. Wall heads cost less." }],
  },
  "ducted.essential": {
    sizes: { "10 kW": "Smaller homes.", "12.5 kW": "Smaller to mid-size family homes.", "14 kW": "Most family homes.", "17 kW": "Larger homes: the biggest in the Kaden range." },
    instead: [
      { go: "ducted.premium", label: "Mitsubishi Electric PEAD-M", when: "You want zoning as standard, or the home is bigger than the Kaden range covers." },
      { go: "multi-head.essential", label: "A multi-head system", when: "There's no usable roof space." },
    ],
  },
  "ducted.premium": {
    sizes: PEAD_SIZES,
    instead: [
      { go: "ducted.signature", label: "PEAD-M + Mitsubishi zone controller", when: "You want every zone on Mitsubishi Electric's own controller, one brand end to end." },
      { go: "ducted.essential", label: "Kaden KDI", when: "Cost decides it, and the home is within the Kaden range." },
    ],
  },
  "ducted.signature": {
    sizes: PEAD_SIZES,
    instead: [{ go: "ducted.premium", label: "PEAD-M with its standard controller", when: "A simple wall controller is all you want." }],
  },
  "evaporative.essential": {
    sizes: { Classic: "Most homes with a pitched roof, where the look on the roof doesn't matter much." },
    instead: [
      { go: "evaporative.premium", label: "Kaden low-profile", when: "It'll be seen from the street and you want it to sit low on the roof." },
      { go: "ducted.essential", label: "A ducted split", when: "You want heating too, or to keep the windows shut on humid days." },
    ],
  },
  "evaporative.premium": {
    sizes: { "Low-profile": "Where the cooler shows from the street and you want it to sit low." },
    instead: [
      { go: "evaporative.essential", label: "Kaden Classic", when: "Looks don't matter much: it cools the same way for less." },
      { go: "evaporative.signature", label: "Brivis Advance", when: "You'd rather have a Brivis cabinet." },
    ],
  },
  "evaporative.signature": {
    sizes: { Advance: "A low-profile cooler from a long-standing local brand." },
    instead: [{ go: "evaporative.premium", label: "Kaden low-profile", when: "The same low look, from Kaden." }],
  },
  // Every heater comes in the same outputs; the star rating is what changes.
  "gas-ducted-heating.3-star": {
    sizes: HEATER_SIZES,
    instead: [
      { go: "gas-ducted-heating.4-star", label: "Brivis StarPro 4-star", when: "You run the heater most days each winter: it burns less gas doing the same job." },
      { go: "ducted.essential", label: "A ducted split", when: "You want cooling from the same system, or to get off gas." },
    ],
  },
  "gas-ducted-heating.4-star": {
    sizes: HEATER_SIZES,
    instead: [
      { go: "gas-ducted-heating.5-star", label: "Brivis StarPro 5-star", when: "You heat long hours through a cold winter, or you're staying in the house for years." },
      { go: "gas-ducted-heating.3-star", label: "Brivis Classic Wombat 3-star", when: "The house is being sold or rented, or the heater only runs a few weeks a year." },
    ],
  },
  "gas-ducted-heating.5-star": {
    sizes: HEATER_SIZES,
    instead: [
      { go: "gas-ducted-heating.6-star", label: "Brivis StarPro 6-star", when: "The heater runs most of the day: its modulating burner holds the temperature with the least gas." },
      { go: "gas-ducted-heating.4-star", label: "Brivis StarPro 4-star", when: "You heat mornings and evenings rather than all day." },
    ],
  },
  "gas-ducted-heating.6-star": {
    sizes: HEATER_SIZES,
    instead: [
      { go: "gas-ducted-heating.5-star", label: "Brivis StarPro 5-star", when: "The heater doesn't run long enough each day for the modulating burner to pay for itself." },
      { go: "zoning.premium", label: "Add zoning", when: "You only heat part of the house at a time: zones cut the gas whatever the star rating." },
    ],
  },
  "zoning.essential": { instead: [{ go: "zoning.premium", label: "Zonemate Touch + Wi-Fi", when: "You want a touchscreen on the wall and control from your phone." }] },
  "zoning.premium": {
    sizes: { "Touch + Wi-Fi": "Any ducted system you'd like to run from a touchscreen and your phone." },
    instead: [
      { go: "zoning.signature", label: "Milieu smart zone control", when: "You want a schedule for every room." },
      { go: "zoning.essential", label: "Zonemate zone controller", when: "Turning rooms on and off from the wall is all you need." },
    ],
  },
  "zoning.signature": { instead: [{ go: "zoning.premium", label: "Zonemate Touch + Wi-Fi", when: "Touchscreen and phone control without per-room schedules." }] },
  "heat-pump.essential": {
    sizes: {
      "180 L": "One or two people with one bathroom, or an apartment. A smaller tank isn't keeping water hot that nobody uses.",
      "275 L": "Three to five people, or two bathrooms. Enough stored to get through the evening showers when it heats once in the middle of the day.",
    },
    instead: [
      { go: "heat-pump.premium", label: "Reclaim ECO all-in-one", when: "You'd like an Australian-made unit with a longer warranty, in the same single-unit format." },
      { go: "heat-pump.signature", label: "Reclaim CO₂ split", when: "It has to sit near a bedroom, you want the quietest option, or frosty mornings worry you most." },
    ],
  },
  "heat-pump.premium": {
    sizes: {
      "200 L": "One to three people with one bathroom. It fits a tighter spot and isn't heating water you won't use. On solar, it heats around midday and covers a small household's evening.",
      "285 L": "Four or five people, two bathrooms, or showers back to back in the morning. The bigger tank also carries more of the day's solar heat into the night.",
    },
    instead: [
      { go: "heat-pump.signature", label: "Reclaim CO₂ split", when: "It has to go near a bedroom window: the split puts the heat pump away from the tank, so it's quieter where it counts. It also holds its output on frosty mornings, and comes in 315 L and 400 L for bigger households." },
      { go: "heat-pump.essential", label: "iStore all-in-one", when: "The upfront price is what matters most: it's the lowest of our heat pumps." },
    ],
  },
  "heat-pump.german": {
    sizes: {
      "200 L": "Up to four people, by Viessmann's own sizing guide.",
      "270 L": "Up to six people. It's 1830 mm tall, so we check the spot first.",
    },
    instead: [
      { go: "heat-pump.essential", label: "iStore all-in-one", when: "The upfront price matters most, or you want the VEU rebate to go as far as it can." },
      { go: "heat-pump.premium", label: "Reclaim ECO all-in-one", when: "You'd rather have an Australian-made unit." },
      { go: "heat-pump.signature", label: "Reclaim CO₂ split", when: "You want the compressor away from the tank, or a size over 270 L." },
    ],
  },
  "heat-pump.signature": {
    sizes: {
      "160 L": "One or two people.",
      "250 L": "Three or four people, with one or two bathrooms.",
      "315 L": "Four or five people, or long showers back to back.",
      "400 L": "Five or more people, or two bathrooms going at once every morning.",
    },
    instead: [
      { go: "heat-pump.premium", label: "Reclaim ECO all-in-one", when: "There's only room for one unit where the old tank stood, or you'd rather spend less. One unit means less install work." },
      { go: "heat-pump.essential", label: "iStore all-in-one", when: "The lowest price is what matters most." },
    ],
  },
  "gas-continuous-flow.essential": {
    sizes: {
      "16 L/min": "One bathroom, one outlet at a time: a unit or a smaller home.",
      "20 L/min": "One bathroom, with the kitchen or laundry running while someone showers.",
      "26 L/min": "Two bathrooms, with two showers at once.",
      "32 L/min": "Three bathrooms, or several outlets running together.",
    },
    instead: [
      { go: "heat-pump.premium", label: "A heat pump", when: "You'd like off gas and the VEU rebate. On solar it costs very little to run." },
      { go: "gas-storage.essential", label: "A gas storage tank", when: "The lowest upfront price matters most, and you rarely run out." },
    ],
  },
  "gas-continuous-flow.premium": {
    sizes: { "26 L/min": "Two bathrooms, with two showers at once.", "32 L/min": "Three bathrooms, or several outlets running together." },
    instead: [
      { go: "gas-continuous-flow.essential", label: "A standard G-series", when: "One bathroom: a 16 or 20 L/min does the job for less." },
      { go: "heat-pump.premium", label: "A heat pump", when: "You'd like off gas and the VEU rebate." },
    ],
  },
  "gas-storage.essential": {
    sizes: { "135 L": "One to three people, as a straight swap for a tank around the same size.", "170 L": "Three to five people, or a household that runs out with a smaller tank." },
    instead: [
      { go: "gas-continuous-flow.essential", label: "Gas continuous flow", when: "You run out with back-to-back showers. Continuous flow doesn't." },
      { go: "heat-pump.essential", label: "A heat pump", when: "You'd like off gas, with the VEU rebate off the price." },
    ],
  },
};

// The heating menu's ducted split reads the cooling one's advice, pointing
// at its own pages rather than sending people back to Cooling.
for (const [k, c] of Object.entries(CHOOSE)) {
  if (!k.startsWith("ducted.")) continue;
  CHOOSE[`reverse-cycle-${k}`] = { ...c, instead: c.instead.map((x) => ({ ...x, go: x.go.startsWith("ducted.") ? `reverse-cycle-${x.go}` : x.go })) };
}

/** What happens after "Book this install". Every line is a promise the site already makes. */
export const BOOKING_STEPS = (install: string): HowStep[] => [
  { t: "Free site check", d: "We look at the room, the walls and where everything can go, and confirm the size." },
  { t: "Fixed price in writing", d: "One price, with the model, the work and the warranty spelled out." },
  { t: "Install day", d: `How long: ${install.charAt(0).toLowerCase()}${install.slice(1)}. Done by our own crew.` },
  { t: "Handover", d: "The compliance certificate is emailed within 24 hours, and our workmanship is covered for six years." },
];

/**
 * Pros and cons for each option, keyed by "Brand Model" so an option listed
 * under both Cooling and Heating carries one set. Written to be fair to the
 * option, drawn from what the catalogue and the brand records already say:
 * no new figures, and no claim we wouldn't make to someone's face.
 */
export const PROS: Record<string, { pros: string[]; cons: string[] }> = {
  "Kaden KSI wall split": {
    pros: ["The lowest upfront cost of our split systems", "Heats and cools from the one unit", "A Reece brand, so parts are on the shelf locally"],
    cons: ["A shorter track record in Australia than Mitsubishi", "One room per unit: several rooms means several outdoor units"],
  },
  "Mitsubishi Electric MSZ-AP wall split": {
    pros: ["Very quiet on low fan, good for bedrooms", "The lowest failure rate of anything we install", "Parts still available many years on"],
    cons: ["Costs more upfront than the Kaden", "One room per unit: several rooms means several outdoor units"],
  },
  "Kaden Multi-head system": {
    pros: ["One outdoor unit runs several rooms", "Every room gets its own remote", "Costs less than the Mitsubishi multi-head"],
    cons: ["If the outdoor unit stops, every room stops with it", "Each head needs its own pipe run, planned at the site check"],
  },
  "Mitsubishi Electric MXZ multi-head": {
    pros: ["Two to six indoor heads off one outdoor unit", "Mix wall and floor-console heads", "Mitsubishi's reliability and parts support"],
    cons: ["Costs more upfront than the Kaden", "If the outdoor unit stops, every room stops with it"],
  },
  "Mitsubishi Electric MXZ with floor consoles": {
    pros: ["Heat comes in at floor level, where you feel it", "Nothing mounted high on feature walls", "Sits neatly under a window"],
    cons: ["Takes up a little floor space", "Costs more than wall-mounted heads"],
  },
  "Kaden KDI ducted system": {
    pros: ["Heats and cools the whole home", "Hidden in the roof, with slim ceiling vents", "Costs less than the Mitsubishi ducted"],
    cons: ["Needs a usable roof space", "A bigger job: usually two to three days", "The range tops out at 17 kW"],
  },
  "Mitsubishi Electric PEAD-M ducted": {
    pros: ["Zoned as standard", "Heating output matches the cooling", "Mitsubishi's reliability, hidden in the roof"],
    cons: ["Costs more than the Kaden ducted", "Needs a usable roof space", "A bigger job: usually two to three days"],
  },
  "Mitsubishi Electric PEAD-M + zone controller": {
    pros: ["Mitsubishi Electric's own zone control, not a third-party box", "One brand end to end, so one warranty covers the lot", "Run only the rooms you're using"],
    cons: ["The most expensive of our ducted options", "Needs a usable roof space"],
  },
  "Kaden Classic evaporative": {
    pros: ["Cheap to run on dry, hot days", "Fresh air through the house all day", "The lowest upfront cost for whole-home cooling"],
    cons: ["Cooling only, no heating", "Less effective on humid days", "Needs a window or door open to work"],
  },
  "Kaden Low-profile evaporative": {
    pros: ["Sits low and neat on the roofline", "Cheap to run on dry, hot days", "Fresh air through the house"],
    cons: ["Costs more than the Classic for the same cooling", "Cooling only, and less effective on humid days"],
  },
  "Brivis Advance low-profile": {
    pros: ["A low-profile cabinet from a long-standing local brand", "Cheap to run on dry, hot days", "Fresh air through the house"],
    cons: ["Cooling only, no heating", "Less effective on humid days"],
  },
  "Braemar Dominator Series": {
    pros: ["Goes where the gas heater was, on the same ducts", "Heating and cooling from one electric system", "Usually done in a day"],
    cons: ["The ducts have to be sound and sized right to reuse", "Costs more upfront than a gas heater swap"],
  },
  "Brivis Classic Wombat 3-star": {
    pros: ["The lowest upfront cost for gas ducted heating", "Usually a straight swap into the same spot", "CO safety test on every install"],
    cons: ["Uses the most gas of the four", "Heating only, no cooling"],
  },
  "Brivis StarPro 4-star": {
    pros: ["Uses less gas than a 3-star", "Same footprint, so the swap stays simple", "CO safety test on every install"],
    cons: ["Costs more upfront than the 3-star", "Heating only, and still on gas"],
  },
  "Brivis StarPro 5-star": {
    pros: ["Less gas again than the 4-star", "Pays its way in a house heated every day", "CO safety test on every install"],
    cons: ["Costs more upfront than the 4-star", "Heating only, and still on gas"],
  },
  "Brivis StarPro 6-star": {
    pros: ["The most efficient gas ducted heater Brivis builds", "Modulating burner: steadier warmth, less gas", "CO safety test on every install"],
    cons: ["The highest upfront cost of the four", "Only earns it back if the heater runs long hours"],
  },
  "Zonemate Zone controller": {
    pros: ["Turn rooms on and off from the wall", "Fits most ducted systems", "The cheapest way to cut a ducted system's running cost"],
    cons: ["No phone control", "No per-room schedules"],
  },
  "Zonemate Touch + Wi-Fi": {
    pros: ["A touchscreen wall controller", "Control every zone from your phone"],
    cons: ["Costs more than the basic controller", "Phone control needs home Wi-Fi"],
  },
  "Milieu Smart zone control": {
    pros: ["A schedule for every room", "Control from your phone"],
    cons: ["The most expensive zoning option", "Needs home Wi-Fi, and a little setting up"],
  },
  "iStore R290 all-in-one": {
    pros: ["The lowest price of our heat pumps, with the VEU rebate taken off at the quote", "Solar diverter and Wi-Fi built in", "One unit: nothing else to place outside", "5-year warranty on the whole unit"],
    cons: ["The compressor is in the same shell, so it hums near the house", "A shorter warranty than the Reclaim", "Two sizes only: 180 L and 275 L"],
  },
  "Reclaim ECO R290 all-in-one": {
    pros: ["Australian made", "VEU rebate taken off at the quote", "One unit: nothing else to place outside"],
    cons: ["Costs more than the iStore", "The compressor is in the same shell, so it hums near the house"],
  },
  "Viessmann Vitocal 161-A all-in-one": {
    pros: ["A German brand, making heating equipment since 1917", "Hot water down to −7 °C, and −15 °C on its 1.8 kW element", "Rated 43 dB(A), with Wi-Fi and a touch screen", "5 years from Viessmann on parts and labour"],
    cons: ["The compressor is in the same shell, so it hums near the house", "Two sizes only: 200 L and 270 L", "VEU eligibility confirmed at the quote"],
  },
  "Reclaim CO₂ split heat pump": {
    pros: ["The compressor sits away from the tank, so it's quieter", "CO₂ keeps making hot water on cold mornings", "Stainless tank option for harder water"],
    cons: ["The highest upfront cost of our hot water options", "Two units to place, and more install work"],
  },
  "Thermann G-series continuous flow": {
    pros: ["Hot water that doesn't run out", "Same-day swaps on common models", "Compact and wall-hung"],
    cons: ["Stays on gas, so no VEU rebate", "Two showers at once is a job for the high-flow"],
  },
  "Thermann G-series, high-flow": {
    pros: ["Runs two showers at once", "Hot water that doesn't run out"],
    cons: ["Costs more than the standard model", "May need a bigger gas line, checked at the site check"],
  },
  "Thermann 4-star gas storage": {
    pros: ["A like-for-like swap", "Same-day on common sizes", "The lowest upfront cost"],
    cons: ["Can run out with back-to-back showers", "Keeps a tank hot all day, and stays on gas"],
  },
};

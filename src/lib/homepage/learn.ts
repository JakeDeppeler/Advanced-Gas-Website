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
export type Learn = { how: HowStep[]; good: string[]; alt: Alt[] };

const SPLIT: Learn = {
  how: [
    { t: "The indoor unit", d: "Mounted high on the wall, it draws room air across a coil and blows it back cooler, or warmer. It treats the air already in the room rather than bringing outside air in." },
    { t: "The pipes between", d: "Two insulated copper pipes carry refrigerant between the indoor and outdoor units, with a drain for the water it pulls out of the air. Back-to-back on the same wall is the shortest, neatest run." },
    { t: "The outdoor unit", d: "The compressor and fan live outside. In summer it moves the room's heat outdoors; in winter it runs the other way and pulls heat in from the outside air." },
    { t: "Inverter control", d: "Instead of switching hard on and off, an inverter compressor speeds up and slows down to hold the temperature. That is what keeps it quiet and cheap to run once the room is there." },
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
  "reverse-cycle-split": SPLIT,
  "multi-head": {
    how: [
      { t: "One outdoor unit", d: "A single outdoor unit runs two or more indoor heads, so there's one box on the outside wall instead of several." },
      { t: "A head in each room", d: "Every room gets its own indoor unit and its own remote, set to its own temperature." },
      { t: "Its own pipe run", d: "Each head is piped back to the outdoor unit separately, which is why the site check looks closely at where those pipes can go." },
      { t: "Sized for how you live", d: "The outdoor unit is sized for the rooms you run together, not for every head flat out at once." },
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
    how: [
      { t: "A unit in the roof", d: "A fan coil sits out of sight in the roof space and pushes conditioned air through insulated ducts." },
      { t: "Vents in each room", d: "Slim ceiling outlets in each room, and a return-air grille that draws air back to the unit to be treated again." },
      { t: "The outdoor unit", d: "Does the same job as a split's: moves heat out of the house in summer and into it in winter." },
      { t: "Zones", d: "Motorised dampers open and close each zone, so you can run the bedrooms at night and the living areas by day." },
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
    how: [
      { t: "Water-soaked pads", d: "On the roof, water trickles over thick cooling pads." },
      { t: "Air drawn through", d: "A fan pulls outside air through the wet pads. As the water evaporates, the air cools." },
      { t: "Through the house", d: "Ducts carry that cooled, fresh air to the rooms." },
      { t: "A window open", d: "Unlike refrigerated air it needs somewhere to go. Leave a window or door ajar and the hot, stale air is pushed out." },
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
    how: [
      { t: "Heat from the air", d: "A fan draws outside air across a coil of refrigerant, which soaks up heat even on a cool day." },
      { t: "Compressed", d: "The compressor squeezes that refrigerant, which lifts its temperature well above the air it came from." },
      { t: "Into the tank", d: "That heat is passed into the water in an insulated tank, ready when you turn on a tap." },
      { t: "Run when power is cheap", d: "Set it to run in the middle of the day off your solar, or on an off-peak tariff." },
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
    how: [
      { t: "Turn on a tap", d: "Water starts to flow and a sensor in the unit lights the burner." },
      { t: "Heated as it passes", d: "The water runs through a heat exchanger and comes out at the temperature you've set." },
      { t: "No tank to run out", d: "It only heats what you use, so it keeps going as long as the tap is on." },
      { t: "Off when you're done", d: "Turn the tap off and the burner stops. You're not paying to keep a tank hot all day." },
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
    how: [
      { t: "An insulated tank", d: "Holds a set amount of hot water, ready to go." },
      { t: "A burner underneath", d: "When the water cools, a gas burner at the base heats it back up." },
      { t: "Recovery", d: "After a big run the tank refills and reheats. How quickly depends on the burner." },
      { t: "A simple swap", d: "Like for like, it usually reuses the existing gas, water and flue connections." },
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
    how: [
      { t: "The heater", d: "A gas heater sits in the roof, under the floor or outside, and warms air over a heat exchanger." },
      { t: "Ducts and vents", d: "A fan pushes the warm air through ducts to floor or ceiling vents in each room." },
      { t: "Return air", d: "Air comes back through a large grille to be warmed again, so the whole house heats evenly." },
      { t: "Safety tested", d: "Every gas heater we fit or service gets a carbon monoxide test before we leave." },
    ],
    good: [
      "Whole-home heating through a Victorian winter",
      "You already have ducts and vents",
      "Fast, even warmth in every room",
    ],
    alt: [
      { if: "you want cooling from the same system", go: "ducted", label: "Ducted split" },
      { if: "only one room needs heating", go: "reverse-cycle-split", label: "Reverse-cycle split" },
    ],
  },
  zoning: {
    how: [
      { t: "Dampers in the ducts", d: "A motorised damper sits in the ductwork for each zone." },
      { t: "A controller", d: "A wall controller opens and closes them, one zone or several at a time." },
      { t: "Only the rooms you use", d: "Close the zones you're not in and the system puts its effort into the ones you are." },
      { t: "On your ducted system", d: "Added to gas ducted heating or a ducted reverse-cycle system." },
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
  "Mitsubishi Electric MSZ-AP Hyper Heating": {
    pros: ["Holds its full rated heat down to −15°", "Made for the coldest mornings, when ordinary splits fade", "The same quiet MSZ-AP indoor unit"],
    cons: ["Costs more than the standard MSZ-AP", "More than you need where winters are mild"],
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
  "Mitsubishi Electric PEAD-M + Zonemate": {
    pros: ["Touchscreen and phone control of every zone", "Run only the rooms you're using", "Mitsubishi's ducted system underneath"],
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
  "Brivis Classic Wombat 3-star": {
    pros: ["The lowest upfront cost for gas ducted heating", "Usually a straight swap into the same spot", "CO safety test on every install"],
    cons: ["Uses more gas than the 6-star", "Heating only, no cooling"],
  },
  "Brivis StarPro 6-star": {
    pros: ["Uses less gas than a 3-star", "Even warmth through the whole house", "CO safety test on every install"],
    cons: ["Costs more upfront than the 3-star", "Heating only, and still on gas"],
  },
  "Brivis StarPro 6-star + Zonemate": {
    pros: ["Heat only the rooms you're using", "Touchscreen and phone control", "6-star efficiency"],
    cons: ["The most expensive of our gas heating options", "Heating only, and still on gas"],
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
  "iStore 270 L R290 all-in-one": {
    pros: ["VEU rebate taken off at the quote", "Solar diverter and Wi-Fi built in", "One unit: nothing else to place outside"],
    cons: ["The compressor is in the same shell, so it hums near the house", "A shorter cylinder warranty than the Reclaim"],
  },
  "Reclaim ECO R290 all-in-one": {
    pros: ["Australian made", "VEU rebate taken off at the quote", "One unit: nothing else to place outside"],
    cons: ["Costs more than the iStore", "The compressor is in the same shell, so it hums near the house"],
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
  "Reclaim Switch to a heat pump": {
    pros: ["VEU rebate taken off at the quote", "Off gas for hot water", "Cuts hot water energy use by up to 75%"],
    cons: ["Costs more upfront than another gas unit", "Needs outdoor space for the unit"],
  },
  "Thermann 4-star gas storage": {
    pros: ["A like-for-like swap", "Same-day on common sizes", "The lowest upfront cost"],
    cons: ["Can run out with back-to-back showers", "Keeps a tank hot all day, and stays on gas"],
  },
  "Thermann Upgrade to continuous flow": {
    pros: ["Hot water that doesn't run out", "No tank to keep hot", "Frees up the space the tank took"],
    cons: ["Costs more than a like-for-like tank", "May need a bigger gas line, checked at the site check"],
  },
  "iStore Switch to a heat pump": {
    pros: ["VEU rebate taken off at the quote", "Off gas for hot water", "Cuts hot water energy use by up to 75%"],
    cons: ["Costs more upfront than another gas tank", "Needs outdoor space for the unit"],
  },
};

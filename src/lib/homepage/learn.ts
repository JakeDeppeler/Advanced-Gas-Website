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

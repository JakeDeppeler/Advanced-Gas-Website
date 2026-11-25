/**
 * Every free tool, in one place: the /tools hub lists them from here and
 * each tool page picks its own colour, its "what it does" points and its
 * neighbours from here, so the two can't drift apart.
 */
export type ToolGroup = "size" | "cost" | "compare" | "reference";

export type ToolInfo = {
  slug: string;
  title: string;
  /** The question the tool answers, as a customer would ask it. */
  q: string;
  group: ToolGroup;
  /** The category colour it belongs to: cooling blue, heating red, hot water orange. */
  acc: string;
  points: string[];
  cta: string;
  /** A 24-unit line icon (an SVG path) for the tool's card: what it measures, not its colour. */
  icon: string;
};

// Line icons on a 24 grid, stroked, in the homepage's ICON style.
const IC = {
  ruler: "M3 17 17 3l4 4L7 21zM7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2",
  tank: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 9s2 2.2 2 3.7a2 2 0 0 1-4 0C10 11.2 12 9 12 9z",
  rebate: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM8 8h.01",
  saving: "M3 7l6 6 4-4 8 8M21 11v6h-6",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  versus: "M7 3c.7 2.4 3.5 3.8 3.5 7a3.5 3.5 0 0 1-7 0c0-1.4.7-2.5 1.4-3.2 0 1.4.7 2.1 1.4 2.1 0-2.1-.7-3.9.7-5.9zM17 12v9M13.2 14.2l7.6 4.6M20.8 14.2l-7.6 4.6",
  columns: "M4 4h6v16H4zM14 4h6v16h-6zM6.5 8h1M16.5 8h1",
  compare: "M8 3h3v18H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM13 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M13 8h5M6 8h5",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
};

const BLUE = "#1F5FBF";
const RED = "#C83A2B";
const ORANGE = "#C2521A";

export const TOOL_GROUPS: { key: ToolGroup; label: string; blurb: string }[] = [
  { key: "size", label: "Size it right", blurb: "Work out what your home actually needs before anyone quotes you." },
  { key: "cost", label: "What it'll cost", blurb: "Running costs, rebates and payback. Real numbers, not sales maths." },
  { key: "compare", label: "Compare systems", blurb: "Side by side, on the specs that decide it." },
  { key: "reference", label: "Look it up", blurb: "What the error on the screen means." },
];

export const TOOL_LIST: ToolInfo[] = [
  {
    slug: "sizing-calculator", group: "size", acc: BLUE, icon: IC.ruler,
    title: "Aircon sizing calculator", q: "What size aircon does this room need?",
    points: ["The residential heat-load formula our installers use", "Adjusts for ceiling height, orientation, insulation, glazing and people", "A kW range and the next standard model size up"],
    cta: "Size a room",
  },
  {
    slug: "heat-pump-sizing", group: "size", acc: ORANGE, icon: IC.tank,
    title: "Heat pump sizing", q: "What size hot water tank does my home need?",
    points: ["Sizes off what your household actually draws, not a bedroom count", "Works on usable capacity, not the number on the badge", "Tank size, recovery rate and full reheat time"],
    cta: "Size my heat pump",
  },
  {
    slug: "veu-rebate-estimator", group: "cost", acc: ORANGE, icon: IC.rebate,
    title: "VEU rebate calculator", q: "How much rebate can I get?",
    points: ["Every VEU upgrade path, hot water and heating", "Household size and solar taken into account", "The rebate range for your upgrade"],
    cta: "Estimate my rebate",
  },
  {
    slug: "hot-water-savings", group: "cost", acc: ORANGE, icon: IC.saving,
    title: "Hot water savings", q: "How much would a heat pump save me?",
    points: ["Gas storage, continuous flow, electric and solar-boosted", "The rebates off the install cost", "Payback and ten-year savings, once you add your quote"],
    cta: "See my savings",
  },
  {
    slug: "running-cost-calculator", group: "cost", acc: BLUE, icon: IC.bolt,
    title: "Running cost calculator", q: "What will this cost me to run?",
    points: ["Split, multi-head, ducted and heat pump hot water", "Capacity and COP turned into power drawn", "Cost per day, week and year at your rate"],
    cta: "Work out my running cost",
  },
  {
    slug: "heating-comparator", group: "compare", acc: RED, icon: IC.versus,
    title: "Gas vs reverse-cycle", q: "Which heats my home for less?",
    points: ["3 to 6-star gas against an inverter reverse-cycle", "Yearly saving and payback with the rebate", "Ten years of running cost, side by side"],
    cta: "Compare heating costs",
  },
  {
    slug: "system-comparison", group: "compare", acc: BLUE, icon: IC.columns,
    title: "System comparison", q: "Split, multi-head, ducted, gas or evap?",
    points: ["Pick any two to five systems", "Running cost, zoning and lifespan", "Who each one suits, and the brands we fit"],
    cta: "Compare systems",
  },
  {
    slug: "heat-pump-compare", group: "compare", acc: ORANGE, icon: IC.compare,
    title: "Heat pump compare", q: "Reclaim, iStore or Thermann?",
    points: ["The heat pump brands we install, plus Rheem for comparison", "Refrigerant, COP, warranty and size range", "Pros, cons and which we'd pick"],
    cta: "Compare heat pumps",
  },
  {
    slug: "fault-codes", group: "reference", acc: BLUE, icon: IC.alert,
    title: "Fault code lookup", q: "What does the error on my aircon mean?",
    points: ["Every major brand, including ones we don't install", "The likely cause and the first thing to check", "When it's time to call someone"],
    cta: "Look up a code",
  },
];

export const findTool = (slug: string) => TOOL_LIST.find((t) => t.slug === slug);

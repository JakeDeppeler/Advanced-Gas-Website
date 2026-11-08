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
    slug: "sizing-calculator", group: "size", acc: BLUE,
    title: "Aircon sizing calculator", q: "What size aircon does this room need?",
    points: ["The residential heat-load formula our installers use", "Adjusts for ceiling height, orientation, insulation, glazing and people", "A kW range and the closest standard model size"],
    cta: "Size a room",
  },
  {
    slug: "heat-pump-sizing", group: "size", acc: ORANGE,
    title: "Heat pump sizing", q: "What size hot water tank does my home need?",
    points: ["Sizes off what your household actually draws, not a bedroom count", "Works on usable capacity, not the number on the badge", "Tank size, recovery rate and full reheat time"],
    cta: "Size my heat pump",
  },
  {
    slug: "veu-rebate-estimator", group: "cost", acc: ORANGE,
    title: "VEU rebate calculator", q: "How much rebate can I get?",
    points: ["Every VEU upgrade path, hot water and heating", "Household size and solar taken into account", "The rebate range and what you'd pay after it"],
    cta: "Estimate my rebate",
  },
  {
    slug: "hot-water-savings", group: "cost", acc: ORANGE,
    title: "Hot water savings", q: "How much would a heat pump save me?",
    points: ["Gas storage, continuous flow, electric and solar-boosted", "The VEU rebate off the install cost", "Payback in years and ten-year savings"],
    cta: "See my savings",
  },
  {
    slug: "running-cost-calculator", group: "cost", acc: BLUE,
    title: "Running cost calculator", q: "What will this cost me to run?",
    points: ["Split, multi-head, ducted and heat pump hot water", "Capacity and COP turned into power drawn", "Cost per day, week and year at your rate"],
    cta: "Work out my running cost",
  },
  {
    slug: "heating-comparator", group: "compare", acc: RED,
    title: "Gas vs reverse-cycle", q: "Which heats my home for less?",
    points: ["3 to 6-star gas against an inverter reverse-cycle", "Yearly saving and payback with the rebate", "Ten years of running cost, side by side"],
    cta: "Compare heating costs",
  },
  {
    slug: "system-comparison", group: "compare", acc: BLUE,
    title: "System comparison", q: "Split, multi-head, ducted, gas or evap?",
    points: ["Pick any two to five systems", "Install cost, running cost, zoning and lifespan", "Who each one suits, and the brands we fit"],
    cta: "Compare systems",
  },
  {
    slug: "heat-pump-compare", group: "compare", acc: ORANGE,
    title: "Heat pump compare", q: "Reclaim, iStore, Thermann or Rheem?",
    points: ["Every hot water heat pump brand we service", "Refrigerant, COP, warranty and size range", "Pros, cons and which we'd pick"],
    cta: "Compare heat pumps",
  },
  {
    slug: "fault-codes", group: "reference", acc: BLUE,
    title: "Fault code lookup", q: "What does the error on my aircon mean?",
    points: ["Every major brand, including ones we don't install", "The likely cause and the first thing to check", "When it's time to call someone"],
    cta: "Look up a code",
  },
];

export const findTool = (slug: string) => TOOL_LIST.find((t) => t.slug === slug);

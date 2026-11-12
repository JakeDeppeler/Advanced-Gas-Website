import type { CategoryCopy } from "./CategoryPage";

/** What each category page says above its systems. Facts only from what the rest of the site already promises. */
export const CATEGORY_COPY: Record<"air" | "heat" | "hw", CategoryCopy & { title: string; description: string; path: string }> = {
  air: {
    path: "/cooling",
    title: "Air Conditioning Installation, Pakenham & SE Melbourne",
    description: "Split systems, multi-head, ducted and evaporative cooling, installed by our own crew across Melbourne's south-east. Free written quote.",
    h1: "Cooling, sized {to the room}.",
    sub: "Split systems, multi-head, ducted and evaporative, installed by our own crew across Melbourne's south-east.",
    acc: "#1F5FBF",
    tools: ["/tools/sizing-calculator", "/tools/running-cost-calculator"],
    toolsHead: "Not sure {what size}?",
    toolsSub: "Work out the kW your room needs, and what a system would cost to run.",
    reviewWord: /air ?con|split|ducted|cool|mitsubishi|kaden/i,
  },
  heat: {
    path: "/heating",
    title: "Heating Installation, Gas Ducted & Reverse Cycle, Pakenham",
    description: "Gas ducted heating, ducted and split reverse cycle, the Braemar Dominator gas-to-electric swap, and zoning. A carbon monoxide test on every gas job.",
    h1: "Heating for a {Melbourne winter}.",
    sub: "Gas ducted heating, ducted and split reverse cycle, and the Braemar Dominator to take a gas ducted house electric. Every gas job gets a carbon monoxide test.",
    acc: "#C83A2B",
    tools: ["/tools/heating-comparator", "/tools/running-cost-calculator"],
    toolsHead: "Gas or {reverse cycle}?",
    toolsSub: "See which heats your home for less, and what each would cost to run.",
    reviewWord: /heat(?!ing pump| pump)|gas ducted|heater|brivis|warm/i,
  },
  hw: {
    path: "/hot-water",
    title: "Hot Water Systems, Heat Pumps & Gas, Pakenham",
    description: "Heat pump and gas hot water, with the VEU rebate taken off the quote, not claimed back later. Installed by our own crew.",
    h1: "Hot water, {sorted}.",
    sub: "Heat pumps and gas, with the VEU rebate taken off the quote, not claimed back later.",
    acc: "#C2521A",
    tools: ["/tools/veu-rebate-estimator", "/tools/hot-water-savings"],
    toolsHead: "Up to {$2,700 off} a heat pump.",
    toolsSub: "See what the VEU rebate takes off for your home, and what a heat pump would save you a year.",
    reviewWord: /hot water|heat pump|reclaim|thermann|istore|veu/i,
  },
};

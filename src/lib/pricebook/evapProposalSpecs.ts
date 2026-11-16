import { EVAP_UNITS, evapTemplate, type Colour, type EvapUnit } from "./quoteTemplateSpecs";

/**
 * The evaporative cooler proposals, Jake 16 Nov: one per size, Basic =
 * Brivis Advance, Premium = Promina, Premium Plus = Contour, the same size in
 * each; one set per colour, since each option is a template for one unit in
 * one colour. On the office's own "Basic, Premium, Premium Plus" proposal
 * type, as the heat pump and gas heater proposals are. Advance stops at 66
 * (its next size is the 86), so the 76 offers Promina and Contour.
 * Pure, for scripts/check-quote-templates.ts.
 */
export const BASIC_PREMIUM = { typeId: 1813, optionIds: { 1: 1814, 2: 1815, 3: 1816 } as Record<number, number> };

const RANGES: { series: EvapUnit["series"]; model: (size: string) => string }[] = [
  { series: "Advance", model: (s) => `F${s}DS` },
  { series: "Promina", model: (s) => `P${s}` },
  { series: "Contour", model: (s) => `L${s}` },
];
export const EVAP_PROPOSAL_SIZES = ["36", "46", "56", "66", "76"];
const COLOURS: Colour[] = ["Beige", "Charcoal", "Terra Red"];

export type ProposalOption = { order: number; templateCode: string; templateName: string };
export type ProposalSpec = { key: string; name: string; options: ProposalOption[] };

export function evapProposals(): ProposalSpec[] {
  return COLOURS.flatMap((colour) => EVAP_PROPOSAL_SIZES.map((size) => ({
    key: `EVAP-${size}-${colour.replace(/\s+/g, "").toUpperCase()}`,
    name: `EVAP - Brivis Evaporative Cooler ${size} (${colour})`,
    options: RANGES.flatMap((r, i) => {
      const u = EVAP_UNITS.find((x) => x.series === r.series && x.model === r.model(size) && x.colour === colour);
      if (!u) return [];
      const t = evapTemplate(u, 0, 0);
      return [{ order: i + 1, templateCode: t.code, templateName: t.name }];
    }),
  })));
}

import { EVAP_UNITS, REFRIGERANTS, evapTemplate, leakRegasCode } from "./quoteTemplateSpecs";

/**
 * Repair, Replace, Upgrade proposals, Jake 28 Nov: asked how the repair and
 * diagnostic templates should go into proposals, "go with b": one proposal
 * per fault, the repair beside a new unit of the same size and a better one,
 * so the customer chooses on the spot. On ServiceTitan's own "Repair, Replace,
 * Upgrade" proposal type.
 *
 *   - Evaporative coolers: one per fault and size, in Charcoal (the colour on
 *     nearly every evap quote this year; the tech changes the colour on the
 *     job). Replace is the Brivis Advance, Upgrade the Contour, as Basic and
 *     Premium Plus are on the evap proposals; the 76 is replaced by the Advance
 *     F86DS, the Advance isn't made in a 76 (Jake, 16 Nov).
 *   - Split systems: the faults worth weighing against a new system (the
 *     capacitor, a leak and regas, the condensate pump), one per size,
 *     Replace a Kaden and Upgrade a Mitsubishi Electric, back to back, the
 *     install the tech changes on the job if it's another.
 * A template is named by the code it was made under (quoteTemplatesAdd.ts) or,
 * for one the office made, by its name. Pure, for scripts/check-quote-templates.ts.
 */
export const REPAIR_REPLACE_UPGRADE = { typeId: 1805, optionIds: { 1: 1806, 2: 1807, 3: 1808 } as Record<number, number> };

export type TemplateRef = { code: string } | { name: string };
/** `was`: a proposal made under another key before the spec changed, to be brought up to this one rather than made again. */
export type RepairProposalSpec = { key: string; name: string; options: { order: number; ref: TemplateRef; label: string }[]; was?: string };

export const EVAP_FAULTS = [
  { code: "EVAP-REP-PUMP", label: "Water Pump" },
  { code: "EVAP-REP-FANMOTOR", label: "Fan Motor" },
  { code: "EVAP-REP-CONTROLBOARD", label: "Control Board" },
  { code: "EVAP-REP-DUMPVALVE-BRIVIS", label: "Dump Valve & Drive Motor" },
  { code: "EVAP-REP-DUMPVALVE", label: "Dump Valve & Service" },
  { code: "EVAP-REP-FLOATVALVE", label: "Float Valve" },
  { code: "EVAP-REP-WATERSENSOR", label: "Water Level Sensor" },
  { code: "EVAP-REP-SOLENOID", label: "Solenoid Valve" },
  { code: "EVAP-REP-CONTROLLER", label: "Wall Controller" },
  { code: "EVAP-REP-FANBELT", label: "Fan Belt" },
] as const;
export const EVAP_REPAIR_SIZES = ["36", "46", "56", "66", "76"] as const;

/**
 * The leak and regas by gas, each size on its own template (Jake, 28 Nov: "the
 * split leak & regas should be off r32 and r410A"). The R410A proposals take
 * over the four made on the one-size template before.
 */
export const SPLIT_FAULTS: { key: string; label: string; repair: (size: string) => string; was?: (size: string) => string }[] = [
  { key: "AC-SPLIT-REP-CAPACITOR", label: "Capacitor", repair: () => "AC-SPLIT-REP-CAPACITOR" },
  ...REFRIGERANTS.map((g) => ({
    key: `AC-SPLIT-LEAK-REGAS-${g.gas}`, label: `Leak Detection & Regas ${g.gas}`, repair: (size: string) => leakRegasCode(g.gas, size),
    ...(g.gas === "R410A" ? { was: (size: string) => `AC-SPLIT-LEAK-REGAS-${size}` } : {}),
  })),
  { key: "AC-SPLIT-REP-CONDPUMP", label: "Condensate Pump", repair: () => "AC-SPLIT-REP-CONDPUMP" },
];
export const SPLIT_REPAIR_SIZES = ["2.5", "3.5", "5", "7.1"] as const;

const evapCode = (series: "Advance" | "Contour", size: string) => {
  const model = series === "Advance" ? (size === "76" ? "F86DS" : `F${size}DS`) : `L${size}`;
  const u = EVAP_UNITS.find((x) => x.series === series && x.model === model && x.colour === "Charcoal");
  return u ? evapTemplate(u, 0, 0).code : null;
};

export function repairProposals(): RepairProposalSpec[] {
  const evap = EVAP_FAULTS.flatMap((f) => EVAP_REPAIR_SIZES.flatMap((size): RepairProposalSpec[] => {
    const replace = evapCode("Advance", size), upgrade = evapCode("Contour", size);
    if (!replace || !upgrade) return [];
    return [{
      key: `${f.code}-${size}`,
      name: `EVAP REPAIR - ${f.label} - ${size} (Charcoal)`,
      options: [
        { order: 1, ref: { code: f.code }, label: "Repair" },
        { order: 2, ref: { code: replace }, label: "Replace" },
        { order: 3, ref: { code: upgrade }, label: "Upgrade" },
      ],
    }];
  }));
  const split = SPLIT_FAULTS.flatMap((f) => SPLIT_REPAIR_SIZES.map((size): RepairProposalSpec => ({
    key: `${f.key}-${size}`,
    name: `SPLIT REPAIR - ${f.label} - ${size}kW`,
    ...(f.was ? { was: f.was(size) } : {}),
    options: [
      { order: 1, ref: { code: f.repair(size) }, label: "Repair" },
      { order: 2, ref: { name: `Kaden ${size}kW Split System - Back to Back` }, label: "Replace" },
      { order: 3, ref: { name: `Mitsubishi Electric ${size}kW Split System - Back to Back` }, label: "Upgrade" },
    ],
  })));
  return [...evap, ...split];
}

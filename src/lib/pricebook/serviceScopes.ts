/**
 * The service and maintenance items' wording, as Jake approved it on 19 Nov:
 * "written like we haven't completed or completed the works so we can send it
 * in a quote or an invoice and people can't tell". So no tense anywhere: what
 * the service is and what it covers, grouped by part of the system, each item
 * a short check or clean ("Return air filter clean"), never "cleaned" or
 * "we will clean".
 *
 * Pure: serviceWording.ts writes it to ServiceTitan, scripts/check-service-
 * wording.ts holds it to that rule.
 */

export type ScopeSection = { heading: string; bullets?: string[]; text?: string };
export type ServiceScope = { name: string; skuId?: number; code?: string; intro: string[]; sections: ScopeSection[] };

const REPORT = (what: string): ScopeSection => ({
  heading: "Service report",
  text: `A written report on the ${what}'s condition, any concerns found, and recommended maintenance or repairs.`,
});

const SPLIT_SECTIONS: ScopeSection[] = [
  { heading: "Indoor unit", bullets: ["Overall condition check", "Return air filter clean (where accessible)", "Coil and fan inspection for dust and debris build-up", "Condensate drain check"] },
  { heading: "Outdoor unit", bullets: ["Condenser coil inspection and fan operation check", "Refrigerant pipework insulation and condition check", "Mounting brackets and installation check"] },
  {
    heading: "Operation and safety",
    bullets: ["Heating and cooling mode test", "Remote control and thermostat check", "Electrical connections and controls inspection", "Operating pressures and temperatures, where required", "Airflow and performance test", "Noise and vibration check"],
  },
];
const SPLIT_NOT_INCLUDED: ScopeSection = {
  heading: "Not included",
  text: "Deep cleaning of the indoor coil, fan barrel or outdoor condenser coil. Where heavy dust, mould or debris is found, a deep clean can be recommended and quoted separately.",
};

const EVAP_SECTIONS: ScopeSection[] = [
  {
    heading: "Water system",
    bullets: [
      "Water tank drain and clean, with sludge and debris removed",
      "Cooling pads and pad frames clean, and pad condition check",
      "Water distribution and feed lines clean and check",
      "Pump operation check and pump strainer clean",
      "Float or solenoid valve and water level check",
      "Drain or dump valve check",
    ],
  },
  {
    heading: "Fan and cabinet",
    bullets: ["Cabinet, roof mounting and weather seals inspection", "Fan, motor and bearings inspection", "Drive belt tension and condition check (belt-drive units)", "Roof penetration and ducting connection inspection"],
  },
  { heading: "Operation and safety", bullets: ["Electrical connections and controls inspection", "Wall controller check in cooling and fan-only modes", "Airflow and performance test at the outlets", "Water leak, noise and vibration check"] },
  REPORT("cooler"),
  { heading: "Not included", text: "Replacement pads, pumps, valves and other parts, which are quoted separately where needed." },
];

export const SERVICE_SCOPES: ServiceScope[] = [
  {
    name: "Split System - Clean & Service",
    skuId: 148186510,
    intro: ["Standard maintenance and operational service of the split system."],
    sections: [...SPLIT_SECTIONS, REPORT("system"), SPLIT_NOT_INCLUDED],
  },
  {
    name: "Split System - Clean & Service (2 or More Splits, Each)",
    code: "AC-SPLIT-SVC-MULTI",
    intro: ["Per split, when two or more split systems are serviced at the same home.", "Standard maintenance and operational service of the split system."],
    sections: [...SPLIT_SECTIONS, REPORT("system"), SPLIT_NOT_INCLUDED],
  },
  {
    // The standard list as well, so the line stands on its own on an invoice
    // without the Clean & Service beside it.
    name: "Split System - Deep Clean",
    skuId: 209601256,
    intro: ["Deep clean and operational service of the split system: the standard service, plus a deep clean."],
    sections: [
      ...SPLIT_SECTIONS,
      {
        heading: "Deep clean",
        bullets: ["Indoor coil deep clean with a coil cleaning treatment", "Fan barrel clean to remove dust, mould and debris", "Condensate tray clean and drain line flush", "Outdoor condenser coil clean", "Indoor unit covers and louvres clean"],
      },
      REPORT("system"),
    ],
  },
  {
    name: "Evaporative Cooler – Maintenance (Single Storey)",
    skuId: 301220633,
    intro: ["Standard maintenance and operational service of the evaporative cooler."],
    sections: EVAP_SECTIONS,
  },
  {
    name: "Evaporative Cooler – Maintenance (Double Storey)",
    skuId: 301220979,
    intro: ["Standard maintenance and operational service of the evaporative cooler.", "Includes roof access on a double-storey home, with the height safety equipment it needs."],
    sections: EVAP_SECTIONS,
  },
  {
    name: "Gas Ducted Heater - General Maintenance",
    skuId: 148186656,
    intro: ["Standard maintenance and operational service of the gas ducted heater."],
    sections: [
      {
        heading: "Burners and gas",
        bullets: ["Burner and burner compartment inspection and clean", "Ignition and flame sensing check", "Gas pressure check and burner adjustment to the manufacturer's specifications", "Gas leak check at the heater connection"],
      },
      {
        heading: "Safety",
        bullets: ["Heat exchanger inspection for cracks, corrosion or overheating", "Carbon monoxide spillage test, where applicable to the heater type", "Flue and flue terminal clearance inspection", "Electrical connections and safety controls inspection"],
      },
      {
        heading: "Air and operation",
        bullets: [
          "Return air filter clean or replacement (where fitted)",
          "Fan, fan motor and fan wheel check",
          "Ducting connections at the heater and return air inspection",
          "Thermostat and wall controller check",
          "Full heating cycle test, with airflow checked at the outlets",
          "Noise and vibration check",
        ],
      },
      REPORT("heater"),
      { heading: "Not included", text: "Duct cleaning, repairs to damaged ducting and replacement parts, which are quoted separately where needed." },
    ],
  },
];

const lines = (s: ScopeSection) => [s.heading, ...(s.bullets ? s.bullets.map((b) => `• ${b}`) : [s.text ?? ""])];

/** As text: a paragraph each, a section's lines one to a line. */
export const scopeText = (s: ServiceScope) => [...s.intro, ...s.sections.map((x) => lines(x).join("\n"))].join("\n\n");

/** As compared with what ServiceTitan holds: one line each (plainText's reading of the HTML). */
export const scopeFlat = (s: ServiceScope) => [...s.intro, ...s.sections.flatMap(lines)].join("\n");

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** As ServiceTitan stores it: a paragraph each, the heading bold, its lines broken. */
export const scopeHtml = (s: ServiceScope) =>
  [...s.intro.map((p) => `<p>${esc(p)}</p>`), ...s.sections.map((x) => `<p><strong>${esc(x.heading)}</strong><br>${lines(x).slice(1).map(esc).join("<br>")}</p>`)].join("");

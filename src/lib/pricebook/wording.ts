/**
 * The words on a quote: every template summary and every service description,
 * written from one place so they read the same.
 *
 * Jake, 17 Nov: the summary is the job — "what we are doing, what we are
 * removing, what it covers" — and the equipment line sells the unit (how it
 * saves money, its key features, why it beats the model below it, the
 * warranty; equipmentCopy.ts). So every install summary runs in four labelled
 * parts, the same four on every quote, and names the unit without selling it.
 *
 * What's included is what's on the template: the pipe length from the coils
 * on it, the base box and flashing where they're listed, the condensate pump
 * where there is one. Nothing here is a product claim.
 */

export type Kind =
  | "split" | "multi" | "ducted" | "dominator" | "heatpump" | "hpsplit" | "gasstorage" | "elecstorage" | "cf"
  | "heater" | "cooktop" | "evap" | "rac";

export type TemplateFacts = {
  name: string;
  kind: Kind;
  brand: string;
  /** e.g. "3.5kW", "315L", "15kW" */
  size: string | null;
  /** The unit as the summary names it, where brand and size don't ("Brivis Promina P46 in Charcoal"). */
  unit?: string;
  /** Split placement, from the install line. */
  placement?: "btb" | "rtw" | "rtr";
  /** Metres of copper on the template (each Ardent pair coil is 20 m); null when it carries none. */
  pipeM?: number | null;
  /** Multi-head: indoor heads on it, a labour line for them, a condensate pump. */
  heads?: number;
  labourLine?: boolean;
  pump?: boolean;
  /** Heat pump: hard-wired or plug-in. */
  wired?: "elec" | "plug";
  heater?: "internal" | "external";
  /** An external heater's base box and flashing, when the template carries them. */
  baseBox?: boolean;
  /** Cooktop: the appliance regulator and gas cock on the template. */
  regulator?: boolean;
  /** New gas feed on a continuous flow. */
  newGasFeed?: boolean;
};

/** The four parts, in order, labelled the same on every quote. */
export const LABELS = { doing: "What we're doing:", removing: "What we're removing:", included: "What's included:", excluded: "What's not included:" } as const;

const ROOM: Record<string, string> = {
  "2.5": "a bedroom or study", "2.6": "a bedroom or study", "3.5": "a large bedroom or a smaller living area",
  "5": "a living area", "6": "a larger living area", "7.1": "a large open-plan living area", "7": "a large open-plan living area",
};

const sentence = (s: string) => s.trim().replace(/\s+/g, " ");
const ELECTRICIAN = "with a licensed electrician for the power";
const OLD_HOT_WATER = "Your old hot water system, drained, disconnected and taken away for disposal.";

/** The summary for a template: what we're doing, removing, including and not. */
export function templateSummary(f: TemplateFacts): string {
  const kw = f.size?.replace(/kw$/i, "") ?? "";
  let doing = "", removing = "", included = "", excluded = "";
  switch (f.kind) {
    case "split": {
      const where = {
        btb: "The outdoor unit goes on a bracket on the outside wall directly behind the indoor unit, so the pipework runs straight through the wall: the neatest install there is, with nothing in the roof space.",
        rtw: "The outdoor unit goes on a bracket on another outside wall, with the pipework and drain run out of sight through the roof space.",
        rtr: "The outdoor unit goes on a bracket on the roof, fixed and sealed to keep the roof watertight, with the pipework and drain run out of sight through the roof space.",
      }[f.placement ?? "btb"];
      const pipe = f.pipeM ? `up to ${f.pipeM} m of Ardent copper pipework` : "a standard run of Ardent copper pipework";
      doing = `Supplying and installing your new ${f.brand} ${f.size} split system${ROOM[kw] ? `, sized for ${ROOM[kw]}` : ""}. ${where} Our own licensed technicians do the install, ${ELECTRICIAN}. The system is pressure-tested and vacuumed before it's first run, so it starts clean, dry and leak-free, and we show you how to use it before we leave.`;
      removing = "Your old split system, if we're replacing one: the refrigerant is recovered by a licensed technician, and the indoor and outdoor units are taken down and disposed of.";
      included = `The indoor and outdoor units, the Rodigas ${f.placement === "rtr" ? "roof bracket and a roof seal where the pipework goes through" : "wall bracket"}, ${pipe}, the drain, Colorbond capping over the pipework outside, sealed wall penetrations, a dedicated circuit and breaker at your switchboard with an isolator at the outdoor unit and a Certificate of Electrical Safety, commissioning, a clean-up, and a compliance certificate on completion.`;
      excluded = `Switchboard upgrades, a condensate pump where the drain can't fall naturally, pipework beyond ${f.pipeM ? `the ${f.pipeM} m included` : "a standard run"} and non-standard access are quoted separately.`;
      break;
    }
    case "multi":
      doing = `Supplying and installing your new ${f.brand} ${f.size} multi-head split system: one outdoor unit running ${f.heads ? `${f.heads} indoor heads` : "an indoor head in each room"}, each with its own controller, so every room runs on its own. Our own licensed technicians do the install, ${ELECTRICIAN}. Each head gets its own Ardent copper run and drain, the whole system is pressure-tested and vacuumed before it's first run, and we show you how to use each controller before we leave.`;
      removing = "Any old split systems in those rooms, if we're replacing them: the refrigerant is recovered by a licensed technician, and the units are taken down and disposed of.";
      included = `The outdoor unit and the indoor heads listed, a Rodigas wall bracket for the outdoor unit, Ardent copper pipework and a drain to each head${f.pump ? ", a condensate pump where a head's drain can't fall naturally" : ""}, Colorbond capping over the pipework outside, sealed wall penetrations, a new RCBO and dedicated circuit at your switchboard with an isolator and control cabling to each head, a Certificate of Electrical Safety, commissioning, and a compliance certificate on completion.${f.labourLine ? " The installation labour is its own line, for the number of heads being fitted." : ""} Rebates are shown on their own lines.`;
      excluded = "Switchboard upgrades, pipework beyond a standard run to each head and non-standard access are quoted separately.";
      break;
    case "ducted":
      doing = `Supplying and installing your new ${f.brand} ${f.size} ducted reverse-cycle system with all-new ductwork. The indoor unit sits out of sight in the roof space with an outlet in each room, and the house is zoned so you run only the areas you're using, from the wall controller or your phone. Our own licensed technicians do the install, ${ELECTRICIAN}. Every run is new Bradflo R1.5 insulated duct sized for the room it feeds, the pipework is pressure-tested and vacuumed, every outlet is balanced, and we walk you through the controller and app before we leave.`;
      removing = "Your old ducted system and its ductwork, where there is one, taken out of the roof space and disposed of.";
      included = "The indoor and outdoor units, new Bradflo R1.5 insulated ductwork to an outlet in each room, the return air, the zone dampers, the Zonemate Touch controller with wifi, the refrigeration pipework and drainage, a new RCBO and dedicated circuit at your switchboard with an isolator and the controller wiring, a Certificate of Electrical Safety, commissioning, airflow balancing at every outlet, and a compliance certificate on completion.";
      excluded = "Switchboard upgrades are quoted separately.";
      break;
    case "dominator":
      doing = `Replacing your ducted gas heater with a Braemar Dominator ducted reverse-cycle system, for heating and cooling from one system through your existing ductwork. The indoor unit goes in where your gas heater was and the outdoor unit on a wall bracket outside, usually in a single day. Our own licensed technicians do the install, ${ELECTRICIAN}. We check the ducting in the roof before we commit to reusing it, fit a new return air box and filter, and commission and test the system before handover.`;
      removing = "Your old gas heater, disconnected, decommissioned and taken away. Removing it is what makes the job eligible for the Victorian Energy Upgrades discount shown on its own line.";
      included = "The Dominator indoor and outdoor units, connection to your existing ductwork with new Bradflo insulated duct where it's needed, a new return air box and filter, a Rodigas wall bracket for the outdoor unit, Ardent copper pipework and drainage, the electrical work (the old unit disconnected and made safe, a new RCBO and dedicated circuit where needed, power and control cabling, an isolator and a Certificate of Electrical Safety), commissioning, and a compliance certificate on completion.";
      excluded = "This is quoted on your existing ductwork being serviceable: if it isn't, we'll tell you before any work starts. Switchboard upgrades are quoted separately.";
      break;
    case "heatpump":
      doing = `Replacing your hot water system with your new ${f.brand} ${f.size ?? ""} heat pump, installed in the same location. Our own licensed plumbers do the install${f.wired === "plug" ? "" : `, ${ELECTRICIAN}`}. The unit sits on a concrete base and is plumbed in Kembla copper with a Tomson tempering valve and fire-rated pipe insulation, then commissioned and tested before we hand it over. We handle the rebate paperwork for you.`;
      removing = OLD_HOT_WATER;
      included = `The heat pump, a concrete base, all plumbing to your existing water connections with a Tomson tempering valve, drainage, ${f.wired === "plug" ? "connection to an existing power point within reach (it plugs in, so there's no electrical work)" : "a new dedicated circuit at your switchboard with a Certificate of Electrical Safety"}, commissioning, and a compliance certificate on completion. Rebates are shown on their own lines.`;
      excluded = f.wired === "plug"
        ? "A new power point, if there isn't one within reach, and moving the system to a new location are quoted separately."
        : "Switchboard upgrades and moving the system to a new location are quoted separately.";
      break;
    case "hpsplit":
      doing = `Replacing your hot water system with your new ${f.brand} ${f.size ?? ""} split heat pump. The tank goes in place of your old system and the heat pump unit is mounted nearby, where it runs best and stays out of the way. Our own licensed plumbers do the install, ${ELECTRICIAN}. We use Kembla copper, a Tomson tempering valve and fire-rated pipe insulation, sit the tank on a concrete base, and commission and test everything before we hand it over. We handle the rebate paperwork for you.`;
      removing = OLD_HOT_WATER;
      included = "The tank and the heat pump unit, a concrete base, a wall bracket for the heat pump unit, all plumbing between the tank and the heat pump and to your existing water connections, a Tomson tempering valve, drainage, a new dedicated circuit at your switchboard with a Certificate of Electrical Safety, commissioning, and a compliance certificate on completion. Rebates are shown on their own lines.";
      excluded = "Switchboard upgrades and moving the system to a new location are quoted separately.";
      break;
    case "gasstorage":
      doing = `Replacing your hot water system with your new ${f.brand} ${f.size ?? ""} gas storage system, in the same location. Our own licensed plumbers and gas fitters connect it to your existing gas and water in Kembla copper with a Tomson tempering valve and fire-rated pipe insulation. Every gas connection is pressure-tested, and the system is commissioned and checked burning safely before handover.`;
      removing = OLD_HOT_WATER;
      included = "The new system, connection to your existing gas and water, a Tomson tempering valve and a Tomson duo valve (isolation and non-return), all fittings, a gas pressure test, commissioning, and a compliance certificate on completion.";
      excluded = "Moving the system to a new location and upgrading the gas line are quoted separately.";
      break;
    case "elecstorage":
      doing = `Replacing your hot water system with your new ${f.unit ?? `${f.brand} ${f.size ?? ""} electric storage system`}, in the same location. Our own licensed plumbers connect it to your existing water and power in Kembla copper with a Tomson valve kit and fire-rated pipe insulation, on a concrete base, then commission and test it before handover.`;
      removing = OLD_HOT_WATER;
      included = "The new system, a concrete base, connection to your existing water and power, a Tomson valve kit, all fittings, commissioning, and a compliance certificate on completion.";
      excluded = "Moving the system to a new location, a new circuit and switchboard upgrades are quoted separately.";
      break;
    case "cf":
      doing = `Supplying and installing your new ${f.unit ?? f.brand} continuous flow hot water system${f.newGasFeed ? ", in place of your gas storage system, with a new gas feed sized for the new unit" : ""}. Our own licensed gas fitters mount it and connect it to your gas and water in Kembla copper with press-fit gas fittings and fire-rated pipe insulation. Every gas connection is pressure-tested, and the system is commissioned and checked burning safely before handover.`;
      removing = OLD_HOT_WATER;
      included = `The new unit, a Zetco connection kit with its valves, connection to your gas and water${f.newGasFeed ? ", a new gas feed sized for the unit" : ""}, all fittings, a gas pressure test, commissioning, and a compliance certificate on completion.`;
      excluded = `${f.newGasFeed ? "" : "If your gas supply needs upsizing for the new unit, that's quoted separately. "}A new power point, if one's needed, is quoted separately.`;
      break;
    case "heater": {
      const what = f.heater === "internal" ? "internal heater, in the same place as your old one" : f.heater === "external" ? "external heater, in a weatherproof cabinet outside so it takes up no room inside" : "ducted gas heater";
      doing = `Replacing your ducted gas heater with your new ${f.brand} ${f.size ?? ""} ${what}, connected to your existing ductwork. Our own licensed gas fitters do the install: the heater is connected to your ductwork and gas${f.heater === "external" ? "" : " and flue"}, a new wall controller is fitted, every gas connection is pressure-tested, a carbon monoxide safety check is done, and it's commissioned and tested before handover.`;
      removing = "Your old heater, disconnected from the gas and power, taken out and disposed of.";
      included = `The new heater${f.baseBox ? " on a new base box with its flashing" : ""}, connection to your existing ductwork and gas${f.heater === "external" ? "" : " and flue"}, a new wall controller, a gas pressure test, a carbon monoxide safety check, commissioning, and a compliance certificate on completion.`;
      excluded = "If the gas line, flue or ductwork needs upgrading or repair to suit the new heater, that's quoted separately.";
      break;
    }
    case "evap":
      doing = `Replacing your evaporative cooler with ${f.unit ? `your new ${f.unit}` : "a new evaporative cooler"}, on your existing roof dropper and ducting. Our own licensed technicians do the install: the new cooler is connected to your water, power and controller and to a new drain, the roof penetration is resealed and weatherproofed, and the cooler is run and tested before we leave.`;
      removing = "Your old cooler, disconnected, lifted off the roof and disposed of.";
      included = "The new cooler, connection to your existing roof dropper, ducting, water, power and controller, a new drain, the roof penetration resealed and weatherproofed, a full operational test, and a compliance certificate on completion.";
      excluded = "Replacing the roof dropper or ductwork, and electrical work if your existing cooler is hard-wired, are quoted separately.";
      break;
    case "rac":
      doing = `Replacing your wall air conditioner with your new ${f.unit ?? f.brand}, in the same opening. Our own licensed technicians fit it, seal it into the opening and test it before we leave.`;
      removing = "Your old wall air conditioner, taken out and disposed of.";
      included = "The new unit fitted and sealed into the existing opening, a full operational test, and a compliance certificate on completion.";
      excluded = "Altering the opening to suit the new unit and any electrical work are quoted separately.";
      break;
    case "cooktop":
      doing = `Supplying and installing your new ${f.unit ?? f.brand} gas cooktop into your existing benchtop cut-out. Our own licensed gas fitters connect it to your existing gas point with an approved connection, pressure-test it, and check every burner lights and burns correctly.`;
      removing = "Your old cooktop, disconnected and taken away.";
      included = `The new cooktop, ${f.regulator ? "an appliance regulator and gas isolation valve, " : ""}the gas connection, a gas pressure test, and a compliance certificate on completion.`;
      excluded = "Benchtop changes for a different size, gas line alterations and electrical work are quoted separately.";
      break;
  }
  return [[LABELS.doing, doing], [LABELS.removing, removing], [LABELS.included, included], [LABELS.excluded, excluded]]
    .map(([label, text]) => sentence(`${label} ${text}`)).join("\n\n");
}

/**
 * Service descriptions, by ServiceTitan code, in the same voice. A code that
 * isn't here keeps its description.
 */
export const SERVICE_COPY: Record<string, string> = {
  // Split installs: what the job is, where the outdoor unit goes, what's in it.
  "AC-SPLIT-BTB": "Installation of your new split system with the outdoor unit directly behind the indoor head: wall bracket, core hole, Ardent copper pipework, drain, pressure test, vacuum, commissioning and a walk-through. Includes removal of your old system where we're replacing one. The materials and the electrical connection are listed under this line.",
  "AC-SPLIT-RTW": "Installation of your new split system with the outdoor unit on a wall bracket on another wall, and the pipework and drain run out of sight through the roof space: Ardent copper pipework, Colorbond capping outside, sealed penetrations, pressure test, vacuum, commissioning and a walk-through. Includes removal of your old system where we're replacing one. The materials and the electrical connection are listed under this line.",
  "AC-SPLIT-RTR": "Installation of your new split system with the outdoor unit on a roof bracket, fixed and flashed to keep the roof weathertight, and the pipework and drain run through the roof space: Ardent copper pipework, sealed penetrations, pressure test, vacuum, commissioning and a walk-through. Includes removal of your old system where we're replacing one. The materials and the electrical connection are listed under this line.",
  "AC-SPLIT-MULTI": "Installation of your new multi-head system: mounting the outdoor unit and every indoor head, an Ardent copper run and drain to each head, Colorbond capping outside, sealed penetrations, pressure test, vacuum, commissioning and a walk-through of each controller. The materials and the electrical connection are listed under this line; the installation labour is its own line, for the number of heads being fitted.",
  "AC-SPLIT-MULTI-2": "Installation labour for a 2-head system: two technicians, 5 hours, to mount the heads and the outdoor unit, run and connect the pipework and drains, test, vacuum and commission.",
  "AC-SPLIT-MULTI-3": "Installation labour for a 3-head system: two technicians, 7 hours, to mount the heads and the outdoor unit, run and connect the pipework and drains, test, vacuum and commission.",
  "AC-SPLIT-MULTI-4": "Installation labour for a 4-head system: two technicians, 8 hours, to mount the heads and the outdoor unit, run and connect the pipework and drains, test, vacuum and commission.",
  "AC-SPLIT-MULTI-5": "Installation labour for a 5-head system: two technicians, 12 hours, to mount the heads and the outdoor unit, run and connect the pipework and drains, test, vacuum and commission.",
  "AC-SPLIT-MULTI-6": "Installation labour for a 6-head system: two technicians, 14 hours, to mount the heads and the outdoor unit, run and connect the pipework and drains, test, vacuum and commission.",
  "AC-DUCTED-2DAYS": "Installation of your new ducted reverse-cycle system: the indoor unit in the roof space and the outdoor unit, new Bradflo insulated ductwork to an outlet in each room, the return air, zone dampers and the Zonemate controller, refrigeration pipework, drainage, pressure test, vacuum, commissioning and airflow balancing to every outlet. Includes removal of the old system and ducting.",
  "AC-DUCTED-LAB": "Installation labour for your ducted system: two technicians, two days, on the roof-space and outdoor work, ductwork, outlets, zoning, pipework, commissioning and balancing.",
  "AC-DUCTED-LAB-1DAY": "Installation labour for your ducted system: two technicians, one day.",
  "AC-DOM-INSTALL": "Installation of your new Braemar Dominator, reusing your existing ductwork: removal of the old unit, the new system positioned and connected, a new return air box, drainage, commissioning and testing before handover.",
  "AC-DOM-LAB": "Installation labour for your Dominator changeover: two technicians, one day, to remove the old unit, fit and connect the new system to your existing ductwork, commission and test.",
  "AC-RAC-INSTALL": "Installation of your new window or wall air conditioner into the existing opening, sealed and tested, with your old unit removed.",
  "AC-CONDENSER-REPLACE": "Replacement of the outdoor unit: the old unit's refrigerant recovered and the unit removed, the new unit fitted and connected, pressure-tested, vacuumed, charged and tested.",
  "DECOMMISSION-DISPOSAL": "Disconnection and removal of your old unit, with the refrigerant safely recovered by a licensed technician, and disposal. For a visit where we're taking a system out and not installing a new one; when we install a new system, removing the old one is included.",
  "EVAP-INSTALL": "Changeover of your rooftop evaporative cooler: the old cooler disconnected, removed and disposed of, the new cooler and controller installed, connected to your ducting, water and a new drain, the roof penetration resealed and weatherproofed, and an operational test.",
  // The internal heater's own service (3 hours, Jake 6 Nov), and the words an
  // internal heater's line gets while its template still uses the external one.
  "GAS-DUCT-INT": "Changeover of your ducted gas heater to a new internal heater, in the same place as the old one: the old heater removed and disposed of, the new heater connected to your ductwork, gas and flue, a new wall controller, a carbon monoxide safety check, commissioning and testing.",
  "GAS-DUCT-EXT#internal": "Changeover of your ducted gas heater to a new internal heater, in the same place as the old one: the old heater removed and disposed of, the new heater connected to your ductwork, gas and flue, a new wall controller, a carbon monoxide safety check, commissioning and testing.",
  "GAS-DUCT-EXT": "Changeover of your ducted gas heater to a new external heater: the old heater removed and disposed of, the new heater connected to your ductwork and gas, a new wall controller, a carbon monoxide safety check, commissioning and testing.",
  // Hot water and cooking.
  "HW-HP-HARD": "Installation of your new heat pump: removal and disposal of the old system, the new unit in the same location on a proper base, all plumbing with a Tomson tempering valve, drainage, commissioning and handover. The materials and the electrical connection are listed under this line.",
  "HW-HP-PLUG": "Installation of your new plug-in heat pump: removal and disposal of the old system, the new unit in the same location on a proper base, all plumbing with a Tomson tempering valve, drainage, commissioning and handover. It plugs into an existing power point within reach, so there's no electrical work. The materials are listed under this line.",
  "HW-HP-SPLIT": "Installation of your new split heat pump: removal and disposal of the old system, the tank and the heat pump unit positioned and mounted, all plumbing between them, a Tomson tempering valve, drainage, commissioning and handover. The materials and the electrical connection are listed under this line.",
  "HW-CF-INS": "Installation of your new continuous flow system: removal and disposal of the old system, the new unit mounted and connected to the gas and water, all valves and fittings, a gas pressure test, commissioning and handover. The materials are listed under this line.",
  "HW-STORAGE-TO-CF": "Changeover from a gas storage system to continuous flow, with a new gas feed sized for the new unit: removal and disposal of the old system, the new unit mounted, new gas and water connections, a gas pressure test, commissioning and handover. The materials are listed under this line.",
  "HW-GAS-STORAGE-INS": "Installation of your new gas storage system: removal and disposal of the old system, the new unit in the same location, connection to your gas and water, all valves and fittings, a gas pressure test, commissioning and handover. The materials are listed under this line.",
  "GAS-COOKTOP-INSTALL": "Installation of your new gas cooktop into your existing cut-out: removal of the old cooktop, connection to your gas point with an approved connection, a gas pressure test, and every burner checked lighting and burning correctly. The materials are listed under this line.",
  // Electrical: the electrician's work, in the same words.
  "AC-SPLIT-ELEC": "The electrical work by a licensed electrician: a dedicated circuit and breaker at the switchboard, cabling to the unit, a weatherproof isolator at the outdoor unit, control cabling between the units, testing and a Certificate of Electrical Safety.",
  "AC-MULTI-ELEC": "The electrical work by a licensed electrician: a new RCBO and dedicated circuit from the switchboard, power to the outdoor unit, a weatherproof isolator, control cabling to each indoor head, testing and a Certificate of Electrical Safety.",
  "AC-DUCTED-ELE": "The electrical work by a licensed electrician: a new RCBO and dedicated circuit at the switchboard, power to the indoor and outdoor units, a weatherproof isolator, controller wiring, testing and a Certificate of Electrical Safety.",
  "DOM-ELEC": "The electrical work by a licensed electrician: the old unit disconnected and made safe, a new RCBO and dedicated circuit where needed, power and control cabling to the new unit, an isolator, testing and a Certificate of Electrical Safety.",
  "ELEC-HP": "The electrical work by a licensed electrician: a new RCBO and dedicated circuit at the switchboard, cabling to the heat pump, a power point or isolator at the unit, testing and a Certificate of Electrical Safety. Switchboard upgrades are quoted separately.",
  // The call-out and repairs.
  ...Object.fromEntries(["AC-SPLIT-DIAG", "AC-MULTI-DIAG", "AC-DUCTED-DIAG", "AC-RAC-DIAG", "AC-ADDON-DIAG", "EVAP-DIAG", "HTR-DUCTED-DIAG", "HTR-SPACE-DIAG"].map((c) => [c,
    "Our standard call-out: a technician comes out, finds the fault and explains what's wrong, and you get a written report and a quote for the repair. Covers the first hour on site; any time after that is charged by the hour."])),
  ...Object.fromEntries(["AC-SPLIT-REPAIR", "AC-MULTI-REPAIR", "AC-DUCTED-REPAIR", "EVAP-REPAIR", "HTR-DUCTED-REPAIR"].map((c) => [c,
    "Repair of the fault we found: the faulty part replaced or the problem fixed, then the system tested to confirm it's working properly. Charged by the hour; parts and any refrigerant are listed on their own lines."])),
  // Hourly labour lines.
  "LAB-HR-1P": "Each hour of a technician's time to complete the job.",
  "LAB-HR-2P": "Each hour of a technician and an apprentice to complete the job.",
  "LAB-HR-3P": "Each hour of a technician and two apprentices to complete the job.",
  // Ducted zone add-ons.
  ...Object.fromEntries([150, 200, 250, 300, 350, 400, 450].map((s) => [`ZONE ${s}MM ADD-ON`,
    `An extra ${s} mm zone: a motorised damper, its control cable and set-up, so the rooms it serves can be run on their own from the controller.`])),
};

/** Descriptions for the split extras, on the template's add-on lines. */
export const ADDON_COPY: Record<string, string> = {
  pump: "A quiet pump to carry the water away where the drain can't fall naturally from the indoor head.",
  coil: "A further 20 m of Ardent copper pipework, for a run longer than the standard 20 m.",
};

/**
 * What a template is, from its own lines: the install service it uses, the
 * equipment on it and the materials that change what's included. Sizes come
 * from the equipment where it names one, so the summary describes what's
 * actually being quoted ("Rinnai 9kW" carrying the 11kW condenser is described
 * as 11kW; the fix is the condenser). Templates that aren't an install
 * (servicing, leak detection, commercial, the deposit) give null and keep
 * their wording.
 */
export type FactItem = { skuType: string; skuName?: string | null; code?: string; quantity?: number | null };
export function templateFacts(name: string, items: FactItem[]): TemplateFacts | null {
  const codes = new Set(items.map((i) => (i.code ?? "").toUpperCase()));
  const named = (re: RegExp) => items.filter((i) => re.test(i.skuName ?? ""));
  const equip = items.filter((i) => i.skuType === "Equipment").map((i) => (i.skuName ?? "").trim());
  const kwOf = (s: string) => { const m = /(\d+(?:[.,]\d+)?)\s*kw/i.exec(s); return m ? `${m[1].replace(",", ".")}kW` : null; };
  const lOf = (s: string) => { const m = /(\d{2,3})\s*l\b/i.exec(s); return m ? `${m[1]}L` : null; };
  const n = name.trim();
  const brandOf = (...names: string[]) => names.find((b) => n.toLowerCase().startsWith(b.toLowerCase())) ?? names[0];
  // Each Ardent pair coil is 20 m; the back-to-back carries half of one. The
  // same coil listed twice (the Kaden 5kW roof-mounted) is one run, not two.
  const coilBy = new Map<string, number>();
  for (const i of named(/copper pair coil/i).filter((x) => x.skuType === "Material")) {
    const k = (i.skuName ?? "").trim().toLowerCase();
    coilBy.set(k, Math.max(coilBy.get(k) ?? 0, Number(i.quantity ?? 1)));
  }
  const coils = [...coilBy.values()].reduce((a, q) => a + q, 0);
  const pipeM = coils > 0 ? Math.round(coils * 20) : null;

  const split = ["AC-SPLIT-BTB", "AC-SPLIT-RTW", "AC-SPLIT-RTR"].find((c) => codes.has(c));
  if (split) {
    return { name: n, kind: "split", brand: brandOf("Mitsubishi Electric", "Kaden", "Rinnai"), size: kwOf(equip[0] ?? "") ?? kwOf(n),
      placement: split === "AC-SPLIT-BTB" ? "btb" : split === "AC-SPLIT-RTW" ? "rtw" : "rtr", pipeM };
  }
  if (codes.has("AC-SPLIT-MULTI")) {
    const condenser = equip.find((e) => /condenser/i.test(e)) ?? "";
    const heads = items.filter((i) => i.skuType === "Equipment" && /indoor|head/i.test(i.skuName ?? "")).reduce((a, i) => a + Number(i.quantity ?? 1), 0);
    return { name: n, kind: "multi", brand: brandOf("Mitsubishi Electric", "Kaden", "Rinnai"), size: kwOf(condenser) ?? kwOf(n),
      heads: heads || undefined, labourLine: [...codes].some((c) => /^AC-SPLIT-MULTI-\d$/.test(c)), pump: named(/cond(ensate)? pump/i).length > 0 };
  }
  if (codes.has("AC-DUCTED-2DAYS")) return { name: n, kind: "ducted", brand: brandOf("Mitsubishi Electric", "Kaden"), size: kwOf(equip[0] ?? "") ?? kwOf(n) };
  if (codes.has("AC-DOM-INSTALL")) return { name: n, kind: "dominator", brand: "Braemar Dominator", size: null };
  if (codes.has("HW-HP-HARD") || codes.has("HW-HP-PLUG")) {
    return { name: n, kind: "heatpump", brand: brandOf("Reclaim", "Thermann", "IStore").replace("IStore", "iStore"), size: lOf(n), wired: codes.has("HW-HP-PLUG") ? "plug" : "elec" };
  }
  if (codes.has("HW-HP-SPLIT")) {
    const pana = /^panasonic/i.test(n);
    const tank = /\bSS\b|stainless/i.test(n) ? "stainless steel" : "glass-lined";
    const kind = /earthworker/i.test(n) ? "Earthworker " : /duplex/i.test(n) ? "Duplex " : "";
    return { name: n, kind: "hpsplit", brand: pana ? `Reclaim x Panasonic ${kwOf(n) ?? ""}`.trim() : `Reclaim ${kind}`.trim(), size: `${lOf(n) ?? ""} ${tank}`.trim() };
  }
  if (codes.has("HW-GAS-STORAGE-INS")) return { name: n, kind: "gasstorage", brand: "Thermann", size: lOf(n) };
  if (codes.has("HW-CF-INS") || codes.has("HW-STORAGE-TO-CF")) {
    const unit = equip[0] ?? "";
    const m = /^(.*?\d+L)/i.exec(unit);
    return { name: n, kind: "cf", brand: m ? m[1].trim() : "Thermann", unit: m ? m[1].trim() : undefined, size: null, newGasFeed: codes.has("HW-STORAGE-TO-CF") };
  }
  if (codes.has("GAS-DUCT-EXT") || codes.has("GAS-DUCT-INT")) {
    const all = `${n} ${equip.join(" ")}`;
    const heater = isInternalHeater(all) ? "internal" : /buffalo/i.test(all) ? "external" : undefined;
    const brand = n.replace(/\s*\d+(?:\.\d+)?kw.*$/i, "").replace(/\s*ducted gas heater.*$/i, "").trim();
    return { name: n, kind: "heater", brand, size: kwOf(n), heater, baseBox: named(/base box/i).length > 0 };
  }
  if (codes.has("GAS-COOKTOP-INSTALL")) {
    const unit = (equip[0] ?? "").replace(/\s*(natural\s+)?gas cooktop.*$/i, "").replace(/\s*with wok burner/i, "").trim();
    return { name: n, kind: "cooktop", brand: unit || brandOf("Beko", "Bosch", "Westinghouse"), unit: unit || undefined, size: null, regulator: named(/appliance regulator/i).length > 0 };
  }
  if (codes.has("HWS-ELEC-INSTALLATION")) {
    const unit = (equip[0] ?? "").replace(/(\d)\s*kw\b/i, "$1kW").trim();
    return { name: n, kind: "elecstorage", brand: "Thermann", size: lOf(n), unit: unit ? `${unit} hot water system` : undefined };
  }
  if (codes.has("AC-RAC-INSTALL")) {
    const m = /-\s*(.+?)\s*$/.exec(n);
    return { name: n, kind: "rac", brand: "Kaden", size: kwOf(n), unit: m ? `${m[1]} wall air conditioner` : undefined };
  }
  if (codes.has("EVAP-INSTALL")) {
    const unit = (equip[0] ?? "").replace(/\s*evap(orative)? cooler/i, "").replace(/\s*\((beige|charcoal|terra red|char|red|t'cotta red)\)\s*$/i, "").trim();
    const colour = /\((beige|charcoal|terra red)\)/i.exec(equip[0] ?? n)?.[1];
    return { name: n, kind: "evap", brand: unit || "Evaporative cooler", unit: unit ? `${unit} evaporative cooler${colour ? ` in ${colour}` : ""}` : undefined, size: null };
  }
  return null;
}

/** The labels that open a paragraph, the summary's four and the equipment's four: bold on the quote. */
const OPENING_LABEL = /^(What we're doing|What we're removing|What's included|What's not included|Why it saves you money|Key features|Why choose it|Warranty):/;
/** A summary or description as ServiceTitan stores it: one paragraph each, its label bold. */
export const summaryHtml = (text: string) => text.split(/\n\n+/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(OPENING_LABEL, "<strong>$1:</strong>")}</p>`).join("");
/** Text for comparing a stored summary or description with ours, whatever markup it was saved with. */
export const plainText = (html: string | null | undefined) =>
  String(html ?? "").replace(/<\/(p|div)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#0?39;|&#x27;|&apos;/gi, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

/** An internal ducted heater, by the unit's name: Wombat, Compact Classic, StarPro "in" models. */
export const isInternalHeater = (s: string) => /wombat|compact classic|sp\d+in\b/i.test(s);

/**
 * The labour line's words: one sentence pointing to the job summary (Jake,
 * 19 Nov, on job 20900: "because we have covered everything in the job
 * summary, the Split System - Roof Bracket needs to be more simple, like: All
 * labour, materials and standard electrical works required to complete the
 * works described in the Job Summary", then "yes, do it on all the
 * templates"). The job write-up uses the same sentence (jobwrite/lines.ts).
 */
export function coverSentence(parts: string[]): string {
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `All ${list} required to complete the works described in the Job Summary.`;
}

/** A template's line as the labour sentence reads it. */
export type LineItem = { skuType: string; skuName?: string | null; code?: string; quantity?: number | null; unitPrice?: number | null };

/** The line that is the installation on each install template: the one Jake calls the labour line. */
const INSTALL_LINES = new Set([
  "AC-SPLIT-BTB", "AC-SPLIT-RTW", "AC-SPLIT-RTR", "AC-SPLIT-MULTI", "AC-DUCTED-2DAYS", "AC-DOM-INSTALL", "AC-RAC-INSTALL", "AC-CONDENSER-REPLACE",
  "EVAP-INSTALL", "GAS-DUCT-INT", "GAS-DUCT-EXT", "HW-HP-HARD", "HW-HP-PLUG", "HW-HP-SPLIT", "HW-CF-INS", "HW-STORAGE-TO-CF", "HW-GAS-STORAGE-INS",
  "GAS-COOKTOP-INSTALL",
]);
/** Crew-and-hours lines that sit beside an installation line on the multi-head, Dominator and older ducted templates. */
const LABOUR_HOURS = /^(AC-SPLIT-MULTI-\d|AC-DOM-LAB|AC-DUCTED-LAB(-1DAY)?)$/;
/** The electrician's line: AC-SPLIT-ELEC, AC-MULTI-ELEC, AC-DUCTED-ELE, DOM-ELEC, ELEC-HP, HWS-ELEC-INSTALLATION. */
const ELECTRICAL_LINE = /(^|-)ELEC?(-|$)|ELECTRIC(AL|IAN)/;

/**
 * The labour sentence for one of a template's lines, or null when the line
 * isn't its labour line. Each line says only what it carries:
 *
 *   - "standard electrical works" only where the electrician's line is $0,
 *     so the labour line's price includes it. Where the electrical is priced
 *     on its own line (a heat pump's ELEC-HP, a multi-head's AC-MULTI-ELEC),
 *     that line keeps its own words and the labour line doesn't claim it;
 *   - "materials" only where the template carries materials;
 *   - beside a crew-and-hours line, the installation line carries the
 *     materials and the hours line the labour, so no two lines both say
 *     "all labour".
 */
export function labourCopy(code: string, items: LineItem[]): string | null {
  const c = code.trim().toUpperCase();
  const isInstall = INSTALL_LINES.has(c), isHours = LABOUR_HOURS.test(c);
  if (!isInstall && !isHours) return null;
  const codes = items.map((i) => (i.code ?? "").trim().toUpperCase());
  const materials = items.some((i) => i.skuType === "Material" && Number(i.quantity ?? 1) > 0 && !/rebate|veec|\bstc\b/i.test(`${i.code ?? ""} ${i.skuName ?? ""}`));
  const elec = items.filter((i, k) => i.skuType === "Service" && ELECTRICAL_LINE.test(codes[k]));
  const elecIncluded = elec.length > 0 && elec.every((i) => Number(i.unitPrice ?? 0) === 0);
  if (isHours) return coverSentence(["labour"]);
  const parts = codes.some((x) => LABOUR_HOURS.test(x))
    ? [materials ? "materials" : null, elecIncluded ? "standard electrical works" : null]
    : ["labour", materials ? "materials" : null, elecIncluded ? "standard electrical works" : null];
  const kept = parts.filter(Boolean) as string[];
  return kept.length ? coverSentence(kept) : null;
}

/**
 * The description a template line should carry, by its service code; internal
 * heaters get their own. Given the template's lines, its labour line gets the
 * one plain sentence (labourCopy) instead.
 */
export function lineCopy(code: string, facts: TemplateFacts | null, items?: LineItem[]): string | null {
  if (items) {
    const labour = labourCopy(code, items);
    if (labour) return labour;
  }
  if (code === "GAS-DUCT-EXT" && facts?.heater === "internal") return SERVICE_COPY["GAS-DUCT-EXT#internal"];
  return SERVICE_COPY[code] ?? null;
}

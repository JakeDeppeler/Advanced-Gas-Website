/**
 * The words on a quote: every template summary and every service description,
 * written from one place so they read the same (Jake, 6 Nov 2026).
 *
 * Every summary runs in the same order: what the job is and what it involves;
 * the brand and why it's the one we fit; how we install it, which is where we
 * show why we cost more (our own licensed team, the materials actually on the
 * template, the testing, the care); then what's included and what isn't.
 *
 * Brand and product claims are the ones the templates already made, carried
 * over. Where a line says something the old wording didn't, it's listed in
 * NEW_CLAIMS so it's checked before it goes on a quote; nothing here invents
 * a figure.
 */

export type Kind =
  | "split" | "multi" | "ducted" | "dominator" | "heatpump" | "hpsplit" | "gasstorage" | "cf"
  | "heater" | "cooktop" | "evap";

export type TemplateFacts = {
  name: string;
  kind: Kind;
  brand: string;
  /** e.g. "3.5kW", "315L", "15kW" */
  size: string | null;
  /** Split placement, from the install line. */
  placement?: "btb" | "rtw" | "rtr";
  /** Heat pump: hard-wired or plug-in. */
  wired?: "elec" | "plug";
  heater?: "internal" | "external";
  /** Extra product facts carried over from the old summary. */
  product?: string;
  /** New gas feed on a continuous flow. */
  newGasFeed?: boolean;
};

const ROOM: Record<string, string> = {
  "2.5": "a bedroom or study", "2.6": "a bedroom or study", "3.5": "a large bedroom or a smaller living area",
  "5": "a living area", "6": "a larger living area", "7.1": "a large open-plan living area",
};

const BRAND: Record<string, string> = {
  "Mitsubishi Electric": "Mitsubishi Electric is the premium range we fit: quiet, efficient inverter systems from one of the most established names in air conditioning.",
  Kaden: "Kaden is the value range we fit: a dependable inverter system that heats and cools efficiently and keeps the cost down.",
  Rinnai: "Rinnai is a name Australian homes have relied on for heating and cooling for decades.",
};

/** Lines that say something the old wording didn't: checked before they go out. */
export const NEW_CLAIMS = [
  BRAND["Mitsubishi Electric"], BRAND.Kaden, BRAND.Rinnai,
];

const CARE = {
  split: "Your install is done by our own licensed technicians, with a licensed electrician we've worked with for years. We use Ardent copper pipe and Rodigas brackets, finish the pipework outside in Colorbond capping, and pressure-test and vacuum the system before it's run, so it starts clean, dry and leak-free. Every penetration is sealed, the site is cleaned up, and we show you how to use it before we leave.",
  multi: "Your install is done by our own licensed technicians, with a licensed electrician we've worked with for years. Each head gets its own Ardent copper run and drain, the pipework outside is finished in Colorbond capping, and the whole system is pressure-tested and vacuumed before it's run. Every penetration is sealed, the site is cleaned up, and we show you how to use each controller before we leave.",
  ducted: "Your install is done by our own licensed technicians, with a licensed electrician we've worked with for years. Every run is new Bradflo R1.5 insulated duct, sized for the room it feeds, so the system delivers the airflow it's rated for. The pipework is pressure-tested and vacuumed, every outlet is balanced, and we walk you through the Zonemate controller and app before we leave.",
  dominator: "Your install is done by our own licensed technicians, with a licensed electrician we've worked with for years. We check the existing ducting in the roof before we commit to reusing it, fit a new return air box, and commission and test the system before handover.",
  hotwater: "Your install is done by our own licensed plumbers, with a licensed electrician we've worked with for years where it's wired in. We use Tomson valves, Kembla copper and fire-rated pipe insulation, sit the unit on a proper base, and test everything before we hand it over. Your old system is taken away, and we handle the rebate paperwork for you.",
  gas: "Your install is done by our own licensed gas fitters. Every gas connection is pressure-tested, the system is commissioned and checked burning safely, and your old unit is taken away.",
  heater: "Your install is done by our own licensed gas fitters. The new heater is connected to your ductwork, gas and flue, a carbon monoxide safety check is done, and it's fully commissioned and tested before handover. Your old heater is taken away.",
  evap: "Your install is done by our own licensed technicians. The roof penetration is resealed and weatherproofed, the cooler connected to your ducting, water and a new drain, and it's run and tested before we leave.",
};

const sentence = (s: string) => s.trim().replace(/\s+/g, " ");

/** The summary for a template, in the one order every summary follows. */
export function templateSummary(f: TemplateFacts): string {
  const kw = f.size?.replace(/kw$/i, "") ?? "";
  const parts: string[] = [];
  switch (f.kind) {
    case "split": {
      const where = {
        btb: "The outdoor unit goes on the outside wall directly behind the indoor head: the neatest install there is, with no pipework through the roof space.",
        rtw: "The outdoor unit goes on a wall bracket on another wall, with the pipework and drain run out of sight through the roof space.",
        rtr: "The outdoor unit goes on a roof bracket, fixed and flashed to keep the roof weathertight, with the pipework and drain run out of sight through the roof space.",
      }[f.placement ?? "btb"];
      parts.push(`Supply and installation of a new ${f.brand} ${f.size} split system air conditioner. ${where} At ${f.size} it's sized for ${ROOM[kw] ?? "the room it serves"}, big enough to hold temperature on the hottest and coldest days without being oversized.`);
      parts.push(BRAND[f.brand] ?? "");
      parts.push(CARE.split);
      parts.push("Includes removal of your old system where we're replacing one, the electrical connection with a Certificate of Electrical Safety, and a compliance certificate on completion. Switchboard upgrades, a condensate pump where the drain can't fall naturally, extra pipe beyond a standard run and non-standard access are quoted separately.");
      break;
    }
    case "multi":
      parts.push(`Supply and installation of a new ${f.brand} ${f.size} multi-head split system: one outdoor unit running a head in each room, each with its own controller, so bedrooms and living areas run independently and only the rooms in use are on. One condenser to site instead of several, and fewer penetrations in your walls.`);
      parts.push(BRAND[f.brand] ?? "");
      parts.push(CARE.multi);
      parts.push("Includes the electrical connection with a Certificate of Electrical Safety and a compliance certificate on completion. Installation labour is shown on its own line for the number of heads being fitted. Switchboard upgrades, extra pipe beyond a standard run and non-standard access are quoted separately.");
      break;
    case "ducted":
      parts.push(`Supply and installation of a new ${f.brand} ${f.size} ducted reverse-cycle system, with all new ductwork. The indoor unit sits out of sight in the roof space with an outlet in each room, and the house is zoned so you run only the areas you're using, from the wall controller or your phone.`);
      parts.push(f.brand === "Mitsubishi Electric" ? BRAND["Mitsubishi Electric"] : "");
      parts.push(CARE.ducted);
      parts.push("Includes removal of the old system and ducting, the Zonemate Touch controller with wifi, the electrical connection with a Certificate of Electrical Safety, and a compliance certificate on completion.");
      break;
    case "dominator":
      parts.push("Replacement of your existing ducted system with a Braemar Dominator reverse-cycle unit, reusing your existing ductwork. Where the ducting is in good condition and correctly sized, there's no need to replace it, which makes this a single-day changeover and a considerably cheaper result than a full ducted install, with heating and cooling from one system.");
      parts.push(CARE.dominator);
      parts.push("Includes removal of your old unit, the electrical connection with a Certificate of Electrical Safety, and a compliance certificate on completion. Quoted on the existing ducting being serviceable: if it isn't, we'll tell you before any work starts.");
      break;
    case "heatpump":
      parts.push(`Replacement of your existing hot water system with a new ${f.brand} ${f.size} heat pump, fully installed. A heat pump draws heat from the air rather than making it, so it runs your hot water on a fraction of the energy of a conventional electric or gas system.`);
      parts.push(CARE.hotwater);
      parts.push(f.wired === "plug"
        ? "Includes removal of your old system, installation in the same location and a compliance certificate on completion. The unit plugs into an existing power point within reach, so no electrical work is needed. Rebates are shown on their own lines."
        : "Includes removal of your old system, installation in the same location, a new dedicated circuit with a Certificate of Electrical Safety, and a compliance certificate on completion. Rebates are shown on their own lines. Switchboard upgrades are quoted separately.");
      break;
    case "hpsplit":
      parts.push(`Replacement of your existing hot water system with a new ${f.brand} ${f.size} split heat pump, fully installed. The tank and the heat pump unit are separate, so the heat pump can sit where it runs best and stays out of the way.`);
      parts.push(f.product ?? "");
      parts.push(CARE.hotwater);
      parts.push("Includes removal of your old system, all plumbing between the tank and the heat pump, a new dedicated circuit with a Certificate of Electrical Safety, and a compliance certificate on completion. Rebates are shown on their own lines. Switchboard upgrades are quoted separately.");
      break;
    case "gasstorage":
      parts.push(`Replacement of your existing hot water system with a new ${f.brand} ${f.size} gas storage system, fully installed.`);
      parts.push(f.product ?? "");
      parts.push(CARE.hotwater.replace(", with a licensed electrician we've worked with for years where it's wired in", "").replace(" and we handle the rebate paperwork for you", ""));
      parts.push("Includes removal of your old system, connection to your existing gas and water, all valves and fittings, and a compliance certificate on completion.");
      break;
    case "cf":
      parts.push(`Supply and installation of a new ${f.brand} gas continuous flow hot water system. It heats water only as you use it, so you never run out and you're not paying to keep a tank hot around the clock.${f.newGasFeed ? " This includes a new gas feed sized for the unit." : ""}`);
      parts.push(CARE.gas);
      parts.push(`Includes connection to your gas and water, all valves and fittings, a full operational test and a compliance certificate on completion.${f.newGasFeed ? "" : " If your gas supply needs upsizing for the new unit, that's quoted separately."} A new power point, if one's needed, is quoted separately.`);
      break;
    case "heater":
      parts.push(`Replacement of your existing ducted gas heater with a new ${f.brand} ${f.size ?? ""} ${f.heater === "internal" ? "internal heater, installed where your old one was" : f.heater === "external" ? "external heater in a weatherproof cabinet outside, taking up no room inside your home" : "ducted gas heater"}, connected to your existing ductwork.`);
      parts.push(f.product ?? "");
      parts.push(CARE.heater);
      parts.push("Includes a new wall controller, a carbon monoxide safety check and a compliance certificate on completion. If the gas line, flue or ductwork needs upgrading or repair to suit the new heater, that's quoted separately.");
      break;
    case "cooktop":
      parts.push(`Supply and installation of a new ${f.brand} gas cooktop into your existing benchtop cut-out, connected to your existing gas point with an approved connection.`);
      parts.push(CARE.gas);
      parts.push("Includes a gas pressure test, a check that every burner lights and burns correctly, and a compliance certificate on completion. Benchtop changes for a different size, gas line alterations and electrical work are quoted separately.");
      break;
    case "evap":
      parts.push(`Replacement of your existing evaporative cooler with a new ${f.brand} ${f.size ?? ""} evaporative cooler and controller, fully installed.`);
      parts.push(f.product ?? "");
      parts.push(CARE.evap);
      parts.push("Includes removal of your old cooler and a compliance certificate on completion. If your existing cooler is hard-wired, the electrical work is quoted separately.");
      break;
  }
  return parts.map(sentence).filter(Boolean).join("\n\n");
}

/** Product facts the old summaries made, carried over word for word where they're right for the template. */
export const PRODUCT: Record<string, string> = {
  thermann135: "The Thermann 135L is a compact mains-pressure system built for outdoor installation and suited to one or two people, with a vitreous enamel lined steel tank built for a long service life.",
  reclaim: "Reclaim runs on CO2 and keeps performing through cold Victorian mornings, when other heat pumps drop off.",
  panasonic: "It pairs a Reclaim tank with a Panasonic heat pump unit.",
  buffalo5: "A 5-Star heater uses noticeably less gas than a 3-Star to give the same warmth: Brivis estimates around 22% less, roughly $600 a year for an average home under their standard test conditions. Your savings will depend on your home and how you use it.",
  brivis3: "Brivis is one of the most trusted names in ducted gas heating in Australia, and has kept Victorian homes warm for decades.",
  starpro: "The Australian-made StarPro is a 6 Star condensing heater: it gets more heat out of every bit of gas, so your home warms faster while running costs come down.",
  ecostar: "The Australian-made Braemar Ecostar has a 6.3 star energy rating, the quiet Stealth Softair fan system and the MagIQtouch touchscreen controller, with zoning so you only heat the rooms you're using.",
  contour: "The Australian-built Contour is Brivis' premium slimline cooler, sitting lower on your roof, with AquaSave water management, a pre-wet cycle that soaks the pads before the fan starts, and a motorised winter seal.",
};

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
  // An internal heater's template still uses the external service (there's no
  // internal one in the pricebook yet), so its line gets these words instead.
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
 * What a template is, from its own lines: the install service it uses and
 * the equipment on it. Sizes come from the equipment where it names one, so
 * the summary describes what's actually being quoted ("Rinnai 9kW" carrying
 * the 11kW condenser is described as 11kW; the fix is the condenser).
 * Templates that aren't an install (servicing, leak detection, commercial,
 * the deposit) give null and keep their wording.
 */
export function templateFacts(name: string, items: { skuType: string; skuName?: string | null; code?: string }[]): TemplateFacts | null {
  const codes = new Set(items.map((i) => (i.code ?? "").toUpperCase()));
  const equip = items.filter((i) => i.skuType === "Equipment").map((i) => (i.skuName ?? "").trim());
  const kwOf = (s: string) => { const m = /(\d+(?:[.,]\d+)?)\s*kw/i.exec(s); return m ? `${m[1].replace(",", ".")}kW` : null; };
  const lOf = (s: string) => { const m = /(\d{2,3})\s*l\b/i.exec(s); return m ? `${m[1]}L` : null; };
  const n = name.trim();
  const brandOf = (...names: string[]) => names.find((b) => n.toLowerCase().startsWith(b.toLowerCase())) ?? names[0];

  const split = ["AC-SPLIT-BTB", "AC-SPLIT-RTW", "AC-SPLIT-RTR"].find((c) => codes.has(c));
  if (split) {
    return { name: n, kind: "split", brand: brandOf("Mitsubishi Electric", "Kaden", "Rinnai"), size: kwOf(equip[0] ?? "") ?? kwOf(n),
      placement: split === "AC-SPLIT-BTB" ? "btb" : split === "AC-SPLIT-RTW" ? "rtw" : "rtr" };
  }
  if (codes.has("AC-SPLIT-MULTI")) {
    const condenser = equip.find((e) => /condenser/i.test(e)) ?? "";
    return { name: n, kind: "multi", brand: brandOf("Mitsubishi Electric", "Kaden", "Rinnai"), size: kwOf(condenser) ?? kwOf(n) };
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
    const wifi = equip.some((e) => /wifi/i.test(e)) ? " This model has wifi, so you can check and control it from your phone." : "";
    const hp = kwOf(n);
    return { name: n, kind: "hpsplit", brand: pana ? "Reclaim x Panasonic" : `Reclaim ${kind}`.trim(), size: `${lOf(n) ?? ""} ${tank}`.trim(),
      product: `${pana ? PRODUCT.panasonic.replace("a Panasonic heat pump", `a Panasonic ${hp ?? ""} heat pump`) : PRODUCT.reclaim}${wifi}` };
  }
  if (codes.has("HW-GAS-STORAGE-INS")) return { name: n, kind: "gasstorage", brand: "Thermann", size: lOf(n), product: /135/.test(n) ? PRODUCT.thermann135 : undefined };
  if (codes.has("HW-CF-INS") || codes.has("HW-STORAGE-TO-CF")) {
    const unit = equip[0] ?? "";
    const m = /^(.*?\d+L)/i.exec(unit);
    return { name: n, kind: "cf", brand: m ? m[1].trim() : "Thermann", size: null, newGasFeed: codes.has("HW-STORAGE-TO-CF") };
  }
  if (codes.has("GAS-DUCT-EXT")) {
    const all = `${n} ${equip.join(" ")}`;
    const heater = /wombat|compact classic|sp\d+in\b/i.test(all) ? "internal" : /buffalo/i.test(all) ? "external" : undefined;
    const product = /starpro/i.test(all) ? PRODUCT.starpro : /ecostar/i.test(all) ? PRODUCT.ecostar : /buffalo 5 star/i.test(n) ? PRODUCT.buffalo5 : /brivis/i.test(all) ? PRODUCT.brivis3 : undefined;
    const brand = n.replace(/\s*\d+(?:\.\d+)?kw.*$/i, "").replace(/\s*ducted gas heater.*$/i, "").trim();
    return { name: n, kind: "heater", brand, size: kwOf(n), heater, product };
  }
  if (codes.has("GAS-COOKTOP-INSTALL")) {
    const unit = (equip[0] ?? "").replace(/\s*(natural\s+)?gas cooktop.*$/i, "").replace(/\s*with wok burner/i, "").trim();
    return { name: n, kind: "cooktop", brand: unit || brandOf("Beko", "Bosch", "Westinghouse"), size: null };
  }
  if (codes.has("EVAP-INSTALL")) {
    const m = /^(.*?)\s*-\s*changeover/i.exec(n);
    return { name: n, kind: "evap", brand: m ? m[1] : n, size: null, product: /contour/i.test(n) ? PRODUCT.contour : undefined };
  }
  return null;
}

/** A summary as ServiceTitan stores it: one paragraph each. */
export const summaryHtml = (text: string) => text.split(/\n\n+/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("");
/** Text for comparing a stored summary or description with ours, whatever markup it was saved with. */
export const plainText = (html: string | null | undefined) =>
  String(html ?? "").replace(/<\/(p|div)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

/** The description a template line should carry, by its service code; internal heaters get their own. */
export function lineCopy(code: string, facts: TemplateFacts | null): string | null {
  if (code === "GAS-DUCT-EXT" && facts?.heater === "internal") return SERVICE_COPY["GAS-DUCT-EXT#internal"];
  return SERVICE_COPY[code] ?? null;
}

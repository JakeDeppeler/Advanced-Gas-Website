/**
 * Aircon fault-code reference table. Covers the most-searched codes
 * for the major brands our customers encounter, whether we install
 * that brand or not (visitors searching "Daikin E9" should land on
 * our site).
 *
 * Data curated from manufacturer service manuals. Each entry lists:
 *   - the code as it appears on the wall controller / indoor unit
 *   - what it usually means (short version)
 *   - the first thing a homeowner or technician should check
 *   - severity to guide the customer's action
 */

export type FaultSystem = "aircon" | "heater" | "hot-water" | "evap";

/**
 * The long-form half of a fault code, for codes that earn their own page.
 *
 * Why this is optional: someone searching "brivis h01 40" is one of the
 * best visitors this site can get. They have a broken heater, they are
 * looking at a code on a wall controller, and every result they get
 * today is a PDF manual or a forum thread from 2014. A page that
 * actually answers them wins that search easily.
 *
 * But a page carrying two lines of text does not win anything, and 149
 * of them would be the same thin-page problem the suburb pages had.
 * So detail pages are only generated for codes that have this filled
 * in, exactly like the service system pages and their `intro`. A code
 * without it still appears in the lookup table; it just doesn't get a
 * URL of its own until someone writes the substance.
 *
 * Safety line: `diyChecks` is only ever things a homeowner can do
 * without tools, without removing a cover, and without touching gas,
 * refrigerant or wiring. Everything else goes in `techChecks`.
 */
export type FaultDetail = {
  /** 2-3 sentences. What the unit is actually telling you. */
  whatItMeans: string;
  /** Causes, most likely first. This is the part people search for. */
  causes: string[];
  /** Safe for anyone. No tools, no covers off, no gas or wiring. */
  diyChecks: string[];
  /** What we do on site, so they know what they're paying for. */
  techChecks: string[];
  /** Can it keep running while they wait? The honest answer. */
  keepRunning: string;
  /** Roughly what the repair involves. No prices, they move. */
  typicalFix: string;
  /** Other codes on the same brand worth reading next. */
  related?: string[];
};

export type FaultCode = {
  brand: string;
  code: string;
  system: FaultSystem;
  meaning: string;
  firstCheck: string;
  severity: "info" | "warn" | "critical";
  detail?: FaultDetail;
};

/** URL-safe slug for a brand or a code. "Mitsubishi Electric" becomes
 *  "mitsubishi-electric", "h01 40" becomes "h01-40". */
export function faultSlug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The codes that have long-form content, and therefore a page. */
export function detailedCodes(): FaultCode[] {
  return FAULT_CODES.filter((f) => f.detail);
}

export function findFaultCode(brandSlug: string, codeSlug: string): FaultCode | undefined {
  return FAULT_CODES.find(
    (f) => faultSlug(f.brand) === brandSlug && faultSlug(f.code) === codeSlug && f.detail,
  );
}

/** Labels used in the filter chip UI. */
export const FAULT_SYSTEM_LABELS: Record<FaultSystem, string> = {
  "aircon": "Air conditioner",
  "heater": "Gas heater",
  "hot-water": "Hot water",
  "evap": "Evap cooler",
};

export const FAULT_CODES: FaultCode[] = [
  // ------------------- Mitsubishi Electric -------------------
  { brand: "Mitsubishi Electric", code: "P1",  system: "aircon", meaning: "Indoor room-thermistor fault",           firstCheck: "Indoor unit thermistor loose or failed, needs a service call.",                      severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P2", system: "aircon",  meaning: "Indoor pipe-thermistor fault",           firstCheck: "Pipe sensor open-circuit, usually a swap-out fix.",                                 severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P4", system: "aircon",  meaning: "Drain sensor fault",                     firstCheck: "Check the condensate drain pan isn't clogged; sensor may need replacing.",           severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P5", system: "aircon",  meaning: "Drain pump fault",                       firstCheck: "Condensate pump seized or blocked, clear the drain line and re-test.",              severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P6", system: "aircon",  meaning: "Coil frost / overheat protection",       firstCheck: "Filter blocked or airflow restricted. Clean filters + check outdoor coil.",          severity: "info" },
  { brand: "Mitsubishi Electric", code: "P8", system: "aircon",  meaning: "Pipe temperature abnormal",              firstCheck: "Low refrigerant charge or restriction. Needs an ARC-licensed tech.",                severity: "warn",
    detail: {
      whatItMeans: "The pipe temperature is not where the unit expects it to be for what it is being asked to do. In practice that almost always means the refrigerant charge is low or something is restricting flow through the system.",
      causes: [
        "A refrigerant leak, most often at a flare joint on the outdoor unit",
        "A blocked or dirty outdoor coil so the system cannot reject heat",
        "A failing outdoor fan",
        "A restriction in the line-set or expansion device",
        "A pipe thermistor that has drifted or failed",
      ],
      diyChecks: [
        "Look at the outdoor unit and clear anything growing against it or blocking airflow",
        "Check the indoor filters and clean them",
        "Give it 30 cm of clear air on every side",
      ],
      techChecks: [
        "Gauge the system and compare superheat and subcool against Mitsubishi's spec",
        "Electronic leak detection on the flares and the coil",
        "Check the outdoor fan and coil condition",
        "Test the pipe thermistor resistance against the table",
      ],
      keepRunning: "You can, but running a split system low on refrigerant is how you turn a flare repair into a compressor replacement. The compressor relies on refrigerant for cooling and lubrication. If it is throwing P8 regularly, turn it off and book it.",
      typicalFix: "If it is a leak, we find it, repair it, pressure test, evacuate and recharge to weight. Re-gassing without finding the leak is a bandaid and we do not do it, because you will be back in a year with the same fault and less compressor.",
      related: [
        "U2",
        "P6",
        "E6",
      ],
    },
  },
  { brand: "Mitsubishi Electric", code: "E0", system: "aircon",  meaning: "Remote-control transmission error",      firstCheck: "Wired controller comms drop, check controller wire terminations.",                 severity: "info" },
  { brand: "Mitsubishi Electric", code: "E6", system: "aircon",  meaning: "Indoor / outdoor comms failure",         firstCheck: "Check the S1-S2-S3 comms wire between indoor & outdoor units.",                     severity: "warn",
    detail: {
      whatItMeans: "The indoor and outdoor units have stopped talking to each other. Nothing is necessarily broken inside either one; the message between them is not getting through.",
      causes: [
        "A loose terminal on the S1-S2-S3 comms wire, usually at the outdoor unit",
        "Damaged interconnect cable, sometimes rodents, sometimes a bracket rubbing through it",
        "Water in the outdoor terminal box",
        "Indoor or outdoor board fault",
        "Wrong wiring after someone else's install or repair",
      ],
      diyChecks: [
        "Turn the isolator off and back on, wait two minutes, and try again",
        "Check the outdoor isolator switch is actually on",
      ],
      techChecks: [
        "Voltage check across S1-S2 and S2-S3 at both ends",
        "Continuity and insulation test on the interconnect",
        "Inspect terminals for water ingress and corrosion",
        "Board diagnostics if the wiring proves good",
      ],
      keepRunning: "The unit will not run properly with E6 up, so the question is moot. It is not dangerous, though; nothing about E6 makes the system unsafe to leave connected.",
      typicalFix: "Most E6s are a terminal, a damaged cable or water in the outdoor box, and they are fixed on the first visit. Board replacements are the minority.",
      related: [
        "E9",
        "E0",
        "P8",
      ],
    },
  },
  { brand: "Mitsubishi Electric", code: "E9", system: "aircon",  meaning: "Indoor / outdoor comms error (variant)", firstCheck: "Same as E6, comms cable, check for damage or loose terminals.",                    severity: "warn" },
  { brand: "Mitsubishi Electric", code: "U2", system: "aircon",  meaning: "Compressor overheat / oil shortage",     firstCheck: "STOP using the unit. Compressor at risk, book a warranty service call.",           severity: "critical",
    detail: {
      whatItMeans: "Compressor overheat, or the unit has detected an oil shortage. This is the most serious code in the Mitsubishi range and the unit has protected itself by shutting down.",
      causes: [
        "Refrigerant charge low, which starves the compressor of cooling and oil return",
        "Outdoor coil badly blocked",
        "Outdoor fan not running",
        "A restriction in the refrigerant circuit",
        "A compressor already on its way out",
      ],
      diyChecks: [
        "Turn the unit off at the controller",
        "Check whether the outdoor fan was spinning before you did, if you can do that safely from where you stand",
      ],
      techChecks: [
        "Full refrigerant charge check and leak test",
        "Compressor windings and insulation resistance",
        "Outdoor fan motor and capacitor test",
        "Coil condition and airflow",
      ],
      keepRunning: "No. Stop using it. U2 exists to save the compressor, and every restart after it works against that. A compressor replacement on a modern inverter split is usually close enough to a new system that we would quote you both.",
      typicalFix: "If we catch it early and the cause is charge or airflow, it is a leak repair and a recharge and the compressor survives. If the compressor is already damaged, we will tell you and price both the repair and the replacement so you can decide with real numbers.",
      related: [
        "P8",
        "P6",
      ],
    },
  },
  { brand: "Mitsubishi Electric", code: "U4", system: "aircon",  meaning: "Outdoor thermistor open-circuit",        firstCheck: "Outdoor coil or discharge sensor faulty. Tech required.",                            severity: "warn" },

  // ------------------- Daikin -------------------
  { brand: "Daikin", code: "A1", system: "aircon",  meaning: "Indoor PCB defect",                                   firstCheck: "Indoor board fault, power-cycle the unit first, then service if it returns.",       severity: "warn" },
  { brand: "Daikin", code: "A5", system: "aircon",  meaning: "High-pressure control / freeze-up protection",        firstCheck: "Filter dirty or outdoor coil blocked. Clean both, re-test.",                        severity: "info",
    detail: {
      whatItMeans: "High pressure control or freeze-up protection has activated. In cooling it usually means the outdoor unit cannot get rid of heat; in heating it usually means the indoor coil has iced up.",
      causes: [
        "Dirty indoor filters, which is the first thing to check every time",
        "Outdoor coil blocked with dust, grass clippings or lint",
        "Something restricting airflow to the outdoor unit",
        "Outdoor fan failing",
        "Refrigerant charge wrong",
      ],
      diyChecks: [
        "Take the indoor filters out and wash them",
        "Hose the outdoor coil down gently with the unit off",
        "Clear at least 30 cm around the outdoor unit",
        "Leave it off for an hour if the indoor coil has iced, then restart",
      ],
      techChecks: [
        "Chemical coil clean if a hose has not done it",
        "Refrigerant pressures against the spec for the ambient",
        "Outdoor fan motor and capacitor",
        "Airflow measurement across the indoor coil",
      ],
      keepRunning: "It is a protection code rather than a damage code, so it is not urgent in the way U0 is. But it will keep tripping until the airflow problem is fixed, and running a system that keeps hitting high pressure is hard on the compressor.",
      typicalFix: "More often than not this is a proper coil clean, indoor and outdoor, and nothing else. That is a service, not a repair.",
      related: [
        "U0",
        "E5",
        "A6",
      ],
    },
  },
  { brand: "Daikin", code: "A6", system: "aircon",  meaning: "Indoor fan motor fault",                              firstCheck: "Fan motor stalled or capacitor failed. Service call.",                                severity: "warn" },
  { brand: "Daikin", code: "C4", system: "aircon",  meaning: "Indoor heat-exchanger thermistor fault",              firstCheck: "Sensor open-circuit, swap-out fix.",                                                 severity: "warn" },
  { brand: "Daikin", code: "C9", system: "aircon",  meaning: "Indoor air suction thermistor fault",                 firstCheck: "Room-temp sensor failed. Service call.",                                              severity: "warn" },
  { brand: "Daikin", code: "E1", system: "aircon",  meaning: "Outdoor PCB defect",                                  firstCheck: "Outdoor board fault. Power-cycle first, then book service.",                          severity: "warn" },
  { brand: "Daikin", code: "E5", system: "aircon",  meaning: "OL activated (compressor overload)",                  firstCheck: "STOP unit. Compressor overload, likely refrigerant charge or fan issue.",           severity: "critical",
    detail: {
      whatItMeans: "Compressor overload protection has activated. The compressor drew more current than it should and the unit stopped it before something let go.",
      causes: [
        "Refrigerant charge wrong, high or low",
        "Outdoor coil blocked so head pressure climbs",
        "Outdoor fan not running",
        "Failing run capacitor",
        "Compressor windings degrading",
      ],
      diyChecks: [
        "Turn the unit off",
        "Check the outdoor unit has clear air around it and the coil is not caked",
      ],
      techChecks: [
        "Compressor current draw against nameplate",
        "Capacitor test",
        "Refrigerant pressures and charge weight",
        "Winding resistance and insulation resistance",
        "Outdoor fan operation",
      ],
      keepRunning: "No. Overload trips are the compressor telling you it is under strain, and repeated restarts under strain are how compressors die.",
      typicalFix: "Often a capacitor or an airflow problem, both of which are straightforward. Where the windings have gone, we price the compressor and a new system side by side, because at that point they are usually close.",
      related: [
        "U0",
        "E6",
        "F3",
      ],
    },
  },
  { brand: "Daikin", code: "E6", system: "aircon",  meaning: "Compressor lock / start failure",                     firstCheck: "STOP unit. Compressor won't spin up. Warranty / service.",                            severity: "critical" },
  { brand: "Daikin", code: "E7", system: "aircon",  meaning: "Outdoor fan motor lock",                              firstCheck: "Check for debris jamming the outdoor fan. If clear, motor swap.",                     severity: "warn" },
  { brand: "Daikin", code: "F3", system: "aircon",  meaning: "Discharge-pipe temperature too high",                 firstCheck: "Low refrigerant charge or blocked outdoor coil. ARC tech needed.",                   severity: "critical" },
  { brand: "Daikin", code: "L5", system: "aircon",  meaning: "Inverter compressor abnormal",                        firstCheck: "STOP unit. Inverter fault, warranty repair.",                                        severity: "critical" },
  { brand: "Daikin", code: "U0", system: "aircon",  meaning: "Refrigerant shortage",                                firstCheck: "Refrigerant low, check for leak, book an ARC-licensed tech.",                        severity: "critical",
    detail: {
      whatItMeans: "Refrigerant shortage. The unit has worked out there is not enough gas in the system to run safely and has stopped rather than damage itself.",
      causes: [
        "A leak at a flare joint, the most common by a distance",
        "A leak in the indoor or outdoor coil",
        "Poor evacuation at the original install",
        "A leak at a service valve",
      ],
      diyChecks: [
        "Turn it off",
        "Look for oily residue around the outdoor pipework, which is often where a leak shows itself",
      ],
      techChecks: [
        "Pressure test and electronic leak detection",
        "Nitrogen pressure test where the leak is not obvious",
        "Weigh in the correct charge after repair and evacuation",
        "UV dye where the leak is intermittent",
      ],
      keepRunning: "No. Running low on refrigerant is what kills compressors, and the compressor is most of the value of the system.",
      typicalFix: "Find the leak, repair it, pressure test, evacuate properly and recharge to weight. Anyone who offers to just top it up without finding the leak is selling you the same repair again next summer.",
      related: [
        "E5",
        "F3",
        "U4",
      ],
    },
  },
  { brand: "Daikin", code: "U4", system: "aircon",  meaning: "Indoor / outdoor comms error",                        firstCheck: "Check the F1-F2 comms wire, loose terminal or damaged cable.",                     severity: "warn" },

  // ------------------- Fujitsu -------------------
  { brand: "Fujitsu", code: "E:EE", system: "aircon",  meaning: "Room-temp thermistor fault",                       firstCheck: "Thermistor open, sensor swap.",                                                       severity: "warn" },
  { brand: "Fujitsu", code: "E:11", system: "aircon",  meaning: "Comms error indoor ↔ outdoor",                     firstCheck: "Comms wire fault. Check terminals both ends.",                                        severity: "warn" },
  { brand: "Fujitsu", code: "E:12", system: "aircon",  meaning: "Outdoor comms not responding",                     firstCheck: "Outdoor board or power supply, book service.",                                       severity: "warn" },
  { brand: "Fujitsu", code: "E:14", system: "aircon",  meaning: "Signal transmission error (wired remote)",         firstCheck: "Wired controller, check the H1-H2 line terminations.",                              severity: "info" },
  { brand: "Fujitsu", code: "OP:00", system: "aircon", meaning: "Outdoor high-pressure protection",                 firstCheck: "Airflow blocked at outdoor unit. Clear obstructions and re-test.",                    severity: "warn" },
  { brand: "Fujitsu", code: "OP:04", system: "aircon", meaning: "Compressor discharge-temp protection",             firstCheck: "STOP unit. Likely low charge or blocked coil.",                                       severity: "critical" },

  // ------------------- Panasonic -------------------
  { brand: "Panasonic", code: "H11", system: "aircon", meaning: "Indoor / outdoor comms failure",                   firstCheck: "Comms cable fault. Check terminals.",                                                  severity: "warn" },
  { brand: "Panasonic", code: "H15", system: "aircon", meaning: "Compressor sensor error",                          firstCheck: "Sensor failed, service call.",                                                        severity: "warn" },
  { brand: "Panasonic", code: "H27", system: "aircon", meaning: "Outdoor air sensor error",                         firstCheck: "Sensor open, swap-out fix.",                                                          severity: "warn" },
  { brand: "Panasonic", code: "F91", system: "aircon", meaning: "Refrigerant abnormal (leak)",                      firstCheck: "STOP unit. Refrigerant leak, ARC tech needed.",                                       severity: "critical" },
  { brand: "Panasonic", code: "F99", system: "aircon", meaning: "Outdoor DC over-current",                          firstCheck: "STOP unit. Inverter / compressor fault. Warranty service.",                            severity: "critical" },

  // ------------------- LG -------------------
  { brand: "LG", code: "CH01", system: "aircon", meaning: "Indoor room-thermistor error",                            firstCheck: "Sensor open, swap fix.",                                                              severity: "warn" },
  { brand: "LG", code: "CH02", system: "aircon", meaning: "Indoor pipe sensor error",                                firstCheck: "Sensor open, swap fix.",                                                              severity: "warn" },
  { brand: "LG", code: "CH05", system: "aircon", meaning: "Indoor / outdoor comms error",                            firstCheck: "Comms cable, check terminals both ends.",                                            severity: "warn" },
  { brand: "LG", code: "CH21", system: "aircon", meaning: "IPM fault (inverter power module)",                       firstCheck: "STOP unit. Inverter power stage, book warranty service.",                            severity: "critical" },

  // ------------------- Kaden -------------------
  { brand: "Kaden", code: "E1", system: "aircon",  meaning: "Indoor & outdoor comms error",                          firstCheck: "Check comms cable connection between heads.",                                          severity: "warn" },
  { brand: "Kaden", code: "E2", system: "aircon",  meaning: "Room temp sensor fault",                                firstCheck: "Sensor open, sensor swap by installer.",                                              severity: "warn" },
  { brand: "Kaden", code: "E5", system: "aircon",  meaning: "Overcurrent protection",                                firstCheck: "Airflow blocked or refrigerant charge low. Service call.",                             severity: "warn" },
  { brand: "Kaden", code: "F1", system: "aircon",  meaning: "Outdoor unit sensor fault",                             firstCheck: "Outdoor sensor swap, book service.",                                                 severity: "warn" },
  { brand: "Kaden", code: "F3", system: "aircon",  meaning: "Compressor discharge temp too high",                    firstCheck: "STOP unit. Likely low charge. ARC tech required.",                                     severity: "critical" },

  // ------------------- Brivis (h01 30-89 · gas ducted heater fault codes) -------------------
  // Source: authoritative Brivis service manual, curated to add a plain-
  // English "first check" so a homeowner knows if it's a reset-and-retry,
  // a service call, or an immediate STOP-USING-THE-UNIT.
  { brand: "Brivis", code: "h01 30", system: "heater", meaning: "Fan limp mode, fan speed sensor signal invalid",                firstCheck: "Unit runs at safe speed. Book gas heater service, main fan sensor or motor.",                                   severity: "warn" },
  { brand: "Brivis", code: "h01 31", system: "heater", meaning: "Flame roll-out during ignition (auto restart)",                  firstCheck: "Unit will attempt to restart. If it persists, book service, roll-out sensor / burner alignment.",                 severity: "warn",
    detail: {
      whatItMeans: "Flame roll-out was detected during the ignition sequence, and the heater will try to restart itself. The auto-restart is why people often see this one clear on its own and then come back a week later.",
      causes: [
        "Partial flue restriction that only shows up on a cold start",
        "Burner needing a clean",
        "Ignition sequence running rough, often gas pressure",
        "Early-stage heat exchanger cracking",
      ],
      diyChecks: [
        "Note how often it happens, and whether it is only on the first start of the day",
        "Do not keep resetting it to get through the night",
      ],
      techChecks: [
        "Flue inspection",
        "Combustion analysis and carbon monoxide test on the running appliance",
        "Gas pressure test",
        "Burner clean and ignition sequence check",
      ],
      keepRunning: "Not comfortably. It auto-restarts, which makes it feel minor, but the underlying cause is the same family as h01 44. Get it looked at before the next cold snap rather than during it.",
      typicalFix: "Usually a burner clean and a flue check. If combustion testing shows the heat exchanger has gone, that is a replacement conversation.",
      related: [
        "h01 44",
        "h01 40",
      ],
    },
  },
  { brand: "Brivis", code: "h01 32", system: "heater", meaning: "Data error, parameters reset to default",                        firstCheck: "Controller memory fault. Book service to re-commission the unit.",                                                 severity: "warn" },
  { brand: "Brivis", code: "h01 33", system: "heater", meaning: "Modulating gas valve, open circuit on coil",                    firstCheck: "Modulation coil fault. Needs a gas fitter service call.",                                                          severity: "warn" },
  { brand: "Brivis", code: "h01 35", system: "heater", meaning: "Supply-air thermistor fault (open / short)",                     firstCheck: "Sensor swap by installer, no heat until fixed.",                                                                  severity: "warn" },
  { brand: "Brivis", code: "h01 36", system: "heater", meaning: "Bad supply-air thermistor location",                              firstCheck: "Thermistor not reaching setpoint in time, indicates blocked ducts or sensor moved. Book service.",                severity: "warn" },
  { brand: "Brivis", code: "h01 37", system: "heater", meaning: "Speed sensor error, unit in safe mode",                          firstCheck: "Main-fan speed signal wrong. May lockout if persistent. Book service.",                                             severity: "warn" },
  { brand: "Brivis", code: "h01 40", system: "heater", meaning: "Return-air overheat, flue-fan overheat switch open",             firstCheck: "Return-air blockage or fan issue. Clean return-air filter first, then service.",                                    severity: "warn",
    detail: {
      whatItMeans: "The heater has shut down because the air coming back to it is too hot, or the flue fan's overheat switch has opened. Nine times out of ten the heater is fine and it simply cannot get enough air through itself, so heat builds up inside the cabinet and the safety switch does its job.",
      causes: [
        "A blocked or filthy return-air filter, by far the most common cause and the one you can fix yourself",
        "Furniture, a rug or a piece of board sitting over the return-air grille",
        "Too many ceiling vents closed, so the heater has nowhere to push air",
        "A failing main fan that is turning too slowly to move the heat away",
        "A blocked or partly collapsed flue",
      ],
      diyChecks: [
        "Pull the return-air filter out and look at it against the light. If you cannot see through it, that is your fault code",
        "Check nothing is sitting on or against the return-air grille",
        "Open every ceiling vent in the house, including the ones in rooms you do not use",
        "Turn the heater off at the controller for ten minutes, then restart it",
      ],
      techChecks: [
        "Measure the temperature rise across the heat exchanger against the data plate",
        "Check main fan speed and current draw",
        "Inspect the flue and the flue fan for blockage or bird nesting",
        "Test the overheat switch and the supply-air thermistor",
        "Check the ductwork for crushed or disconnected runs in the roof",
      ],
      keepRunning: "It will usually restart itself once it cools down, and it is safe to let it. But if it keeps tripping, stop using it and book someone. Repeated overheating is what cracks a heat exchanger, and a cracked heat exchanger is a carbon monoxide problem rather than a heating one.",
      typicalFix: "Most of these are a filter and a duct check, done in one visit. Where the fan or the overheat switch has genuinely failed it is a parts replacement, and Rinnai stock Brivis parts in Melbourne for units well over a decade old.",
      related: [
        "h01 41",
        "h01 42",
        "h01 43",
      ],
    },
  },
  { brand: "Brivis", code: "h01 41", system: "heater", meaning: "Supply-air overheat switch tripped",                              firstCheck: "Blocked supply ducts / grille. Check no vents shut. Service if it persists.",                                       severity: "warn",
    detail: {
      whatItMeans: "The supply-air overheat switch has tripped. That is the safety on the outlet side of the heater, so the heater is making heat but it is not getting away down the ducts fast enough.",
      causes: [
        "Ceiling vents closed or blocked, especially in bedrooms nobody uses",
        "A crushed, kinked or disconnected flexible duct in the roof space",
        "An undersized or partly blocked return-air path",
        "A fan running slow or failing",
      ],
      diyChecks: [
        "Open every ceiling vent in the house and leave them open",
        "Check nothing is covering a vent, including furniture directly under one",
        "Look at the return-air filter and clean or replace it",
        "Restart the heater after ten minutes and see whether it holds",
      ],
      techChecks: [
        "Static pressure test across the system",
        "Walk the roof space and check every branch duct for crushing or disconnection",
        "Confirm fan speed setting matches the duct design",
        "Test the supply-air overheat switch and thermistor",
      ],
      keepRunning: "Once, on a cold night, with the vents opened up, it is generally fine. Repeatedly, no. Same reasoning as h01 40: overheat cycling is what damages a heat exchanger.",
      typicalFix: "Usually ductwork rather than the heater. Reconnecting or replacing a collapsed branch, or rebalancing the system so the air has somewhere to go.",
      related: [
        "h01 40",
        "h01 42",
        "h01 43",
      ],
    },
  },
  { brand: "Brivis", code: "h01 42", system: "heater", meaning: "Supply-air thermistor temp exceeded overheat threshold",          firstCheck: "Duct blockage forcing overheat. Open all vents, clean filter, book service if persists.",                            severity: "warn" },
  { brand: "Brivis", code: "h01 43", system: "heater", meaning: "Overheat cool-down in progress",                                  firstCheck: "Unit cooling itself down safely. Wait 5 min. If it recurs, service.",                                               severity: "info",
    detail: {
      whatItMeans: "The heater is cooling itself down after an overheat and will come back on by itself. This one is informational rather than a fault, but it is a symptom of the same airflow problem behind h01 40 and h01 41.",
      causes: [
        "Whatever caused the overheat in the first place, usually a blocked filter or closed vents",
        "Normal behaviour immediately after an overheat trip",
      ],
      diyChecks: [
        "Wait five minutes and let it finish",
        "Then check the return-air filter and open all the ceiling vents",
        "If it goes into cool-down repeatedly, treat it as h01 40",
      ],
      techChecks: [
        "Same as h01 40: airflow, filter, ductwork, fan speed and the overheat circuit",
      ],
      keepRunning: "Yes, this one is fine. The heater is protecting itself and will restart. What is not fine is seeing it often, because that means the heater is overheating often.",
      typicalFix: "Fix the airflow and this code stops appearing. It is a symptom rather than a fault.",
      related: [
        "h01 40",
        "h01 41",
        "h01 42",
      ],
    },
  },
  { brand: "Brivis", code: "h01 44", system: "heater", meaning: "Flame roll-out detected during ignition",                         firstCheck: "Roll-out sensor triggered. Book gas fitter, burner or heat exchanger issue.",                                       severity: "warn",
    detail: {
      whatItMeans: "Flame roll-out. The burner flame has come out of the combustion chamber where it should not be, and the roll-out sensor has shut the heater down. This is one of the codes we take seriously immediately.",
      causes: [
        "A blocked or restricted flue, including bird nests, which is more common than people expect",
        "A cracked or corroded heat exchanger",
        "A blocked burner or debris in the combustion chamber",
        "Incorrect gas pressure",
        "A failed flue fan",
      ],
      diyChecks: [
        "Turn the heater off at the controller and leave it off",
        "That is the whole list. Do not restart it repeatedly to see if it clears",
      ],
      techChecks: [
        "Full flue inspection end to end",
        "Heat exchanger inspection for cracking",
        "Carbon monoxide test with a calibrated analyser while the unit runs",
        "Gas pressure test at the appliance",
        "Burner and combustion chamber clean and inspection",
      ],
      keepRunning: "No. Turn it off and leave it off until someone has looked at it. Flame roll-out means combustion is happening where it should not be, and the failure behind it is often a heat exchanger, which puts carbon monoxide into the air you are breathing. Carbon monoxide has no smell and no warning.",
      typicalFix: "Depends entirely on what caused it. A blocked flue is a clean and a bird guard. A cracked heat exchanger is not repairable on most units and means replacing the heater, and we will tell you that plainly rather than sell you a part that does not fix it.",
      related: [
        "h01 31",
        "h01 40",
      ],
    },
  },
  { brand: "Brivis", code: "h01 45", system: "heater", meaning: "Low 24V AC supply voltage",                                       firstCheck: "Power supply issue on the low-voltage transformer. Service call.",                                                    severity: "warn" },
  { brand: "Brivis", code: "h01 46", system: "heater", meaning: "No flame on ignition attempt",                                    firstCheck: "Check gas isolation valve is on. If good, book a gas fitter, igniter, gas pressure, or flame rod.",                 severity: "warn" },
  { brand: "Brivis", code: "h01 47", system: "heater", meaning: "Unstable flame, dropped during validation",                      firstCheck: "Gas pressure or flame rod issue. Book a gas fitter.",                                                                 severity: "warn" },
  { brand: "Brivis", code: "h01 48", system: "heater", meaning: "Pressure loss, combustion chamber switch opened mid-cycle",      firstCheck: "Flue restriction or fan issue. Book service, check flue is clear.",                                                  severity: "warn" },
  { brand: "Brivis", code: "h01 49", system: "heater", meaning: "Flame lost during heating cycle",                                 firstCheck: "Gas supply interruption or flame sensor issue. Book gas fitter.",                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 50", system: "heater", meaning: "Ignition lockout, max ignition attempts exceeded",               firstCheck: "STOP unit. Power cycle at the wall control to reset. If it re-locks, gas fitter required.",                          severity: "critical" },
  { brand: "Brivis", code: "h01 51", system: "heater", meaning: "Roll-out signal with no gas active (sensing circuit fault)",      firstCheck: "Roll-out sensor circuit fault. Book service.",                                                                       severity: "warn" },
  { brand: "Brivis", code: "h01 52", system: "heater", meaning: "Flame signal detected with no gas, flame sensing circuit fault", firstCheck: "Flame rod / control board fault. Book service.",                                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 53", system: "heater", meaning: "Overheat lockout",                                                firstCheck: "STOP unit. Overheat safety triggered multiple times. Gas fitter required before use.",                                severity: "critical" },
  { brand: "Brivis", code: "h01 54", system: "heater", meaning: "Roll-out lockout, max roll-out events during heat cycle",        firstCheck: "STOP unit. Repeated roll-out, burner / heat exchanger inspection required.",                                        severity: "critical" },
  { brand: "Brivis", code: "h01 55", system: "heater", meaning: "Flame validation lockout, flame lost repeatedly at validate step", firstCheck: "STOP unit. Book gas fitter, flame or gas supply issue.",                                                            severity: "critical" },
  { brand: "Brivis", code: "h01 56", system: "heater", meaning: "Pressure switch stuck open, flue fan on but no pressure",        firstCheck: "Pressure switch or tube blocked. Book service.",                                                                      severity: "warn" },
  { brand: "Brivis", code: "h01 57", system: "heater", meaning: "Pressure switch stuck closed, flue fan off but pressure detected", firstCheck: "Pressure switch stuck. Book service.",                                                                               severity: "warn" },
  { brand: "Brivis", code: "h01 58", system: "heater", meaning: "Pressure switch fail, max pressure-loss events exceeded",        firstCheck: "STOP unit. Flue / pressure switch fault. Book service.",                                                              severity: "critical" },
  { brand: "Brivis", code: "h01 59", system: "heater", meaning: "Cross-check comms error between primary and secondary MCU",       firstCheck: "Control board comms fault. Board-level service required.",                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 60", system: "heater", meaning: "Motor open circuit, no zero-cross detect signal",                firstCheck: "Fan motor open circuit, book service. Motor swap likely.",                                                          severity: "warn" },
  { brand: "Brivis", code: "h01 61", system: "heater", meaning: "Primary valve stuck off, relay contact not closing",             firstCheck: "Gas valve relay fault. Book gas fitter.",                                                                             severity: "warn" },
  { brand: "Brivis", code: "h01 62", system: "heater", meaning: "Primary valve stuck on, relay contact welded",                   firstCheck: "STOP unit. Gas valve relay stuck. Gas fitter needed immediately.",                                                    severity: "critical" },
  { brand: "Brivis", code: "h01 63", system: "heater", meaning: "Primary valve fail, relay not closing during heating",           firstCheck: "STOP unit. Gas valve fault. Book gas fitter.",                                                                         severity: "critical" },
  { brand: "Brivis", code: "h01 64", system: "heater", meaning: "Modulating valve overcurrent (>150 mA)",                          firstCheck: "Modulation coil short. Book service.",                                                                                severity: "warn" },
  { brand: "Brivis", code: "h01 65", system: "heater", meaning: "Motor lockout, fan limp + open circuit or overheat combo",       firstCheck: "STOP unit. Multiple fan faults combined. Book service.",                                                              severity: "critical" },
  { brand: "Brivis", code: "h01 66", system: "heater", meaning: "Secondary valve stuck off",                                       firstCheck: "Second gas valve relay fault. Gas fitter.",                                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 67", system: "heater", meaning: "Secondary valve stuck on",                                        firstCheck: "STOP unit. Gas valve stuck. Gas fitter needed immediately.",                                                          severity: "critical" },
  { brand: "Brivis", code: "h01 68", system: "heater", meaning: "Secondary valve fail during heating",                             firstCheck: "STOP unit. Gas fitter required.",                                                                                     severity: "critical" },
  { brand: "Brivis", code: "h01 69", system: "heater", meaning: "Fuse blown, 24V AC voltage lost",                                firstCheck: "2A fuse on the control board is open. Service call to replace + diagnose why it blew.",                               severity: "warn" },
  { brand: "Brivis", code: "h01 70", system: "heater", meaning: "Remote MCU shutdown fail",                                        firstCheck: "Control-board fault. Board-level service.",                                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 71", system: "heater", meaning: "Remote MCU state mismatch",                                       firstCheck: "Control-board fault. Board-level service.",                                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 72", system: "heater", meaning: "Ambiguous fault, unattributed shutdown",                          firstCheck: "Undiagnosed shutdown. Book service to read secondary log.",                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 73", system: "heater", meaning: "Remote MCU next-state mismatch",                                  firstCheck: "Control-board firmware or hardware fault. Book service.",                                                              severity: "warn" },
  { brand: "Brivis", code: "h01 74", system: "heater", meaning: "Remote MCU lockout (secondary board locked)",                     firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 75", system: "heater", meaning: "AC input scan fault, 24V input stuck high",                      firstCheck: "Input scanning circuit fault. Board-level service.",                                                                    severity: "warn" },
  { brand: "Brivis", code: "h01 76", system: "heater", meaning: "Lockout storage fault, non-volatile memory access failure",       firstCheck: "Control board's ability to store lockouts compromised. Book service.",                                                severity: "warn" },
  { brand: "Brivis", code: "h01 77", system: "heater", meaning: "Remote MCU IO mismatch",                                          firstCheck: "IO state mismatch between board MCUs. Book service.",                                                                  severity: "warn" },
  { brand: "Brivis", code: "h01 79", system: "heater", meaning: "A/D converter reference voltage check failed",                    firstCheck: "Board-level analog fault. Service.",                                                                                   severity: "warn" },
  { brand: "Brivis", code: "h01 80", system: "heater", meaning: "Flame sense fault, measured voltage out of range",               firstCheck: "Flame rod or sensing circuit fault. Book gas fitter.",                                                                 severity: "warn" },
  { brand: "Brivis", code: "h01 81", system: "heater", meaning: "Roll-out sense fault, sensor voltage out of range",              firstCheck: "Roll-out sensor circuit fault. Book service.",                                                                          severity: "warn" },
  { brand: "Brivis", code: "h01 82", system: "heater", meaning: "System timing fault, MCU timing vs 50 Hz mismatch",              firstCheck: "Control-board timing fault. Board-level service.",                                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 83", system: "heater", meaning: "System execution fault, internal MCU error",                     firstCheck: "Control-board firmware fault. Board-level service.",                                                                    severity: "warn" },
  { brand: "Brivis", code: "h01 84", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 85", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 86", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 87", system: "heater", meaning: "Cross-check comms fault, no MCU comms >10 s",                    firstCheck: "Control-board comms failure. Board-level service.",                                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 88", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 89", system: "heater", meaning: "MCU non-volatile storage test code (not seen in normal use)",     firstCheck: "Diagnostic-only code, service tech will interpret. If it appears on normal operation, book service.",                severity: "info" },

  // ------------------- Reclaim (CO2 heat pump hot water) -------------------
  { brand: "Reclaim",  code: "E1", system: "hot-water", meaning: "Ambient temp sensor fault",                       firstCheck: "Outdoor sensor open-circuit. Book a Reclaim-accredited service tech.",                    severity: "warn" },
  { brand: "Reclaim",  code: "E2", system: "hot-water", meaning: "Evaporator temp sensor fault",                    firstCheck: "Evaporator sensor fault, swap-out fix by a tech.",                                        severity: "warn" },
  { brand: "Reclaim",  code: "E3", system: "hot-water", meaning: "Discharge / suction sensor fault",                firstCheck: "Sensor swap by an ARC-licensed tech.",                                                      severity: "warn" },
  { brand: "Reclaim",  code: "E4", system: "hot-water", meaning: "Tank temp sensor fault",                          firstCheck: "Tank thermistor open, sensor swap. Water still heats via boost.",                          severity: "warn" },
  { brand: "Reclaim",  code: "E5", system: "hot-water", meaning: "High-pressure fault (CO2)",                       firstCheck: "STOP unit. Refrigerant charge / heat-exchanger issue. Warranty service.",                   severity: "critical",
    detail: {
      whatItMeans: "High pressure fault on the CO2 circuit. Reclaim runs carbon dioxide as a refrigerant at much higher pressures than an ordinary heat pump, so its pressure protection is more sensitive and worth respecting.",
      causes: [
        "Restricted airflow across the evaporator, often leaves or lint",
        "Water flow problem between the heat pump and the tank",
        "A failing circulation pump",
        "Heat exchanger fouling",
        "Refrigerant charge issue",
      ],
      diyChecks: [
        "Turn the system off at the controller",
        "Clear anything blocking airflow to the outdoor heat pump",
        "Check nothing has grown up against it over summer",
      ],
      techChecks: [
        "CO2 circuit pressures against Reclaim's spec",
        "Water flow rate between heat pump and tank",
        "Circulation pump operation",
        "Heat exchanger and evaporator condition",
      ],
      keepRunning: "No. Stop it and book it. The good news is that Reclaim's heat pump warranty runs ten years parts and labour on their own unit, so if the system is within that window this is very likely covered.",
      typicalFix: "Often airflow or water flow rather than the refrigerant circuit itself. Where it is the circuit, it is a warranty job through Reclaim rather than something to pay for out of pocket.",
      related: [
        "E6",
        "E7",
        "F1",
      ],
    },
  },
  { brand: "Reclaim",  code: "E6", system: "hot-water", meaning: "Low-pressure fault (CO2)",                        firstCheck: "STOP unit. Likely refrigerant leak, Reclaim tech required.",                                severity: "critical" },
  { brand: "Reclaim",  code: "E7", system: "hot-water", meaning: "Compressor overload",                             firstCheck: "STOP unit. Compressor at risk, book warranty service.",                                     severity: "critical" },
  { brand: "Reclaim",  code: "F1", system: "hot-water", meaning: "Comms error tank ↔ heat pump",                    firstCheck: "Check the comms wire between the outdoor heat pump and the tank controller.",              severity: "warn",
    detail: {
      whatItMeans: "The tank controller and the outdoor heat pump have lost communication. The tank knows it wants hot water; the heat pump is not hearing about it.",
      causes: [
        "Damaged comms cable between the outdoor unit and the tank, which on a split install can be a long run",
        "Water in a junction or terminal",
        "A loose terminal at either end",
        "Controller fault, which is the least common",
      ],
      diyChecks: [
        "Look along the visible run of cable between the outdoor unit and the tank for obvious damage",
        "Check nothing has been dug up, whipper-snipped or nailed through recently",
      ],
      techChecks: [
        "Continuity test on the comms run",
        "Terminal inspection at both ends for water and corrosion",
        "Controller diagnostics",
        "Check the run length is within Reclaim's spec, which matters on a long split",
      ],
      keepRunning: "You will have hot water for as long as the tank stays hot, then you will not, because the heat pump is not being told to run. It is not dangerous, just a countdown.",
      typicalFix: "Usually a cable or a terminal, fixed on the first visit. Controllers carry ten years on the Reclaim unit, so a genuine controller failure inside that window is a warranty claim.",
      related: [
        "E5",
        "E6",
        "E4",
      ],
    },
  },

  // ------------------- iStore -------------------
  { brand: "iStore",   code: "E1", system: "hot-water", meaning: "Ambient temp sensor fault",                       firstCheck: "Sensor open-circuit. Book service, water will still heat on boost element.",              severity: "warn" },
  { brand: "iStore",   code: "E2", system: "hot-water", meaning: "Evaporator sensor fault",                         firstCheck: "Sensor swap by installer.",                                                                  severity: "warn" },
  { brand: "iStore",   code: "E3", system: "hot-water", meaning: "Condenser sensor fault",                          firstCheck: "Sensor open, service call.",                                                                severity: "warn" },
  { brand: "iStore",   code: "E4", system: "hot-water", meaning: "Tank sensor fault",                               firstCheck: "Tank thermistor fault, sensor swap.",                                                       severity: "warn" },
  { brand: "iStore",   code: "E5", system: "hot-water", meaning: "Compressor high pressure",                        firstCheck: "STOP unit. Likely blocked evaporator airflow. Clean coil.",                                  severity: "critical",
    detail: {
      whatItMeans: "Compressor high pressure on an iStore heat pump. On an all-in-one this is usually the evaporator not getting the air it needs rather than anything wrong inside the refrigerant circuit.",
      causes: [
        "Evaporator coil blocked with dust or lint, the most common by far",
        "The unit installed somewhere with not enough air movement around it",
        "Fan failing or slowing",
        "Very high ambient plus a dirty coil together",
      ],
      diyChecks: [
        "Turn it off at the isolator",
        "Look at the coil, if you can see it, and check whether it is furred up with dust",
        "Make sure nothing is stacked against the unit",
      ],
      techChecks: [
        "Coil clean and airflow check",
        "Refrigerant pressures against spec",
        "Fan motor test",
        "Confirm clearances match iStore's install requirements",
      ],
      keepRunning: "Turn it off. You will still have whatever hot water is in the tank, and on most iStore units the electric boost will keep you going while you wait, which is worth knowing if you have a house full of people.",
      typicalFix: "Usually a coil clean and better clearance around the unit. iStore carry a 6-year tank and 3-year compressor warranty, so a genuine refrigerant-side fault inside that period is a warranty job.",
      related: [
        "E8",
        "E7",
        "E1",
      ],
    },
  },
  { brand: "iStore",   code: "E7", system: "hot-water", meaning: "Anti-freeze protection triggered",                firstCheck: "Very cold ambient, normal in winter. If persistent, book service.",                          severity: "info" },
  { brand: "iStore",   code: "E8", system: "hot-water", meaning: "Compressor drive fault",                          firstCheck: "STOP unit. Inverter drive fault, warranty repair.",                                          severity: "critical" },

  // ------------------- Thermann -------------------
  { brand: "Thermann", code: "E1", system: "hot-water", meaning: "Water temp sensor fault (integrated HP)",         firstCheck: "Sensor open, Thermann service call.",                                                       severity: "warn" },
  { brand: "Thermann", code: "E2", system: "hot-water", meaning: "Ambient sensor fault",                            firstCheck: "Sensor open, swap by installer.",                                                             severity: "warn" },
  { brand: "Thermann", code: "E5", system: "hot-water", meaning: "Compressor overload",                             firstCheck: "STOP unit. Book warranty service.",                                                            severity: "critical" },
  { brand: "Thermann", code: "F1", system: "hot-water", meaning: "Comms error (integrated HP)",                     firstCheck: "Check internal comms wire between board and controller.",                                     severity: "warn" },
  { brand: "Thermann", code: "12", system: "hot-water", meaning: "G-series continuous flow, ignition failure",     firstCheck: "Check gas supply on. If OK, needs a licensed gas fitter.",                                    severity: "warn" },
  { brand: "Thermann", code: "11", system: "hot-water", meaning: "G-series, no ignition detected",                 firstCheck: "Gas valve or igniter fault. Book a gas fitter.",                                              severity: "warn" },

  // ------------------- Braemar (gas ducted / evap) -------------------
  { brand: "Braemar", code: "23",  system: "heater",   meaning: "Overheat lockout",                                firstCheck: "Blocked filter or return-air path. Clean filter and reset.",                                 severity: "warn" },
  { brand: "Braemar", code: "27",  system: "heater",   meaning: "Ignition failure (no flame sensed)",              firstCheck: "Check gas is on. If OK, needs a licensed gas fitter to inspect igniter + flame sensor.",     severity: "warn" },
  { brand: "Braemar", code: "42",  system: "heater",   meaning: "Fan proving switch fault",                        firstCheck: "Fan not detected running. Book gas heater service.",                                          severity: "warn" },
  { brand: "Braemar", code: "51",  system: "heater",   meaning: "Wall-controller comms lost",                      firstCheck: "Check the low-voltage comms wire between controller and unit.",                              severity: "info" },
  { brand: "Braemar", code: "58",  system: "heater",   meaning: "Zone motor / damper fault",                       firstCheck: "One zone motor stuck, book service to swap the damper motor.",                              severity: "warn" },

  // ------------------- Bonaire (evap / gas ducted) -------------------
  { brand: "Bonaire", code: "E01", system: "evap",   meaning: "Water pump fault (evap)",                         firstCheck: "Check evap water supply on. If OK, pump swap needed.",                                        severity: "warn" },
  { brand: "Bonaire", code: "E02", system: "evap",   meaning: "Water level fault (evap)",                        firstCheck: "Water inlet blocked or float stuck. Clean the reservoir.",                                    severity: "warn" },
  { brand: "Bonaire", code: "E04", system: "evap",   meaning: "Fan motor fault",                                 firstCheck: "Motor seized or capacitor gone. Book service.",                                               severity: "warn" },
  { brand: "Bonaire", code: "E05", system: "evap",   meaning: "Ambient temp sensor fault",                       firstCheck: "Outdoor sensor open, sensor swap by installer.",                                             severity: "warn" },
  { brand: "Bonaire", code: "E12", system: "evap",   meaning: "Comms error (integrated system)",                 firstCheck: "Check comms wire between wall controller and unit.",                                          severity: "info" },

  // ------------------- Sanden (heat pump hot water) -------------------
  { brand: "Sanden",  code: "F1",  system: "hot-water", meaning: "Comms error tank ↔ heat pump",                    firstCheck: "Check the comms cable between heat pump and tank controller.",                              severity: "warn" },
  { brand: "Sanden",  code: "F2",  system: "hot-water", meaning: "Tank temp sensor fault",                          firstCheck: "Tank thermistor swap, service call.",                                                        severity: "warn" },
  { brand: "Sanden",  code: "F3",  system: "hot-water", meaning: "Ambient sensor fault",                            firstCheck: "Outdoor sensor open. Service call.",                                                          severity: "warn" },
  { brand: "Sanden",  code: "F5",  system: "hot-water", meaning: "High-pressure protection (CO₂)",                  firstCheck: "STOP unit. Refrigerant issue. Warranty tech required.",                                       severity: "critical" },
  { brand: "Sanden",  code: "F7",  system: "hot-water", meaning: "Compressor overload",                             firstCheck: "STOP unit. Book warranty service.",                                                            severity: "critical" },

  // ------------------- Rheem (electric + gas storage) -------------------
  { brand: "Rheem",   code: "1",   system: "hot-water", meaning: "Water temp sensor fault",                         firstCheck: "Sensor open, book service. Element still heats but at fixed temp.",                          severity: "warn" },
  { brand: "Rheem",   code: "12",  system: "hot-water", meaning: "Ignition failure (gas storage)",                  firstCheck: "Check gas supply. If OK, needs a gas fitter, igniter or valve fault.",                       severity: "warn" },
  { brand: "Rheem",   code: "14",  system: "hot-water", meaning: "Blocked flue",                                   firstCheck: "STOP unit. Flue restriction / no draft. Gas fitter required immediately.",                    severity: "critical" },

  // ------------------- Rinnai (gas continuous flow) -------------------
  { brand: "Rinnai",  code: "11",  system: "hot-water", meaning: "No ignition on gas continuous flow",              firstCheck: "Check the gas isolation valve is open. If OK, gas fitter needed.",                            severity: "warn",
    detail: {
      whatItMeans: "No ignition on a gas continuous flow unit. The unit tried to light, did not, and locked out rather than keep pumping gas.",
      causes: [
        "Gas isolation valve turned off, and yes this is genuinely the most common cause",
        "LPG bottle empty or the changeover valve not switched",
        "Gas supply interrupted, sometimes a network issue after works in the street",
        "Igniter or flame rod dirty",
        "Gas pressure too low at the appliance",
      ],
      diyChecks: [
        "Check the gas isolation valve at the unit is open, the handle should be in line with the pipe",
        "If you are on LPG, check the bottle and the changeover valve",
        "Check other gas appliances in the house still work, which tells you whether it is the unit or the supply",
        "Turn the unit off at the power point for a minute and back on",
      ],
      techChecks: [
        "Gas pressure test at the appliance, working and standing",
        "Igniter and flame rod inspection and clean",
        "Combustion analysis",
        "Check the gas line is sized correctly, which catches a surprising number of these on units added later",
      ],
      keepRunning: "There is nothing to keep running; it is locked out and that is the unit behaving correctly. It is safe to leave connected.",
      typicalFix: "Half of these are a valve or a bottle and cost you a phone call. Where it is real, it is an igniter, a flame rod clean or a gas pressure problem, all fixed on the first visit.",
      related: [
        "12",
        "14",
        "61",
      ],
    },
  },
  { brand: "Rinnai",  code: "12",  system: "hot-water", meaning: "Flame failure (drops out mid-shower)",            firstCheck: "Gas pressure low or igniter dirty. Book Rinnai service.",                                     severity: "warn" },
  { brand: "Rinnai",  code: "14",  system: "hot-water", meaning: "Thermal fuse activated (overtemp)",               firstCheck: "STOP unit. Overheat safety triggered, book service before use.",                             severity: "critical",
    detail: {
      whatItMeans: "The thermal fuse has activated. Something got hot enough inside the unit to trip a one-shot safety device, and that device does not reset.",
      causes: [
        "Blocked flue or exhaust path",
        "Fan failure so combustion products are not being cleared",
        "Heat exchanger scaled up internally, which is common on hard water",
        "Overheating from a water flow restriction",
      ],
      diyChecks: [
        "Turn the unit off at the power point and leave it off",
        "Do not attempt to reset it",
      ],
      techChecks: [
        "Flue and exhaust inspection",
        "Fan operation and current draw",
        "Heat exchanger condition and scale check",
        "Water flow rate through the unit",
        "Carbon monoxide test",
      ],
      keepRunning: "No. A thermal fuse trips once and stays tripped, which tells you the designers thought this was worth stopping the appliance for. Leave it off until a gas fitter has looked at it.",
      typicalFix: "The fuse itself is a part, but replacing it without finding what cooked it just means it trips again. We find the cause first. On an older unit with a scaled heat exchanger, replacement is often the honest answer.",
      related: [
        "11",
        "12",
        "16",
      ],
    },
  },
  { brand: "Rinnai",  code: "16",  system: "hot-water", meaning: "High temp warning",                              firstCheck: "Temperature setting or thermistor issue. Check controller setpoint first.",                    severity: "warn" },
  { brand: "Rinnai",  code: "61",  system: "hot-water", meaning: "Fan motor fault",                                firstCheck: "Fan not spinning. Book service.",                                                              severity: "warn" },

  // ------------------- Extra Mitsubishi codes -------------------
  { brand: "Mitsubishi Electric", code: "P7", system: "aircon", meaning: "System error / multi-head miswire",       firstCheck: "Indoor unit address conflict on multi-head. Requires MXZ config check.",                       severity: "warn" },
  { brand: "Mitsubishi Electric", code: "U8", system: "aircon", meaning: "Outdoor DC voltage abnormal",             firstCheck: "STOP unit. Power supply or inverter drive fault, warranty service.",                          severity: "critical" },

  // ------------------- Extra Daikin codes -------------------
  { brand: "Daikin",  code: "H9",  system: "aircon",   meaning: "Outdoor ambient sensor fault",                    firstCheck: "Sensor open, swap fix.",                                                                     severity: "warn" },
  { brand: "Daikin",  code: "J3",  system: "aircon",   meaning: "Discharge pipe thermistor fault",                  firstCheck: "Sensor swap by installer.",                                                                    severity: "warn" },
  { brand: "Daikin",  code: "P4",  system: "aircon",   meaning: "Heat sink temperature abnormal",                   firstCheck: "STOP unit. Inverter overheat. Warranty service.",                                              severity: "critical" },
];

/** Distinct brands present in the table, alphabetised for filter UI. */
export const FAULT_BRANDS: string[] = Array.from(
  new Set(FAULT_CODES.map((f) => f.brand)),
).sort();

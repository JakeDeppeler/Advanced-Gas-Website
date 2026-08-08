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

export type FaultCode = {
  brand: string;
  code: string;
  meaning: string;
  firstCheck: string;
  severity: "info" | "warn" | "critical";
};

export const FAULT_CODES: FaultCode[] = [
  // ------------------- Mitsubishi Electric -------------------
  { brand: "Mitsubishi Electric", code: "P1",  meaning: "Indoor room-thermistor fault",           firstCheck: "Indoor unit thermistor loose or failed — needs a service call.",                      severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P2",  meaning: "Indoor pipe-thermistor fault",           firstCheck: "Pipe sensor open-circuit — usually a swap-out fix.",                                 severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P4",  meaning: "Drain sensor fault",                     firstCheck: "Check the condensate drain pan isn't clogged; sensor may need replacing.",           severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P5",  meaning: "Drain pump fault",                       firstCheck: "Condensate pump seized or blocked — clear the drain line and re-test.",              severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P6",  meaning: "Coil frost / overheat protection",       firstCheck: "Filter blocked or airflow restricted. Clean filters + check outdoor coil.",          severity: "info" },
  { brand: "Mitsubishi Electric", code: "P8",  meaning: "Pipe temperature abnormal",              firstCheck: "Low refrigerant charge or restriction. Needs an ARC-licensed tech.",                severity: "warn" },
  { brand: "Mitsubishi Electric", code: "E0",  meaning: "Remote-control transmission error",      firstCheck: "Wired controller comms drop — check controller wire terminations.",                 severity: "info" },
  { brand: "Mitsubishi Electric", code: "E6",  meaning: "Indoor / outdoor comms failure",         firstCheck: "Check the S1-S2-S3 comms wire between indoor & outdoor units.",                     severity: "warn" },
  { brand: "Mitsubishi Electric", code: "E9",  meaning: "Indoor / outdoor comms error (variant)", firstCheck: "Same as E6 — comms cable, check for damage or loose terminals.",                    severity: "warn" },
  { brand: "Mitsubishi Electric", code: "U2",  meaning: "Compressor overheat / oil shortage",     firstCheck: "STOP using the unit. Compressor at risk — book a warranty service call.",           severity: "critical" },
  { brand: "Mitsubishi Electric", code: "U4",  meaning: "Outdoor thermistor open-circuit",        firstCheck: "Outdoor coil or discharge sensor faulty. Tech required.",                            severity: "warn" },

  // ------------------- Daikin -------------------
  { brand: "Daikin", code: "A1",  meaning: "Indoor PCB defect",                                   firstCheck: "Indoor board fault — power-cycle the unit first, then service if it returns.",       severity: "warn" },
  { brand: "Daikin", code: "A5",  meaning: "High-pressure control / freeze-up protection",        firstCheck: "Filter dirty or outdoor coil blocked. Clean both, re-test.",                        severity: "info" },
  { brand: "Daikin", code: "A6",  meaning: "Indoor fan motor fault",                              firstCheck: "Fan motor stalled or capacitor failed. Service call.",                                severity: "warn" },
  { brand: "Daikin", code: "C4",  meaning: "Indoor heat-exchanger thermistor fault",              firstCheck: "Sensor open-circuit — swap-out fix.",                                                 severity: "warn" },
  { brand: "Daikin", code: "C9",  meaning: "Indoor air suction thermistor fault",                 firstCheck: "Room-temp sensor failed. Service call.",                                              severity: "warn" },
  { brand: "Daikin", code: "E1",  meaning: "Outdoor PCB defect",                                  firstCheck: "Outdoor board fault. Power-cycle first, then book service.",                          severity: "warn" },
  { brand: "Daikin", code: "E5",  meaning: "OL activated (compressor overload)",                  firstCheck: "STOP unit. Compressor overload — likely refrigerant charge or fan issue.",           severity: "critical" },
  { brand: "Daikin", code: "E6",  meaning: "Compressor lock / start failure",                     firstCheck: "STOP unit. Compressor won't spin up. Warranty / service.",                            severity: "critical" },
  { brand: "Daikin", code: "E7",  meaning: "Outdoor fan motor lock",                              firstCheck: "Check for debris jamming the outdoor fan. If clear, motor swap.",                     severity: "warn" },
  { brand: "Daikin", code: "F3",  meaning: "Discharge-pipe temperature too high",                 firstCheck: "Low refrigerant charge or blocked outdoor coil. ARC tech needed.",                   severity: "critical" },
  { brand: "Daikin", code: "L5",  meaning: "Inverter compressor abnormal",                        firstCheck: "STOP unit. Inverter fault — warranty repair.",                                        severity: "critical" },
  { brand: "Daikin", code: "U0",  meaning: "Refrigerant shortage",                                firstCheck: "Refrigerant low — check for leak, book an ARC-licensed tech.",                        severity: "critical" },
  { brand: "Daikin", code: "U4",  meaning: "Indoor / outdoor comms error",                        firstCheck: "Check the F1-F2 comms wire — loose terminal or damaged cable.",                     severity: "warn" },

  // ------------------- Fujitsu -------------------
  { brand: "Fujitsu", code: "E:EE",  meaning: "Room-temp thermistor fault",                       firstCheck: "Thermistor open — sensor swap.",                                                       severity: "warn" },
  { brand: "Fujitsu", code: "E:11",  meaning: "Comms error indoor ↔ outdoor",                     firstCheck: "Comms wire fault. Check terminals both ends.",                                        severity: "warn" },
  { brand: "Fujitsu", code: "E:12",  meaning: "Outdoor comms not responding",                     firstCheck: "Outdoor board or power supply — book service.",                                       severity: "warn" },
  { brand: "Fujitsu", code: "E:14",  meaning: "Signal transmission error (wired remote)",         firstCheck: "Wired controller — check the H1-H2 line terminations.",                              severity: "info" },
  { brand: "Fujitsu", code: "OP:00", meaning: "Outdoor high-pressure protection",                 firstCheck: "Airflow blocked at outdoor unit. Clear obstructions and re-test.",                    severity: "warn" },
  { brand: "Fujitsu", code: "OP:04", meaning: "Compressor discharge-temp protection",             firstCheck: "STOP unit. Likely low charge or blocked coil.",                                       severity: "critical" },

  // ------------------- Panasonic -------------------
  { brand: "Panasonic", code: "H11", meaning: "Indoor / outdoor comms failure",                   firstCheck: "Comms cable fault. Check terminals.",                                                  severity: "warn" },
  { brand: "Panasonic", code: "H15", meaning: "Compressor sensor error",                          firstCheck: "Sensor failed — service call.",                                                        severity: "warn" },
  { brand: "Panasonic", code: "H27", meaning: "Outdoor air sensor error",                         firstCheck: "Sensor open — swap-out fix.",                                                          severity: "warn" },
  { brand: "Panasonic", code: "F91", meaning: "Refrigerant abnormal (leak)",                      firstCheck: "STOP unit. Refrigerant leak — ARC tech needed.",                                       severity: "critical" },
  { brand: "Panasonic", code: "F99", meaning: "Outdoor DC over-current",                          firstCheck: "STOP unit. Inverter / compressor fault. Warranty service.",                            severity: "critical" },

  // ------------------- LG -------------------
  { brand: "LG", code: "CH01", meaning: "Indoor room-thermistor error",                            firstCheck: "Sensor open — swap fix.",                                                              severity: "warn" },
  { brand: "LG", code: "CH02", meaning: "Indoor pipe sensor error",                                firstCheck: "Sensor open — swap fix.",                                                              severity: "warn" },
  { brand: "LG", code: "CH05", meaning: "Indoor / outdoor comms error",                            firstCheck: "Comms cable — check terminals both ends.",                                            severity: "warn" },
  { brand: "LG", code: "CH21", meaning: "IPM fault (inverter power module)",                       firstCheck: "STOP unit. Inverter power stage — book warranty service.",                            severity: "critical" },

  // ------------------- Kaden -------------------
  { brand: "Kaden", code: "E1",  meaning: "Indoor & outdoor comms error",                          firstCheck: "Check comms cable connection between heads.",                                          severity: "warn" },
  { brand: "Kaden", code: "E2",  meaning: "Room temp sensor fault",                                firstCheck: "Sensor open — sensor swap by installer.",                                              severity: "warn" },
  { brand: "Kaden", code: "E5",  meaning: "Overcurrent protection",                                firstCheck: "Airflow blocked or refrigerant charge low. Service call.",                             severity: "warn" },
  { brand: "Kaden", code: "F1",  meaning: "Outdoor unit sensor fault",                             firstCheck: "Outdoor sensor swap — book service.",                                                 severity: "warn" },
  { brand: "Kaden", code: "F3",  meaning: "Compressor discharge temp too high",                    firstCheck: "STOP unit. Likely low charge. ARC tech required.",                                     severity: "critical" },

  // ------------------- Brivis (gas heaters, but same code territory) -------------------
  { brand: "Brivis", code: "22",  meaning: "Overheat safety limit tripped",                        firstCheck: "Blocked filter or blocked return-air path. Clean filter, reset unit.",                severity: "warn" },
  { brand: "Brivis", code: "37",  meaning: "Ignition failure — no gas or dirty igniter",           firstCheck: "Check gas supply on. If good, needs a gas fitter to inspect the igniter.",            severity: "warn" },
  { brand: "Brivis", code: "43",  meaning: "Fan proving switch open",                              firstCheck: "Fan not spinning up. Book gas heater service.",                                        severity: "warn" },
  { brand: "Brivis", code: "50",  meaning: "Communications lost (network wall control)",           firstCheck: "Check the network wire between the wall control and the heater.",                     severity: "info" },
];

/** Distinct brands present in the table, alphabetised for filter UI. */
export const FAULT_BRANDS: string[] = Array.from(
  new Set(FAULT_CODES.map((f) => f.brand)),
).sort();

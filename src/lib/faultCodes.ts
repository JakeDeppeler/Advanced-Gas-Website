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

export type FaultCode = {
  brand: string;
  code: string;
  system: FaultSystem;
  meaning: string;
  firstCheck: string;
  severity: "info" | "warn" | "critical";
};

/** Labels used in the filter chip UI. */
export const FAULT_SYSTEM_LABELS: Record<FaultSystem, string> = {
  "aircon": "Air conditioner",
  "heater": "Gas heater",
  "hot-water": "Hot water",
  "evap": "Evap cooler",
};

export const FAULT_CODES: FaultCode[] = [
  // ------------------- Mitsubishi Electric -------------------
  { brand: "Mitsubishi Electric", code: "P1",  system: "aircon", meaning: "Indoor room-thermistor fault",           firstCheck: "Indoor unit thermistor loose or failed — needs a service call.",                      severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P2", system: "aircon",  meaning: "Indoor pipe-thermistor fault",           firstCheck: "Pipe sensor open-circuit — usually a swap-out fix.",                                 severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P4", system: "aircon",  meaning: "Drain sensor fault",                     firstCheck: "Check the condensate drain pan isn't clogged; sensor may need replacing.",           severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P5", system: "aircon",  meaning: "Drain pump fault",                       firstCheck: "Condensate pump seized or blocked — clear the drain line and re-test.",              severity: "warn" },
  { brand: "Mitsubishi Electric", code: "P6", system: "aircon",  meaning: "Coil frost / overheat protection",       firstCheck: "Filter blocked or airflow restricted. Clean filters + check outdoor coil.",          severity: "info" },
  { brand: "Mitsubishi Electric", code: "P8", system: "aircon",  meaning: "Pipe temperature abnormal",              firstCheck: "Low refrigerant charge or restriction. Needs an ARC-licensed tech.",                severity: "warn" },
  { brand: "Mitsubishi Electric", code: "E0", system: "aircon",  meaning: "Remote-control transmission error",      firstCheck: "Wired controller comms drop — check controller wire terminations.",                 severity: "info" },
  { brand: "Mitsubishi Electric", code: "E6", system: "aircon",  meaning: "Indoor / outdoor comms failure",         firstCheck: "Check the S1-S2-S3 comms wire between indoor & outdoor units.",                     severity: "warn" },
  { brand: "Mitsubishi Electric", code: "E9", system: "aircon",  meaning: "Indoor / outdoor comms error (variant)", firstCheck: "Same as E6 — comms cable, check for damage or loose terminals.",                    severity: "warn" },
  { brand: "Mitsubishi Electric", code: "U2", system: "aircon",  meaning: "Compressor overheat / oil shortage",     firstCheck: "STOP using the unit. Compressor at risk — book a warranty service call.",           severity: "critical" },
  { brand: "Mitsubishi Electric", code: "U4", system: "aircon",  meaning: "Outdoor thermistor open-circuit",        firstCheck: "Outdoor coil or discharge sensor faulty. Tech required.",                            severity: "warn" },

  // ------------------- Daikin -------------------
  { brand: "Daikin", code: "A1", system: "aircon",  meaning: "Indoor PCB defect",                                   firstCheck: "Indoor board fault — power-cycle the unit first, then service if it returns.",       severity: "warn" },
  { brand: "Daikin", code: "A5", system: "aircon",  meaning: "High-pressure control / freeze-up protection",        firstCheck: "Filter dirty or outdoor coil blocked. Clean both, re-test.",                        severity: "info" },
  { brand: "Daikin", code: "A6", system: "aircon",  meaning: "Indoor fan motor fault",                              firstCheck: "Fan motor stalled or capacitor failed. Service call.",                                severity: "warn" },
  { brand: "Daikin", code: "C4", system: "aircon",  meaning: "Indoor heat-exchanger thermistor fault",              firstCheck: "Sensor open-circuit — swap-out fix.",                                                 severity: "warn" },
  { brand: "Daikin", code: "C9", system: "aircon",  meaning: "Indoor air suction thermistor fault",                 firstCheck: "Room-temp sensor failed. Service call.",                                              severity: "warn" },
  { brand: "Daikin", code: "E1", system: "aircon",  meaning: "Outdoor PCB defect",                                  firstCheck: "Outdoor board fault. Power-cycle first, then book service.",                          severity: "warn" },
  { brand: "Daikin", code: "E5", system: "aircon",  meaning: "OL activated (compressor overload)",                  firstCheck: "STOP unit. Compressor overload — likely refrigerant charge or fan issue.",           severity: "critical" },
  { brand: "Daikin", code: "E6", system: "aircon",  meaning: "Compressor lock / start failure",                     firstCheck: "STOP unit. Compressor won't spin up. Warranty / service.",                            severity: "critical" },
  { brand: "Daikin", code: "E7", system: "aircon",  meaning: "Outdoor fan motor lock",                              firstCheck: "Check for debris jamming the outdoor fan. If clear, motor swap.",                     severity: "warn" },
  { brand: "Daikin", code: "F3", system: "aircon",  meaning: "Discharge-pipe temperature too high",                 firstCheck: "Low refrigerant charge or blocked outdoor coil. ARC tech needed.",                   severity: "critical" },
  { brand: "Daikin", code: "L5", system: "aircon",  meaning: "Inverter compressor abnormal",                        firstCheck: "STOP unit. Inverter fault — warranty repair.",                                        severity: "critical" },
  { brand: "Daikin", code: "U0", system: "aircon",  meaning: "Refrigerant shortage",                                firstCheck: "Refrigerant low — check for leak, book an ARC-licensed tech.",                        severity: "critical" },
  { brand: "Daikin", code: "U4", system: "aircon",  meaning: "Indoor / outdoor comms error",                        firstCheck: "Check the F1-F2 comms wire — loose terminal or damaged cable.",                     severity: "warn" },

  // ------------------- Fujitsu -------------------
  { brand: "Fujitsu", code: "E:EE", system: "aircon",  meaning: "Room-temp thermistor fault",                       firstCheck: "Thermistor open — sensor swap.",                                                       severity: "warn" },
  { brand: "Fujitsu", code: "E:11", system: "aircon",  meaning: "Comms error indoor ↔ outdoor",                     firstCheck: "Comms wire fault. Check terminals both ends.",                                        severity: "warn" },
  { brand: "Fujitsu", code: "E:12", system: "aircon",  meaning: "Outdoor comms not responding",                     firstCheck: "Outdoor board or power supply — book service.",                                       severity: "warn" },
  { brand: "Fujitsu", code: "E:14", system: "aircon",  meaning: "Signal transmission error (wired remote)",         firstCheck: "Wired controller — check the H1-H2 line terminations.",                              severity: "info" },
  { brand: "Fujitsu", code: "OP:00", system: "aircon", meaning: "Outdoor high-pressure protection",                 firstCheck: "Airflow blocked at outdoor unit. Clear obstructions and re-test.",                    severity: "warn" },
  { brand: "Fujitsu", code: "OP:04", system: "aircon", meaning: "Compressor discharge-temp protection",             firstCheck: "STOP unit. Likely low charge or blocked coil.",                                       severity: "critical" },

  // ------------------- Panasonic -------------------
  { brand: "Panasonic", code: "H11", system: "aircon", meaning: "Indoor / outdoor comms failure",                   firstCheck: "Comms cable fault. Check terminals.",                                                  severity: "warn" },
  { brand: "Panasonic", code: "H15", system: "aircon", meaning: "Compressor sensor error",                          firstCheck: "Sensor failed — service call.",                                                        severity: "warn" },
  { brand: "Panasonic", code: "H27", system: "aircon", meaning: "Outdoor air sensor error",                         firstCheck: "Sensor open — swap-out fix.",                                                          severity: "warn" },
  { brand: "Panasonic", code: "F91", system: "aircon", meaning: "Refrigerant abnormal (leak)",                      firstCheck: "STOP unit. Refrigerant leak — ARC tech needed.",                                       severity: "critical" },
  { brand: "Panasonic", code: "F99", system: "aircon", meaning: "Outdoor DC over-current",                          firstCheck: "STOP unit. Inverter / compressor fault. Warranty service.",                            severity: "critical" },

  // ------------------- LG -------------------
  { brand: "LG", code: "CH01", system: "aircon", meaning: "Indoor room-thermistor error",                            firstCheck: "Sensor open — swap fix.",                                                              severity: "warn" },
  { brand: "LG", code: "CH02", system: "aircon", meaning: "Indoor pipe sensor error",                                firstCheck: "Sensor open — swap fix.",                                                              severity: "warn" },
  { brand: "LG", code: "CH05", system: "aircon", meaning: "Indoor / outdoor comms error",                            firstCheck: "Comms cable — check terminals both ends.",                                            severity: "warn" },
  { brand: "LG", code: "CH21", system: "aircon", meaning: "IPM fault (inverter power module)",                       firstCheck: "STOP unit. Inverter power stage — book warranty service.",                            severity: "critical" },

  // ------------------- Kaden -------------------
  { brand: "Kaden", code: "E1", system: "aircon",  meaning: "Indoor & outdoor comms error",                          firstCheck: "Check comms cable connection between heads.",                                          severity: "warn" },
  { brand: "Kaden", code: "E2", system: "aircon",  meaning: "Room temp sensor fault",                                firstCheck: "Sensor open — sensor swap by installer.",                                              severity: "warn" },
  { brand: "Kaden", code: "E5", system: "aircon",  meaning: "Overcurrent protection",                                firstCheck: "Airflow blocked or refrigerant charge low. Service call.",                             severity: "warn" },
  { brand: "Kaden", code: "F1", system: "aircon",  meaning: "Outdoor unit sensor fault",                             firstCheck: "Outdoor sensor swap — book service.",                                                 severity: "warn" },
  { brand: "Kaden", code: "F3", system: "aircon",  meaning: "Compressor discharge temp too high",                    firstCheck: "STOP unit. Likely low charge. ARC tech required.",                                     severity: "critical" },

  // ------------------- Brivis (h01 30-89 · gas ducted heater fault codes) -------------------
  // Source: authoritative Brivis service manual, curated to add a plain-
  // English "first check" so a homeowner knows if it's a reset-and-retry,
  // a service call, or an immediate STOP-USING-THE-UNIT.
  { brand: "Brivis", code: "h01 30", system: "heater", meaning: "Fan limp mode — fan speed sensor signal invalid",                firstCheck: "Unit runs at safe speed. Book gas heater service — main fan sensor or motor.",                                   severity: "warn" },
  { brand: "Brivis", code: "h01 31", system: "heater", meaning: "Flame roll-out during ignition (auto restart)",                  firstCheck: "Unit will attempt to restart. If it persists, book service — roll-out sensor / burner alignment.",                 severity: "warn" },
  { brand: "Brivis", code: "h01 32", system: "heater", meaning: "Data error — parameters reset to default",                        firstCheck: "Controller memory fault. Book service to re-commission the unit.",                                                 severity: "warn" },
  { brand: "Brivis", code: "h01 33", system: "heater", meaning: "Modulating gas valve — open circuit on coil",                    firstCheck: "Modulation coil fault. Needs a gas fitter service call.",                                                          severity: "warn" },
  { brand: "Brivis", code: "h01 35", system: "heater", meaning: "Supply-air thermistor fault (open / short)",                     firstCheck: "Sensor swap by installer — no heat until fixed.",                                                                  severity: "warn" },
  { brand: "Brivis", code: "h01 36", system: "heater", meaning: "Bad supply-air thermistor location",                              firstCheck: "Thermistor not reaching setpoint in time — indicates blocked ducts or sensor moved. Book service.",                severity: "warn" },
  { brand: "Brivis", code: "h01 37", system: "heater", meaning: "Speed sensor error — unit in safe mode",                          firstCheck: "Main-fan speed signal wrong. May lockout if persistent. Book service.",                                             severity: "warn" },
  { brand: "Brivis", code: "h01 40", system: "heater", meaning: "Return-air overheat — flue-fan overheat switch open",             firstCheck: "Return-air blockage or fan issue. Clean return-air filter first, then service.",                                    severity: "warn" },
  { brand: "Brivis", code: "h01 41", system: "heater", meaning: "Supply-air overheat switch tripped",                              firstCheck: "Blocked supply ducts / grille. Check no vents shut. Service if it persists.",                                       severity: "warn" },
  { brand: "Brivis", code: "h01 42", system: "heater", meaning: "Supply-air thermistor temp exceeded overheat threshold",          firstCheck: "Duct blockage forcing overheat. Open all vents, clean filter, book service if persists.",                            severity: "warn" },
  { brand: "Brivis", code: "h01 43", system: "heater", meaning: "Overheat cool-down in progress",                                  firstCheck: "Unit cooling itself down safely. Wait 5 min. If it recurs, service.",                                               severity: "info" },
  { brand: "Brivis", code: "h01 44", system: "heater", meaning: "Flame roll-out detected during ignition",                         firstCheck: "Roll-out sensor triggered. Book gas fitter — burner or heat exchanger issue.",                                       severity: "warn" },
  { brand: "Brivis", code: "h01 45", system: "heater", meaning: "Low 24V AC supply voltage",                                       firstCheck: "Power supply issue on the low-voltage transformer. Service call.",                                                    severity: "warn" },
  { brand: "Brivis", code: "h01 46", system: "heater", meaning: "No flame on ignition attempt",                                    firstCheck: "Check gas isolation valve is on. If good, book a gas fitter — igniter, gas pressure, or flame rod.",                 severity: "warn" },
  { brand: "Brivis", code: "h01 47", system: "heater", meaning: "Unstable flame — dropped during validation",                      firstCheck: "Gas pressure or flame rod issue. Book a gas fitter.",                                                                 severity: "warn" },
  { brand: "Brivis", code: "h01 48", system: "heater", meaning: "Pressure loss — combustion chamber switch opened mid-cycle",      firstCheck: "Flue restriction or fan issue. Book service — check flue is clear.",                                                  severity: "warn" },
  { brand: "Brivis", code: "h01 49", system: "heater", meaning: "Flame lost during heating cycle",                                 firstCheck: "Gas supply interruption or flame sensor issue. Book gas fitter.",                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 50", system: "heater", meaning: "Ignition lockout — max ignition attempts exceeded",               firstCheck: "STOP unit. Power cycle at the wall control to reset. If it re-locks, gas fitter required.",                          severity: "critical" },
  { brand: "Brivis", code: "h01 51", system: "heater", meaning: "Roll-out signal with no gas active (sensing circuit fault)",      firstCheck: "Roll-out sensor circuit fault. Book service.",                                                                       severity: "warn" },
  { brand: "Brivis", code: "h01 52", system: "heater", meaning: "Flame signal detected with no gas — flame sensing circuit fault", firstCheck: "Flame rod / control board fault. Book service.",                                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 53", system: "heater", meaning: "Overheat lockout",                                                firstCheck: "STOP unit. Overheat safety triggered multiple times. Gas fitter required before use.",                                severity: "critical" },
  { brand: "Brivis", code: "h01 54", system: "heater", meaning: "Roll-out lockout — max roll-out events during heat cycle",        firstCheck: "STOP unit. Repeated roll-out — burner / heat exchanger inspection required.",                                        severity: "critical" },
  { brand: "Brivis", code: "h01 55", system: "heater", meaning: "Flame validation lockout — flame lost repeatedly at validate step", firstCheck: "STOP unit. Book gas fitter — flame or gas supply issue.",                                                            severity: "critical" },
  { brand: "Brivis", code: "h01 56", system: "heater", meaning: "Pressure switch stuck open — flue fan on but no pressure",        firstCheck: "Pressure switch or tube blocked. Book service.",                                                                      severity: "warn" },
  { brand: "Brivis", code: "h01 57", system: "heater", meaning: "Pressure switch stuck closed — flue fan off but pressure detected", firstCheck: "Pressure switch stuck. Book service.",                                                                               severity: "warn" },
  { brand: "Brivis", code: "h01 58", system: "heater", meaning: "Pressure switch fail — max pressure-loss events exceeded",        firstCheck: "STOP unit. Flue / pressure switch fault. Book service.",                                                              severity: "critical" },
  { brand: "Brivis", code: "h01 59", system: "heater", meaning: "Cross-check comms error between primary and secondary MCU",       firstCheck: "Control board comms fault. Board-level service required.",                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 60", system: "heater", meaning: "Motor open circuit — no zero-cross detect signal",                firstCheck: "Fan motor open circuit — book service. Motor swap likely.",                                                          severity: "warn" },
  { brand: "Brivis", code: "h01 61", system: "heater", meaning: "Primary valve stuck off — relay contact not closing",             firstCheck: "Gas valve relay fault. Book gas fitter.",                                                                             severity: "warn" },
  { brand: "Brivis", code: "h01 62", system: "heater", meaning: "Primary valve stuck on — relay contact welded",                   firstCheck: "STOP unit. Gas valve relay stuck. Gas fitter needed immediately.",                                                    severity: "critical" },
  { brand: "Brivis", code: "h01 63", system: "heater", meaning: "Primary valve fail — relay not closing during heating",           firstCheck: "STOP unit. Gas valve fault. Book gas fitter.",                                                                         severity: "critical" },
  { brand: "Brivis", code: "h01 64", system: "heater", meaning: "Modulating valve overcurrent (>150 mA)",                          firstCheck: "Modulation coil short. Book service.",                                                                                severity: "warn" },
  { brand: "Brivis", code: "h01 65", system: "heater", meaning: "Motor lockout — fan limp + open circuit or overheat combo",       firstCheck: "STOP unit. Multiple fan faults combined. Book service.",                                                              severity: "critical" },
  { brand: "Brivis", code: "h01 66", system: "heater", meaning: "Secondary valve stuck off",                                       firstCheck: "Second gas valve relay fault. Gas fitter.",                                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 67", system: "heater", meaning: "Secondary valve stuck on",                                        firstCheck: "STOP unit. Gas valve stuck. Gas fitter needed immediately.",                                                          severity: "critical" },
  { brand: "Brivis", code: "h01 68", system: "heater", meaning: "Secondary valve fail during heating",                             firstCheck: "STOP unit. Gas fitter required.",                                                                                     severity: "critical" },
  { brand: "Brivis", code: "h01 69", system: "heater", meaning: "Fuse blown — 24V AC voltage lost",                                firstCheck: "2A fuse on the control board is open. Service call to replace + diagnose why it blew.",                               severity: "warn" },
  { brand: "Brivis", code: "h01 70", system: "heater", meaning: "Remote MCU shutdown fail",                                        firstCheck: "Control-board fault. Board-level service.",                                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 71", system: "heater", meaning: "Remote MCU state mismatch",                                       firstCheck: "Control-board fault. Board-level service.",                                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 72", system: "heater", meaning: "Ambiguous fault — unattributed shutdown",                          firstCheck: "Undiagnosed shutdown. Book service to read secondary log.",                                                            severity: "warn" },
  { brand: "Brivis", code: "h01 73", system: "heater", meaning: "Remote MCU next-state mismatch",                                  firstCheck: "Control-board firmware or hardware fault. Book service.",                                                              severity: "warn" },
  { brand: "Brivis", code: "h01 74", system: "heater", meaning: "Remote MCU lockout (secondary board locked)",                     firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 75", system: "heater", meaning: "AC input scan fault — 24V input stuck high",                      firstCheck: "Input scanning circuit fault. Board-level service.",                                                                    severity: "warn" },
  { brand: "Brivis", code: "h01 76", system: "heater", meaning: "Lockout storage fault — non-volatile memory access failure",       firstCheck: "Control board's ability to store lockouts compromised. Book service.",                                                severity: "warn" },
  { brand: "Brivis", code: "h01 77", system: "heater", meaning: "Remote MCU IO mismatch",                                          firstCheck: "IO state mismatch between board MCUs. Book service.",                                                                  severity: "warn" },
  { brand: "Brivis", code: "h01 79", system: "heater", meaning: "A/D converter reference voltage check failed",                    firstCheck: "Board-level analog fault. Service.",                                                                                   severity: "warn" },
  { brand: "Brivis", code: "h01 80", system: "heater", meaning: "Flame sense fault — measured voltage out of range",               firstCheck: "Flame rod or sensing circuit fault. Book gas fitter.",                                                                 severity: "warn" },
  { brand: "Brivis", code: "h01 81", system: "heater", meaning: "Roll-out sense fault — sensor voltage out of range",              firstCheck: "Roll-out sensor circuit fault. Book service.",                                                                          severity: "warn" },
  { brand: "Brivis", code: "h01 82", system: "heater", meaning: "System timing fault — MCU timing vs 50 Hz mismatch",              firstCheck: "Control-board timing fault. Board-level service.",                                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 83", system: "heater", meaning: "System execution fault — internal MCU error",                     firstCheck: "Control-board firmware fault. Board-level service.",                                                                    severity: "warn" },
  { brand: "Brivis", code: "h01 84", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 85", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 86", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 87", system: "heater", meaning: "Cross-check comms fault — no MCU comms >10 s",                    firstCheck: "Control-board comms failure. Board-level service.",                                                                     severity: "warn" },
  { brand: "Brivis", code: "h01 88", system: "heater", meaning: "Control board lockout (system lockout initiated)",                firstCheck: "STOP unit. Board-level service required.",                                                                             severity: "critical" },
  { brand: "Brivis", code: "h01 89", system: "heater", meaning: "MCU non-volatile storage test code (not seen in normal use)",     firstCheck: "Diagnostic-only code — service tech will interpret. If it appears on normal operation, book service.",                severity: "info" },

  // ------------------- Reclaim (CO2 heat pump hot water) -------------------
  { brand: "Reclaim",  code: "E1", system: "hot-water", meaning: "Ambient temp sensor fault",                       firstCheck: "Outdoor sensor open-circuit. Book a Reclaim-accredited service tech.",                    severity: "warn" },
  { brand: "Reclaim",  code: "E2", system: "hot-water", meaning: "Evaporator temp sensor fault",                    firstCheck: "Evaporator sensor fault — swap-out fix by a tech.",                                        severity: "warn" },
  { brand: "Reclaim",  code: "E3", system: "hot-water", meaning: "Discharge / suction sensor fault",                firstCheck: "Sensor swap by an ARC-licensed tech.",                                                      severity: "warn" },
  { brand: "Reclaim",  code: "E4", system: "hot-water", meaning: "Tank temp sensor fault",                          firstCheck: "Tank thermistor open — sensor swap. Water still heats via boost.",                          severity: "warn" },
  { brand: "Reclaim",  code: "E5", system: "hot-water", meaning: "High-pressure fault (CO2)",                       firstCheck: "STOP unit. Refrigerant charge / heat-exchanger issue. Warranty service.",                   severity: "critical" },
  { brand: "Reclaim",  code: "E6", system: "hot-water", meaning: "Low-pressure fault (CO2)",                        firstCheck: "STOP unit. Likely refrigerant leak — Reclaim tech required.",                                severity: "critical" },
  { brand: "Reclaim",  code: "E7", system: "hot-water", meaning: "Compressor overload",                             firstCheck: "STOP unit. Compressor at risk — book warranty service.",                                     severity: "critical" },
  { brand: "Reclaim",  code: "F1", system: "hot-water", meaning: "Comms error tank ↔ heat pump",                    firstCheck: "Check the comms wire between the outdoor heat pump and the tank controller.",              severity: "warn" },

  // ------------------- iStore -------------------
  { brand: "iStore",   code: "E1", system: "hot-water", meaning: "Ambient temp sensor fault",                       firstCheck: "Sensor open-circuit. Book service — water will still heat on boost element.",              severity: "warn" },
  { brand: "iStore",   code: "E2", system: "hot-water", meaning: "Evaporator sensor fault",                         firstCheck: "Sensor swap by installer.",                                                                  severity: "warn" },
  { brand: "iStore",   code: "E3", system: "hot-water", meaning: "Condenser sensor fault",                          firstCheck: "Sensor open — service call.",                                                                severity: "warn" },
  { brand: "iStore",   code: "E4", system: "hot-water", meaning: "Tank sensor fault",                               firstCheck: "Tank thermistor fault — sensor swap.",                                                       severity: "warn" },
  { brand: "iStore",   code: "E5", system: "hot-water", meaning: "Compressor high pressure",                        firstCheck: "STOP unit. Likely blocked evaporator airflow. Clean coil.",                                  severity: "critical" },
  { brand: "iStore",   code: "E7", system: "hot-water", meaning: "Anti-freeze protection triggered",                firstCheck: "Very cold ambient — normal in winter. If persistent, book service.",                          severity: "info" },
  { brand: "iStore",   code: "E8", system: "hot-water", meaning: "Compressor drive fault",                          firstCheck: "STOP unit. Inverter drive fault — warranty repair.",                                          severity: "critical" },

  // ------------------- Thermann -------------------
  { brand: "Thermann", code: "E1", system: "hot-water", meaning: "Water temp sensor fault (integrated HP)",         firstCheck: "Sensor open — Thermann service call.",                                                       severity: "warn" },
  { brand: "Thermann", code: "E2", system: "hot-water", meaning: "Ambient sensor fault",                            firstCheck: "Sensor open — swap by installer.",                                                             severity: "warn" },
  { brand: "Thermann", code: "E5", system: "hot-water", meaning: "Compressor overload",                             firstCheck: "STOP unit. Book warranty service.",                                                            severity: "critical" },
  { brand: "Thermann", code: "F1", system: "hot-water", meaning: "Comms error (integrated HP)",                     firstCheck: "Check internal comms wire between board and controller.",                                     severity: "warn" },
  { brand: "Thermann", code: "12", system: "hot-water", meaning: "G-series continuous flow — ignition failure",     firstCheck: "Check gas supply on. If OK, needs a licensed gas fitter.",                                    severity: "warn" },
  { brand: "Thermann", code: "11", system: "hot-water", meaning: "G-series — no ignition detected",                 firstCheck: "Gas valve or igniter fault. Book a gas fitter.",                                              severity: "warn" },

  // ------------------- Braemar (gas ducted / evap) -------------------
  { brand: "Braemar", code: "23",  system: "heater",   meaning: "Overheat lockout",                                firstCheck: "Blocked filter or return-air path. Clean filter and reset.",                                 severity: "warn" },
  { brand: "Braemar", code: "27",  system: "heater",   meaning: "Ignition failure (no flame sensed)",              firstCheck: "Check gas is on. If OK, needs a licensed gas fitter to inspect igniter + flame sensor.",     severity: "warn" },
  { brand: "Braemar", code: "42",  system: "heater",   meaning: "Fan proving switch fault",                        firstCheck: "Fan not detected running. Book gas heater service.",                                          severity: "warn" },
  { brand: "Braemar", code: "51",  system: "heater",   meaning: "Wall-controller comms lost",                      firstCheck: "Check the low-voltage comms wire between controller and unit.",                              severity: "info" },
  { brand: "Braemar", code: "58",  system: "heater",   meaning: "Zone motor / damper fault",                       firstCheck: "One zone motor stuck — book service to swap the damper motor.",                              severity: "warn" },

  // ------------------- Bonaire (evap / gas ducted) -------------------
  { brand: "Bonaire", code: "E01", system: "evap",   meaning: "Water pump fault (evap)",                         firstCheck: "Check evap water supply on. If OK, pump swap needed.",                                        severity: "warn" },
  { brand: "Bonaire", code: "E02", system: "evap",   meaning: "Water level fault (evap)",                        firstCheck: "Water inlet blocked or float stuck. Clean the reservoir.",                                    severity: "warn" },
  { brand: "Bonaire", code: "E04", system: "evap",   meaning: "Fan motor fault",                                 firstCheck: "Motor seized or capacitor gone. Book service.",                                               severity: "warn" },
  { brand: "Bonaire", code: "E05", system: "evap",   meaning: "Ambient temp sensor fault",                       firstCheck: "Outdoor sensor open — sensor swap by installer.",                                             severity: "warn" },
  { brand: "Bonaire", code: "E12", system: "evap",   meaning: "Comms error (integrated system)",                 firstCheck: "Check comms wire between wall controller and unit.",                                          severity: "info" },

  // ------------------- Sanden (heat pump hot water) -------------------
  { brand: "Sanden",  code: "F1",  system: "hot-water", meaning: "Comms error tank ↔ heat pump",                    firstCheck: "Check the comms cable between heat pump and tank controller.",                              severity: "warn" },
  { brand: "Sanden",  code: "F2",  system: "hot-water", meaning: "Tank temp sensor fault",                          firstCheck: "Tank thermistor swap — service call.",                                                        severity: "warn" },
  { brand: "Sanden",  code: "F3",  system: "hot-water", meaning: "Ambient sensor fault",                            firstCheck: "Outdoor sensor open. Service call.",                                                          severity: "warn" },
  { brand: "Sanden",  code: "F5",  system: "hot-water", meaning: "High-pressure protection (CO₂)",                  firstCheck: "STOP unit. Refrigerant issue. Warranty tech required.",                                       severity: "critical" },
  { brand: "Sanden",  code: "F7",  system: "hot-water", meaning: "Compressor overload",                             firstCheck: "STOP unit. Book warranty service.",                                                            severity: "critical" },

  // ------------------- Rheem (electric + gas storage) -------------------
  { brand: "Rheem",   code: "1",   system: "hot-water", meaning: "Water temp sensor fault",                         firstCheck: "Sensor open — book service. Element still heats but at fixed temp.",                          severity: "warn" },
  { brand: "Rheem",   code: "12",  system: "hot-water", meaning: "Ignition failure (gas storage)",                  firstCheck: "Check gas supply. If OK, needs a gas fitter — igniter or valve fault.",                       severity: "warn" },
  { brand: "Rheem",   code: "14",  system: "hot-water", meaning: "Blocked flue",                                   firstCheck: "STOP unit. Flue restriction / no draft. Gas fitter required immediately.",                    severity: "critical" },

  // ------------------- Rinnai (gas continuous flow) -------------------
  { brand: "Rinnai",  code: "11",  system: "hot-water", meaning: "No ignition on gas continuous flow",              firstCheck: "Check the gas isolation valve is open. If OK, gas fitter needed.",                            severity: "warn" },
  { brand: "Rinnai",  code: "12",  system: "hot-water", meaning: "Flame failure (drops out mid-shower)",            firstCheck: "Gas pressure low or igniter dirty. Book Rinnai service.",                                     severity: "warn" },
  { brand: "Rinnai",  code: "14",  system: "hot-water", meaning: "Thermal fuse activated (overtemp)",               firstCheck: "STOP unit. Overheat safety triggered — book service before use.",                             severity: "critical" },
  { brand: "Rinnai",  code: "16",  system: "hot-water", meaning: "High temp warning",                              firstCheck: "Temperature setting or thermistor issue. Check controller setpoint first.",                    severity: "warn" },
  { brand: "Rinnai",  code: "61",  system: "hot-water", meaning: "Fan motor fault",                                firstCheck: "Fan not spinning. Book service.",                                                              severity: "warn" },

  // ------------------- Extra Mitsubishi codes -------------------
  { brand: "Mitsubishi Electric", code: "P7", system: "aircon", meaning: "System error / multi-head miswire",       firstCheck: "Indoor unit address conflict on multi-head. Requires MXZ config check.",                       severity: "warn" },
  { brand: "Mitsubishi Electric", code: "U8", system: "aircon", meaning: "Outdoor DC voltage abnormal",             firstCheck: "STOP unit. Power supply or inverter drive fault — warranty service.",                          severity: "critical" },

  // ------------------- Extra Daikin codes -------------------
  { brand: "Daikin",  code: "H9",  system: "aircon",   meaning: "Outdoor ambient sensor fault",                    firstCheck: "Sensor open — swap fix.",                                                                     severity: "warn" },
  { brand: "Daikin",  code: "J3",  system: "aircon",   meaning: "Discharge pipe thermistor fault",                  firstCheck: "Sensor swap by installer.",                                                                    severity: "warn" },
  { brand: "Daikin",  code: "P4",  system: "aircon",   meaning: "Heat sink temperature abnormal",                   firstCheck: "STOP unit. Inverter overheat. Warranty service.",                                              severity: "critical" },
];

/** Distinct brands present in the table, alphabetised for filter UI. */
export const FAULT_BRANDS: string[] = Array.from(
  new Set(FAULT_CODES.map((f) => f.brand)),
).sort();

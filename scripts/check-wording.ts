/**
 * The words on a quote: each template gets the summary for what's actually on
 * it. The old summaries named the wrong brand (Kaden roof-to-wall saying
 * Mitsubishi Electric), the wrong size (a 250L saying 160L) and the wrong
 * heater (internal heaters described as sitting outside); these hold the
 * generator to the template's own lines.
 *
 *   npm run check:wording
 */
import { INSTALL_CODES, INSTALL_COPY, INSTALL_LINE, lineCopy, plainText, SERVICE_COPY, summaryHtml, templateFacts, templateSummary } from "../src/lib/pricebook/wording";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};
const svc = (code: string, name = code) => ({ skuType: "Service", skuName: name, code });
const eq = (name: string) => ({ skuType: "Equipment", skuName: name });
const mat = (name: string, quantity = 1) => ({ skuType: "Material", skuName: name, quantity });
const sum = (name: string, items: ReturnType<typeof svc | typeof eq | typeof mat>[]) => {
  const f = templateFacts(name, items);
  if (!f) throw new Error(`${name}: no facts`);
  return { f, s: templateSummary(f) };
};

const k = sum("Kaden 3.5kW Split System - Roof To Wall Bracket", [svc("AC-SPLIT-RTW"), eq("Kaden KSI 3.5kw V3 Split Air Conditioner")]);
ok("a Kaden roof-to-wall says Kaden, never Mitsubishi", /new Kaden 3\.5kW split system/.test(k.s) && !/Mitsubishi/.test(k.s), k.s.slice(0, 120));
ok("roof-to-wall: the bracket on another wall", k.f.placement === "rtw" && /bracket on another outside wall/.test(k.s));
ok("every split says what's removed", /If we're replacing an old split system, a licensed technician recovers its refrigerant/.test(k.s));
// Jake, 25 Nov: "not dot points". Three paragraphs of sentences, no labels:
// the job; what comes out and what the price covers; what it doesn't.
const LABELLED = /^(What we're doing|What we're removing|What's included|What's not included):/m;
ok("the summary is three plain paragraphs, with no labels", k.s.split("\n\n").length === 3 && !LABELLED.test(k.s), k.s.split("\n\n").map((p) => p.slice(0, 30)));
ok("it opens with what we'll do, and says what the price includes", /^We'll (supply and install|replace) /.test(k.s) && /The price includes the /.test(k.s.split("\n\n")[1]));
ok("no brand selling in a summary: that's the equipment line's", !/premium range|value range|relied on/.test(k.s));
const btb = sum("Mitsubishi Electric 3.5kW Split System - Back to Back", [svc("AC-SPLIT-BTB"), eq("Mitsubishi Electric 3.5kw Split System"), mat('Ardent Copper Pair Coil 1/4" x 3/8" R410A 20mtr', 0.5)]);
ok("pipe included is what's on the template: half a 20 m coil is 10 m", btb.f.pipeM === 10 && /up to 10 m of Ardent copper/.test(btb.s) && /beyond the 10 m included/.test(btb.s));
const dup = sum("Kaden 5kW Split System - Roof Mounted", [svc("AC-SPLIT-RTR"), eq("Kaden KSI 5kw V3 Split Air Conditioner"), mat('Ardent Copper Pair Coil 1/4" x 1/2" R410A 20mtr'), mat('Ardent Copper Pair Coil 1/4" x 1/2" R410A 20mtr')]);
ok("the same coil listed twice is one 20 m run, not 40", dup.f.pipeM === 20);

const k26 = sum("Kaden 2.6kW Split System - Roof Mounted", [svc("AC-SPLIT-RTR"), eq("Kaden KSI 2.5kw V3 Split Air Conditioner")]);
ok("the size comes from the unit on it: the 2.6kW template holds a 2.5kW", /Kaden 2\.5kW/.test(k26.s) && k26.f.placement === "rtr");

const r9 = sum("Rinnai 9kw Multi Head Split System", [svc("AC-SPLIT-MULTI"), eq("Rinnai RPX 2.5kw Indoor"), eq("Rinnai Multi Condenser 11kw")]);
ok("a multi-head is described by its condenser", r9.f.kind === "multi" && r9.f.size === "11kW");
ok("a multi-head without a labour line doesn't promise one", !/labour is its own line/.test(r9.s));
const r14 = sum("Rinnai 14kW Multi Head Split System", [svc("AC-SPLIT-MULTI"), svc("AC-SPLIT-MULTI-4"), eq("Rinnai Multi Condenser 14kw"), eq("Rinnai RPX 2.5kw Indoor"), eq("Rinnai RPX 3.5kw Indoor"), mat("Silent Mini White Cond Pump 45L/h FP3450")]);
ok("one with a labour line says so, counts its heads and names the pump", /labour is its own line/.test(r14.s) && /running 2 indoor heads/.test(r14.s) && /condensate pump/.test(r14.s));

const gl = sum("Reclaim Split GL 250L V1", [svc("HW-HP-SPLIT"), eq("Reclaim Split - Glass Lined - 250L V1")]);
ok("a 250L says 250L, glass-lined", /Reclaim 250L glass-lined split heat pump/.test(gl.s) && !/160L/.test(gl.s), gl.s.slice(0, 110));
ok("no wifi line where the unit doesn't have it", !/wifi/.test(gl.s));
const gl2 = sum("Reclaim Split GL 250L V2", [svc("HW-HP-SPLIT"), eq("Reclaim Split - Glass Lined - 250L V2 (WIFI)")]);
ok("wifi is the unit's to say, not the summary's", !/wifi/i.test(gl2.s));
const pana = sum("Panasonic Split GL 250L 4kw", [svc("HW-HP-SPLIT"), eq("Reclaim x Panasonic - Glass Lined - 250L 4kw")]);
ok("Panasonic: named as the Reclaim x Panasonic 4kW, no product claims", /Reclaim x Panasonic 4kW 250L glass-lined split heat pump/.test(pana.s) && !/CO2/.test(pana.s), pana.s.slice(0, 200));
const ew = sum("Reclaim Earthworker Split SS 250L V2", [svc("HW-HP-SPLIT"), eq("Reclaim Split - Stainless Steel - 250L V2 (Earth Worker)")]);
ok("Earthworker 250L says 250L stainless, not 25L", /Reclaim Earthworker 250L stainless steel/.test(ew.s) && !/\b25L/.test(ew.s));

const is = sum("IStore 180L - Plug", [svc("HW-HP-PLUG"), eq("IStore Heat Pump 180L")]);
ok("iStore plug-in: no electrical work, and no claim borrowed from Reclaim", /it plugs in, so there's no electrical work/.test(is.s) && !/cold Victorian mornings|CO2/.test(is.s) && /new iStore 180L heat pump/.test(is.s));
const rc = sum("Reclaim 300L - Elec", [svc("HW-HP-HARD"), eq("Reclaim Heat Pump 300L - Plug In")]);
ok("hard-wired heat pump: a new circuit and a Certificate of Electrical Safety", /new dedicated circuit at your switchboard with a Certificate of Electrical Safety/.test(rc.s));

const wom = sum("Brivis Wombat 3 Star 15kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Brivis Classic 2P Wombat 15NG")]);
ok("Wombat is internal, not an external cabinet", wom.f.heater === "internal" && /internal heater/.test(wom.s) && !/weatherproof cabinet/.test(wom.s), wom.s.slice(0, 140));
ok("Wombat no longer says Compact Classic", !/Compact Classic/.test(wom.s));
const womInt = sum("Brivis Wombat 3 Star 20kW Ducted Gas Heater", [svc("GAS-DUCT-INT"), eq("Brivis Classic 2P Wombat 20NG")]);
ok("a heater on the new internal service reads as internal", womInt.f.heater === "internal" && /internal heater/.test(womInt.s));
ok("the internal service carries the internal installation wording", SERVICE_COPY["GAS-DUCT-INT"] === INSTALL_COPY["GAS-DUCT-INT"] && /internal ducted gas heater/.test(SERVICE_COPY["GAS-DUCT-INT"]));
const sp = sum("Brivis StarPro 6 Star 15kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Brivis Starpro SP615in V4")]);
ok("StarPro SP615in is internal", sp.f.heater === "internal");
const buf = sum("Brivis Buffalo 5 Star 20kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Brivis Buffalo 5 Star 20kW")]);
ok("Buffalo is external; its gas figure is the unit's line, not the summary's", buf.f.heater === "external" && /weatherproof cabinet/.test(buf.s) && !/22% less/.test(buf.s));
const eco = sum("Braemar Ecostar 6 Star 18kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Braemar TQM618NG")]);
ok("a heater we can't place says neither", eco.f.heater === undefined && !/internal heater|weatherproof cabinet/.test(eco.s));

const cf = sum("Continuous Flow - Installation (New Gas Feed)", [svc("HW-STORAGE-TO-CF"), eq("Thermann G-Series 26L 50 degree Natural Gas Continuous Flow Hot Water System")]);
ok("continuous flow with a new gas feed says so, and doesn't call the feed an extra", !!cf.f.newGasFeed && /new gas feed sized for the unit/.test(cf.s) && !/upsizing/.test(cf.s));
const west = sum("Gas Westinghouse Cooktop – Installation", [svc("GAS-COOKTOP-INSTALL"), eq("Westinghouse 60cm 4 Burner Natural Gas Cooktop – Stainless Steel")]);
ok("cooktop names the unit cleanly", /new Westinghouse 60cm 4 Burner gas cooktop/.test(west.s), west.s.slice(0, 90));

ok("servicing, leak detection and the deposit keep their wording", templateFacts("Split System Clean & Service", []) === null && templateFacts("Deposit", []) === null);

// Services.
ok("every diagnostic is the call-out covering the first hour", ["AC-SPLIT-DIAG", "EVAP-DIAG", "HTR-DUCTED-DIAG"].every((c) => /first hour on site/.test(SERVICE_COPY[c])));
ok("no internal notes in any description", Object.values(SERVICE_COPY).every((d) => !/not customer-facing|internal labour line|1 van/i.test(d)));
ok("multi-head labour lines each name their head count and hours", [2, 3, 4, 5, 6].every((n) => new RegExp(`${n}-head system`).test(SERVICE_COPY[`AC-SPLIT-MULTI-${n}`])));
ok("removal: for a visit with no install; included when we install", /no.*installing a new one|not installing a new one/.test(SERVICE_COPY["DECOMMISSION-DISPOSAL"]) && /removing the old one is included/.test(SERVICE_COPY["DECOMMISSION-DISPOSAL"]));
ok("zone add-ons describe what they are", /motorised damper/.test(SERVICE_COPY["ZONE 200MM ADD-ON"]));

// Markup round trip.
const html = summaryHtml("One & two.\n\nThree < four.");
ok("summaries go in as paragraphs, escaped", html === "<p>One &amp; two.</p><p>Three &lt; four.</p>");
ok("and read back to the same text", plainText(html) === "One & two.\nThree < four.");


// The installation lines (Jake, 25 Nov): each kind of install says what it
// covers — the labour, the materials, the old unit out — and where the
// electrician or the labour is priced on its own line, says so rather than
// claiming it.
ok("every installation service has its own wording", INSTALL_CODES.every((c) => SERVICE_COPY[c] === INSTALL_COPY[c] && INSTALL_COPY[c].length > 150), INSTALL_CODES.filter((c) => SERVICE_COPY[c] !== INSTALL_COPY[c]));
ok("no two installs read the same", new Set(INSTALL_CODES.map((c) => INSTALL_COPY[c])).size === INSTALL_CODES.length);
ok("each says what it includes", INSTALL_CODES.every((c) => /Includes/.test(INSTALL_COPY[c])), INSTALL_CODES.filter((c) => !/Includes/.test(INSTALL_COPY[c])));
const ELEC_LINE = ["AC-SPLIT-BTB", "AC-SPLIT-RTW", "AC-SPLIT-RTR", "AC-SPLIT-MULTI", "AC-DUCTED-2DAYS", "AC-DOM-INSTALL", "HW-HP-HARD", "HW-HP-SPLIT"];
ok("where the electrician has a line, the install points to it", ELEC_LINE.every((c) => /electrical (connection|work) by our licensed electrician (is|are) on (its|their) own line|electrical connection by our licensed electrician are on their own lines/.test(INSTALL_COPY[c])), ELEC_LINE.filter((c) => !/licensed electrician/.test(INSTALL_COPY[c])));
ok("and nowhere else claims an electrician", INSTALL_CODES.filter((c) => !ELEC_LINE.includes(c)).every((c) => !/licensed electrician/.test(INSTALL_COPY[c])));
ok("the plug-in heat pump says no electrician is needed", /no electrician is needed/.test(INSTALL_COPY["HW-HP-PLUG"]));
ok("where the labour has its own line, the install doesn't claim all labour", ["AC-SPLIT-MULTI", "AC-DUCTED-2DAYS", "AC-DOM-INSTALL"].every((c) => !/all labour/.test(INSTALL_COPY[c]) && /labour/.test(INSTALL_COPY[c])));
ok("everywhere else it includes all labour", INSTALL_CODES.filter((c) => !["AC-SPLIT-MULTI", "AC-DUCTED-2DAYS", "AC-DOM-INSTALL"].includes(c)).every((c) => /all labour/.test(INSTALL_COPY[c])));
ok("roof-to-wall says two lengths of cover (24 Nov: two hat sections)", /two lengths of Colorbond cover/.test(INSTALL_COPY["AC-SPLIT-RTW"]));
ok("the evap drain runs to the gutter, and the cooler's wall controller is included (Jake, 25 Nov)", /new PVC drain run to the gutter/.test(INSTALL_COPY["EVAP-INSTALL"]) && /the new cooler and its wall controller/.test(INSTALL_COPY["EVAP-INSTALL"]));
ok("no gas heater promises a controller the templates don't carry", !/controller/i.test(INSTALL_COPY["GAS-DUCT-INT"] + INSTALL_COPY["GAS-DUCT-EXT"]));
ok("no install names an equipment brand", INSTALL_CODES.every((c) => !/Mitsubishi|Kaden|Rinnai|Brivis|Braemar|Thermann|Reclaim|iStore|Bosch|Beko|Westinghouse/i.test(INSTALL_COPY[c])));
ok("the internal heater on the external service reads as internal", SERVICE_COPY["GAS-DUCT-EXT#internal"] === INSTALL_COPY["GAS-DUCT-INT"] && lineCopy("GAS-DUCT-EXT", { name: "x", kind: "heater", brand: "Brivis", size: null, heater: "internal" } as never) === INSTALL_COPY["GAS-DUCT-INT"]);
ok("a template's roof bracket line asks for the roof bracket wording", lineCopy("AC-SPLIT-RTR", null) === INSTALL_COPY["AC-SPLIT-RTR"]);
ok("the job write-up's own labour sentence is kept", INSTALL_LINE === "All labour and materials required to complete the works described in the Job Summary.");
ok("the electricians' lines keep their own words", ["AC-SPLIT-ELEC", "AC-MULTI-ELEC", "AC-DUCTED-ELE", "DOM-ELEC", "ELEC-HP"].every((c) => /licensed electrician/.test(SERVICE_COPY[c])));
ok("the crew-and-hours lines keep theirs", /two technicians/.test(SERVICE_COPY["AC-DOM-LAB"]) && /two technicians/.test(SERVICE_COPY["AC-DUCTED-LAB"]));
ok("the call-outs, repairs and zones keep theirs", /first hour on site/.test(SERVICE_COPY["AC-SPLIT-DIAG"]) && /motorised damper/.test(SERVICE_COPY["ZONE 250MM ADD-ON"]));

// Jake, 25 Nov: the ducted templates are on Mitsubishi Electric zoning, a temperature control in each zone.
const du = sum("Mitsubishi Electric Ducted Split 16kW", [svc("AC-DUCTED-2DAYS"), eq("Mitsubishi Electric 16kw Ducted Split"), eq("Mitsubishi Electric Zone Controller")]);
ok("the ducted summary names the Mitsubishi Electric zone controller and a temperature control in each zone, never the Zonemate", du.f.kind === "ducted" && /Mitsubishi Electric zone controller/.test(du.s) && /temperature control in each zone/.test(du.s) && !/zonemate|your phone|app before/i.test(du.s), du.s.slice(0, 200));

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);

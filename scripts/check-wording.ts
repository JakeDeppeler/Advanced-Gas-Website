/**
 * The words on a quote: each template gets the summary for what's actually on
 * it. The old summaries named the wrong brand (Kaden roof-to-wall saying
 * Mitsubishi Electric), the wrong size (a 250L saying 160L) and the wrong
 * heater (internal heaters described as sitting outside); these hold the
 * generator to the template's own lines.
 *
 *   npm run check:wording
 */
import { plainText, SERVICE_COPY, summaryHtml, templateFacts, templateSummary } from "../src/lib/pricebook/wording";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};
const svc = (code: string, name = code) => ({ skuType: "Service", skuName: name, code });
const eq = (name: string) => ({ skuType: "Equipment", skuName: name });
const sum = (name: string, items: ReturnType<typeof svc | typeof eq>[]) => {
  const f = templateFacts(name, items);
  if (!f) throw new Error(`${name}: no facts`);
  return { f, s: templateSummary(f) };
};

const k = sum("Kaden 3.5kW Split System - Roof To Wall Bracket", [svc("AC-SPLIT-RTW"), eq("Kaden KSI 3.5kw V3 Split Air Conditioner")]);
ok("a Kaden roof-to-wall says Kaden, never Mitsubishi", /new Kaden 3\.5kW split system/.test(k.s) && !/Mitsubishi/.test(k.s), k.s.slice(0, 120));
ok("roof-to-wall: the wall bracket on another wall", k.f.placement === "rtw" && /wall bracket on another wall/.test(k.s));
ok("every split says removal of the old system is included", /Includes removal of your old system/.test(k.s));
ok("the summary runs job, brand, install, inclusions", k.s.split("\n\n").length === 4, k.s.split("\n\n").map((p) => p.slice(0, 30)));

const k26 = sum("Kaden 2.6kW Split System - Roof Mounted", [svc("AC-SPLIT-RTR"), eq("Kaden KSI 2.5kw V3 Split Air Conditioner")]);
ok("the size comes from the unit on it: the 2.6kW template holds a 2.5kW", /Kaden 2\.5kW/.test(k26.s) && k26.f.placement === "rtr");

const r9 = sum("Rinnai 9kw Multi Head Split System", [svc("AC-SPLIT-MULTI"), eq("Rinnai RPX 2.5kw Indoor"), eq("Rinnai Multi Condenser 11kw")]);
ok("a multi-head is described by its condenser", r9.f.kind === "multi" && r9.f.size === "11kW");
ok("multi-head says labour is its own line", /labour is shown on its own line/.test(r9.s));

const gl = sum("Reclaim Split GL 250L V1", [svc("HW-HP-SPLIT"), eq("Reclaim Split - Glass Lined - 250L V1")]);
ok("a 250L says 250L, glass-lined", /Reclaim 250L glass-lined split heat pump/.test(gl.s) && !/160L/.test(gl.s), gl.s.slice(0, 110));
ok("no wifi line where the unit doesn't have it", !/wifi/.test(gl.s));
const gl2 = sum("Reclaim Split GL 250L V2", [svc("HW-HP-SPLIT"), eq("Reclaim Split - Glass Lined - 250L V2 (WIFI)")]);
ok("the wifi model says so", /This model has wifi/.test(gl2.s));
const pana = sum("Panasonic Split GL 250L 4kw", [svc("HW-HP-SPLIT"), eq("Reclaim x Panasonic - Glass Lined - 250L 4kw")]);
ok("Panasonic: a Reclaim tank with the Panasonic heat pump, not the CO2 line", /Panasonic 4kW heat pump/.test(pana.s) && !/CO2/.test(pana.s), pana.s.slice(0, 200));
const ew = sum("Reclaim Earthworker Split SS 250L V2", [svc("HW-HP-SPLIT"), eq("Reclaim Split - Stainless Steel - 250L V2 (Earth Worker)")]);
ok("Earthworker 250L says 250L stainless, not 25L", /Reclaim Earthworker 250L stainless steel/.test(ew.s) && !/\b25L/.test(ew.s));

const is = sum("IStore 180L - Plug", [svc("HW-HP-PLUG"), eq("IStore Heat Pump 180L")]);
ok("iStore plug-in: no electrical work, and no CO2 claim borrowed from Reclaim", /no electrical work is needed/.test(is.s) && !/cold Victorian mornings/.test(is.s) && /new iStore 180L heat pump/.test(is.s));
const rc = sum("Reclaim 300L - Elec", [svc("HW-HP-HARD"), eq("Reclaim Heat Pump 300L - Plug In")]);
ok("hard-wired heat pump: a new circuit and a Certificate of Electrical Safety", /new dedicated circuit with a Certificate of Electrical Safety/.test(rc.s));

const wom = sum("Brivis Wombat 3 Star 15kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Brivis Classic 2P Wombat 15NG")]);
ok("Wombat is internal, not an external cabinet", wom.f.heater === "internal" && /internal heater/.test(wom.s) && !/weatherproof cabinet/.test(wom.s), wom.s.slice(0, 140));
ok("Wombat no longer says Compact Classic", !/Compact Classic/.test(wom.s));
const sp = sum("Brivis StarPro 6 Star 15kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Brivis Starpro SP615in V4")]);
ok("StarPro SP615in is internal", sp.f.heater === "internal");
const buf = sum("Brivis Buffalo 5 Star 20kW Ducted Gas Heater", [svc("GAS-DUCT-EXT"), eq("Brivis Buffalo 5 Star 20kW")]);
ok("Buffalo is external, with Brivis' 5-Star figure carried over", buf.f.heater === "external" && /weatherproof cabinet/.test(buf.s) && /22% less/.test(buf.s));
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

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);

// Checks the job write-up's one price and its input on fixture documents.
// Run: npm run check:jobwrite
//
// The ducted fixture is estimate 303188600 (job 20912, 19 Nov) as the replica
// had it: a labour line, the electrician's line, priced zoning parts, $0
// materials, the compliance certificate and the VEEC rebate.

import assert from "node:assert/strict";
import { alreadyOnePrice, planOnePrice, roleOf, type DocLine } from "../src/lib/jobwrite/lines";
import { summaryHtmlFor, summaryTextFor, wordsInput } from "../src/lib/jobwrite/words";

let n = 0;
const line = (id: number, type: string, code: string, qty: number, unitPrice: number, unitCost = 0): DocLine =>
  ({ id, skuId: id * 10, code, name: code, type, qty, unitPrice, total: Math.round(qty * unitPrice * 100) / 100, unitCost, chargeable: unitPrice !== 0, description: "" });

const ducted: DocLine[] = [
  line(1, "Equipment", "Mitsubishi Zone Controller", 1, 1500, 1237.35),
  line(2, "Equipment", "Mitsubishi Electric 16kw Ducted", 1, 5800, 4801.39),
  line(3, "Service", "AC-DUCTED-2DAYS", 1, 8370, 3700),
  line(4, "Service", "BPC Compliance Certificate", 1, 65, 50),
  line(5, "Service", "REBATE-TOTAL", 1, 0),
  line(6, "Service", "AC-DUCTED-ELE", 1, 1000, 700),
  line(7, "Material", "Wall Bracket 550mm", 1, 0, 55.22),
  line(8, "Material", "REBATE-VEEC", 66, -70, -74),
  line(9, "Service", "Zone 150mm Add-on", 1, 0),
  line(10, "Material", "ZoneBoss Blue 24V Cable RJ12", 1, 20, 14.11),
  line(11, "Material", "ZoneBoss Damper 24V 150mm", 1, 76, 65.8),
  line(12, "Material", "ZoneBoss Blue 24V Cable RJ12", 3, 20, 14.11),
  line(13, "Material", "ZONEBOSS DAMPER 24V 200mm", 3, 80, 64.27),
  line(14, "Material", "ZONEBOSS DAMPER 24V 250mm", 1, 80, 61.25),
  line(15, "Material", "ZONEBOSS DAMPER 24V 300mm", 1, 95, 68.35),
  line(16, "Equipment", "Mitsubishi ITC", 3, 0, 57.67),
];

// Roles.
assert.equal(roleOf(ducted[2]), "labour");
assert.equal(roleOf(ducted[3]), "certificate");
assert.equal(roleOf(ducted[4]), "rebate");
assert.equal(roleOf(ducted[5]), "electrical");
assert.equal(roleOf(ducted[7]), "rebate");
assert.equal(roleOf(ducted[1]), "equipment", "Mitsubishi Electric is equipment, not electrical work");
assert.equal(roleOf(ducted[9]), "materials");
n += 7;

// The plan: labour 8370 + electrical 1000 + priced materials 571 on the labour line; total unchanged.
const p = planOnePrice({ kind: "estimate", lines: ducted });
assert.deepEqual(p.blockers, []);
assert.equal(p.target?.id, 3);
assert.equal(p.parts.labour, 8370);
assert.equal(p.parts.electrical, 1000);
assert.equal(p.parts.materials, 20 + 76 + 60 + 240 + 80 + 95);
assert.equal(p.combined, 8370 + 1000 + 571);
assert.equal(p.before, p.after, "the total never moves");
assert.equal(p.lines.find((l) => l.id === 6)?.newTotal, 0);
assert.equal(p.lines.find((l) => l.id === 4)?.newTotal, 65, "the certificate keeps its price");
assert.equal(p.lines.find((l) => l.id === 8)?.newTotal, -4620, "the rebate keeps its line");
assert.equal(p.lines.find((l) => l.id === 2)?.newTotal, 5800, "the equipment keeps its price");
assert.equal(p.changes, 8, "the labour line, the electrician's and six priced zoning parts");
assert.equal(alreadyOnePrice(p), false);
n += 13;

// An evap changeover is already one price: nothing moves.
const evap = planOnePrice({ kind: "estimate", lines: [line(1, "Equipment", "Brivis Promina P36 Char", 1, 2170, 1729.48), line(2, "Service", "EVAP-INSTALL", 1, 1150), line(3, "Service", "BPC Compliance Certificate", 1, 65, 50)] });
assert.equal(evap.combined, 1150);
assert.equal(evap.changes, 0);
assert.equal(alreadyOnePrice(evap), true);
n += 3;

// Refused: an invoice gone to the accounts, a labour line of quantity 2, no labour at all.
assert.match(planOnePrice({ kind: "invoice", lines: ducted, exported: true }).blockers.join(" "), /accounts/);
assert.match(planOnePrice({ kind: "estimate", lines: [line(1, "Service", "AC-SPLIT-MULTI-2", 2, 500), line(2, "Material", "Pipe", 1, 50)] }).blockers.join(" "), /quantity 2/);
const none = planOnePrice({ kind: "estimate", lines: [line(1, "Equipment", "Unit", 1, 1000), line(2, "Material", "Pipe", 1, 50)] });
assert.match(none.blockers.join(" "), /no labour line/);
assert.equal(none.target, null);
assert.equal(none.after, none.before);
n += 5;

// The summary: labels in bold, empty parts left out, the text escaped.
const q = { doing: "Replacing your heater & cooling.", removing: "", included: "New ductwork <R1.5>.", excluded: "", labour: "x" };
assert.equal(summaryHtmlFor("estimate", q), "<p><strong>What we're doing:</strong> Replacing your heater &amp; cooling.</p><p><strong>What's included:</strong> New ductwork &lt;R1.5&gt;.</p>");
assert.equal(summaryTextFor("invoice", { did: "Fitted it.", removed: "The old one.", included: "", labour: "" }), "What we did: Fitted it.\n\nWhat we removed: The old one.");
n += 2;

// The input says which parts went into the one price, and no prices are asked for.
const input = wordsInput({
  job: { number: "20912", type: "Installation - Ducted Refrigerated", businessUnit: null, status: "Scheduled", summary: "<p>Ducted 16kW</p>" },
  quote: { kind: "estimate", id: 1, name: "Mitsubishi 16kW", status: "Sold", summary: null, lines: ducted }, quotePlan: p,
  invoice: null, invoicePlan: null, reports: [], notes: [{ at: "2026-11-10T00:00:00Z", text: "Manhole in the hallway", jobNumber: "20880" }], electricians: [],
});
assert.match(input.text, /Merged into the one labour price: labour, electrical, materials/);
assert.match(input.text, /\[labour, merged into the one price\] 1 × AC-DUCTED-2DAYS/);
assert.match(input.text, /Manhole in the hallway/);
assert.match(input.text, /<invoice>none on this job<\/invoice>/);
assert.equal(input.key, wordsInput({ ...{ job: { number: "20912", type: "Installation - Ducted Refrigerated", businessUnit: null, status: "Scheduled", summary: "<p>Ducted 16kW</p>" } }, quote: { kind: "estimate", id: 1, name: "Mitsubishi 16kW", status: "Sold", summary: null, lines: ducted }, quotePlan: p, invoice: null, invoicePlan: null, reports: [], notes: [{ at: "2026-11-10T00:00:00Z", text: "Manhole in the hallway", jobNumber: "20880" }], electricians: [] }).key);
n += 5;

console.log(`check-jobwrite: ${n} checks passed`);

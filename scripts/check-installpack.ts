/**
 * Install packs: what goes in the lists, what's said about ordering, and when
 * a new version is made.
 *
 * The fixture is job 20453's sold quote and orders as they stood on 27 Oct,
 * with the customer's details replaced. An installer acts on this sheet on
 * site: a rebate line listed as a material, a "sent" that wasn't, or a version
 * that changes with nothing new in it would each send somebody the wrong way.
 *
 *   npm run check:installpack
 *   npm run check:installpack -- out.pdf photo1.jpg photo2.jpg   (also writes the PDF)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPack, fingerprint, packParts, plainText, whatChanged, type PackFacts } from "../src/lib/installpack/build";
import { packPdf } from "../src/lib/installpack/pdf";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const SCOPE = "Replacement of your existing ducted system with a Dominator reverse-cycle unit, using your existing ductwork.\n\nYour existing unit is removed, the new system installed and connected, a new return air box fitted, and everything commissioned and tested before handover.";
const facts: PackFacts = {
  jobId: 301570798,
  jobNumber: "20453",
  jobType: "Installation - Ducted Refrigerated",
  customer: "A. Customer",
  siteAddress: "1 Example Street, Pakenham, VIC 3810",
  sitePhone: "0400 000 000",
  visits: "Fri 30 Oct 7:00am",
  crew: "Chaz Stephens, Jackson Lane, Paddy Fairclough, Ray Kennedy",
  quote: { id: 301223831, name: "Braemar Dominator Installation Internal", fromJob: "20106", soldOn: "2026-10-05T22:39:43Z", summary: SCOPE },
  jobSummary: `${SCOPE}\n\nRemove existing system. Install fan coil and outdoor unit. Pipework, electrical,\ncommission and hand over. Remove all rubbish from site.`,
  items: [
    { skuId: 301158109, type: "Equipment", code: "Braemar Dominator S2 (Internal)", name: "Braemar Dominator Series 2 - Internal", qty: 1 },
    { skuId: 301165167, type: "Service", code: "AC-DOM-INSTALL", name: "Dominator - Installation", qty: 1 },
    { skuId: 209621211, type: "Service", code: "BPC Compliance Certificate", name: "BPC Compliance Certificate", qty: 1 },
    { skuId: 301034048, type: "Service", code: "REBATE-TOTAL", name: "Total Government Rebates Applied", qty: 1 },
    { skuId: 301164380, type: "Service", code: "DOM-ELEC", name: " Dominator - Electrical Connection", qty: 1 },
    { skuId: 301034820, type: "Material", code: "REBATE-VEEC", name: "Victorian Energy Upgrades Discount (VEEC)", qty: 74 },
    { skuId: 301167609, type: "Material", code: "INS-R1.0-350", name: "Bradflo Insulated Duct R1.0 350mm x 6 Metre", qty: 2 },
    { skuId: 301190015, type: "Material", code: "R/A Box 600x400", name: "Return Air Box - 400mm x 600mm", qty: 1 },
    { skuId: 209622205, type: "Material", code: '3/8" x 5/8"    ', name: 'Ardent Copper Pair Coil 3/8" x 5/8" R410A 20mtr   ', qty: 1 },
    { skuId: 301216460, type: "Material", code: "PVC Pressure90 20mm", name: "PVC Pressure Elbow 90Deg 20mm", qty: 4 },
    { skuId: 999, type: "Material", code: "Silicone", name: "Silicone", qty: 0.5 },
    { skuId: 301572051, type: "Material", code: "4-Way 230mm x 230mm", name: "  Multivent MDO 4-Way 230mm x 230mm", qty: 11 },
    { skuId: 301155705, type: "Service", code: "Extra Time", name: "Extra Time", qty: 2 },
  ],
  orders: [
    { skuId: 301158109, supplier: "Braemar", po: "AGA-261026-BRA-M1", status: "sent", kind: "order", sentAt: "2026-10-25T21:38:00Z", pickup: false },
    { skuId: 301167609, supplier: "Reece", po: "AGA-261026-REE", status: "draft", kind: "order", sentAt: null, pickup: false },
    { skuId: 301190015, supplier: "Reece", po: "AGA-261026-REE", status: "draft", kind: "order", sentAt: null, pickup: false },
    { skuId: 209622205, supplier: "Reece", po: "AGA-261019-REE", status: "cancelled", kind: "order", sentAt: null, pickup: false },
    { skuId: 301216460, supplier: "Reece", po: "AGA-261019-REE-2", status: "sent", kind: "order", sentAt: "2026-10-20T00:00:00Z", pickup: true },
    { skuId: null, supplier: "GT Electrics", po: "AGA-261026-GTE-7", status: "sent", kind: "work_order", sentAt: "2026-10-21T05:45:03Z", pickup: false },
  ],
};

const p = buildPack(facts);
const names = (ls: { name: string }[]) => ls.map((l) => l.name);
console.log("-- what's listed --");
ok("the unit is under Going in", names(p.units).join() === "Braemar Dominator Series 2 - Internal", names(p.units));
ok("a rebate is never a material or work", ![...names(p.materials), ...p.work].some((n) => /rebate|VEEC/i.test(n)));
ok("materials keep the quote's order", names(p.materials)[0] === "Bradflo Insulated Duct R1.0 350mm x 6 Metre" && p.materials.length === 6, names(p.materials));
ok("names are tidied of ServiceTitan's stray spaces", names(p.materials).includes("Multivent MDO 4-Way 230mm x 230mm"));
ok("the code shows when it differs from the name", p.materials[0].code === "INS-R1.0-350" && p.materials.find((l) => l.name === "Silicone")?.code === null);
ok("part quantities stay as written", p.materials.find((l) => l.name === "Silicone")?.qty === "0.5");
ok("labour lines are listed, with a quantity when it isn't one", p.work.includes("Dominator - Electrical Connection") && p.work.includes("Extra Time ×2"), p.work);

console.log("-- what's said about ordering --");
const ord = (n: string) => [...p.units, ...p.materials].find((l) => l.name.startsWith(n))?.ordered;
ok("a sent order says who, which and when", ord("Braemar") === "Braemar, AGA-261026-BRA-M1, sent Mon 26 Oct", ord("Braemar"));
ok("a draft says it hasn't gone", ord("Bradflo") === "Reece, AGA-261026-REE: draft, not sent yet", ord("Bradflo"));
ok("a cancelled order is no order", ord("Ardent") === "Not on an order", ord("Ardent"));
ok("a pickup says so", ord("PVC Pressure") === "Reece, AGA-261019-REE-2, sent Tue 20 Oct (pick up)", ord("PVC Pressure"));
ok("a line on no order says so plainly", ord("Silicone") === "Not on an order");
ok("the electrician's work order is listed once", p.contractors.length === 1 && p.contractors[0].startsWith("GT Electrics: work order AGA-261026-GTE-7, sent"), p.contractors);

console.log("-- wording --");
ok("the scope is the quote's, word for word", p.scope === SCOPE);
ok("job notes don't repeat the scope", p.jobNotes?.startsWith("Remove existing system.") === true, p.jobNotes);
ok("job notes the same as the scope aren't printed", buildPack({ ...facts, jobSummary: SCOPE }).jobNotes === null);
ok("HTML becomes plain text", plainText("<div><b>QUOTATION REQUIRED</b></div><div>Arrange install&nbsp;of new split</div>") === "QUOTATION REQUIRED\nArrange install of new split");
ok("the quote line says which job it came from", p.facts.find(([k]) => k === "Quote")?.[1] === "Braemar Dominator Installation Internal · from job 20106 · sold Tue 6 Oct", p.facts);
ok("nobody assigned is said, not left blank", buildPack({ ...facts, crew: null }).facts.find(([k]) => k === "Crew")?.[1] === "Nobody assigned yet");

console.log("-- when a new version is made --");
const base = packParts(facts);
ok("the same facts give the same fingerprint", fingerprint(packParts(structuredClone(facts))) === fingerprint(base));
const sent = packParts({ ...facts, orders: facts.orders.map((o) => (o.po === "AGA-261026-REE" ? { ...o, status: "sent" as const, sentAt: "2026-10-28T00:00:00Z" } : o)) });
ok("an order going out is a new version", fingerprint(sent) !== fingerprint(base));
ok("…and the note says it was the orders", whatChanged(base, sent, false) === "what's been ordered changed", whatChanged(base, sent, false));
const moved = packParts({ ...facts, visits: "Mon 2 Nov 7:00am", crew: "Ray Kennedy" });
ok("a move and a crew change are both named", whatChanged(base, moved, false) === "the booking and the crew changed", whatChanged(base, moved, false));
ok("photos are named when they're what changed", whatChanged(base, base, true) === "the photos changed");
ok("a different sold quote is the quote changing", whatChanged(base, packParts({ ...facts, quote: { ...facts.quote, id: 1 } }), false) === "the quote changed");

const [out, ...photos] = process.argv.slice(2);
(async () => {
  if (out) {
    const pics = photos.map((path, i) => ({ photo: { id: i, name: path.split("/").pop()!, at: "2026-10-12T01:00:00Z", quoteVisit: i % 2 === 0 }, bytes: readFileSync(path) }));
    writeFileSync(out, await packPdf(p, pics, { version: 2, madeAt: new Date("2026-10-27T23:00:00Z"), notShown: 3 }));
    console.log(`wrote ${out}`);
  }
  console.log(bad ? `\n${bad} failed` : "\nall passed");
  process.exit(bad ? 1 : 0);
})();

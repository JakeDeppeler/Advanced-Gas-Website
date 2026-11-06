/**
 * Condition Reports: how a ServiceTitan form submission reads into the PDF
 * that goes with a work order.
 *
 * The fixture is submission 465 (job 20721, 31 Oct) in the shape the forms
 * probe returned, with the customer's details replaced and the tech's notes
 * written out in full (the probe cut answers at 60 characters). A light shown
 * the wrong colour, or a field dropped, would tell a contractor the wrong
 * thing about the unit they're walking up to.
 *
 *   npm run check:conditionreport
 *   npm run check:conditionreport -- out.pdf signature.png   (also writes the PDF)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { answer, reportFileName, toReport, type Submission } from "../src/lib/conditionReport/report";
import { reportPdf } from "../src/lib/conditionReport/pdf";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

// A 1×1 transparent PNG, unless a real signature is given.
const DOT = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const sigPath = process.argv[3];
const SIG = sigPath ? readFileSync(sigPath).toString("base64") : DOT;

const photo = (n: number) => ({ fileName: `Attaches/20721_20261031013813233_${n}.jpg`, originalFileName: `IMG_${7198 + n}_compressed.jpg` });
const sub: Submission = {
  id: 465,
  formName: "Condition Report ",
  status: "Completed",
  submittedOn: "2026-10-31T01:38:22.920004Z",
  owners: [{ type: "Job", id: 303041482 }, { type: "Equipment", id: 303042953 }],
  units: [
    { name: "Customer Name", type: "Text", value: "An Agency - Bayside", attachments: [] },
    { name: "Location Address", type: "Text", value: "1 Example Street, Seaford, VIC 3198", attachments: [] },
    { name: "Customer Reference", type: "Text", value: null, attachments: [] },
    { name: "Job Number", type: "Text", value: "20721", attachments: [] },
    { name: "Equipment Name", type: "Text", value: "Reverse cycle ducted split ", attachments: [] },
    { name: "Equipment Type", type: "Text", value: "Ducted Reverse Cycle", attachments: [] },
    { name: "Equipment Manufacturer", type: "Text", value: "Daikin", attachments: [] },
    { name: "Equipment Model", type: "Text", value: "RZQ71FV4A", attachments: [] },
    { name: "Equipment Serial Number", type: "Text", value: "9053413", attachments: [] },
    { name: "System status", type: "Dropdown", value: null, options: [], attachments: [] },
    { name: "Condition", type: "Stoplight", value: 1, attachments: [] },
    {
      name: "Technician Notes", type: "Text",
      value: "Report of ducted split system setting off safety switch. On inspection the outdoor unit's fan motor windings read low to earth and the motor is tripping the RCD on start-up.\r\nIndoor coil clean, filters in fair condition. Recommend replacing the outdoor fan motor; unit otherwise serviceable.",
      attachments: Array.from({ length: 10 }, (_, i) => photo(i + 1)),
    },
    { name: "Service Date", type: "Date", value: "2026-10-31T01:23:00Z", attachments: [] },
    { name: "Technician ", type: "Text", value: "A. Technician", attachments: [] },
    { name: "Signature", type: "Signature", value: `data:image/png;base64,${SIG}`, isRefused: false, refusalReason: null, attachments: [] },
  ],
};

const r = toReport(sub);
ok("job number from its field", r.jobNumber === "20721", r.jobNumber);
ok("site from the address field", r.site === "1 Example Street, Seaford, VIC 3198", r.site);
ok("equipment is make and model", r.equipment === "Daikin RZQ71FV4A", r.equipment);
ok("the light is amber (1)", r.lights.length === 1 && r.lights[0].light === 1, r.lights);
ok("notes keep their line break and count the photos", r.notes.length === 1 && r.notes[0].text.includes("\n") && r.notes[0].photos === 10, r.notes.map((n) => [n.name, n.photos]));
ok("photos counted across the report", r.photos === 10, r.photos);
ok("unanswered fields left out", !r.facts.some(([k]) => /reference|system status/i.test(k)), r.facts.map(([k]) => k));
ok("job number, customer and address aren't repeated as facts", !r.facts.some(([k]) => /job number|customer name|address/i.test(k)));
ok("equipment, date and tech are facts", ["Equipment Model", "Equipment Serial Number", "Service Date", "Technician"].every((k) => r.facts.some(([f]) => f === k)), r.facts);
ok("service date in Melbourne time", r.facts.find(([k]) => k === "Service Date")?.[1] === "31 Oct 2026, 12:23 pm", r.facts.find(([k]) => k === "Service Date"));
ok("signature carries the PNG and who signed", r.signature?.png === SIG && r.signature?.by === "A. Technician");
ok("file name", reportFileName(r) === "Condition report - job 20721 - Daikin RZQ71FV4A.pdf", reportFileName(r));

// The other two lights, and one that isn't a light ServiceTitan sends.
const light = (v: unknown) => toReport({ ...sub, units: [{ name: "Condition", type: "Stoplight", value: v }] }).lights[0].light;
ok("0 is red, 2 is green", light(0) === 0 && light(2) === 2);
ok("anything else isn't guessed", light(3) === null && light(null) === null && light("amber") === null);
ok("a dropdown answered by position names the option", answer({ type: "Dropdown", value: 1, options: [{ name: "Running" }, { name: "Not running" }] }) === "Not running");
ok("a refused signature says so", toReport({ ...sub, units: [{ name: "Signature", type: "Signature", value: null, isRefused: true, refusalReason: "Customer not home" }] }).signature?.refused === "Customer not home");

(async () => {
  const pdf = await reportPdf(r, new Date("2026-11-01T00:00:00Z"));
  ok("PDF made", pdf.length > 1000, pdf.length);
  const out = process.argv[2];
  if (out) { writeFileSync(out, pdf); console.log(`wrote ${out}`); }
  if (bad) { console.error(`${bad} failed`); process.exit(1); }
})();

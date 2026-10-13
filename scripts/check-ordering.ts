/**
 * Supply › Next week: the week it picks, what it would order, from whom, and
 * what it would tell the electrician. Fixtures are shaped like live rows from
 * upcoming_order_lines and electrician_work_orders (12 Oct 2026).
 *
 * Writes the filled Mitsubishi form to $ORDERING_PDF_OUT when set, so it can
 * be opened and looked at.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import {
  byJob, ccList, dayTimeLabel, deliveryInstructionsFor, orderDelivery, mitsubishiOrderEmail, modelLooksLikeName, neededBy, nextWeek, parseEmails, planWeek, poNumber, reeceListEmail,
  splitAddress, supplierOrderEmail, supplierRows, workOrderEmail, workRef,
  type OrderLine, type Supplier, type WorkOrderRow,
} from "../src/lib/ordering/plan";
import { fillMitsubishiForm } from "../src/lib/ordering/mitsubishiForm";


let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

console.log("-- which week --");
// Wednesday 15 Oct 2026, 7am Melbourne (AEDT, UTC+11) = Tue 14 Oct 20:00 UTC
const wed = new Date("2026-10-14T20:00:00Z");
const w = nextWeek(wed);
ok("run on a Wednesday drafts the Monday to Sunday after", w.start === "2026-10-19" && w.end === "2026-10-25", JSON.stringify(w));
// The other cron slot, an hour later, lands on the same week.
ok("the second cron slot picks the same week", JSON.stringify(nextWeek(new Date("2026-10-14T21:00:00Z"))) === JSON.stringify(w));
// Sunday night in Melbourne is still the old week.
ok("Sunday 11pm Melbourne is still this week's run", nextWeek(new Date("2026-10-19T12:00:00Z")).start === "2026-10-26");
ok("across the April daylight-saving change", nextWeek(new Date("2027-04-01T00:00:00Z")).start === "2027-04-05");

const S = (id: string, name: string, method: Supplier["method"], email: string | null): Supplier =>
  ({ id, name, method, email, notes: null, work_order_note: id === "gt_electrics" ? "Email us if you can't make it." : null, active: true });
const suppliers = [
  S("reece", "Reece", "reece_cart", null),
  S("mitsubishi", "Mitsubishi Electric", "email_form", "LEGCustomerService@meaust.meap.com"),
  S("reclaim", "Reclaim Energy", "email", "orders@reclaimenergy.com.au"),
  S("gt_electrics", "GT Electrics (Geoff)", "work_order", "geoff@gtelectrics.com.au"),
];

const L = (p: Partial<OrderLine>): OrderLine => ({
  job_id: 1, job_number: "1", job_type: "Install - Split System", customer_name: "C", suburb: "Pakenham",
  install_date: "2026-10-20", estimate_id: 9, sku_id: 1, sku_name: "X", description: "X", sku_type: "Material",
  qty: 1, unit_cost: 10, supplier_id: "reece", issue: null, supplier_model: "X", appointment_start: "2026-10-19T20:30:00Z", ...p,
});
const lines: OrderLine[] = [
  L({ job_id: 300, job_number: "20300", customer_name: "Lisa", install_date: "2026-10-21", sku_id: 301091988, sku_name: "Mitsubishi Electric 18kw Ducted",
      description: "Mitsubishi Electric 18kw Ducted Split", sku_type: "Equipment", unit_cost: 5231.18, supplier_id: "mitsubishi", supplier_model: "Mitsubishi Electric 18kw Ducted" }),
  L({ job_id: 264, job_number: "20264", customer_name: "Anthony Hooper", install_date: "2026-10-20", sku_id: 148184332, sku_name: "PEA-M71/PUZ-M71",
      sku_type: "Equipment", unit_cost: 1820, supplier_id: "mitsubishi", supplier_model: "MSZ-AP71VGKIT" }),
  L({ job_id: 265, job_number: "20265", customer_name: "Second split", install_date: "2026-10-22", sku_id: 148184332, sku_name: "PEA-M71/PUZ-M71",
      sku_type: "Equipment", unit_cost: 1820, supplier_id: "mitsubishi", supplier_model: "MSZ-AP71VGKIT" }),
  L({ job_id: 300, job_number: "20300", install_date: "2026-10-21", sku_id: 11, sku_name: "Kembla Hard Drawn Copper 15mm", qty: 2, unit_cost: 59.33, supplier_part: "1234567" }),
  L({ job_id: 264, job_number: "20264", install_date: "2026-10-20", sku_id: 11, sku_name: "Kembla Hard Drawn Copper 15mm", qty: 3, unit_cost: 59.33 }),
  L({ job_id: 410, job_number: "20410", install_date: "2026-10-23", sku_id: 21, sku_name: "Reclaim Heat Pump 300L", sku_type: "Equipment", unit_cost: 3030, supplier_id: "reclaim" }),
  // Not next week: must not be ordered yet.
  L({ job_id: 500, job_number: "20500", install_date: "2026-10-28", sku_id: 21, sku_name: "Reclaim Heat Pump 300L", sku_type: "Equipment", unit_cost: 3030, supplier_id: "reclaim" }),
  // Problems.
  L({ job_id: 600, job_number: "20600", install_date: "2026-10-20", sku_id: null, sku_name: null, supplier_id: null, issue: "No sold quote linked to this install job", qty: null, unit_cost: null }),
  L({ job_id: 610, job_number: "20610", install_date: "2026-10-20", sku_id: 31, sku_name: "Mystery 9000", sku_type: "Equipment", supplier_id: null, issue: "No supplier set for this item" }),
];
const W = (p: Partial<WorkOrderRow>): WorkOrderRow => ({
  job_id: 1, job_number: "1", job_type: "Install - Split System", customer_name: "C", site_address: "1 Test St, Clyde, VIC 3978",
  crew: "Jackson Lane, Ray Kennedy", electrical_items: "AC-SPLIT-ELEC x1", send_to: "geoff@gtelectrics.com.au", issue: null,
  customer_phone: "0400000000", customer_email: "c@example.com", system_installed: "Kaden KSI 5kw V3 Split Air Conditioner",
  work_order_note: "Email us if you can't make it.", appointment_start_at: "2026-10-20T20:30:00Z", appointment_end_at: "2026-10-21T05:00:00Z",
  all_visits: "Wed 21 Oct 7:30am", install_date: "2026-10-21", ...p,
});
const workOrders: WorkOrderRow[] = [
  W({ job_id: 309, job_number: "20309", customer_name: "Melissa Payet", site_address: "19 Fremont Street, Clyde, VIC 3978", system_installed: "Kaden KSI 3.5kw V3 Split Air Conditioner" }),
  W({ job_id: 311, job_number: "20311", customer_name: "19 Fremont St Clyde", site_address: "19 Fremont Street, Clyde, VIC 3978", customer_phone: null,
      appointment_start_at: "2026-10-21T00:00:00Z", crew: "Jackson Lane, Paddy Fairclough" }),
  W({ job_id: 258, job_number: "20258", customer_name: "Matthew Birchall", site_address: "35 Granton Avenue, Endeavour Hills, VIC 3802",
      install_date: "2026-10-22", appointment_start_at: "2026-10-21T20:30:00Z", electrical_items: "AC-DUCTED-ELE x1", system_installed: "Mitsubishi Electric 16kw Ducted Split" }),
  W({ job_id: 900, job_number: "20900", install_date: "2026-10-29" }),
  W({ job_id: 910, job_number: "20910", site_address: "5 Other Rd, Pakenham, VIC 3810", crew: null, issue: "No crew assigned yet" }),
];

console.log("\n-- the plan --");
const plan = planWeek({ week: w, lines, workOrders, suppliers, alreadyOrdered: new Set() });
const bySup = Object.fromEntries(plan.orders.map((o) => [o.supplier_id, o.lines]));
ok("one order per supplier", plan.orders.map((o) => o.supplier_id).sort().join(",") === "mitsubishi,reclaim,reece", plan.orders.map((o) => o.supplier_id).join(","));
ok("next week only — the 28 Oct heat pump waits", (bySup.reclaim ?? []).every((l) => l.job_number === "20410"));
ok("materials go to Reece, per job", (bySup.reece ?? []).length === 2);
ok("no work_order supplier ends up as a goods order", !bySup.gt_electrics);

const meRows = supplierRows(bySup.mitsubishi ?? []);
const same = meRows.find((r) => r.model === "MSZ-AP71VGKIT");
ok("the same unit for two jobs is one line of two", same?.qty === 2 && same.jobs.join(",") === "20264,20265", JSON.stringify(same));
ok("and is wanted by the earlier install", same?.first_install === "2026-10-20");

ok("a job with no sold quote is a problem, not an order", plan.problems.some((p) => p.job_number === "20600"));
ok("an item with no supplier is named", plan.problems.some((p) => p.job_number === "20610" && p.what.includes("Mystery 9000")));
ok("a pricebook name where Mitsubishi needs a model code is flagged",
  plan.problems.some((p) => p.job_number === "20300" && p.what.includes("model code")));
ok("a real model code is not", !plan.problems.some((p) => p.job_number === "20264"));
ok("modelLooksLikeName", modelLooksLikeName("Mitsubishi Electric 18kw Ducted") && !modelLooksLikeName("PEA-M160HAA/PUZ-ZM160YKA") && modelLooksLikeName(null));

console.log("\n-- the electrician --");
const fremont = plan.workOrders.find((x) => x.details.site_address.startsWith("19 Fremont"));
ok("two jobs at one site on one day are one work order", fremont?.details.jobs.length === 2, String(fremont?.details.jobs.length));
ok("…starting at the earlier of the two", fremont?.details.start_at === "2026-10-20T20:30:00Z");
ok("…with everyone on the crew once", fremont?.details.crew.join(",") === "Jackson Lane,Ray Kennedy,Paddy Fairclough", fremont?.details.crew.join(","));
ok("…and the contact that has a phone", fremont?.details.customer_phone === "0400000000");
ok("a different site is its own work order", plan.workOrders.length === 3, String(plan.workOrders.length));
ok("the week after isn't booked yet", !plan.workOrders.some((x) => x.details.jobs.some((j) => j.job_number === "20900")));
ok("no crew yet is flagged for the office", plan.problems.some((p) => p.job_number === "20910" && /crew/.test(p.what)));
ok("time reads in Melbourne", dayTimeLabel("2026-10-20T20:30:00Z") === "Wed 21 Oct, 7:30 am", dayTimeLabel("2026-10-20T20:30:00Z"));

const settings = {
  replyTo: "admin@advancedgas.com.au", deliveryAddress: "1 Sierra Circuit, Pakenham VIC 3810", orderedBy: "Kellie Winbanks",
  mitsubishi: { accountName: "ADVANCED GAS & AIRCONDITIONING SERVICES PTY LTD", accountNumber: "116360", abn: "35607575280", salesRep: "ALEX BETTIN", contactName: "KELLIE WINBANKS", contactNumber: "0359478000" },
  signName: "Kellie Winbanks", signPosition: "Owner", factoryInstructions: "Deliver to our factory", deliveryNote: "We do not have a forklift.",
};
const wo = workOrderEmail({ supplier: suppliers[3], poNumber: poNumber(w, "gt_electrics", 1), details: fremont!.details, settings });
ok("work order email says when, where, the system, crew and customer",
  /Wed 21 Oct, 7:30 am/.test(wo.text) && /19 Fremont Street/.test(wo.text) && /Kaden KSI 3.5kw/.test(wo.text) && /Paddy Fairclough/.test(wo.text) && /0400000000/.test(wo.text));
ok("and tells him to email us if he can't make it", /Email us if you can't make it/.test(wo.text));
ok("the po number", poNumber(w, "gt_electrics", 1) === "AGA-261019-GTE" && poNumber(w, "mitsubishi", 2) === "AGA-261019-MIT-2");

const se = supplierOrderEmail({ supplier: suppliers[2], poNumber: "AGA-261019-REC", lines: bySup.reclaim!, delivery: settings.deliveryAddress, deliveryInstructions: null, settings, attached: false, today: "2026-10-14" });
ok("delivered three days before the install", neededBy("2026-10-23") === "2026-10-20" && neededBy("2026-10-19") === "2026-10-16");
ok("…moved back to the Friday when that's a weekend", neededBy("2026-10-21") === "2026-10-16" && neededBy("2026-10-20") === "2026-10-16");
ok("supplier email asks for one delivery three days before the first install", /deliver by Tue 20 Oct/.test(se.subject) && se.text.includes("all in one delivery"), se.subject);
ok("a delivery date already gone reads ASAP", orderDelivery([{ install_date: "2026-10-16" }], "2026-10-14")?.label === "ASAP"
  && orderDelivery([{ install_date: "2026-10-23" }, { install_date: "2026-10-30" }], "2026-10-14")?.label === "Tue 20 Oct");
{
  const ds = { factoryInstructions: "Deliver to our factory", deliveryNote: "We do not have a forklift." };
  const said = (instr: string | null, toSite: boolean) => deliveryInstructionsFor({ delivery_instructions: instr, delivery_to_site: toSite }, ds);
  ok("a factory order: deliver to the factory, and no forklift", said(null, false) === "Deliver to our factory. We do not have a forklift.", String(said(null, false)));
  ok("a site order still says no forklift", said(null, true) === "We do not have a forklift.", String(said(null, true)));
  ok("an order's own instructions come first, the note still added", said("Leave at side gate", true) === "Leave at side gate. We do not have a forklift.", String(said("Leave at side gate", true)));
  ok("…and not twice when the instructions already say it", said("Call Kellie, we do not have a forklift", false) === "Call Kellie, we do not have a forklift.", String(said("Call Kellie, we do not have a forklift", false)));
}

console.log("\n-- one order across this week and next, for suppliers that charge per delivery --");
{
  const rin = S("rinnai", "Rinnai (Brivis)", "email", "SalesOrders@rinnai.com.au");
  const rinnaiLines: OrderLine[] = [
    L({ job_id: 700, job_number: "20700", install_date: "2026-10-16", sku_id: 71, sku_name: "Brivis P46CHAR", supplier_id: "rinnai", sku_type: "Equipment" }),
    L({ job_id: 701, job_number: "20701", install_date: "2026-10-21", sku_id: 71, sku_name: "Brivis P46CHAR", supplier_id: "rinnai", sku_type: "Equipment" }),
    L({ job_id: 702, job_number: "20702", install_date: "2026-10-13", sku_id: 71, sku_name: "Brivis P46CHAR", supplier_id: "rinnai", sku_type: "Equipment" }),
    L({ job_id: 703, job_number: "20703", install_date: "2026-10-16", sku_id: 21, sku_name: "Reclaim Heat Pump 300L", supplier_id: "reclaim", sku_type: "Equipment" }),
  ];
  const win = { start: "2026-10-14", end: "2026-10-25" };
  const separate = planWeek({ week: w, lines: rinnaiLines, workOrders: [], suppliers: [...suppliers, rin], alreadyOrdered: new Set(), combineWindow: win });
  const rinOrder = separate.orders.find((o) => o.supplier_id === "rinnai");
  ok("without the switch, only next week's job", rinOrder?.lines.map((l) => l.job_number).join() === "20701", rinOrder?.lines.map((l) => l.job_number).join());
  const combined = planWeek({ week: w, lines: rinnaiLines, workOrders: [], suppliers: [...suppliers, { ...rin, combine_orders: true }], alreadyOrdered: new Set(), combineWindow: win });
  const c = combined.orders.find((o) => o.supplier_id === "rinnai");
  ok("with it, this week's job joins next week's on one order", c?.lines.map((l) => l.job_number).join() === "20700,20701", c?.lines.map((l) => l.job_number).join());
  ok("…but not a job from before today", !c?.lines.some((l) => l.job_number === "20702"));
  ok("…and other suppliers keep to the week", !combined.orders.some((o) => o.supplier_id === "reclaim"));
  ok("…and anything already ordered stays out", !planWeek({ week: w, lines: rinnaiLines, workOrders: [], suppliers: [...suppliers, { ...rin, combine_orders: true }],
    alreadyOrdered: new Set(["700:71"]), combineWindow: win }).orders.find((o) => o.supplier_id === "rinnai")?.lines.some((l) => l.job_number === "20700"));
}
ok("and escapes what it prints", !/<script/.test(supplierOrderEmail({ supplier: suppliers[2], poNumber: "X", lines: [{ ...bySup.reclaim![0], supplier_model: "<script>" }], delivery: "a", deliveryInstructions: null, settings, attached: false }).html));

console.log("\n-- the office's own wording --");
const custom = supplierOrderEmail({
  supplier: { ...suppliers[2], email_intro: "G'day Reclaim crew,\nOrder {po} below please.", email_signoff: "Cheers — Kellie <ring 5947 8000>" },
  poNumber: "AGA-261019-REC", lines: bySup.reclaim!, delivery: settings.deliveryAddress, deliveryInstructions: null, settings, attached: false,
});
ok("a custom opening is used, with {po} filled in", custom.text.startsWith("G'day Reclaim crew,\nOrder AGA-261019-REC below please."), custom.text.slice(0, 60));
ok("a custom closing is used", custom.text.includes("Cheers — Kellie <ring 5947 8000>"));
ok("and escaped in the HTML, line breaks kept", custom.html.includes("Cheers — Kellie &lt;ring 5947 8000&gt;") && custom.html.includes("G&#39;day") === false && custom.html.includes("crew,<br>Order"));
ok("the order lines are still there", custom.text.includes("— job 20410, install Fri 23 Oct"));
const plain = supplierOrderEmail({ supplier: { ...suppliers[2], email_intro: "   ", email_signoff: null }, poNumber: "X1", lines: bySup.reclaim!, delivery: "a", deliveryInstructions: null, settings, attached: false });
ok("a blank box falls back to the standard wording", plain.text.startsWith("Hi team,") && plain.text.includes("Please confirm the order"));
const geoffCustom = workOrderEmail({ supplier: { ...suppliers[3], email_intro: "Morning Geoff,", email_signoff: "Call Jake if stuck." }, poNumber: "W1", details: fremont!.details, settings });
ok("Geoff's opening and note can be changed too", geoffCustom.text.startsWith("Morning Geoff,") && geoffCustom.text.includes("Call Jake if stuck.") && !geoffCustom.text.includes("Email us if you can't make it"));

console.log("\n-- work order name, CC, Reece per job, Mitsubishi form-style --");
ok("a work order is called by its job numbers and address", workRef(fremont!.details).startsWith("Job ") && workRef(fremont!.details).includes(" & ")
  && workRef(fremont!.details).endsWith(fremont!.details.site_address), workRef(fremont!.details));
ok("…and that is what Geoff's email is titled", wo.subject.includes(workRef(fremont!.details)) && !wo.subject.includes("AGA-"), wo.subject);
const pe = parseEmails("a@x.com; B@x.com,  a@x.com\nnot-an-email");
ok("CC box: splits, drops repeats, keeps typos to point out", pe.ok.join() === "a@x.com,B@x.com" && pe.bad.join() === "not-an-email", JSON.stringify(pe));
const cc = ccList(settings, { ...suppliers[2], cc_emails: ["jake@trusttrade.au", "ADMIN@advancedgas.com.au"] }, { cc_emails: ["kellie@x.com", "orders@reclaim.com.au"] }, "orders@reclaim.com.au");
ok("CC: the office, the supplier's standing copies and this order's, once each, never the recipient",
  cc.join() === "admin@advancedgas.com.au,jake@trusttrade.au,kellie@x.com", cc.join());
const groups = byJob(bySup.reece!);
ok("Reece lines group per job, earliest install first", groups.map((g) => g.job_number).join() === "20264,20300", groups.map((g) => g.job_number).join());
const rl = reeceListEmail({ supplier: suppliers[0], poNumber: "AGA-261019-REE", lines: bySup.reece!, delivery: settings.deliveryAddress, settings,
  instructions: deliveryInstructionsFor({ delivery_instructions: null, delivery_to_site: false }, settings) });
ok("the Reece list carries the delivery instructions for maX", rl.text.includes("Delivery instructions for maX: Deliver to our factory. We do not have a forklift."));
ok("the Reece list has a table per job", (rl.html.match(/<table role="presentation" width="100%"/g) ?? []).length >= 2 && rl.text.indexOf("Job 20264") < rl.text.indexOf("Job 20300"));
ok("…with the Reece product number where the pricebook has one", rl.text.includes("2 x 1234567  Kembla") && rl.text.includes("(no Reece #)"), rl.text);
ok("…and says how many are missing one", /1 line\(s\) have no Reece product number/.test(rl.text));
ok("splitAddress", JSON.stringify(splitAddress("1 Sierra Circuit, Pakenham VIC 3810")) === JSON.stringify({ street: "1 Sierra Circuit, Pakenham", state: "VIC", postcode: "3810" }));
const me = mitsubishiOrderEmail({ supplier: suppliers[1], poNumber: "AGA-261019-MIT", orderDate: "15/10/2026", lines: bySup.mitsubishi!,
  delivery: settings.deliveryAddress, deliveryInstructions: "Ring Kellie", settings, attached: true, today: "2026-10-14" });
ok("Mitsubishi email names the attached form as the order", me.html.includes("AGA-261019-MIT Mitsubishi Electric order form.pdf") && me.text.includes("on your order form, attached"));
ok("…and doesn't repeat the lines, so there's one version of the order", !me.text.includes("MSZ-AP71VGKIT") && !me.html.includes("MSZ-AP71VGKIT"), me.text);
ok("…but says how many units, when, and where", me.text.includes("Units: 3 (2 models)") && me.text.includes("Deliver by: Fri 16 Oct — all in one delivery") && me.text.includes("Deliver to: 1 Sierra Circuit") && me.text.includes("Ring Kellie"), me.text);

console.log("\n-- the Mitsubishi form --");
(async () => {
  const filled = await fillMitsubishiForm({
    poNumber: "AGA-261019-MIT", orderDate: "15/10/2026", lines: bySup.mitsubishi!, delivery: settings.deliveryAddress,
    deliveryInstructions: deliveryInstructionsFor({ delivery_instructions: null, delivery_to_site: false }, settings), settings, today: "2026-10-14",
    signaturePng: process.env.ORDERING_SIG_PNG ? new Uint8Array(readFileSync(process.env.ORDERING_SIG_PNG)) : null,
  });
  ok("fills without a missing field", "pdf" in filled, "error" in filled ? filled.error : "");
  const blankAcct = await fillMitsubishiForm({ poNumber: "X", orderDate: "x", delivery: "x", deliveryInstructions: null, lines: bySup.mitsubishi!,
    settings: { ...settings, mitsubishi: undefined } });
  if ("pdf" in blankAcct) {
    const f = (await PDFDocument.load(blankAcct.pdf)).getForm();
    ok("an empty account setting leaves the account number typed on the form", f.getTextField("Account Number").getText() === "116360");
  } else ok("an empty account setting still fills", false, blankAcct.error);
  if ("pdf" in filled) {
    ok("one form row per unit model", filled.rows === 2, String(filled.rows));
    const f = (await PDFDocument.load(filled.pdf)).getForm();
    ok("signed off by Kellie Winbanks, Owner — in separate boxes",
      f.getTextField("Print Name").getText() === "Kellie Winbanks" && f.getTextField("Position").getText() === "Owner",
      `${f.getTextField("Print Name").getText()} / ${f.getTextField("Position").getText()}`);
    ok("every row has the one delivery date", f.getTextField("Delivery Date").getText() === "Fri 16 Oct" && f.getTextField("Delivery Date 2").getText() === "Fri 16 Oct",
      `${f.getTextField("Delivery Date").getText()} / ${f.getTextField("Delivery Date 2").getText()}`);
    ok("our job numbers in Mitsubishi's quote reference box", f.getTextField("CRM Quote Reference").getText() === "20264, 20265, 20300", f.getTextField("CRM Quote Reference").getText());
    ok("Site says Factory", f.getTextField("Site").getText() === "Factory");
    ok("delivery instructions on the form, forklift note included", f.getTextField("Delivery Instructions").getText() === "Deliver to our factory. We do not have a forklift.", f.getTextField("Delivery Instructions").getText());
    if (process.env.ORDERING_PDF_OUT) writeFileSync(process.env.ORDERING_PDF_OUT, filled.pdf);
  }
  const tooMany = await fillMitsubishiForm({
    poNumber: "X", orderDate: "x", delivery: "x", deliveryInstructions: null, settings,
    lines: Array.from({ length: 15 }, (_, i) => ({ ...bySup.mitsubishi![0], supplier_model: `M-${i}` })),
  });
  ok("more units than the form holds is refused, not truncated", "error" in tooMany);

  console.log(bad ? `\n${bad} FAILED` : "\nall ok");
  process.exit(bad ? 1 : 0);
})();

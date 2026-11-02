/**
 * Reece orders placed in maX: how a To order card becomes one maX order per
 * job. A wrong product, a merged quantity off by a coil, a date Reece refuses
 * or an address it can't read would each buy the wrong thing or stop the order.
 *
 *   npm run check:reeceorder
 */
import { fingerprint, parseAddress, planJobs, productId, reeceViolations, requiredBy, type PlanLine, type ReeceUnit } from "../src/lib/ordering/reecePlan";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const line = (id: number, job: number | null, part: string | null, qty: number, install = "2026-11-10"): PlanLine => ({
  id, job_id: job, job_number: job ? String(20000 + job) : null, customer_name: job ? `Customer ${job}` : null, install_date: job ? install : null,
  sku_name: `Item ${id}`, description: null, supplier_part: part, qty, unit_cost: 10,
});
const units = new Map<number, ReeceUnit | null>([
  [1400600, { uom: "LEN", ex: 12.5, inc: 13.75 }],
  [2702119, { uom: "EA", ex: null, inc: null }],
  [8002480, null],
]);

const jobs = planJobs([
  line(1, 2, "1400600", 0.5, "2026-11-12"),
  line(2, 2, "1400600", 1),       // same product, same job: one line, 1.5
  line(3, 1, "2702119", 2, "2026-11-05"),
  line(4, 1, null, 1),            // no Reece number
  line(5, 1, "8002480", 1),       // Reece doesn't list it
  line(6, null, "1400600", 3),    // factory stock
], units);

ok("one order per job, soonest install first, stock last", jobs.map((j) => j.key).join(",") === "job:1,job:2,stock", jobs.map((j) => j.key));
const j2 = jobs.find((j) => j.key === "job:2")!;
ok("same product on one job is one line with quantities added", j2.products.length === 1 && j2.products[0].quantity === 1.5 && j2.products[0].lineIds.join() === "1,2", j2.products);
ok("unit of measure from Reece", j2.products[0].unitOfMeasure === "LEN");
const j1 = jobs.find((j) => j.key === "job:1")!;
ok("no Reece price falls back to our cost, inc GST worked out", j1.products[0].unitPriceExcludingGst === 10 && j1.products[0].unitPriceIncludingGst === 11, j1.products[0]);
ok("a line with no Reece number is a problem, not dropped", j1.problems.some((p) => p.lineIds[0] === 4 && /no Reece product number/.test(p.why)));
ok("a product Reece doesn't list is a problem", j1.problems.some((p) => p.lineIds[0] === 5 && /doesn't list product 8002480/.test(p.why)));
ok("product numbers: digits only", productId("1400600") === 1400600 && productId(" 1400600 ") === 1400600 && productId("MSZAP71") === null && productId("") === null);

const fp = fingerprint(jobs);
ok("fingerprint names every job's products and quantities", fp === "job:1=2702119x2EA;job:2=1400600x1.5LEN;stock=1400600x3LEN", fp);
const changed = fingerprint(planJobs([line(1, 2, "1400600", 1), line(2, 2, "1400600", 1), line(3, 1, "2702119", 2), line(6, null, "1400600", 3)], units));
ok("a changed quantity changes the fingerprint", changed !== fp);

ok("the factory address reads", JSON.stringify(parseAddress("1 Sierra Circuit, Pakenham VIC 3810")) === JSON.stringify({ addressLine1: "1 Sierra Circuit", suburb: "Pakenham", state: "VIC", postcode: 3810 }), parseAddress("1 Sierra Circuit, Pakenham VIC 3810"));
ok("unit and street on two lines", JSON.stringify(parseAddress("Unit 4, 38-40 Tuscany Rise, Berwick VIC 3806")) === JSON.stringify({ addressLine1: "Unit 4", addressLine2: "38-40 Tuscany Rise", suburb: "Berwick", state: "VIC", postcode: 3806 }), parseAddress("Unit 4, 38-40 Tuscany Rise, Berwick VIC 3806"));
ok("ServiceTitan's form with a comma and Australia", parseAddress("5 Park Street, Seaford, VIC 3198 Australia")?.suburb === "Seaford", parseAddress("5 Park Street, Seaford, VIC 3198 Australia"));
ok("an address without a state and postcode isn't guessed", parseAddress("1 Sierra Circuit Pakenham") === null && parseAddress("") === null);

ok("needed 7 am the day before the install", requiredBy("2026-11-11", null, "2026-11-02") === "2026-11-10T07:00:00");
ok("the office's deliver-by day wins", requiredBy("2026-11-10", "2026-11-06", "2026-11-02") === "2026-11-06T07:00:00");
ok("never before tomorrow: Reece refuses a time that's passed", requiredBy("2026-11-02", null, "2026-11-02") === "2026-11-03T07:00:00" && requiredBy(null, null, "2026-11-02") === "2026-11-03T07:00:00");
ok("across a month end", requiredBy("2026-12-02", null, "2026-11-02") === "2026-12-01T07:00:00");
ok("a Monday install is wanted the Friday before", requiredBy("2026-11-09", null, "2026-11-02") === "2026-11-06T07:00:00");
ok("a Sunday install is wanted the Friday before", requiredBy("2026-11-08", null, "2026-11-02") === "2026-11-06T07:00:00");
ok("the office's weekend deliver-by is left as set", requiredBy("2026-11-09", "2026-11-07", "2026-11-02") === "2026-11-07T07:00:00");

ok("Reece's refusal reads as its words", reeceViolations(JSON.stringify({ violations: [{ fieldName: "requiredByDateTime", message: "must be in the future" }] }))[0] === "requiredByDateTime: must be in the future");
ok("a body that isn't Reece's list gives nothing", reeceViolations("<html>").length === 0);

if (bad) { console.error(`${bad} failed`); process.exit(1); }
console.log("all passed");

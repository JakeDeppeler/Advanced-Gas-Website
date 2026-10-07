/**
 * The sync's shape assertions, against the live numbers and against the ways
 * they could go wrong.
 *
 * Runs offline: the field counts are the real ones read out of the replica on
 * 7 October 2026, so the first block is a regression test on the declarations
 * themselves — if somebody raises a floor past what the data actually does, the
 * sync starts crying wolf every hour and this says so first.
 */
import { checkFields, summarise, FIELDS, type FieldRow } from "../src/lib/dashboard/syncShape";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

const row = (tbl: string, col: string, f: number, t: number, rf: number, rt: number): FieldRow =>
  ({ tbl, col, filled: f, total: t, recent_filled: rf, recent_total: rt });

/** Read out of Supabase on 2026-10-07, after the customer-name backfill. */
const LIVE: FieldRow[] = [
  row("st_jobs", "job_type", 296, 5446, 263, 263),
  row("st_jobs", "business_unit", 283, 5446, 252, 263),
  row("st_jobs", "customer_name", 5446, 5446, 263, 263),
  row("st_jobs", "suburb", 5323, 5446, 263, 263),
  row("st_jobs", "postcode", 5257, 5446, 263, 263),
  row("st_jobs", "status", 5446, 5446, 263, 263),
  row("st_jobs", "location_id", 5446, 5446, 263, 263),
  row("st_jobs", "completed_on", 5100, 5446, 140, 263),
  row("st_jobs", "scheduled_on", 0, 5446, 0, 263),
  row("st_jobs", "campaign", 0, 5446, 0, 263),
  row("st_invoices", "job_id", 5455, 5455, 289, 289),
  row("st_invoices", "job_type", 5455, 5455, 289, 289),
  row("st_estimates", "status", 4074, 4074, 521, 521),
  row("st_estimates", "created_by", 4074, 4074, 521, 521),
  row("st_estimates", "sold_by", 34, 4074, 32, 521),
  row("st_locations", "name", 2741, 2741, 2741, 2741),
  row("st_locations", "suburb", 2575, 2741, 2575, 2741),
  row("st_locations", "postcode", 2514, 2741, 2514, 2741),
  row("st_technicians", "name", 8, 8, 8, 8),
  row("st_employees", "name", 6, 6, 6, 6),
  row("st_payments", "paid_on", 4505, 4505, 4505, 4505),
  row("st_timesheets", "technician_id", 309, 309, 309, 309),
];

console.log("-- the replica as it stands --");
const live = checkFields(LIVE);
ok("today's numbers raise nothing", live.length === 0, live.length ? summarise(live) : "");
ok("every declared field is present in the report", !live.some((f) => f.kind === "missing"));
ok("the declaration covers every field the report returns",
   LIVE.every((r) => FIELDS.some((f) => f.table === r.tbl && f.column === r.col)));

console.log("\n-- a field that should be full going empty --");
const broke = LIVE.map((r) => (r.tbl === "st_jobs" && r.col === "job_type" ? row(r.tbl, r.col, 296, 5446, 0, 263) : r));
const b = checkFields(broke);
ok("caught", b.length === 1 && b[0].kind === "empty", summarise(b));
ok("names the field", b[0]?.field === "st_jobs.job_type");

console.log("\n-- the pre-go-live import must not trip it --");
// job_type is 5% across the whole table. Judged on all rows it would be a
// permanent false alarm; judged on recent rows it is clean.
ok("5% all-time, 100% recent, raises nothing",
   checkFields([row("st_jobs", "job_type", 296, 5446, 263, 263)],
               [{ table: "st_jobs", column: "job_type", expect: "filled" }]).length === 0);

console.log("\n-- a field thinning out, not vanishing --");
const thin = checkFields([row("st_jobs", "suburb", 5323, 5446, 180, 263)],
                         [{ table: "st_jobs", column: "suburb", expect: "filled", floor: 0.9 }]);
ok("68% against a 90% floor is caught", thin.length === 1 && thin[0].kind === "thin", summarise(thin));

console.log("\n-- a field declared absent that starts arriving --");
const arrived = checkFields([row("st_jobs", "scheduled_on", 40, 5446, 40, 263)],
                            [{ table: "st_jobs", column: "scheduled_on", expect: "absent" }]);
ok("noticed, so the tile it blanks can come back", arrived.length === 1 && arrived[0].kind === "arrived", summarise(arrived));

console.log("\n-- the cases that must stay quiet --");
ok("a partial field being partial",
   checkFields([row("st_estimates", "sold_by", 34, 4074, 32, 521)],
               [{ table: "st_estimates", column: "sold_by", expect: "partial" }]).length === 0);
ok("an absent field staying absent",
   checkFields([row("st_jobs", "campaign", 0, 5446, 0, 263)],
               [{ table: "st_jobs", column: "campaign", expect: "absent" }]).length === 0);
ok("a table with no recent rows at all is not judged",
   checkFields([row("st_jobs", "job_type", 296, 5446, 0, 0)],
               [{ table: "st_jobs", column: "job_type", expect: "filled" }]).length === 0);

console.log("\n-- a column that disappears --");
const gone = checkFields([], [{ table: "st_jobs", column: "customer_name", expect: "filled" }]);
ok("reported rather than silently passing", gone.length === 1 && gone[0].kind === "missing");

console.log("\n-- a partial field going to nothing --");
const died = checkFields([row("st_estimates", "sold_by", 34, 4074, 0, 521)],
                         [{ table: "st_estimates", column: "sold_by", expect: "partial" }]);
ok("caught", died.length === 1 && died[0].kind === "empty", summarise(died));

console.log(bad === 0 ? "\nall good" : `\n${bad} failed`);
process.exit(bad === 0 ? 0 : 1);

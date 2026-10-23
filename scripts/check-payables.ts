/**
 * What we owe, aged — against Xero's own aged-payables report.
 *
 * The board's Money page puts a supplier's money in a column and the office
 * works a payment run off it, so the bands have to land where Xero's report
 * lands or the wall and the ledger will disagree in front of everybody. The
 * fixture below is the real ledger of 15 October 2026: all forty open bills,
 * ten suppliers, as the report returned them.
 *
 * Xero ages by calendar month and this ages by days, so the two are not the
 * same rule — they agree on this day's ledger, and this is what checks that
 * they still do.
 */
import { agePayables, type OnTerms, type RawBill } from "../src/lib/dashboard/payablesTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};
/** Money compares to the cent: these are sums of floats, not integers. */
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

const TODAY = "2026-10-15";
const b = (supplier: string, number: string, due: string | null, amount: number): RawBill => ({ supplier, number, due, amount });

const LEDGER: RawBill[] = [
  b("AA Officer Inbound", "RB22073823290", "2026-10-12", 210.68),
  b("ATO", "—", "2026-04-25", 20510.74),
  b("ATO", "—", "2026-08-25", 34110.0),
  b("ATO", "—", "2026-08-21", 14116.0),
  b("Cardinia Council", "RB21737791950", "2027-05-31", 2349.11),
  b("Cardinia Council", "RB21940287710", "2027-05-31", 2279.98),
  b("DKAHW", "Factory Rent", "2026-11-10", 19250.02),
  b("Geoff Thomson Electrics", "5304", "2026-10-16", 385.0),
  b("Geoff Thomson Electrics", "5305", "2026-10-16", 385.0),
  b("Geoff Thomson Electrics", "5307", "2026-10-16", 440.0),
  b("Geoff Thomson Electrics", "5306", "2026-10-16", 1265.0),
  b("Geoff Thomson Electrics", "5323", "2026-10-23", 440.0),
  b("Geoff Thomson Electrics", "5318", "2026-10-23", 330.0),
  b("Geoff Thomson Electrics", "5320", "2026-10-23", 440.0),
  b("Geoff Thomson Electrics", "5321", "2026-10-23", 440.0),
  b("Geoff Thomson Electrics", "5317", "2026-10-23", 330.0),
  b("Geoff Thomson Electrics", "5319", "2026-10-23", 330.0),
  b("Geoff Thomson Electrics", "5324", "2026-10-23", 275.0),
  b("Geoff Thomson Electrics", "5322", "2026-10-23", 181.5),
  b("Geoff Thomson Electrics", "5328", "2026-10-26", 440.0),
  b("IQumulate Premium Funding", "93330318", "2027-06-16", 9649.54),
  b("Metalflex", "RB21661529230", "2026-09-30", 60000.0),
  b("Metalflex", "RB22075567830", "2026-10-31", 60686.84),
  b("Mitsubishi Electric", "92013994", "2026-10-16", 5660.06),
  b("Mitsubishi Electric", "92013993", "2026-10-16", 5570.13),
  b("Mitsubishi Electric", "92015108", "2026-10-21", 1945.38),
  b("Mitsubishi Electric", "92015087", "2026-10-21", 1171.29),
  b("Mitsubishi Electric", "92016920", "2026-10-31", 1582.43),
  b("Mitsubishi Electric", "92016921", "2026-10-31", 1582.43),
  b("Mitsubishi Electric", "92020243", "2026-11-08", 2025.68),
  b("Reclaim Energy", "SI-00019891", "2026-10-30", 5463.7),
  b("Reclaim Energy", "SI-00019963", "2026-10-30", 6666.0),
  b("Rinnai Australia", "22958767 RI", "2026-10-31", 2087.07),
  b("Rinnai Australia", "22966621 RI", "2026-11-30", 1495.01),
  b("Rinnai Australia", "22967592 RI", "2026-11-30", 1598.21),
  b("Rinnai Australia", "22967593 RI", "2026-11-30", 1598.21),
  b("Rinnai Australia", "22968209 RI", "2026-11-30", 1355.66),
  b("Rinnai Australia", "22970572 RI", "2026-11-30", 2665.84),
  b("Rinnai Australia", "22970573 RI", "2026-11-30", 2066.66),
  b("Rinnai Australia", "22970574 RI", "2026-11-30", 2087.07),
];

const r = agePayables(LEDGER, TODAY);

console.log("-- the ledger of 15 October, against Xero's own report --");
ok("forty bills", r.count === 40, r.count);
ok("owing $275,465.24", near(r.total, 275465.24), r.total);
ok("overdue $128,947.42 over five bills", near(r.overdueTotal, 128947.42) && r.overdueCount === 5, {
  value: r.overdueTotal,
  count: r.overdueCount,
});
// Xero's four non-empty buckets, to the cent. Its "< 1 month" is this report's
// 1–30, its "1 month" is 31–60 and its "3+ months" is over 90 — on this day.
ok("current $146,517.82", near(r.aging.current, 146517.82), r.aging.current);
ok("1–30 $60,210.68", near(r.aging.d1_30, 60210.68), r.aging.d1_30);
ok("31–60 $48,226", near(r.aging.d31_60, 48226), r.aging.d31_60);
ok("61–90 empty", r.aging.d61_90 === 0, r.aging.d61_90);
ok("over 90 $20,510.74 — the April ATO bill", near(r.aging.d90, 20510.74), r.aging.d90);
ok("the bands add to the total", near(Object.values(r.aging).reduce((t, v) => t + v, 0), r.total));

console.log("\n-- what falls due this week --");
ok("eight bills, $16,821.86", r.dueSoon.count === 8 && near(r.dueSoon.value, 16821.86), r.dueSoon);
// The window is "not late yet, and due inside seven days". A bill due today is
// in it; one due in eight is not, however large.
const soon = (days: number) => agePayables([b("S", "1", isoPlus(days), 1)], TODAY).dueSoon.count;
function isoPlus(days: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
ok("due today counts", soon(0) === 1);
ok("due in seven counts", soon(7) === 1);
ok("due in eight does not", soon(8) === 0);
ok("already late does not", soon(-1) === 0);

console.log("\n-- the boundaries --");
const band = (days: number) => {
  const one = agePayables([b("S", "1", isoPlus(-days), 1)], TODAY);
  return Object.entries(one.aging).find(([, v]) => v > 0)?.[0];
};
ok("due today is current, not overdue", band(0) === "current" && agePayables([b("S", "1", TODAY, 1)], TODAY).overdueCount === 0);
ok("one day late is 1–30", band(1) === "d1_30");
ok("thirty is 1–30, thirty-one opens the next", band(30) === "d1_30" && band(31) === "d31_60");
ok("sixty, sixty-one", band(60) === "d31_60" && band(61) === "d61_90");
ok("ninety, ninety-one", band(90) === "d61_90" && band(91) === "d90");

console.log("\n-- the order the list is worked in --");
ok("the April ATO bill is first", r.bills[0]?.amount === 20510.74, r.bills[0]);
ok("most overdue down to soonest due", r.bills.every((x, i) => i === 0 || r.bills[i - 1].days >= x.days));
ok("the five overdue are the top five", r.bills.slice(0, 5).every((x) => x.days > 0) && r.bills[5].days <= 0);
ok("equal ages put the bigger bill first", (() => {
  const same = r.bills.filter((x) => x.days === r.bills[5].days);
  return same.every((x, i) => i === 0 || same[i - 1].amount >= x.amount);
})());

console.log("\n-- what is not a bill --");
ok("a credit is left out", agePayables([b("S", "1", TODAY, -500)], TODAY).count === 0);
ok("a zero is left out", agePayables([b("S", "1", TODAY, 0)], TODAY).count === 0);
// Never the worst band on the strength of a missing date: a bill with no due
// date is treated as due today, so it is neither claimed as overdue nor
// buried at the bottom of a list somebody works from the top.
const noDate = agePayables([b("S", "1", null, 900)], TODAY);
ok("no due date is due today, not overdue", noDate.overdueCount === 0 && noDate.aging.current === 900 && noDate.bills[0].due === TODAY);

console.log("\n-- suppliers paid off on terms --");
// The same ledger, with the two arrangements the office had actually recorded
// in the portal on the day: the ATO on a payment plan, Metalflex on a line of
// credit. Four of the five "overdue" bills belong to them.
const ON_TERMS: OnTerms = new Map([
  ["ato", "plan"],
  ["metalflex", "credit"],
]);
const t = agePayables(LEDGER, TODAY, ON_TERMS);
ok("the ledger is unchanged: still $275,465.24 over forty bills", near(t.total, 275465.24) && t.count === 40, { total: t.total, count: t.count });
ok("$189,423.58 of it is on terms, over five bills", near(t.onTerms.total, 189423.58) && t.onTerms.count === 5, t.onTerms);
ok("named biggest first: Metalflex, then the ATO", t.onTerms.suppliers.map((x) => x.supplier).join() === "Metalflex,ATO", t.onTerms.suppliers.map((x) => x.supplier));
ok("each carries its kind", t.onTerms.suppliers.map((x) => x.kind).join() === "credit,plan", t.onTerms.suppliers.map((x) => x.kind));
// The point of the exercise: the overdue figure stops being a payment plan.
ok("overdue falls to $210.68 over one bill", near(t.overdueTotal, 210.68) && t.overdueCount === 1, { value: t.overdueTotal, count: t.overdueCount });
ok("and that bill is the one genuinely missed", t.bills[0]?.supplier === "AA Officer Inbound", t.bills[0]);
ok("nothing on terms is in the pay order", !t.bills.some((x) => ["ATO", "Metalflex"].includes(x.supplier)));
ok("thirty-five bills to chase, $86,041.66", t.chaseable.count === 35 && near(t.chaseable.total, 86041.66), t.chaseable);
ok("the bands add to what is chaseable, not to the total", near(Object.values(t.aging).reduce((a, v) => a + v, 0), t.chaseable.total));
ok("chaseable and on terms add back to the total", near(t.chaseable.total + t.onTerms.total, t.total));
// The ATO's April statement was the whole of the over-90 band and 31-60 was
// nothing but the ATO; both empty out, and the credit line leaves 1-30.
ok("over 90 empties", t.aging.d90 === 0, t.aging.d90);
ok("31-60 empties", t.aging.d31_60 === 0, t.aging.d31_60);
ok("1-30 is $210.68, the credit line gone from it", near(t.aging.d1_30, 210.68), t.aging.d1_30);
// This week's cash never contained either of them, so it must not move.
ok("what falls due this week is untouched", t.dueSoon.count === 8 && near(t.dueSoon.value, 16821.86), t.dueSoon);
// The key is the portal's: a name typed with different case or spacing is the
// same supplier, or an arrangement would silently stop applying.
const loose = agePayables([b("  ATO  ", "x", "2026-01-01", 10)], TODAY, new Map([["ato", "plan"]]));
ok("the name is matched loosely, as the portal matches it", loose.onTerms.count === 1 && loose.overdueCount === 0, loose.onTerms);
ok("no arrangements means every bill is one to chase", agePayables(LEDGER, TODAY).onTerms.count === 0);

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);

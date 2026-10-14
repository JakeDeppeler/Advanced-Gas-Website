/**
 * Deposits, part payments and finals, against how this business is actually
 * paid: 40% up front and the balance on a domestic install, instalments as the
 * rent comes in on a real estate job.
 *
 * ServiceTitan records none of it — its payment type is the method, and only
 * five of 885 jobs invoiced in 120 days carry more than one invoice — so the
 * kind is worked out from what each payment leaves owing. These are the cases
 * that rule has to get right.
 */
import { kindsForInvoice, tallyKinds, type AppliedPayment } from "../src/lib/dashboard/paidKindTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${JSON.stringify(extra)}` : ""}`);
  if (!pass) bad++;
};
const pay = (paymentId: number, amount: number, on: string, invoiceTotal = 10_000): AppliedPayment => ({
  paymentId, invoiceId: 1, amount, on, invoiceTotal,
});
const kinds = (rows: AppliedPayment[], prior = 0) => kindsForInvoice(rows, prior).map((r) => r.kind).join(",");

console.log("-- a domestic install: 40% up front, the balance on completion --");
ok("the 40% is a deposit, the balance is the final",
   kinds([pay(1, 4000, "2026-10-01"), pay(2, 6000, "2026-10-20")]) === "deposit,final");
ok("and the day the final lands, on its own, still reads as a final",
   kinds([pay(2, 6000, "2026-10-20")], 4000) === "final");
// The case the whole `priorPaid` argument exists for: without August's deposit
// the balance would be the first payment the window can see, and read as one.
ok("without what was paid before, the very same payment reads as a deposit",
   kinds([pay(2, 6000, "2026-10-20")], 0) === "deposit");

console.log("\n-- a real estate job paid as the rent comes in --");
ok("deposit, then part payments, then the final",
   kinds([pay(1, 2500, "2026-08-01"), pay(2, 2500, "2026-09-01"), pay(3, 2500, "2026-10-01"), pay(4, 2500, "2026-11-01")])
     === "deposit,part,part,final");

console.log("\n-- paid in one --");
ok("a job paid in full on the day is a final, not a deposit",
   kinds([pay(1, 10_000, "2026-10-14")]) === "final");
ok("and so is one paid in full in two goes on the same day",
   kinds([pay(1, 3000, "2026-10-14"), pay(2, 7000, "2026-10-14")]) === "deposit,final");

console.log("\n-- the edges --");
// Rounding: an invoice settled to the cent must not read as still owing.
ok("a cent short still settles", kinds([pay(1, 9999.999, "2026-10-14")]) === "final");
ok("a dollar short does not", kinds([pay(1, 9999, "2026-10-14")]) === "deposit");
ok("an over-payment settles", kinds([pay(1, 12_000, "2026-10-14")]) === "final");
// Order is by day, not by the order the rows came back.
ok("the earlier payment is the deposit however the rows arrive",
   kinds([pay(2, 6000, "2026-10-20"), pay(1, 4000, "2026-10-01")]) === "deposit,final");
ok("an invoice with no total has no final to find",
   kindsForInvoice([pay(1, 500, "2026-10-14", 0)]).map((r) => r.kind).join(",") === "deposit");

console.log("\n-- the tally --");
const rows = kindsForInvoice([pay(1, 4000, "2026-10-01"), pay(2, 6000, "2026-10-20")]);
const t = tallyKinds(rows, { count: 1, value: 1621.4 });
ok("counts and values land in the right buckets",
   t.deposit.count === 1 && t.deposit.value === 4000 && t.final.count === 1 && t.final.value === 6000, t);
// A payment nobody has applied yet is money in and also somebody's job: it is
// never folded into one of the three.
ok("and a payment with nothing applied is kept apart", t.unmatched.count === 1 && t.part.count === 0);

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * Moving a sold job's credit, and the one thing it must never do: change what
 * the board says about a job nobody has moved.
 *
 * This is the only setting on the board that moves money between people — the
 * leaderboard and the commission bands on it both follow it — so the fallback
 * has to be exactly the rule that was there before it existed.
 */
import {
  creditWith,
  normaliseSaleCredits,
  type SaleCredits,
} from "../src/lib/dashboard/saleCreditTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

/** The board's own job identity, copied from metrics.ts so this needs no db. */
const quoteKey = (r: { id: number; job_id: number | null; customer_id?: number | null; created_on?: string | null }) =>
  r.job_id != null ? `j${r.job_id}` : r.customer_id != null && r.created_on ? `c${r.customer_id}-${r.created_on.slice(0, 10)}` : `e${r.id}`;

const row = (p: Partial<{ id: number; job_id: number | null; customer_id: number | null; created_on: string | null; created_by: string | null; sold_by: string | null }> = {}) => ({
  id: 1, job_id: 301090477, customer_id: null, created_on: "2026-09-24T07:26:37Z",
  created_by: "Jake Deppeler", sold_by: "Kellie Winbanks", ...p,
});

console.log("-- with nothing moved, the rule is the one that was always there --");
const plain = creditWith({}, quoteKey);
ok("whoever wrote the quote", plain(row()) === "Jake Deppeler");
ok("not whoever closed it", plain(row()) !== "Kellie Winbanks");
ok("who closed it, when nobody is recorded as writing it", plain(row({ created_by: null })) === "Kellie Winbanks");
ok("null when neither is recorded", plain(row({ created_by: null, sold_by: null })) === null);

console.log("\n-- a move takes the job --");
const moves: SaleCredits = normaliseSaleCredits({
  j301090477: { to: "Jye Stephens", from: "Jake Deppeler", by: "jake", at: "2026-10-13T00:00:00Z" },
});
const moved = creditWith(moves, quoteKey);
ok("the moved job reads as the new person's", moved(row()) === "Jye Stephens");
// The point of keying on the job rather than the estimate: a quote's options
// are separate rows, and the sale is a third. All of them have to follow.
ok("every option of it follows, not just the one that sold", moved(row({ id: 999 })) === "Jye Stephens");
ok("a different job is untouched", moved(row({ job_id: 1234 })) === "Jake Deppeler");

console.log("\n-- a quote with no job on it --");
// ServiceTitan leaves job_id null on a fair share of estimates; the board keys
// those on the customer and the day, and a move has to be able to name one.
const noJob = { id: 7, job_id: null, customer_id: 55, created_on: "2026-10-01T03:00:00Z", created_by: "Kellie Winbanks", sold_by: null };
const byCustomer = creditWith(normaliseSaleCredits({ "c55-2026-10-01": { to: "Natasha Hahir" } }), quoteKey);
ok("is movable too", byCustomer(noJob) === "Natasha Hahir");
ok("and the same customer on another day is not", byCustomer({ ...noJob, created_on: "2026-10-02T03:00:00Z" }) === "Kellie Winbanks");

console.log("\n-- what a malformed row must not do --");
ok("not an object", Object.keys(normaliseSaleCredits("Jye")).length === 0);
ok("null", Object.keys(normaliseSaleCredits(null)).length === 0);
// A move with nobody to move it to would credit the job to the empty string:
// a blank row on the leaderboard nobody could account for.
ok("a move with no name is dropped", Object.keys(normaliseSaleCredits({ j1: { to: "" }, j2: { to: "  " }, j3: {} })).length === 0);
ok("and a move with one is kept", normaliseSaleCredits({ j1: { to: " Jye Stephens " } }).j1.to === "Jye Stephens");
const partial = normaliseSaleCredits({ j1: { to: "Jye Stephens" } });
ok("a move with no audit trail still works", creditWith(partial, quoteKey)(row({ job_id: 1 })) === "Jye Stephens");
ok("and reads as moved from nobody rather than crashing", partial.j1.from === null);

console.log("\n-- undoing a move --");
// Clearing is a delete, not a move back: a move to the original name would
// leave an audit line claiming somebody moved it when they put it back.
const cleared = creditWith(normaliseSaleCredits({}), quoteKey);
ok("puts the job back where ServiceTitan has it", cleared(row()) === "Jake Deppeler");

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);

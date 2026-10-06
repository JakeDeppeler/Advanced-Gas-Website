/**
 * Does a read that needs more than one page come back whole?
 *
 *   npm run check:paging
 *
 * This is the shape of bug that does not announce itself. An unordered
 * offset-paged read returns the right *number* of rows, every one of them real,
 * and the total is simply wrong — it put $669,510 on the wall as the year to
 * date against a true $390,203. Nothing throws and nothing looks odd.
 *
 * The paging is exercised against a fake PostgREST that behaves the way the
 * real one is allowed to: unordered reads come back in whatever order it likes.
 */
import { PAGE, hasOrder, pagedQuery } from "../src/lib/dashboard/paging";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"}  ${what}${cond || got === undefined ? "" : `  (got ${JSON.stringify(got)})`}`);
}


type Row = { id: number; total: number };

/**
 * A table of `n` rows, each worth a different amount — because with every row
 * equal a doubled row and a dropped one cancel in the total, and the check
 * passes for the wrong reason. It did, on the first writing of this file.
 *
 * Asked for a range without an order it serves them in a different arrangement
 * each time — which is exactly what Postgres reserves
 * the right to do, and what makes offset paging without ORDER BY unsafe.
 */
function fakeTable(n: number) {
  const rows: Row[] = Array.from({ length: n }, (_, i) => ({ id: i + 1, total: i + 1 }));
  let call = 0;
  return (query: string, from: number): Row[] => {
    const served = hasOrder(query)
      ? rows
      : // A different rotation per request: same rows, no promise of order.
        [...rows.slice((++call * 37) % n), ...rows.slice(0, (call * 37) % n)];
    return served.slice(from, from + PAGE);
  };
}

/** The paging loop as db.ts runs it, over the fake table. */
function readAll(serve: (q: string, from: number) => Row[], query: string): Row[] {
  const head = serve(query, 0);
  if (head.length < PAGE) return head;
  const stable = pagedQuery(query);
  const out: Row[] = [];
  if (stable === query) out.push(...head);
  else {
    const first = serve(stable, 0);
    out.push(...first);
    if (first.length < PAGE) return out;
  }
  for (let from = out.length; ; from += PAGE) {
    const page = serve(stable, from);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

console.log("\n-- a read that fits in one page --");
const small = readAll(fakeTable(400), "invoice_date=gte.2026-07-01");
ok(small.length === 400, "comes back whole", small.length);

console.log("\n-- the Pace page's two years of invoices --");
// 2,023 rows against a page of 1,000: three pages, which is where it broke.
const big = readAll(fakeTable(2023), "invoice_date=gte.2025-07-01");
ok(big.length === 2023, "every row, once", big.length);
ok(new Set(big.map((r) => r.id)).size === 2023, "no row served twice", new Set(big.map((r) => r.id)).size);
const TRUE_TOTAL = (2023 * 2024) / 2;
ok(big.reduce((a, r) => a + r.total, 0) === TRUE_TOTAL, "and the total is the total", big.reduce((a, r) => a + r.total, 0));

console.log("\n-- a caller that named its own order is left alone --");
const owned = readAll(fakeTable(2023), "invoice_date=gte.2025-07-01&order=invoice_date.desc");
ok(owned.length === 2023, "still whole", owned.length);

console.log("\n-- exactly one page, and one past it --");
ok(readAll(fakeTable(1000), "x=1").length === 1000, "a full first page still reads on");
ok(readAll(fakeTable(1001), "x=1").length === 1001, "and stops at the right place");

console.log("\n-- and the old loop really does break --");
/*
 * The version this replaced: page straight through without ever naming an
 * order. If this passes the same fake table, the checks above prove nothing.
 */
function readAllUnordered(serve: (q: string, from: number) => Row[], query: string): Row[] {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = serve(query, from);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}
const broken = readAllUnordered(fakeTable(2023), "invoice_date=gte.2025-07-01");
ok(new Set(broken.map((r) => r.id)).size < 2023, "it serves some rows twice", new Set(broken.map((r) => r.id)).size);
ok(
  broken.reduce((a, r) => a + r.total, 0) !== TRUE_TOTAL,
  "and its total is wrong while the row count looks right",
  { rows: broken.length, total: broken.reduce((a, r) => a + r.total, 0), shouldBe: TRUE_TOTAL },
);

console.log("\n-- the order test itself --");
ok(hasOrder("order=id.asc"), "at the start");
ok(hasOrder("a=1&order=id.asc"), "after an ampersand");
ok(!hasOrder("reorder=1"), "not a column that merely ends in order", hasOrder("reorder=1"));
ok(!hasOrder("select=total,invoice_date"), "nor a plain select");

console.log(failed ? `\n${failed} failed\n` : "\nall good\n");
process.exit(failed ? 1 : 0);

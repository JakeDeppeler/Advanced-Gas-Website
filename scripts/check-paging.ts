/**
 * Does a read that needs more than one page come back whole?
 *
 *   npm run check:paging
 *
 * This is the shape of bug that does not announce itself. An offset-paged read
 * over an unstable order returns the right *number* of rows, every one of them
 * real, and the total is simply wrong — it put $669,510 on the wall as the year
 * to date against a true $390,203. Nothing throws and nothing looks odd.
 *
 * The paging is exercised against a fake PostgREST that behaves the way the real
 * one is allowed to: rows the order does not separate come back in whatever
 * arrangement it likes, and differently each time.
 */
import { PAGE, hasOrder, keyColumns, orderedColumns, pagedQuery, splitLimit } from "../src/lib/dashboard/paging";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"}  ${what}${cond || got === undefined ? "" : `  (got ${JSON.stringify(got)})`}`);
}

/**
 * `supplier` and `code` are here so the supplier_items case has the key it
 * actually pages on — the table has no `id`, and a fake missing the columns the
 * key names would tie every row against every other and fail for its own
 * reasons rather than the code's.
 */
type Row = { id: number; total: number; day: string; supplier: string; code: string };

/**
 * A table of `n` rows, each worth a different amount — because with every row
 * equal a doubled row and a dropped one cancel in the total, and the check
 * passes for the wrong reason. It did, on the first writing of this file.
 *
 * `day` deliberately repeats across blocks of fifty rows, so an order on it is
 * a real order with real ties.
 *
 * The server honours the order it was asked for and arranges everything that
 * order does not separate however it likes, differently on each request. That
 * is the latitude Postgres actually keeps, and the whole reason paging needs a
 * key: a gentler fake — one that merely rotated the rows before a stable sort —
 * left most tie groups in the same relative order and let the broken loop pass.
 */
function fakeTable(n: number) {
  const rows: Row[] = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    total: i + 1,
    day: `2026-01-${String((Math.floor(i / 50) % 28) + 1).padStart(2, "0")}`,
    supplier: "reece",
    code: `C${String(i + 1).padStart(6, "0")}`,
  }));
  let call = 0;
  return (query: string, from: number, span: number): Row[] => {
    call += 1;
    // `order=post_date.desc.nullslast,number.asc` → [[post_date, -1], [number, 1]]
    const terms = (/(?:^|&)order=([^&]*)/.exec(query)?.[1] ?? "")
      .split(",")
      .filter(Boolean)
      .map((t) => t.split("."))
      .map(([col, dir]) => [col as keyof Row, dir === "desc" ? -1 : 1] as const);
    /** Where this row falls among its ties on this request, and nowhere near where it fell on the last. */
    const spin = (id: number) => (id * 2654435761 + call * 40503) % 100003;
    const served = [...rows].sort((a, b) => {
      for (const [col, dir] of terms) {
        const c = String(a[col]).localeCompare(String(b[col]), "en", { numeric: true });
        if (c) return c * dir;
      }
      return spin(a.id) - spin(b.id);
    });
    return served.slice(from, from + span);
  };
}

/** The paging loop as db.ts runs it, over the fake table. */
function readAll(serve: (q: string, from: number, span: number) => Row[], table: string, query: string): Row[] {
  const { query: base, limit } = splitLimit(query);
  const want = limit ?? Infinity;
  const head = serve(base, 0, Math.min(want, PAGE));
  if (head.length < PAGE || head.length >= want) return head;

  const stable = pagedQuery(base, table);
  const out: Row[] = [];
  if (stable === base) out.push(...head);
  else {
    const first = serve(stable, 0, PAGE);
    out.push(...first);
    if (first.length < PAGE) return out;
  }
  while (out.length < want) {
    const page = serve(stable, out.length, Math.min(want - out.length, PAGE));
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

const TOTAL = (n: number) => (n * (n + 1)) / 2;
function whole(rows: Row[], n: number, what: string) {
  ok(rows.length === n, `${what}: every row`, rows.length);
  ok(new Set(rows.map((r) => r.id)).size === n, `${what}: none served twice`, new Set(rows.map((r) => r.id)).size);
  ok(rows.reduce((a, r) => a + r.total, 0) === TOTAL(n), `${what}: and the total is the total`, rows.reduce((a, r) => a + r.total, 0));
}

console.log("\n-- a read that fits in one page --");
whole(readAll(fakeTable(400), "st_invoices", "invoice_date=gte.2026-07-01"), 400, "400 rows");

console.log("\n-- the Pace page's two years of invoices --");
// 2,023 rows against a page of 1,000: three pages, which is where it broke.
whole(readAll(fakeTable(2023), "st_invoices", "invoice_date=gte.2025-07-01"), 2023, "2,023 rows");

console.log("\n-- a caller's own order, with ties --");
/*
 * The hole the first fix left. `order=day.desc` is an order, so the read was
 * left alone with it — and a day that fifty rows share is fifty rows the server
 * may hand back in a different arrangement on the next request.
 */
whole(readAll(fakeTable(2023), "st_jobs", "completed_on=gte.2026-01-01&order=day.desc"), 2023, "ordered by a tied column");

console.log("\n-- a table whose key is not id --");
ok(keyColumns("supplier_items").join() === "supplier,code", "supplier_items pages on (supplier, code)", keyColumns("supplier_items"));
ok(keyColumns("portal_page_views").join() === "path,day", "portal_page_views on (path, day)", keyColumns("portal_page_views"));
ok(keyColumns("st_invoices").join() === "id", "everything else on id", keyColumns("st_invoices"));
ok(
  pagedQuery("supplier=eq.reece&order=code.asc", "supplier_items") === "supplier=eq.reece&order=code.asc,supplier.asc",
  "and a column the caller already named is not repeated",
  pagedQuery("supplier=eq.reece&order=code.asc", "supplier_items"),
);
whole(readAll(fakeTable(2023), "supplier_items", "supplier=eq.reece&order=day.asc"), 2023, "supplier_items");

console.log("\n-- a caller's ceiling --");
ok(readAll(fakeTable(5000), "st_jobs", "x=1&limit=20").length === 20, "a small limit is one request's worth");
ok(readAll(fakeTable(5000), "st_jobs", "x=1&limit=1000").length === 1000, "a limit of exactly one page");
ok(readAll(fakeTable(5000), "st_jobs", "x=1&limit=2400").length === 2400, "a limit across pages stops on the number");
ok(readAll(fakeTable(1500), "st_jobs", "x=1&limit=2400").length === 1500, "and short-changes gracefully");
ok(splitLimit("a=1&limit=20&b=2").query === "a=1&b=2", "the limit comes out of the middle", splitLimit("a=1&limit=20&b=2").query);
ok(splitLimit("limit=20&b=2").query === "b=2", "out of the front", splitLimit("limit=20&b=2").query);
ok(splitLimit("a=1&limit=20").limit === 20, "and is read", splitLimit("a=1&limit=20").limit);
ok(splitLimit("a=1").limit === null, "absent when absent", splitLimit("a=1").limit);
/*
 * Range and limit/offset are two ways to ask for the same window and PostgREST
 * does not promise which wins. A read that pages by hand *and* by header is the
 * one combination that can loop for ever, so it is refused rather than guessed.
 */
let threw = false;
try { splitLimit("a=1&offset=1000&limit=1000"); } catch { threw = true; }
ok(threw, "a hand-rolled offset is refused outright");

console.log("\n-- exactly one page, and one past it --");
ok(readAll(fakeTable(1000), "st_jobs", "x=1").length === 1000, "a full first page still reads on");
ok(readAll(fakeTable(1001), "st_jobs", "x=1").length === 1001, "and stops at the right place");

console.log("\n-- and the version this replaced really does break --");
/*
 * Page straight through under the caller's own order, adding nothing. If this
 * passes the tied-column table, the check above proves nothing.
 */
function readAllTrustingTheCaller(serve: (q: string, from: number, span: number) => Row[], query: string): Row[] {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = serve(query, from, PAGE);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}
const broken = readAllTrustingTheCaller(fakeTable(2023), "completed_on=gte.2026-01-01&order=day.desc");
ok(new Set(broken.map((r) => r.id)).size < 2023, "it serves some rows twice", new Set(broken.map((r) => r.id)).size);
ok(
  broken.reduce((a, r) => a + r.total, 0) !== TOTAL(2023),
  "and its total is wrong while the row count looks right",
  { rows: broken.length, total: broken.reduce((a, r) => a + r.total, 0), shouldBe: TOTAL(2023) },
);

console.log("\n-- the order test itself --");
ok(hasOrder("order=id.asc"), "at the start");
ok(hasOrder("a=1&order=id.asc"), "after an ampersand");
ok(!hasOrder("reorder=1"), "not a column that merely ends in order", hasOrder("reorder=1"));
ok(!hasOrder("select=total,invoice_date"), "nor a plain select");
ok(orderedColumns("a=1&order=post_date.desc.nullslast,number.desc").join() === "post_date,number", "columns read bare of direction and nulls", orderedColumns("a=1&order=post_date.desc.nullslast,number.desc"));

console.log(failed ? `\n${failed} failed\n` : "\nall good\n");
process.exit(failed ? 1 : 0);

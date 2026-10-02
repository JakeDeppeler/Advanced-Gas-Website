import { NextResponse } from "next/server";
type Row = Record<string, unknown>;
import { dashboardDbConfigured, q, sbSelect } from "@/lib/dashboard/db";
import { cronAuthorised, screenTokenValid } from "@/lib/dashboard/screenAuth";
import { reeceConfigured, reeceConnection, reeceSearch } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Item lookup while quoting: /api/reece/search?q=copper+20mm
//
// Live maX search when the API is connected; otherwise the local supplier_items
// replica, which is what the price file filled. Either way the result is the
// same shape with our contractor price, so whatever calls this does not care
// which answered. Accepts the cron bearer or the screen token (?k=) so an office
// tool in a browser can use it.

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!cronAuthorised(req) && !screenTokenValid(url.searchParams.get("k"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const term_ = (url.searchParams.get("q") ?? "").trim();
  if (term_.length < 2) return NextResponse.json({ ok: false, error: "q must be at least 2 characters" }, { status: 400 });
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));

  if (reeceConfigured() && (await reeceConnection()).status === "connected") {
    try {
      const items = await reeceSearch(term_, limit);
      return NextResponse.json({ ok: true, source: "max-api", items: items.map(({ raw: _raw, ...i }) => i) });
    } catch (e) {
      // Fall through to the replica rather than fail the lookup — a quote
      // waiting on a search is worse than a price a day old.
      console.warn("Reece search failed, using replica:", (e as Error).message);
    }
  }

  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });

  // PostgREST filter grammar: `*` is the wildcard, and commas, dots and
  // parentheses delimit the `or=(…)` list, so they are stripped from the term.
  const term = term_.replace(/[*%,.()\\]/g, "").trim();
  const cols = "code,description,uom,pack_qty,cost,gst_applies,list_price,category,barcode,seen_at";
  let exact: Row[] = [];
  let fuzzy: Row[] = [];
  try {
    exact = await sbSelect<Row>(
      "supplier_items",
      [q.select(cols), q.eq("supplier", "reece"), `code=ilike.${encodeURIComponent(term)}`, "limit=1"].join("&"),
    );
    fuzzy = await sbSelect<Row>(
      "supplier_items",
      [
        q.select(cols),
        q.eq("supplier", "reece"),
        `or=${encodeURIComponent(`(code.ilike.*${term}*,description.ilike.*${term}*)`)}`,
        q.order("code"),
        `limit=${limit}`,
      ].join("&"),
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  const seen = new Set<string>();
  const items = [...exact, ...fuzzy].filter((i) => {
    const code = String(i.code);
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
  return NextResponse.json({ ok: true, source: "replica", items });
}

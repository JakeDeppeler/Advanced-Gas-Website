import { NextResponse } from "next/server";
import { searchSite } from "@/lib/searchIndex";

/**
 * Suggestions for the header's search box.
 *
 * The matching stays on the server, which is the whole point: the suburb and
 * brand data is a great deal of prose and none of it needs to reach the
 * browser. The box is a real form underneath, so if this never answers the
 * page still submits and the results page does the same search.
 */
export const runtime = "nodejs";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = searchSite(q, 8).map((h) => ({ t: h.title, p: h.path, k: h.kind }));
  return NextResponse.json(
    { hits },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}

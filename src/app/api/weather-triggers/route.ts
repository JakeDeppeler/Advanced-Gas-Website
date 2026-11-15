import { NextResponse } from "next/server";
import { loadWeatherReport } from "@/lib/weather-triggers/load";
import { reportCsv } from "@/lib/weather-triggers/csv";

export const runtime = "nodejs";
// The forecast is held for an hour inside loadWeatherReport; the route itself
// runs per request so "today" and the staleness check are always current.
export const dynamic = "force-dynamic";

/**
 * Suburbs the weather is about to send us work from, for ad targeting.
 *
 *   GET /api/weather-triggers             JSON, read by the Google Ads Script
 *   GET /api/weather-triggers?format=csv  one row per flagged suburb, to paste
 *                                         into Google Ads or Meta
 *
 * Public on purpose: it's a forecast and our published suburb list, and the
 * Ads Script fetches it from Google's servers with no way to hold a portal
 * session. Nothing secret goes in it.
 *
 * When the forecast couldn't be fetched the JSON says so in `status`, and the
 * CSV answers 503 instead of an empty list, so a paste or an import never
 * mistakes "couldn't check" for "nothing to target".
 */
export async function GET(req: Request) {
  const report = await loadWeatherReport();
  const usable = report.status === "ok" || report.status === "partial";
  // Short at the edge: the forecast underneath is already held for an hour.
  const cache = usable ? "public, s-maxage=600, stale-while-revalidate=600" : "no-store";

  if (new URL(req.url).searchParams.get("format") === "csv") {
    if (!usable) {
      return new NextResponse(`# ${report.message}\n`, {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return new NextResponse(reportCsv(report), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="weather-targets-${report.today}.csv"`,
        "cache-control": cache,
      },
    });
  }

  return NextResponse.json(report, {
    // 200 even when unavailable: the body says what happened, and the Ads
    // Script reads `status` either way. A 5xx would only lose the explanation.
    headers: { "cache-control": cache },
  });
}

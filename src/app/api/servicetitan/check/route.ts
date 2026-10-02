import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { checkServiceTitan } from "@/lib/dashboard/stCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Read-only diagnostic for the ServiceTitan link. Run it after setting the four
// ST_* variables, before running the backfill — it names which credential or
// scope is wrong instead of leaving you to infer it from a failing sync.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://<host>/api/servicetitan/check
//
// Guarded by CRON_SECRET: it reveals which credentials are set and how many
// records the tenant holds, which is not public information. It returns 200 even
// when the link is broken — the body is the report, and a non-2xx would be
// indistinguishable from the endpoint itself being misconfigured.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const report = await checkServiceTitan();
  return NextResponse.json(report);
}

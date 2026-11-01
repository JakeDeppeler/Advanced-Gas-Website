import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { checkServiceTitan } from "@/lib/dashboard/stCheck";
import { probeEstimates, probeForms, probeJobHistory, probeReports } from "@/lib/dashboard/stEstimateProbe";

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
//
// ?estimate=<id>,<id> asks instead what ServiceTitan returns for those
// estimates, field by field (stEstimateProbe): whether the API says a quote
// is still a draft. Up to five ids, digits only.
//
// ?job=<id>,<id> lists the kinds of event in those jobs' history
// (probeJobHistory): whether ServiceTitan records a quote being sent.
//
// ?forms=<name> lists the tenant's forms and the shape of the newest
// submissions of those matching the name (probeForms): whether a work order
// can carry the job's Condition Report.
// It also lays out one completed report field by field, answers cut short,
// and tries filtering the list to one job.
//
// ?reports=<name> lists the ServiceTitan reports the portal can read whose
// name matches, and their columns (probeReports): whether a report can say a
// quote is a draft, which the estimate API can't.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ids = (new URL(req.url).searchParams.get("estimate") ?? "").split(",").map((x) => x.trim()).filter((x) => /^\d{1,12}$/.test(x)).slice(0, 5).map(Number);
  if (ids.length) return NextResponse.json({ estimates: await probeEstimates(ids) });
  const jobs = (new URL(req.url).searchParams.get("job") ?? "").split(",").map((x) => x.trim()).filter((x) => /^\d{1,12}$/.test(x)).slice(0, 5).map(Number);
  if (jobs.length) return NextResponse.json({ jobs: await probeJobHistory(jobs) });
  const forms = new URL(req.url).searchParams.get("forms");
  if (forms) return NextResponse.json({ forms: await probeForms(forms) });
  const reports = new URL(req.url).searchParams.get("reports");
  if (reports) return NextResponse.json({ reports: await probeReports(reports) });

  const report = await checkServiceTitan();
  return NextResponse.json(report);
}

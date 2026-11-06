import { NextResponse, type NextRequest } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { q, sbSelect } from "@/lib/dashboard/db";
import { conditionReports } from "@/lib/conditionReport/fetch";
import { reportPdf } from "@/lib/conditionReport/pdf";
import { reportFileName, toReport } from "@/lib/conditionReport/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * A job's Condition Report as the PDF a work order carries, for the office
 * to look at: /api/portal/condition-report?job=20721. The newest completed
 * one; &n=2 for the one before it, where a job has several (one per unit).
 */
export async function GET(req: NextRequest) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url));
  const job = (req.nextUrl.searchParams.get("job") ?? "").trim();
  if (!/^\d{3,12}$/.test(job)) return new NextResponse("Give a job number: ?job=20721", { status: 400 });
  const n = Math.max(1, Math.min(6, Number(req.nextUrl.searchParams.get("n")) || 1));

  const [row] = await sbSelect<{ id: number }>("st_jobs", [q.select("id"), `job_number=eq.${job}`, "limit=1"].join("&"));
  if (!row) return new NextResponse(`No job ${job} in the portal's copy of ServiceTitan.`, { status: 404 });
  try {
    const subs = await conditionReports([Number(row.id)]);
    const sub = subs[n - 1];
    if (!sub) return new NextResponse(subs.length ? `Job ${job} has ${subs.length} completed Condition Report${subs.length === 1 ? "" : "s"}, not ${n}.` : `Job ${job} has no completed Condition Report in ServiceTitan.`, { status: 404 });
    const r = toReport(sub);
    const pdf = await reportPdf(r, new Date());
    return new NextResponse(Buffer.from(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${reportFileName(r)}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new NextResponse(`ServiceTitan wouldn't give the report: ${(e as Error).message.replace(/^ServiceTitan \S+ failed: /, "").slice(0, 200)}`, { status: 502 });
  }
}

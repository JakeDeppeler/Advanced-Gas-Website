import { NextResponse, type NextRequest } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { installJob, packFactsFor } from "@/lib/installpack/facts";
import { buildPackFile } from "@/lib/installpack/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The install pack for one booked install, made now and shown in the browser,
 * without putting anything on the job: for the office to see what the
 * installer will get. /api/portal/install-pack?job=20453
 *
 * Photos are capped lower than on the real pack because Vercel won't return
 * more than 4.5 MB from a function; the PDF says how many were left off.
 */
const PREVIEW_PHOTO_BYTES = 3 * 1048576;

export async function GET(req: NextRequest) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url));
  const job = (req.nextUrl.searchParams.get("job") ?? "").trim();
  if (!/^\d{3,12}$/.test(job)) return new NextResponse("Give a job number: ?job=20453", { status: 400 });

  const j = await installJob(job);
  if (!j) return new NextResponse(`Job ${job} isn't an install job with a visit still to come, so it has no install pack.`, { status: 404 });
  const facts = (await packFactsFor([j])).get(j.job_id)!;
  try {
    const built = await buildPackFile(j, facts, 0, Date.now() + 50_000, PREVIEW_PHOTO_BYTES);
    return new NextResponse(Buffer.from(built.pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${built.fileName.replace(/"/g, "")}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new NextResponse(`The pack couldn't be made: ${(e as Error).message}`, { status: 502 });
  }
}

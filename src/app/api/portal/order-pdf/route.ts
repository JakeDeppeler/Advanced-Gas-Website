import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { orderPdfFor } from "@/lib/ordering/send";

export const dynamic = "force-dynamic";

/**
 * An order as a PDF, to save and attach to the job in ServiceTitan: the
 * office's, behind the same capability as the To order page.
 */
export async function GET(req: Request) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return new NextResponse("Not found", { status: 404 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new NextResponse("Not found", { status: 404 });
  const r = await orderPdfFor(id).catch((e) => ({ error: (e as Error).message }));
  if ("error" in r) return new NextResponse(r.error, { status: 404 });
  return new NextResponse(Buffer.from(r.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${r.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

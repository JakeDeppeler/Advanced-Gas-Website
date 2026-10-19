import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { jobFileToShow } from "@/lib/ordering/jobFiles";

export const dynamic = "force-dynamic";

/**
 * A file on a ServiceTitan job, to see before sending it with a work order:
 * the picker's photo previews and its View links. Behind the same capability
 * as Work orders. The browser is sent on to where ServiceTitan keeps the file
 * when it can be; our token never leaves the server either way.
 */
export async function GET(req: Request) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return new NextResponse("Not found", { status: 404 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new NextResponse("Not found", { status: 404 });
  const r = await jobFileToShow(id);
  // The storage link is short-lived, so neither it nor the file is kept.
  if ("url" in r) return NextResponse.redirect(r.url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  if ("error" in r) return new NextResponse(r.error, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  // Shown in the page only if it's a photo or a PDF. Anything else on a job
  // (an .html someone attached) downloads instead, and is sandboxed if opened,
  // so it can't run as the portal.
  const shown = /^image\/(jpeg|png|gif|webp)$|^application\/pdf$/.test(r.mime);
  return new NextResponse(Buffer.from(r.bytes), {
    headers: {
      "Content-Type": shown ? r.mime : "application/octet-stream",
      "Content-Disposition": shown ? "inline" : "attachment",
      // Not on a PDF: Chrome won't open its PDF viewer in a sandbox.
      ...(shown ? {} : { "Content-Security-Policy": "sandbox" }),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

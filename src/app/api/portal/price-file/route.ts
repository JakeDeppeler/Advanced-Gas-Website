import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { importPriceFile } from "@/lib/pricebook/importFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The portal's "Upload a price file" button.
 *
 * Its own route rather than the scheduled import's, so that endpoint keeps
 * the one secret it trusts and this one checks the portal session, the same
 * capability that opens Supply. The file goes through the same import.
 */
export async function POST(req: Request) {
  const user = await getPortalUser();
  if (!user || !can(user, "overhead")) return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "The database isn’t connected." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ ok: false, error: "Pick a price file." }, { status: 400 });
  const name = "name" in file && typeof file.name === "string" ? file.name : null;

  const { status, report } = await importPriceFile(await file.text(), name, false);
  return NextResponse.json(report, { status });
}

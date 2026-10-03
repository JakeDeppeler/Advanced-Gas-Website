import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { importPriceFile } from "@/lib/pricebook/importFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Loads a Reece maX price file into supplier_items.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        --data-binary @reece-prices.csv -H "Content-Type: text/csv" \
//        "https://www.advancedgas.com.au/api/reece/import?dryRun=1"
//
// Or as a multipart upload with the file in a `file` field. Pass ?dryRun=1 to
// see the column mapping and a sample without storing anything — do that first
// with a new file, because the parser guesses columns from their headers.
//
// This does not touch the ServiceTitan pricebook. That is /api/pricebook/sync,
// which reads what this stored.

export async function POST(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  let text: string;
  let fileName: string | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "multipart body needs a `file` field" }, { status: 400 });
    }
    fileName = "name" in file && typeof file.name === "string" ? file.name : null;
    text = await file.text();
  } else {
    text = await req.text();
  }
  if (!text.trim()) return NextResponse.json({ ok: false, error: "empty body" }, { status: 400 });

  // A pinned column map (portal_settings.pricebook.fileColumns) overrides the
  // header guessing once the real file layout is known.
  const { status, report } = await importPriceFile(text, fileName, dryRun);
  return NextResponse.json(report, { status });
}

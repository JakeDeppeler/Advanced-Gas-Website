import { NextResponse } from "next/server";
import { dashboardDbConfigured, sbUpsert } from "@/lib/dashboard/db";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { addNotes, applyImport, checkContacts, loadImportSpec, mergePairs, otherLocations, planImport, syncTags } from "@/lib/locations/stLocations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Bulk location import into one ServiceTitan customer.
//
//   GET /api/servicetitan/locations              dry run: plan only, nothing written
//   GET /api/servicetitan/locations?apply=1      create up to `limit` (default 5, max 50)
//   GET /api/servicetitan/locations?contacts=1&from=N
//                                                add any missing contacts to list
//                                                positions N..N+limit, once the
//                                                creates are done
//   GET /api/servicetitan/locations?notes=1      add each listed location's missing notes
//   GET /api/servicetitan/locations?others=1     read-only: the customer's locations
//                                                that are not on the list, with the
//                                                listed unit each one seems to duplicate
//   GET /api/servicetitan/locations?merge=1      fold the approved duplicate pairs in
//                                                portal_settings.st_location_import_merge
//   GET /api/servicetitan/locations?tags=1&from=N
//                                                set the managed tags on list positions
//                                                N..N+limit
//
// The list is read from portal_settings.st_location_import. Safe to repeat: the
// plan is recomputed from the customer's live locations, so anything already
// created drops out. Driven by .github/workflows/servicetitan-locations.yml.
//
// The response carries location names and counts but never the contact
// details — the workflow prints it to a public log.

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  if (!serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "ServiceTitan credentials not set — see DASHBOARD.md step 4" }, { status: 503 });
  }

  const url = new URL(req.url);
  const apply = url.searchParams.get("apply") === "1";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 5));

  try {
    const spec = await loadImportSpec();
    const plan = await planImport(spec);
    const summary = {
      customer: plan.customer,
      inList: spec.locations.length,
      existingOnCustomer: plan.existing,
      alreadyThere: plan.alreadyThere.length,
      toCreate: plan.toCreate.length,
    };

    if (url.searchParams.get("tags") === "1") {
      const from = Math.max(0, Math.floor(Number(url.searchParams.get("from")) || 0));
      const result = await syncTags(spec, plan, from, limit);
      return NextResponse.json({ ok: result.failed.length === 0, mode: "tags", summary, ...result });
    }

    if (url.searchParams.get("merge") === "1") {
      const result = await mergePairs(spec);
      return NextResponse.json({ ok: result.merged === result.pairs, mode: "merge", summary, ...result });
    }

    if (url.searchParams.get("others") === "1") {
      // The names of a customer's existing locations can carry residents'
      // names, so the full report goes to Supabase and the public workflow log
      // gets counts only.
      const others = otherLocations(spec, plan);
      await sbUpsert(
        "portal_settings",
        [{ key: "st_location_import_others", value: { at: new Date().toISOString(), others }, updated_at: new Date().toISOString() }],
        "key",
      );
      return NextResponse.json({
        ok: true,
        mode: "others",
        summary,
        others: others.length,
        sameUnitAsListed: others.filter((o) => o.sameUnitAs).length,
        savedTo: "portal_settings.st_location_import_others",
      });
    }

    if (url.searchParams.get("notes") === "1") {
      const result = await addNotes(spec, plan);
      return NextResponse.json({ ok: result.failed.length === 0, mode: "notes", summary, ...result });
    }

    if (url.searchParams.get("contacts") === "1") {
      const from = Math.max(0, Math.floor(Number(url.searchParams.get("from")) || 0));
      const result = await checkContacts(spec, plan, from, limit);
      return NextResponse.json({ ok: result.failed.length === 0, mode: "contacts", summary, ...result });
    }

    if (!apply) {
      return NextResponse.json({
        ok: true,
        mode: "dry-run",
        summary,
        firstToCreate: plan.toCreate.slice(0, 10).map((l) => l.name),
        alreadyThere: plan.alreadyThere.slice(0, 50),
      });
    }

    const result = await applyImport(spec, plan, limit);
    return NextResponse.json({ ok: result.failed.length === 0, mode: "apply", summary, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

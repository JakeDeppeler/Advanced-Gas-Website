import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import {
  addNotes, applyImport, checkContacts, fetchCustomer, fetchLive, loadSpec, mergeDouble, missingTagTypes, norm,
  planImport, sameSpot, saveSpec, setStatus, specProblem, syncTags,
  type ImportLocation, type StatusTag,
} from "@/lib/locations/stLocations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Everything the Site locations pages do, one POST with an `action`:
 *
 *   preview   the list against the customer's live locations; writes nothing
 *   save      store the list (portal_settings.locations:<id>)
 *   create    create or adopt up to `limit` of what's missing
 *   contacts / notes / tags
 *             one page of [from, from + limit) — the page loops them
 *   merge     fold one double into the record kept
 *   status    move locations to a service status
 *
 * Admins only — the same capability that opens Admin. Paged because a village
 * is hundreds of calls to ServiceTitan and a function has 60 seconds; the page
 * drives the loop and shows progress.
 */
export async function POST(req: Request) {
  const user = await getPortalUser();
  if (!user || !can(user, "manage_users")) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "The database isn’t connected." }, { status: 503 });
  if (!serviceTitanConfigured()) return NextResponse.json({ ok: false, error: "ServiceTitan isn’t connected." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const customerId = Number(body?.customerId);
  const action = String(body?.action ?? "");
  if (!Number.isInteger(customerId) || customerId <= 0) return NextResponse.json({ ok: false, error: "Which customer?" }, { status: 400 });
  const limit = Math.min(50, Math.max(1, Number(body?.limit) || 50));
  const from = Math.max(0, Math.floor(Number(body?.from) || 0));

  try {
    if (action === "preview") {
      const locations = (body?.locations ?? []) as ImportLocation[];
      const customer = await fetchCustomer(customerId);
      const live = await fetchLive(customerId);
      const active = live.filter((l) => l.active !== false);
      const byName = new Map(live.map((l) => [norm(l.name), l]));
      const rows = locations.map((l) => {
        const same = byName.get(norm(l.name));
        if (same) return { name: l.name, state: "exists" as const, match: { id: same.id, name: same.name } };
        const twin = active.find((a) => sameSpot(a, l));
        if (twin) return { name: l.name, state: "double" as const, match: { id: twin.id, name: twin.name } };
        return { name: l.name, state: "new" as const };
      });
      const missingTags = await missingTagTypes({ customerId, locations, statusTags: (body?.statusTags ?? []) as StatusTag[] });
      return NextResponse.json({ ok: true, customer, existing: live.length, rows, missingTags });
    }

    if (action === "save") {
      const customer = await fetchCustomer(customerId);
      const spec = {
        customerId,
        customerName: customer.name,
        locations: (body?.locations ?? []) as ImportLocation[],
        statusTags: (body?.statusTags ?? []) as StatusTag[],
        savedAt: new Date().toISOString(),
        savedBy: user.name,
      };
      const problem = specProblem(spec);
      if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });
      await saveSpec(spec);
      return NextResponse.json({ ok: true, saved: spec.locations.length });
    }

    const spec = await loadSpec(customerId);
    if (action === "merge") {
      const keep = Number(body?.keep);
      const retire = ((body?.retire ?? []) as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (!keep || !retire.length) return NextResponse.json({ ok: false, error: "Which locations?" }, { status: 400 });
      return NextResponse.json({ ok: true, done: await mergeDouble(customerId, spec, keep, retire) });
    }

    if (!spec) return NextResponse.json({ ok: false, error: "No saved list for this customer yet." }, { status: 400 });

    if (action === "status") {
      const ids = ((body?.ids ?? []) as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (!ids.length) return NextResponse.json({ ok: false, error: "Tick some locations first." }, { status: 400 });
      if (ids.length > 500) return NextResponse.json({ ok: false, error: "Up to 500 at a time." }, { status: 400 });
      return NextResponse.json({ ok: true, ...(await setStatus(customerId, spec, ids, String(body?.label ?? ""))) });
    }

    const plan = await planImport(spec);
    const summary = { inList: spec.locations.length, existing: plan.existing, toCreate: plan.toCreate.length };
    if (action === "create") return NextResponse.json({ ok: true, summary, ...(await applyImport(spec, plan, limit)) });
    if (action === "contacts") return NextResponse.json({ ok: true, summary, ...(await checkContacts(spec, plan, from, limit)) });
    if (action === "notes") return NextResponse.json({ ok: true, summary, ...(await addNotes(spec, plan, from, limit)) });
    if (action === "tags") return NextResponse.json({ ok: true, summary, ...(await syncTags(spec, plan, from, limit)) });

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (e) {
    const msg = (e as Error).message.replace(/[^\s"'@]+@[^\s"'@]+/g, "[email]");
    // A mistyped customer number is the common one; say it plainly.
    const error = /customers\/\d+ failed: 404/.test(msg) ? "ServiceTitan has no customer with that number." : msg;
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
}

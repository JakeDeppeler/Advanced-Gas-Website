import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured, stList } from "@/lib/dashboard/servicetitan";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { addQuoteTemplates } from "@/lib/pricebook/quoteTemplatesAdd";
import { setUpServices } from "@/lib/pricebook/serviceSetup";
import { fixTemplates22Nov } from "@/lib/pricebook/templateFixes";
import { splitRebateHeaders } from "@/lib/pricebook/rebateHeaders";
import { addEvapProposals } from "@/lib/pricebook/evapProposals";
import { addRepairProposals } from "@/lib/pricebook/repairProposals";
import { buildFromReece } from "@/lib/pricebook/reeceBuild";
import { syncQuoteWording } from "@/lib/pricebook/quoteWording";
import { syncServiceWording } from "@/lib/pricebook/serviceWording";
import { groupQuoteTemplates, lineUpFixes, lookAtTemplates, tidyTemplateNames } from "@/lib/pricebook/quoteTemplatesFix";
import { snapshotCatalog } from "@/lib/proposals/snapshot";
import { saveSettings } from "@/lib/portal/db";
import { reeceConfigured, reeceConnection, reeceSearch } from "@/lib/pricebook/reece";
import type { TemplateItem } from "@/lib/pricebook/labour";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Jake's 16 Nov service prices into the pricebook (serviceSetup.ts), then the
 * 15 Nov quote templates into ServiceTitan, then laid out the way Jake
 * lays a quote out, then the template names put to the pattern — as much as
 * fits a call. See src/lib/pricebook/quoteTemplatesAdd.ts and
 * quoteTemplatesFix.ts. Called by the after-sync schedule, not the sync
 * itself: the sync already uses half its minute, and a hundred or so writes
 * would push the wall board's snapshot past the end of it. Once everything is
 * done each step answers with nothing to do.
 *
 * ?look=1 changes nothing: it saves every active template's lines and prices
 * to portal_settings.quote_templates_look, to see what they really charge.
 * ?catalog=1 changes nothing either: it saves the whole pricebook, services
 * with their linked parts, to portal_settings.st_catalog_snapshot (snapshot.ts),
 * for the template audit (Jake, 28 Nov).
 * ?reece=<phrase> changes nothing: it searches Reece's catalogue (the phrases
 * separated by |, three to thirty characters each) and saves what comes back,
 * our price, the market price, the codes and the images, to
 * portal_settings.reece_probe, for choosing the heaters and duct fittings to
 * add to the pricebook (Jake, 28 Nov).
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase or ServiceTitan not configured" }, { status: 503 });
  }
  try {
    if (new URL(req.url).searchParams.get("look")) return NextResponse.json({ ok: true, look: await lookAtTemplates() });
    if (new URL(req.url).searchParams.get("catalog")) return NextResponse.json({ ok: true, catalog: await snapshotCatalog() });
    const reece = new URL(req.url).searchParams.get("reece");
    if (reece) {
      if (!reeceConfigured() || (await reeceConnection()).status !== "ready") return NextResponse.json({ ok: false, error: "Reece isn't connected" });
      const phrases = reece.split("|").map((x) => x.trim()).filter((x) => x.length >= 3).slice(0, 12);
      const found: Record<string, unknown> = {};
      for (const phrase of phrases) {
        const r = await reeceSearch(phrase, 50).catch((e: Error) => ({ error: e.message.slice(0, 200) }));
        found[phrase] = "error" in r ? r : { total: r.totalResults, gstRate: r.gstRate, items: r.items };
      }
      const saved = await saveSettings("reece_probe", { at: new Date().toISOString(), found });
      return NextResponse.json({ ok: true, phrases: phrases.length, saved: saved.ok });
    }
    const until = Date.now() + 40_000;
    // Jake's 16 Nov service prices and the items the service templates are built on, first.
    const services = await setUpServices(until - 25_000);
    const add = await addQuoteTemplates(until - Date.now());
    let group: Awaited<ReturnType<typeof groupQuoteTemplates>> | null = null;
    let tidy: Awaited<ReturnType<typeof tidyTemplateNames>> | null = null;
    let lineUp: Awaited<ReturnType<typeof lineUpFixes>> | null = null;
    let rebates: Awaited<ReturnType<typeof splitRebateHeaders>> | null = null;
    let proposals: Awaited<ReturnType<typeof addEvapProposals>> | null = null;
    let repairProposals: Awaited<ReturnType<typeof addRepairProposals>> | null = null;
    let wording: Awaited<ReturnType<typeof syncQuoteWording>> | null = null;
    let serviceWording: Awaited<ReturnType<typeof syncServiceWording>> | null = null;
    let fixes: Awaited<ReturnType<typeof fixTemplates22Nov>> | null = null;
    let reeceItems: Awaited<ReturnType<typeof buildFromReece>> | null = null;
    if (Date.now() < until) {
      // One read of the templates for both steps: the regroup changes lines, the renames names.
      const all = await stList<{ id: number; name?: string; internalName?: string | null; totalPrice?: number; summary?: string | null; items?: TemplateItem[] }>(
        "sales", "estimate-templates", { active: "True" }, 5);
      group = await groupQuoteTemplates(until, all);
      // The line-up fixes before the renames: they check each template's name as the review found it.
      lineUp = await lineUpFixes(until, all);
      tidy = await tidyTemplateNames(until, all);
      // Jake, 16 Nov: the rebate totals for hot water and heating & cooling, then the evap proposals.
      if (Date.now() < until) rebates = await splitRebateHeaders(until, all);
      if (Date.now() < until) proposals = await addEvapProposals(until);
      // Jake, 28 Nov: Repair, Replace, Upgrade for each evap and split fault.
      if (Date.now() < until) repairProposals = await addRepairProposals(until);
      // Jake, 17 Nov: the summary says the job, the equipment line sells the unit.
      if (Date.now() < until) wording = await syncQuoteWording(until, all);
      // Jake, 19 Nov: the service and maintenance items, worded for a quote or an invoice alike.
      if (Date.now() < until) serviceWording = await syncServiceWording(until, all);
      // Jake, 22 Nov: the fixes from the review of every template (templateFixPlan.ts).
      if (Date.now() < until) fixes = await fixTemplates22Nov(until, all);
      // Jake, 28 Nov: the Multisnap take-offs and the 4, 5 and 6 star heaters from Reece.
      if (Date.now() < until) reeceItems = await buildFromReece(until);
    }
    const failed = [...services.failed, ...add.failed, ...(group?.failed ?? []), ...(tidy?.failed ?? []), ...(lineUp?.failed ?? []), ...(rebates?.failed ?? []), ...(proposals?.failed ?? []), ...(repairProposals?.failed ?? []), ...(wording?.failed ?? []), ...(serviceWording?.failed ?? []), ...(fixes?.failed ?? []), ...(reeceItems?.failed ?? [])];
    return NextResponse.json({ ok: failed.length === 0, services, add, group, tidy, lineUp, rebates, proposals, repairProposals, wording, serviceWording, fixes, reeceItems });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

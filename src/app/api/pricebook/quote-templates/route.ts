import { NextResponse } from "next/server";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { serviceTitanConfigured, stList } from "@/lib/dashboard/servicetitan";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { addQuoteTemplates } from "@/lib/pricebook/quoteTemplatesAdd";
import { setUpServices } from "@/lib/pricebook/serviceSetup";
import { groupQuoteTemplates, lineUpFixes, lookAtTemplates, tidyTemplateNames } from "@/lib/pricebook/quoteTemplatesFix";
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
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured() || !serviceTitanConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase or ServiceTitan not configured" }, { status: 503 });
  }
  try {
    if (new URL(req.url).searchParams.get("look")) return NextResponse.json({ ok: true, look: await lookAtTemplates() });
    const until = Date.now() + 40_000;
    // Jake's 16 Nov service prices and the items the service templates are built on, first.
    const services = await setUpServices(until - 25_000);
    const add = await addQuoteTemplates(until - Date.now());
    let group: Awaited<ReturnType<typeof groupQuoteTemplates>> | null = null;
    let tidy: Awaited<ReturnType<typeof tidyTemplateNames>> | null = null;
    let lineUp: Awaited<ReturnType<typeof lineUpFixes>> | null = null;
    if (Date.now() < until) {
      // One read of the templates for both steps: the regroup changes lines, the renames names.
      const all = await stList<{ id: number; name?: string; internalName?: string | null; totalPrice?: number; items?: TemplateItem[] }>(
        "sales", "estimate-templates", { active: "True" }, 5);
      group = await groupQuoteTemplates(until, all);
      // The line-up fixes before the renames: they check each template's name as the review found it.
      lineUp = await lineUpFixes(until, all);
      tidy = await tidyTemplateNames(until, all);
    }
    const failed = [...services.failed, ...add.failed, ...(group?.failed ?? []), ...(tidy?.failed ?? []), ...(lineUp?.failed ?? [])];
    return NextResponse.json({ ok: failed.length === 0, services, add, group, tidy, lineUp });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

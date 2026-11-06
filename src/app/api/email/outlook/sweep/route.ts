import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { outlookConfigured } from "@/lib/outlook/graph";
import { aiConfigured } from "@/lib/outlook/draft";
import { sweep } from "@/lib/outlook/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Keeps the Outlook subscriptions alive and drafts anything the webhook
 * missed (lib/outlook/sweep.ts). Called by Vercel's daily cron and by the
 * dashboard-sync workflow; either alone keeps it working.
 *
 * Its JSON is also the setup check: run it by hand after connecting the
 * mailboxes and it says whether each subscription was made, and what
 * happened to each email it found.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  const missing = [
    !outlookConfigured() && "MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET and OUTLOOK_DRAFT_MAILBOXES",
    !aiConfigured() && "ANTHROPIC_API_KEY",
    !dashboardDbConfigured() && "Supabase",
  ].filter(Boolean);
  // Not set up is not a failure: the cron runs whether or not anyone has
  // connected the mailboxes yet.
  if (missing.length) return NextResponse.json({ ok: true, off: `Outlook drafts are off until these are set: ${missing.join("; ")}.` });

  const result = await sweep();
  return NextResponse.json({ ok: true, ...result });
}

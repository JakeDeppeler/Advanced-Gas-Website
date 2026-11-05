import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { buildDailyReminder, renderDailyReminder, sendDailyReminder } from "@/lib/reminders/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The morning to-do email (lib/reminders/daily.ts), from Vercel's weekday
 * cron. `?preview=1` returns what it would send without sending it.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: true, off: "Supabase not configured" });
  if (new URL(req.url).searchParams.get("preview")) {
    const r = await buildDailyReminder();
    const mail = renderDailyReminder(r);
    return NextResponse.json({ ok: true, preview: true, subject: mail?.subject ?? null, text: mail?.text ?? null, liveTags: r.liveTags });
  }
  return NextResponse.json({ ok: true, ...(await sendDailyReminder()) });
}

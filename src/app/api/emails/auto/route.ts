import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { runAutoEmails } from "@/lib/autoEmails/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The after-the-quote customer emails (lib/autoEmails/run.ts), from the
 * ten-minute schedule. Each kind does nothing while switched off. `?dry=1`
 * says what each would send now, without sending or writing anything.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  return NextResponse.json({ ok: true, dry, ...(await runAutoEmails(new Date(), { dry })) });
}

import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { runFiling } from "@/lib/outlook/filing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Filing admin@ into its own folders (lib/outlook/filing.ts), from the
 * ten-minute schedule. Does nothing while switched off. `?dry=1` works out
 * where each email would go, moving and writing nothing, whatever the switch
 * says; `?learn=1` reads the folders again first.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  const p = new URL(req.url).searchParams;
  return NextResponse.json({ ok: true, ...(await runFiling({ dry: p.get("dry") === "1", learn: p.get("learn") === "1" })) });
}

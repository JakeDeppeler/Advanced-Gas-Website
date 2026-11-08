import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { sendCustomerEmailPreviews, PREVIEW_SETS, PREVIEW_TO, type PreviewSet } from "@/lib/previews/customerEmails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends the customer email previews to the owner, and only to the owner
 * (lib/previews/customerEmails.ts). `?only=answers,journey` sends just those
 * groups; without it, everything.
 */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  const asked = (new URL(req.url).searchParams.get("only") ?? "").split(",").map((s) => s.trim()).filter((s): s is PreviewSet => (PREVIEW_SETS as readonly string[]).includes(s));
  return NextResponse.json({ ok: true, to: PREVIEW_TO, sets: asked.length ? asked : [...PREVIEW_SETS], ...(await sendCustomerEmailPreviews(asked.length ? asked : undefined)) });
}

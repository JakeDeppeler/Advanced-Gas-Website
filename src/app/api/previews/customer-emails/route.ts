import { NextResponse } from "next/server";
import { scheduledCallAuthorised } from "@/lib/dashboard/cronAuth";
import { sendCustomerEmailPreviews, PREVIEW_TO } from "@/lib/previews/customerEmails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sends the customer email previews to the owner, and only to the owner (lib/previews/customerEmails.ts). */
export async function GET(req: Request) {
  if (!(await scheduledCallAuthorised(req))) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ ok: true, to: PREVIEW_TO, ...(await sendCustomerEmailPreviews()) });
}

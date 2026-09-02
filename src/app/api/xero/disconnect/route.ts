import { NextResponse, type NextRequest } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { deleteIntegration } from "@/lib/portal/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url), { status: 303 });
  await deleteIntegration("xero");
  return NextResponse.redirect(new URL("/portal/finance", req.url), { status: 303 });
}

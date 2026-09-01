import { NextResponse, type NextRequest } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { xeroConfigured, authorizeUrl } from "@/lib/portal/xero";

export const runtime = "nodejs";

/** Kick off the Xero OAuth flow (admins with the overhead capability). */
export async function GET(req: NextRequest) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url));
  if (!xeroConfigured()) return NextResponse.redirect(new URL("/portal/finance?error=notconfigured", req.url));

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("xero_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}

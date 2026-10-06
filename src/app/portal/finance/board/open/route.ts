import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opening the wall board from the portal.
 *
 * The board can't complete a login — it is a TV on a bracket — so `/screen` is
 * gated by a shared token in the query string instead. That leaves the portal
 * with no way to link to it, which is why the only way to look at the board has
 * been to know the URL.
 *
 * This redirects instead of printing the link. The token still ends up in the
 * address bar of the tab that opens, because that is how the board authorises and
 * there is no way around it; what it doesn't do is sit in the portal's HTML, where
 * it would be in every screenshot and every copied link. The portal session is
 * checked first, against the same capability that gates the figures themselves.
 */
export async function GET(req: Request) {
  const user = await getPortalUser();
  if (!user) return NextResponse.redirect(new URL("/portal/login", req.url));
  if (!can(user, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url));

  const token = process.env.SCREEN_TOKEN;
  if (!token) {
    // Nothing to redirect to, and a 404 from /screen would look like a bug in
    // this link rather than a missing environment variable.
    return NextResponse.redirect(new URL("/portal/finance/board?board=no-token", req.url));
  }

  // A relative Location, so the browser resolves it against the address it
  // asked for. Built from req.url it named the server's own host, which a
  // framed board — the Remote page shows it live — counts as another site and
  // refuses to draw.
  return new NextResponse(null, { status: 307, headers: { Location: `/screen?k=${encodeURIComponent(token)}` } });
}

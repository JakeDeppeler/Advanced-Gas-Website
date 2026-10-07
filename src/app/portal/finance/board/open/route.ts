import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opening the wall board from the portal.
 *
 * The board can't complete a login — it is a TV on a bracket — so it is gated by
 * a shared token in the query string instead. That leaves the portal with no way
 * to link to it, which is why the only way to look at the board has been to know
 * the URL.
 *
 * This redirects instead of printing the link, so the token never sits in the
 * portal's HTML where it would be in every screenshot and every copied link. It
 * goes to /tv, whose middleware moves the token into a cookie and redirects
 * again — so the tab that opens settles on the short URL with nothing secret in
 * it. The portal session is checked first, against the same capability that
 * gates the figures themselves.
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
  //
  // To /tv rather than /screen: the middleware there takes the token out of the
  // address bar and into a cookie, so the tab this opens settles on the short
  // URL and the token is not left on screen behind whoever clicked it.
  return new NextResponse(null, { status: 307, headers: { Location: `/tv?k=${encodeURIComponent(token)}` } });
}

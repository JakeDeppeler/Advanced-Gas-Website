import { NextResponse, type NextRequest } from "next/server";
import { verify } from "@/lib/portal/token";
import { SESSION_COOKIE } from "@/lib/portal/constants";
import { BOARD_COOKIE, BOARD_COOKIE_MAX_AGE, sameSecret } from "@/lib/dashboard/boardCookie";

/**
 * The wall board at /tv.
 *
 * Nothing to do with the portal session: the board has its own token and its
 * own cookie, and a television cannot sign in. Arrive once with `?k=<token>`
 * and the token moves into an httpOnly cookie and out of the address bar, so
 * the panel spends the rest of its life on a URL somebody can type.
 *
 * Without a valid token this falls through to the page, which 404s — an
 * unauthenticated visitor should not learn the route exists.
 */
function boardGate(req: NextRequest) {
  const supplied = req.nextUrl.searchParams.get("k");
  const expected = process.env.SCREEN_TOKEN;
  if (!supplied || !expected || !sameSecret(supplied, expected)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.searchParams.delete("k");
  const res = NextResponse.redirect(url);
  res.cookies.set(BOARD_COOKIE, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: BOARD_COOKIE_MAX_AGE,
  });
  return res;
}

/**
 * Gate the /portal and /trade areas. Both require a valid, unexpired
 * session cookie; the login page and the /api/portal/* auth routes stay
 * public (the matcher below never touches /api).
 *
 * /trade is the same portal on an iPad in a van, behind the same cookie —
 * one sign-in, two shells.
 *
 * This runs on the Edge, where a database round-trip per request isn't
 * worth it, so it only confirms the cookie is a genuine, signed session.
 * The finer-grained checks — is this person still on the team, are they an
 * admin, can they see the overhead tool — happen server-side on each page,
 * where the live role and capabilities are read from the database.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/tv" || pathname.startsWith("/tv/")) return boardGate(req);
  if (pathname === "/portal/login") return NextResponse.next();

  const secret = process.env.PORTAL_AUTH_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  let signedIn = false;
  if (secret && cookie) {
    const payload = await verify<{ email?: string; t?: string }>(cookie, secret);
    signedIn = !!(payload && payload.t === "session" && payload.email);
  }

  if (!signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = pathname && pathname !== "/portal" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal", "/portal/:path*", "/trade", "/trade/:path*", "/tv", "/tv/:path*"],
};

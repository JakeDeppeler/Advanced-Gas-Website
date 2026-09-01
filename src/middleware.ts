import { NextResponse, type NextRequest } from "next/server";
import { verify } from "@/lib/portal/token";
import { SESSION_COOKIE } from "@/lib/portal/constants";

/**
 * Gate the /portal area. Everything under /portal requires a valid,
 * unexpired session cookie; the login page and the /api/portal/* auth
 * routes stay public (the matcher below never touches /api).
 *
 * This runs on the Edge, where a database round-trip per request isn't
 * worth it, so it only confirms the cookie is a genuine, signed session.
 * The finer-grained checks — is this person still on the team, are they an
 * admin, can they see the overhead tool — happen server-side on each page,
 * where the live role and capabilities are read from the database.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ["/portal", "/portal/:path*"],
};

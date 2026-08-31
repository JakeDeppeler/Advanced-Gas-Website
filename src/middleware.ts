import { NextResponse, type NextRequest } from "next/server";
import { verify } from "@/lib/portal/token";
import { findMember } from "@/lib/portal/team";
import { SESSION_COOKIE } from "@/lib/portal/constants";

/**
 * Gate the /portal area. Everything under /portal requires a valid session
 * cookie for a current team member; /portal/admin also requires the admin
 * role. The login page and the /api/portal/* auth routes stay public (the
 * matcher below never touches /api). Runs on the Edge, so it verifies the
 * cookie itself rather than importing the Node session helper.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/portal/login") return NextResponse.next();

  const secret = process.env.PORTAL_AUTH_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  let role: string | null = null;
  if (secret && cookie) {
    const payload = await verify<{ email?: string; t?: string }>(cookie, secret);
    if (payload && payload.t === "session" && payload.email) {
      const member = findMember(String(payload.email));
      if (member) role = member.role;
    }
  }

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = pathname && pathname !== "/portal" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/portal/admin") && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "?denied=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal", "/portal/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import { readMagicToken, createSessionValue, sessionCookieOptions, SESSION_COOKIE } from "@/lib/portal/session";
import { resolveUser } from "@/lib/portal/db";

export const runtime = "nodejs";

/** The target of the emailed link: validate the one-time token, set the
 *  session cookie, and drop the person where they were headed. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const next = req.nextUrl.searchParams.get("next") ?? "/portal";

  const email = token ? await readMagicToken(token) : null;
  const member = email ? await resolveUser(email) : null;

  if (!member) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = "?error=expired";
    return NextResponse.redirect(url);
  }

  const value = await createSessionValue({ email: member.email, name: member.name });
  const dest = req.nextUrl.clone();
  dest.pathname = next.startsWith("/portal") ? next : "/portal";
  dest.search = "";

  const res = NextResponse.redirect(dest);
  if (value) res.cookies.set(SESSION_COOKIE, value, sessionCookieOptions);
  return res;
}

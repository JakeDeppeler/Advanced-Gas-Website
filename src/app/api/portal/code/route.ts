import { NextResponse, type NextRequest } from "next/server";
import { checkLoginCode } from "@/lib/portal/loginCode";
import { resolveUser } from "@/lib/portal/db";
import { createSessionValue, sessionCookieOptions, SESSION_COOKIE } from "@/lib/portal/session";
import { LOGIN_EMAIL_COOKIE } from "@/lib/portal/constants";

export const runtime = "nodejs";

/** The code typed on the login page: check it, set the session, and go where they were headed. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const next = String(form?.get("next") ?? "");
  const email = (req.cookies.get(LOGIN_EMAIL_COOKIE)?.value ?? "").trim().toLowerCase();

  const back = (error: string) => {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = `?step=code&error=${error}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
    return NextResponse.redirect(url, { status: 303 });
  };
  if (!email) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = "?error=expired";
    return NextResponse.redirect(url, { status: 303 });
  }

  // Someone not on the team never has a code, so this reads "expired" for
  // them, the same as for a code that's run out.
  const checked = await checkLoginCode(email, code);
  if (checked !== "ok") return back(checked);
  const member = await resolveUser(email);
  const value = member ? await createSessionValue({ email: member.email, name: member.name }) : null;
  if (!value) return back("expired");

  const dest = req.nextUrl.clone();
  dest.pathname = next.startsWith("/portal") || next.startsWith("/trade") ? next : "/portal";
  dest.search = "";
  const res = NextResponse.redirect(dest, { status: 303 });
  res.cookies.set(SESSION_COOKIE, value, sessionCookieOptions);
  res.cookies.delete(LOGIN_EMAIL_COOKIE);
  return res;
}

import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/portal/db";
import { issueLoginCode } from "@/lib/portal/loginCode";
import { sendLoginCode } from "@/lib/portal/email";
import { LOGIN_EMAIL_COOKIE } from "@/lib/portal/constants";

export const runtime = "nodejs";

/**
 * Ask for a sign-in code. Responds the same way no matter what — the page
 * moves on to "type the code" — but a code is only sent when the address is
 * on the team, so this can't be used to find out who is. "Send a new code"
 * posts here again with no address, and the one in the cookie is used.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const typed = String(form?.get("email") ?? "").trim().toLowerCase();
  const email = typed || (req.cookies.get(LOGIN_EMAIL_COOKIE)?.value ?? "").trim().toLowerCase();
  const next = String(form?.get("next") ?? "");

  const url = req.nextUrl.clone();
  url.pathname = "/portal/login";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    url.search = "";
    return NextResponse.redirect(url, { status: 303 });
  }

  if (await isAllowed(email)) {
    const code = await issueLoginCode(email);
    if (code) await sendLoginCode(email, code);
  }

  url.search = `?step=code${typed ? "" : "&again=1"}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(LOGIN_EMAIL_COOKIE, email, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 60,
  });
  return res;
}

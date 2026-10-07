import { NextResponse, type NextRequest } from "next/server";
import { BOARD_COOKIE, BOARD_COOKIE_MAX_AGE } from "@/lib/dashboard/boardCookie";
import { redeemPairing } from "@/lib/board/pairing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The code, typed on the television.
 *
 * Spends it, puts the real token in the board cookie and sends the browser to
 * /tv, which is where the panel lives from then on. A wrong code comes back to
 * the same form with nothing to learn from — the response is identical whether
 * the code was mistyped, expired, already used, or burnt by earlier guesses.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const token = process.env.SCREEN_TOKEN;

  const url = req.nextUrl.clone();
  url.pathname = "/tv";

  if (!token || !code || !(await redeemPairing(code).catch(() => false))) {
    url.search = "?bad=1";
    return NextResponse.redirect(url, { status: 303 });
  }

  url.search = "";
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(BOARD_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: BOARD_COOKIE_MAX_AGE,
  });
  return res;
}

import { NextResponse } from "next/server";
import { BOARD_COOKIE, BOARD_COOKIE_MAX_AGE } from "@/lib/dashboard/boardCookie";
import { redeemPairing } from "@/lib/board/pairing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redeeming a pairing code: advancedgas.com.au/tv/K7M2QX8P
 *
 * A path rather than a query string, because this gets typed on a television
 * remote and `?c=` costs two awkward keystrokes on a soft keyboard.
 *
 * Spends the code, puts the real token in the board cookie and sends the
 * browser to /tv, which is where the panel lives from then on. The token itself
 * is never in a URL anybody had to read out.
 *
 * A bad, expired or already-spent code 404s exactly as an unauthorised /tv
 * does — there is nothing to learn here by trying.
 */
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const token = process.env.SCREEN_TOKEN;
  if (!token || !(await redeemPairing(params.code).catch(() => false))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const res = NextResponse.redirect(new URL("/tv", req.url), { status: 303 });
  res.cookies.set(BOARD_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: BOARD_COOKIE_MAX_AGE,
  });
  return res;
}

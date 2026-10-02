import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { reeceAuthorizeUrl, reeceOAuthConfigured } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Starts the maX OAuth flow. Opened in a browser by whoever holds the maX login:
//
//   https://www.advancedgas.com.au/api/reece/connect?k=<SCREEN_TOKEN>
//
// Guarded by the screen token because a bearer header cannot be sent from a
// browser address bar. The state value is held in a short-lived cookie and
// checked by the callback, so a stray callback cannot attach someone else's
// maX account to this deployment.

export async function GET(req: Request) {
  const k = new URL(req.url).searchParams.get("k");
  if (!screenTokenValid(k)) return new NextResponse("Unauthorized", { status: 401 });
  if (!reeceOAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Reece OAuth is not configured",
        fix: "Set REECE_CLIENT_ID, REECE_CLIENT_SECRET, REECE_AUTHORIZE_URL, REECE_TOKEN_URL and REECE_API_BASE from Reece's partner credentials, then redeploy.",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(reeceAuthorizeUrl(state));
  res.cookies.set("reece_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/reece",
  });
  return res;
}

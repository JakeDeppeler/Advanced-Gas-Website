import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { reeceConfig, reeceConfigured, reeceOnboardingStart } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Starts Reece's customer-onboarding flow, which ends with a Customer-Token for
// the account. Only needed if Reece set us up as a platform rather than with a
// customer number: with REECE_CUSTOMER_NUMBER set, every call already carries
// the identity and this flow is unnecessary.
//
//   https://www.advancedgas.com.au/api/reece/connect?k=<SCREEN_TOKEN>
//
// Guarded by the screen token because a bearer header cannot be sent from a
// browser address bar. The request token is held in a short-lived cookie and
// exchanged by the callback, so a stray callback cannot attach someone else's
// Reece account to this deployment.

export async function GET(req: Request) {
  const k = new URL(req.url).searchParams.get("k");
  if (!screenTokenValid(k)) return new NextResponse("Unauthorized", { status: 401 });
  if (!reeceConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Reece API is not configured", fix: "Set REECE_CLIENT_ID and REECE_CLIENT_SECRET, then redeploy." },
      { status: 503 },
    );
  }

  const callback = `${reeceConfig().siteUrl}/api/reece/callback`;
  let start;
  try {
    start = await reeceOnboardingStart(callback);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }

  const res = NextResponse.redirect(start.redirect);
  res.cookies.set("reece_request_token", start.requestToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 900,
    path: "/api/reece",
  });
  return res;
}

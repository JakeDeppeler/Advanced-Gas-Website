import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { reeceConfig, reeceConfigured, reeceOnboardingStart } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Starts Reece's customer-onboarding flow, which ends with a Customer-Token for
// the account. Only needed if Reece set us up as a platform rather than with a
// customer number: with REECE_CUSTOMER_NUMBER set, every call already carries
// the identity and this flow is unnecessary.
//
// Started from Settings › Integrations (Connect Reece) by someone signed in to
// the portal with the overhead capability, the same people who can connect
// Xero, or from a bare browser with the screen token:
//
//   https://www.advancedgas.com.au/api/reece/connect?k=<SCREEN_TOKEN>
//
// The token route stays because a bearer header cannot be sent from a browser
// address bar. The request token is held in a short-lived cookie and
// exchanged by the callback, so a stray callback cannot attach someone else's
// Reece account to this deployment.

export async function GET(req: Request) {
  const k = new URL(req.url).searchParams.get("k");
  const byToken = screenTokenValid(k);
  if (!byToken) {
    const me = await getPortalUser();
    if (!me || !can(me, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url));
    if (!reeceConfigured()) return NextResponse.redirect(new URL("/portal/integrations?reece=notconfigured", req.url));
  }
  if (!reeceConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Reece API is not configured", fix: "Set REECE_CLIENT_ID and REECE_CLIENT_SECRET, then redeploy." },
      { status: 503 },
    );
  }

  // Reece sends the browser back here, so it must be absolute; without
  // NEXT_PUBLIC_SITE_URL the address this was opened on is the right host.
  const callback = `${reeceConfig().siteUrl || new URL(req.url).origin}/api/reece/callback`;
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

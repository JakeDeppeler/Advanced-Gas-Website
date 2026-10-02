import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { reeceConfig, reeceConfigured, reecePunchoutUrl } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends the user to Reece's site to build a cart:
//
//   https://www.advancedgas.com.au/api/reece/punchout/start?k=<SCREEN_TOKEN>
//
// When they finish, Reece form-posts a cart token to the hook URL below, which
// is /api/reece/punchout carrying REECE_PUNCHOUT_SECRET so stray posts are
// rejected. The secret travels in the hook URL because Reece's PunchOut does
// not sign the post; the cart itself can only be read with our API credentials.

export async function GET(req: Request) {
  if (!screenTokenValid(new URL(req.url).searchParams.get("k"))) return new NextResponse("Unauthorized", { status: 401 });
  const c = reeceConfig();
  if (!reeceConfigured() || !c.punchoutSecret) {
    return NextResponse.json(
      { ok: false, error: "PunchOut is not configured", fix: "Set REECE_CLIENT_ID, REECE_CLIENT_SECRET and REECE_PUNCHOUT_SECRET (and REECE_DOMAIN_KEY if it differs from the client id)." },
      { status: 503 },
    );
  }
  const hook = `${c.siteUrl}/api/reece/punchout?s=${encodeURIComponent(c.punchoutSecret)}`;
  try {
    return NextResponse.redirect(await reecePunchoutUrl(hook));
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

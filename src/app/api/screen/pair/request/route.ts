import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/portal/db";
import { can } from "@/lib/portal/caps";
import { sendPairingCode } from "@/lib/portal/email";
import { pairingToSend, prettyCode } from "@/lib/board/pairing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Email me a code", from the box on /tv.
 *
 * Answers identically whatever happens — the screen just says a code is on its
 * way. A code is only actually sent to somebody who is on the team *and* can
 * see the board's figures, which is the same capability that gates the portal's
 * own board page. Saying so out loud would turn this into a way to find out who
 * works here, from a form anybody can reach.
 *
 * The send is throttled to one a minute on the stored row. The code it sends is
 * whichever one is currently live, so pressing the button twice posts the same
 * code rather than invalidating the one already being typed.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();

  if (email) {
    try {
      const user = await resolveUser(email);
      if (user && can(user, "overhead")) {
        const pairing = await pairingToSend();
        if (pairing) await sendPairingCode(email, prettyCode(pairing.code));
      }
    } catch {
      // A screen that can't be paired right now still says "check your email".
      // The alternative tells a stranger which addresses got that far.
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/tv";
  url.search = "?sent=1";
  return NextResponse.redirect(url, { status: 303 });
}

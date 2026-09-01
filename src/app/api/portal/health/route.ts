import { NextResponse, type NextRequest } from "next/server";
import { isTeam, team } from "@/lib/portal/team";
import { createMagicToken } from "@/lib/portal/session";
import { sendMagicLink } from "@/lib/portal/email";

export const runtime = "nodejs";

/**
 * Temporary diagnostic for wiring up the portal. Reports what THIS deploy
 * has configured (booleans only, never a secret value). Add `&send=1` to
 * actually attempt a magic-link send for the given email and return Resend's
 * exact response — the definitive way to see why nothing arrives. Disabled
 * on production; delete once the portal is confirmed working.
 */
export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() || null;
  const doSend = req.nextUrl.searchParams.get("send") === "1";

  const hasSecret = !!process.env.PORTAL_AUTH_SECRET;
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const onTeam = email ? isTeam(email) : null;

  let sendResult: { ok: boolean; error?: string } | null = null;
  if (doSend && email && onTeam && hasSecret) {
    const token = await createMagicToken(email);
    if (token) {
      // point the link at THIS deploy so it actually works from here
      const link = `${req.nextUrl.origin}/api/portal/verify?token=${encodeURIComponent(token)}`;
      sendResult = await sendMagicLink(email, link);
    }
  }

  return NextResponse.json({
    ok: true,
    hasSecret,
    hasResendKey,
    fromAddress: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev (Resend sandbox — owner-only delivery)",
    fromConfigured: !!process.env.RESEND_FROM_EMAIL,
    teamCount: team().length,
    emailQueried: email,
    emailOnTeam: onTeam,
    // the real gate — needs the key too
    wouldSend: !!(email && onTeam && hasSecret && hasResendKey),
    sendAttempted: doSend,
    sendResult, // { ok:true } = Resend accepted it; { ok:false, error } = the exact failure
    deployCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "unknown",
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { isTeam, team } from "@/lib/portal/team";

export const runtime = "nodejs";

/**
 * Temporary diagnostic for wiring up the portal. Reports what THIS deploy
 * actually has configured — booleans only, never a secret value — so we can
 * tell a stale deploy or a missing key from an allow-list miss without
 * guessing. Disabled on production (VERCEL_ENV === "production") so it can't
 * be probed on the live site; safe to delete once the portal is sending.
 */
export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() || null;
  return NextResponse.json({
    ok: true,
    hasSecret: !!process.env.PORTAL_AUTH_SECRET,
    hasResendKey: !!process.env.RESEND_API_KEY,
    fromAddress: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev (Resend sandbox — owner-only delivery)",
    notifyEmailSet: !!process.env.LEAD_NOTIFICATION_EMAIL,
    teamCount: team().length,
    emailQueried: email,
    emailOnTeam: email ? isTeam(email) : null,
    wouldSend: !!(email && isTeam(email) && process.env.PORTAL_AUTH_SECRET),
    deployCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "unknown",
  });
}

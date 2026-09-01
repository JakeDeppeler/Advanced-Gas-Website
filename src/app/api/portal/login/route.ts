import { NextResponse, type NextRequest } from "next/server";
import { isTeam } from "@/lib/portal/team";
import { createMagicToken } from "@/lib/portal/session";
import { sendMagicLink } from "@/lib/portal/email";
import { site } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Request a magic link. Responds the same way no matter what — the login
 * page just says "check your email" — but a link is only actually sent when
 * the address is on the team allow-list and auth is configured. That avoids
 * turning this into a way to probe who's on the team.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  const next = String(form?.get("next") ?? "");

  if (email && isTeam(email) && process.env.PORTAL_AUTH_SECRET) {
    const token = await createMagicToken(email);
    if (token) {
      // Build the link against the deployment it was requested from. On
      // production that's the canonical site URL; on a preview build use
      // the deployment's own Vercel URL so the link lands back on the same
      // deploy and the portal is testable before it's merged live.
      // VERCEL_URL is set by Vercel (not user input), so it's safe to trust.
      const canonical = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
      const base =
        process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : canonical;
      const link =
        `${base}/api/portal/verify?token=${encodeURIComponent(token)}` +
        (next ? `&next=${encodeURIComponent(next)}` : "");
      await sendMagicLink(email, link);
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/portal/login";
  url.search = "?sent=1";
  return NextResponse.redirect(url, { status: 303 });
}

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
      const base = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
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

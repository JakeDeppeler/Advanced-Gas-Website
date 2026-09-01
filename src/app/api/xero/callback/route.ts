import { NextResponse, type NextRequest } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { exchangeCode, getConnections } from "@/lib/portal/xero";
import { saveIntegration } from "@/lib/portal/db";

export const runtime = "nodejs";

/** Xero redirects back here with a code; exchange it, pick the org, store tokens. */
export async function GET(req: NextRequest) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return NextResponse.redirect(new URL("/portal?denied=1", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get("xero_oauth_state")?.value;
  if (!code || !state || !saved || state !== saved) {
    return NextResponse.redirect(new URL("/portal/finance?error=state", req.url));
  }

  const tok = await exchangeCode(code);
  if (!tok) return NextResponse.redirect(new URL("/portal/finance?error=exchange", req.url));

  const conns = await getConnections(tok.access_token);
  const tenant = conns[0];
  if (!tenant) return NextResponse.redirect(new URL("/portal/finance?error=notenant", req.url));

  await saveIntegration("xero", {
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    expiresAt: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    connectedBy: me.email,
  });

  const res = NextResponse.redirect(new URL("/portal/finance?connected=1", req.url));
  res.cookies.delete("xero_oauth_state");
  return res;
}

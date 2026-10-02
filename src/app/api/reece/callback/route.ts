import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reeceExchangeCode } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OAuth redirect target registered with Reece (REECE_REDIRECT_URI). Exchanges
// the code for tokens and stores them in portal_integrations under 'reece'.

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const denied = url.searchParams.get("error");

  if (denied) {
    return new NextResponse(`Reece maX did not authorise the connection: ${denied}`, { status: 400 });
  }

  const cookie = req.headers.get("cookie") ?? "";
  const expected = /(?:^|;\s*)reece_oauth_state=([^;]+)/.exec(cookie)?.[1] ?? "";
  if (!code || !expected || !same(state, expected)) {
    return new NextResponse("Invalid OAuth state — start again from /api/reece/connect", { status: 400 });
  }

  try {
    await reeceExchangeCode(code);
  } catch (e) {
    return new NextResponse(`Token exchange failed: ${(e as Error).message}`, { status: 502 });
  }

  const res = new NextResponse(
    "Reece maX connected. The nightly catalogue pull will now run; trigger it early from the Actions tab (Pricebook sync) if you want it sooner.",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
  res.cookies.set("reece_oauth_state", "", { maxAge: 0, path: "/api/reece" });
  return res;
}

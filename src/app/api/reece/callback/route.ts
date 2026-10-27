import { NextResponse } from "next/server";
import { reeceOnboardingFinish } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where Reece sends the user back after they pick their account. The request
// token from the cookie is exchanged for the Customer-Token, which is stored in
// portal_integrations under 'reece' and used on every call from then on.

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const requestToken = /(?:^|;\s*)reece_request_token=([^;]+)/.exec(cookie)?.[1];
  if (!requestToken) {
    return new NextResponse("No onboarding in progress — start again from /api/reece/connect", { status: 400 });
  }

  let result;
  try {
    result = await reeceOnboardingFinish(decodeURIComponent(requestToken));
  } catch (e) {
    return new NextResponse(`Could not complete Reece onboarding: ${(e as Error).message}`, { status: 502 });
  }

  // Back to Integrations, where the Reece row now reads Connected with the
  // account number. Whoever got this far started it from there or holds the
  // screen token; either way the page is where the next step is.
  const back = new URL("/portal/integrations", req.url);
  back.searchParams.set("reece", "connected");
  back.searchParams.set("account", String(result.customerNumber));
  const res = NextResponse.redirect(back);
  res.cookies.set("reece_request_token", "", { maxAge: 0, path: "/api/reece" });
  return res;
}

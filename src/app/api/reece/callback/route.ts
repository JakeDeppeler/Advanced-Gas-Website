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

  const res = new NextResponse(
    `Reece account ${result.customerNumber}${result.displayName ? ` (${result.displayName})` : ""} connected. The nightly price-file pull will now run; trigger it early from the Actions tab (Pricebook sync) if you want it sooner.`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
  res.cookies.set("reece_request_token", "", { maxAge: 0, path: "/api/reece" });
  return res;
}

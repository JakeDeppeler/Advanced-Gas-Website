import { NextResponse } from "next/server";
import { dashboardDbConfigured, q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { currentReviewLink } from "@/lib/reviews/requests";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The button in a review email: counts that it was opened, then on to Google.
 * Always to our own Google review link, never to anything in the URL, so it
 * can't be used to bounce people elsewhere. A click in the first minute after
 * sending is a mail scanner checking the link, not the customer, and isn't counted.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const to = await currentReviewLink().catch(() => site.social.google);
  if (/^[0-9a-f-]{36}$/i.test(params.id) && dashboardDbConfigured()) {
    try {
      const row = (await sbSelect<{ id: string; sent_at: string | null; clicked_at: string | null; clicks: number }>(
        "portal_review_requests", [q.select("id,sent_at,clicked_at,clicks"), q.eq("id", params.id)].join("&"),
      ))[0];
      if (row && row.sent_at && Date.now() - Date.parse(row.sent_at) > 60_000) {
        await sbUpdate("portal_review_requests", `id=eq.${row.id}`, { clicks: (row.clicks ?? 0) + 1, clicked_at: row.clicked_at ?? new Date().toISOString() });
      }
    } catch {
      // Counting is a nicety; the customer still gets to Google.
    }
  }
  return NextResponse.redirect(to, 302);
}

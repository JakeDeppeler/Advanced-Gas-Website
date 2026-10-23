import { NextResponse } from "next/server";
import { getChatSettings } from "@/lib/chat/store";
import { dashboardDbConfigured } from "@/lib/dashboard/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether the website shows the chat button.
 *
 * Asked by the widget after the page loads, rather than read in the layout:
 * a database read in the root layout would make every public page dynamic,
 * and the site's pages are static for speed. Cached at the edge for a minute,
 * so turning the chat on or off in the portal takes about that long to show
 * and costs one database read a minute however busy the site is.
 */
export async function GET() {
  const enabled = dashboardDbConfigured() ? (await getChatSettings()).widget : false;
  return NextResponse.json(
    { enabled },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
  );
}

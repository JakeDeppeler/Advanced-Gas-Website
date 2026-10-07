import { notFound } from "next/navigation";
import { ScreenBoard } from "@/components/ScreenBoard";
import { latestSnapshot } from "@/lib/dashboard/metrics";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { readRemote } from "@/lib/board/remote";

/**
 * The board itself, shared by /screen and /tv.
 *
 * Two routes, one board: /screen is the original and still takes the token in
 * the query, and /tv is the short one the panel in the office actually lives
 * on, authorised by the cookie the middleware sets. Keeping the render in one
 * place is the point — the alternative is two pages that drift.
 *
 * `token` is already resolved and checked by the caller. It is handed to the
 * client component because the board polls /api/screen with it, exactly as it
 * did before any of this; the cookie shortens the URL, it does not change how
 * the page talks to its own API.
 */
export type BoardParams = { theme?: string; safe?: string; alert?: string };

export async function Board({ token, params }: { token: string | null; params: BoardParams }) {
  // 404 rather than 401 — an unauthenticated visitor shouldn't learn the route
  // exists at all.
  if (!token) notFound();

  if (!dashboardDbConfigured()) {
    return <Message text="Supabase is not configured for this deployment." />;
  }

  const [snapshot, remote] = await Promise.all([latestSnapshot(), readRemote().catch(() => null)]);
  if (!snapshot) {
    return <Message text="No snapshot yet. Run the sync job once to populate the board." />;
  }

  return (
    <ScreenBoard
      initial={snapshot}
      token={token}
      remote={remote}
      theme={params.theme === "dark" ? "dark" : "light"}
      // Clamped, because this comes off a URL anybody with the token can edit
      // and a board inset by 40% is a support call, not a setting.
      safe={Math.min(10, Math.max(0, Number(params.safe) || 0))}
      // `?alert=quote|done|sold` puts one alert on the board on a loop, so the
      // thing can be judged on the wall it is for rather than in a screenshot.
      // Sample figures, and it says so on screen — nobody should be able to
      // mistake a preview for a sale that happened.
      preview={
        params.alert === "quote" || params.alert === "done" || params.alert === "sold" ? params.alert : undefined
      }
    />
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="screen">
      <div className="screen__empty">{text}</div>
    </div>
  );
}

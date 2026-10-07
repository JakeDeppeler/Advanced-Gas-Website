import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { BOARD_COOKIE } from "@/lib/dashboard/boardCookie";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { Board, type BoardParams } from "../screen/board";
import { PairScreen } from "./pair";
import "../screen/screen.css";
import "./pair.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live board",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Both schemes, declared at the document.
 *
 * The board switches itself between light and dark and paints every surface it
 * uses. Saying so here stops a browser applying an automatic dark theme of its
 * own on top — which is what turned the board's light mode dark grey on the
 * television while it stayed white on a laptop. The stylesheet narrows this to
 * the exact theme in play; this is the document-level statement that the page
 * is not light-only and needs no help.
 */
export const viewport: Viewport = { colorScheme: "light dark" };

/**
 * The short route: advancedgas.com.au/tv.
 *
 * The panel is handed the token once — open /tv?k=<token> on it — and the
 * middleware moves that token into an httpOnly cookie and redirects here
 * without it. From then on the board is a URL somebody can read out over the
 * phone, and the secret is not sitting in the address bar of a screen the whole
 * office walks past.
 *
 * The cookie is checked here rather than trusted: the middleware sets it, but a
 * cookie is just a string a browser sends, and the token it has to match is the
 * same `SCREEN_TOKEN` /screen checks. `?k=` still works for the first visit, in
 * case a browser is refusing cookies — then the token stays in the URL, which
 * is exactly where it is today.
 */
export default async function TvPage({
  searchParams,
}: {
  searchParams: BoardParams & { k?: string; sent?: string; bad?: string };
}) {
  const fromCookie = cookies().get(BOARD_COOKIE)?.value;
  const supplied = screenTokenValid(fromCookie) ? fromCookie : searchParams.k;
  // Unpaired, so ask — rather than the 404 this used to answer with. A screen
  // that cannot be set up without somebody bringing a laptop to it is a screen
  // that stays blank, and the form gives away nothing the sign-in page doesn't.
  if (!screenTokenValid(supplied)) {
    return <PairScreen sent={searchParams.sent === "1"} bad={searchParams.bad === "1"} />;
  }
  return <Board token={supplied as string} params={searchParams} />;
}

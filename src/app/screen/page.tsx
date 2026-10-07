import type { Metadata } from "next";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { Board, type BoardParams } from "./board";
import "./screen.css";

// Server-rendered so the panel paints real numbers on first load rather than a
// spinner; the client component takes over polling from there.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live board",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The original board route, token in the query.
 *
 * Still here and still working: it is bookmarked, and the short route at /tv is
 * an addition rather than a replacement. /tv is the one to put on the panel.
 */
export default async function ScreenPage({ searchParams }: { searchParams: BoardParams & { k?: string } }) {
  const ok = screenTokenValid(searchParams.k);
  return <Board token={ok ? (searchParams.k as string) : null} params={searchParams} />;
}

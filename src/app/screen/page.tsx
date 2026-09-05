import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScreenBoard } from "@/components/ScreenBoard";
import { latestSnapshot } from "@/lib/metrics";
import { screenTokenValid } from "@/lib/screenAuth";
import { supabaseConfigured } from "@/lib/supabase";
import "./screen.css";

// Server-rendered so the panel paints real numbers on first load rather than a
// spinner; the client component takes over polling from there.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live board",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ScreenPage({
  searchParams,
}: {
  searchParams: { k?: string };
}) {
  // 404 rather than 401 — an unauthenticated visitor shouldn't learn the route
  // exists at all.
  if (!screenTokenValid(searchParams.k)) notFound();

  if (!supabaseConfigured()) {
    return <Message text="Supabase is not configured for this deployment." />;
  }

  const snapshot = await latestSnapshot();
  if (!snapshot) {
    return <Message text="No snapshot yet. Run the sync job once to populate the board." />;
  }

  return <ScreenBoard initial={snapshot} token={searchParams.k as string} />;
}

function Message({ text }: { text: string }) {
  return (
    <div className="screen">
      <div className="screen__empty">{text}</div>
    </div>
  );
}

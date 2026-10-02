import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScreenBoard } from "@/components/ScreenBoard";
import { latestSnapshot } from "@/lib/dashboard/metrics";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import "./screen.css";

// Server-rendered so the panel paints real numbers on first load rather than a
// spinner; the client component takes over polling from there.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live board",
  robots: { index: false, follow: false, nocache: true },
};

// Light is the default: it is the design the board was drawn to, and the panel
// in the office is a bright room. `?theme=dark` is still there for a dim one.
export default async function ScreenPage({
  searchParams,
}: {
  searchParams: { k?: string; theme?: string };
}) {
  // 404 rather than 401 — an unauthenticated visitor shouldn't learn the route
  // exists at all.
  if (!screenTokenValid(searchParams.k)) notFound();

  if (!dashboardDbConfigured()) {
    return <Message text="Supabase is not configured for this deployment." />;
  }

  const snapshot = await latestSnapshot();
  if (!snapshot) {
    return <Message text="No snapshot yet. Run the sync job once to populate the board." />;
  }

  return (
    <ScreenBoard
      initial={snapshot}
      token={searchParams.k as string}
      theme={searchParams.theme === "dark" ? "dark" : "light"}
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

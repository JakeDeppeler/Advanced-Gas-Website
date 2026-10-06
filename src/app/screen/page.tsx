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
  searchParams: { k?: string; theme?: string; safe?: string; alert?: string };
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
      // Clamped, because this comes off a URL anybody with the token can edit
      // and a board inset by 40% is a support call, not a setting.
      safe={Math.min(10, Math.max(0, Number(searchParams.safe) || 0))}
      // `?alert=quote|done|sold` puts one alert on the board on a loop, so the
      // thing can be judged on the wall it is for rather than in a screenshot.
      // Sample figures, and it says so on screen — nobody should be able to
      // mistake a preview for a sale that happened.
      preview={
        searchParams.alert === "quote" || searchParams.alert === "done" || searchParams.alert === "sold"
          ? searchParams.alert
          : undefined
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

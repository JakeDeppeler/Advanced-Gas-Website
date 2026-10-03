import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, TradeIcon } from "@/components/portal/TradeShell";
import { WatchedToggle } from "@/components/portal/WatchedToggle";
import { dbConfigured, listVideos, watchedVideos } from "@/lib/portal/db";
import { mergeVideos, upNext } from "@/lib/portal/videos";
import { LEARNING_TRACKS } from "@/lib/portal/content";
import { allSops } from "@/lib/portal/sops";

export const dynamic = "force-dynamic";
export const metadata = { title: "Video — Trade portal" };

/** One video, and what to watch next. */
export default async function TradeVideo({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const [stored, watched] = dbConfigured()
    ? await Promise.all([listVideos().catch(() => []), watchedVideos(user.email).catch(() => new Set<string>())])
    : [[], new Set<string>()];
  const all = mergeVideos(stored, watched);
  const video = all.find((v) => v.id === decodeURIComponent(params.id));
  if (!video) notFound();
  const track = LEARNING_TRACKS.find((t) => t.slug === video.track);
  const next = upNext(all, video, 4);
  const sop = video.sopCode ? allSops().find((s) => s.sop.code === video.sopCode) : undefined;

  return (
    <TradeShell user={user} active="tools" title={video.title} sub={[video.category, video.minutes ? `${video.minutes} min` : null].filter(Boolean).join(" · ")}>
      <div className="tr-split" style={{ ["--tr-side" as string]: "340px" }}>
        <div className="tr-stack">
          <div className="tr-player">
            {video.youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                title={video.title}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#fff" }}>
                <span className="tr-vid__play" style={{ width: 84, height: 84, opacity: 0.5 }}><TradeIcon path="M8 5v14l11-7z" size={34} /></span>
                <span style={{ fontWeight: 700 }}>Filmed, not loaded in yet</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/trade/videos${track ? `?track=${track.slug}` : ""}`} className="tr-btn">← All videos</Link>
            {sop && <Link href={`/trade/processes?sop=${sop.sop.code}`} className="tr-btn">The written procedure · {sop.sop.code}</Link>}
            {video.youtubeId && <WatchedToggle id={video.id} watched={video.watched} />}
          </div>
          {video.description && <p className="tr-muted" style={{ fontSize: 17 }}>{video.description}</p>}
        </div>

        <aside className="tr-card">
          <h2 style={{ paddingBottom: 6 }}>Up next</h2>
          {next.length ? (
            <div className="tr-rows">
              {next.map((v) => (
                <Link key={v.id} href={`/trade/videos/${encodeURIComponent(v.id)}`} className="tr-row">
                  <span className="tr-row__k">
                    <strong style={{ fontSize: 16 }}>{v.title}</strong>
                    <span>{v.minutes ? `${v.minutes} min` : "Not loaded in yet"}{v.watched ? " · watched" : ""}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : <p className="tr-empty">Nothing else on this shelf yet.</p>}
        </aside>
      </div>
    </TradeShell>
  );
}

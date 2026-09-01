import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { LEARNING_TRACKS, VIDEOS } from "@/lib/portal/content";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { track: string } }) {
  const t = LEARNING_TRACKS.find((x) => x.slug === params.track);
  return { title: t ? `${t.label} — Learning — Team portal` : "Learning — Team portal" };
}

export default async function LearningTrackPage({ params }: { params: { track: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const track = LEARNING_TRACKS.find((t) => t.slug === params.track);
  if (!track) notFound();

  const vids = VIDEOS.filter((v) => v.track === track.slug);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Learning · {track.label}</div>
        <h1>{track.label}.</h1>
        <p>{track.blurb}</p>
      </div>

      {vids.length === 0 ? (
        <div className="pt-note">
          <strong>Nothing here yet.</strong> Add videos to this track in <code>src/lib/portal/content.ts</code>{" "}
          (set <code>track: &quot;{track.slug}&quot;</code>) and they&rsquo;ll show here.
        </div>
      ) : (
        <div className="pt-grid">
          {vids.map((v) => (
            <div key={v.title} className="pt-vid">
              <div className="pt-vid__frame">
                {v.youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
                    title={v.title}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <span className="pt-vid__play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                )}
              </div>
              <div className="pt-vid__body">
                <div className="pt-card__tag">{v.category}{v.minutes ? ` · ${v.minutes} min` : ""}</div>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

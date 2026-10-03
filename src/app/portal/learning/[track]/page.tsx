import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import Link from "next/link";
import { LEARNING_TRACKS } from "@/lib/portal/content";
import { can } from "@/lib/portal/caps";
import { dbConfigured, listVideos, watchedVideos } from "@/lib/portal/db";
import { mergeVideos, onTrack } from "@/lib/portal/videos";
import { AddVideo } from "@/components/portal/AddVideo";
import { PortalTabs } from "@/components/portal/PortalTabs";

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

  const [stored, watched] = dbConfigured()
    ? await Promise.all([listVideos().catch(() => []), watchedVideos(user.email).catch(() => new Set<string>())])
    : [[], new Set<string>()];
  const vids = onTrack(mergeVideos(stored, watched), track.slug);
  const done = vids.filter((v) => v.watched).length;

  return (
    <PortalShell user={user}>
      <PortalTabs tabs={LEARNING_TRACKS.map((x) => ({ href: `/portal/learning/${x.slug}`, label: x.label }))} />
      <div className="pt-head">
        <div className="pt-head__eyebrow">Learning · {track.label}</div>
        <h1>{track.label}.</h1>
        <p>{track.blurb}</p>
        {vids.length > 0 && (
          <p className="pt-head__figsub">
            {done} of {vids.length} watched{vids.some((v) => !v.youtubeId) ? " · some aren't loaded in yet" : ""}
          </p>
        )}
      </div>

      {vids.length === 0 ? (
        <div className="pt-note">
          <strong>Nothing on this track yet.</strong> Add the first one below and it shows here.
        </div>
      ) : (
        <div className="pt-grid">
          {vids.map((v) => (
            <Link
              key={v.id}
              href={`/portal/learning/${track.slug}/${encodeURIComponent(v.id)}`}
              className={`pt-vid pt-vid--card${v.youtubeId ? "" : " is-empty"}`}
            >
              <div className="pt-vid__frame">
                <span className="pt-vid__play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
                {v.watched && <span className="pt-vid__done" aria-label="Watched">✓</span>}
              </div>
              <div className="pt-vid__body">
                <div className="pt-card__tag">{v.category}{v.minutes ? ` · ${v.minutes} min` : ""}</div>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
                {/* A card that cannot play says so on its face rather than
                    making somebody click to find out. */}
                {!v.youtubeId && <span className="pt-vid__flag">Not loaded in yet</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      {can(user, "manage_users") && <AddVideo track={track.slug} />}
    </PortalShell>
  );
}

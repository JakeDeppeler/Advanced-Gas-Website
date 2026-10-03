import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import Link from "next/link";
import { LEARNING_TRACKS } from "@/lib/portal/content";
import { can } from "@/lib/portal/caps";
import { dbConfigured, listVideos, watchedVideos } from "@/lib/portal/db";
import { mergeVideos, onTrack } from "@/lib/portal/videos";
import { AddVideo } from "@/components/portal/AddVideo";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { track: string } }) {
  const t = LEARNING_TRACKS.find((x) => x.slug === params.track);
  return { title: t ? `${t.label} — Learning — Team portal` : "Learning — Team portal" };
}

/** Learning, one shelf at a time, to Learning.dc.html. */
export default async function LearningTrackPage({ params }: { params: { track: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const track = LEARNING_TRACKS.find((t) => t.slug === params.track);
  if (!track) notFound();

  const [stored, watched] = dbConfigured()
    ? await Promise.all([listVideos().catch(() => []), watchedVideos(user.email).catch(() => new Set<string>())])
    : [[], new Set<string>()];
  const vids = onTrack(mergeVideos(stored, watched), track.slug);
  const canAdd = can(user, "manage_users");
  // There is nowhere in the portal to file a suggestion, so it goes to the
  // office inbox with the shelf already named.
  const suggest = `mailto:${site.email}?subject=${encodeURIComponent(`Video suggestion — ${track.label}`)}`;

  return (
    <PortalShell user={user}>
      <div className="pt-lrn">
        <div className="pt-lrn__head">
          <PortalBack href="/portal" label="Home" />
          <h1>Learning</h1>
          <p>{track.blurb}</p>
        </div>

        <PortalTabs tabs={LEARNING_TRACKS.map((x) => ({ href: `/portal/learning/${x.slug}`, label: x.label }))} />

        {vids.length === 0 ? (
          <section className="pt-lrn__empty">
            <span className="pt-lrn__emptyicon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4zM10 9l5 3-5 3z" /></svg>
            </span>
            <strong>No videos here yet</strong>
            <span>Videos for this shelf get added as we film them. If there&rsquo;s a job you want shown, suggest it and we&rsquo;ll put it on the list.</span>
            <a href={suggest} className="pt-btn pt-btn--ghost pt-lrn__suggest">Suggest a video</a>
          </section>
        ) : (
          <section className="pt-lrn__grid">
            {vids.map((v) => (
              <Link key={v.id} href={`/portal/learning/${track.slug}/${encodeURIComponent(v.id)}`} className="pt-lrn__card">
                <span className={`pt-lrn__thumb${v.youtubeId ? "" : " is-empty"}`}>
                  <span className="pt-lrn__play" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  {v.watched && <span className="pt-lrn__chip pt-lrn__chip--done">✓ Watched</span>}
                  {/* A card that cannot play says so on its face rather than
                      making somebody click to find out. */}
                  {(v.minutes || !v.youtubeId) && (
                    <span className="pt-lrn__chip">{v.youtubeId ? `${v.minutes} min` : "Not loaded in yet"}</span>
                  )}
                </span>
                <span className="pt-lrn__body">
                  {v.category && <span className="pt-lrn__tag">{v.category}</span>}
                  <strong>{v.title}</strong>
                  {v.description && <span>{v.description}</span>}
                </span>
              </Link>
            ))}
          </section>
        )}
        {canAdd && <AddVideo track={track.slug} />}
      </div>
    </PortalShell>
  );
}

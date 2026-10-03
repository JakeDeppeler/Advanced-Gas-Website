import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { VideoPlayer } from "@/components/portal/VideoPlayer";
import { dbConfigured, listVideos, watchedVideos } from "@/lib/portal/db";
import { mergeVideos, onTrack, upNext } from "@/lib/portal/videos";
import { LEARNING_TRACKS } from "@/lib/portal/content";
import { allSops } from "@/lib/portal/sops";

export const dynamic = "force-dynamic";
export const metadata = { title: "Video — Learning — Team portal" };

/** The id is url-encoded in the path, so a stored uuid and a fallback both work. */
export default async function VideoPage({ params }: { params: { track: string; video: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const track = LEARNING_TRACKS.find((t) => t.slug === params.track);
  if (!track) notFound();

  const [stored, watched] = dbConfigured()
    ? await Promise.all([listVideos().catch(() => []), watchedVideos(user.email).catch(() => new Set<string>())])
    : [[], new Set<string>()];
  const all = mergeVideos(stored, watched);

  const id = decodeURIComponent(params.video);
  const video = all.find((v) => v.id === id);
  if (!video) notFound();

  const next = upNext(all, video);
  // A video that names a procedure links straight to it.
  const sop = video.sopCode ? allSops().find((s) => s.sop.code === video.sopCode) : undefined;

  return (
    <PortalShell user={user}>
      <div className="pt-vp">
        <div className="pt-vp__main">
          <PortalBack href={`/portal/learning/${track.slug}`} label="Learning" />
          <VideoPlayer video={video} sopHref={sop ? `/portal/sops/${sop.section.slug}/${sop.sop.slug}` : null} />
        </div>

        <aside className="pt-vp__next">
          <h2>Up next</h2>
          {next.length === 0 ? (
            <p>Nothing else on this shelf yet.</p>
          ) : (
            next.map((v) => (
              <Link key={v.id} href={`/portal/learning/${track.slug}/${encodeURIComponent(v.id)}`}>
                <strong>{v.title}</strong>
                <span>
                  {v.minutes ? `${v.minutes} min` : "Not loaded in yet"}
                  {v.watched ? " · watched" : ""}
                </span>
              </Link>
            ))
          )}
        </aside>
      </div>
    </PortalShell>
  );
}

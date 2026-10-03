import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, TradeIcon } from "@/components/portal/TradeShell";
import { LEARNING_TRACKS } from "@/lib/portal/content";
import { dbConfigured, listVideos, watchedVideos } from "@/lib/portal/db";
import { mergeVideos, onTrack } from "@/lib/portal/videos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Videos — Trade portal" };

export default async function TradeVideos({ searchParams }: { searchParams: { track?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const track = LEARNING_TRACKS.find((t) => t.slug === searchParams.track) ?? LEARNING_TRACKS[0];
  // The same store the office portal writes, so a video added on a laptop is
  // on the van iPad without a deploy.
  const [stored, watched] = dbConfigured()
    ? await Promise.all([listVideos().catch(() => []), watchedVideos(user.email).catch(() => new Set<string>())])
    : [[], new Set<string>()];
  const shown = onTrack(mergeVideos(stored, watched), track.slug);

  return (
    <TradeShell user={user} active="/trade/videos" title="Videos" sub="Method videos from the crew">
      <div className="tr-stack">
        <nav className="tr-pills" aria-label="Tracks">
          {LEARNING_TRACKS.map((t) => (
            <Link key={t.slug} href={`/trade/videos?track=${t.slug}`} aria-current={t.slug === track.slug ? "page" : undefined} className={`tr-pill${t.slug === track.slug ? " is-on" : ""}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <span className="tr-sub">{track.blurb}</span>

        {shown.length ? (
          <div className="tr-vids">
            {shown.map((v) => {
              // A card only links somewhere when there is something behind it.
              // Every one of these is filmed but none is loaded in yet, so the
              // card says so rather than opening an empty player.
              return (
                <Link
                  key={v.id}
                  href={`/portal/learning/${track.slug}/${encodeURIComponent(v.id)}`}
                  className="tr-vid"
                >
                  <span className="tr-vid__shot">
                    <TradeIcon path="M8 5v14l11-7z" size={26} />
                    {v.minutes && <span className="tr-vid__len">{v.minutes} min</span>}
                  </span>
                  <span className="tr-vid__txt">
                    <span className="tr-vid__cat">{v.category}</span>
                    <strong>{v.title}</strong>
                    <span className="tr-sub">{v.description}</span>
                    {!v.youtubeId
                      ? <span className="tr-foot">Not loaded in yet.</span>
                      : v.watched && <span className="tr-foot">✓ Watched</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="tr-empty" style={{ margin: 0 }}>Videos for this track get added as we film them.</p>
        )}

        <section className="tr-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span className="tr-row__k">
            <strong>Want a job filmed?</strong>
            <span>Tell Dean or Kellie and it goes on the list.</span>
          </span>
          {/* Not a button: nothing in here writes a suggestion anywhere, and a
              button that silently does nothing is worse than a sentence. */}
          <Link href="/trade/info?section=contact" className="tr-btn">Who to ask</Link>
        </section>
      </div>
    </TradeShell>
  );
}

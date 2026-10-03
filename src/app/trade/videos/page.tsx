import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, TradeIcon } from "@/components/portal/TradeShell";
import { LEARNING_TRACKS } from "@/lib/portal/content";
import { dbConfigured, listVideos, watchedVideos } from "@/lib/portal/db";
import { mergeVideos, onTrack } from "@/lib/portal/videos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Videos — Trade portal" };

/** Method videos, by track. The same store the office writes, so one added on a laptop is on the iPad without a deploy. */
export default async function TradeVideos({ searchParams }: { searchParams: { track?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const track = LEARNING_TRACKS.find((t) => t.slug === searchParams.track) ?? LEARNING_TRACKS[0];
  const [stored, watched] = dbConfigured()
    ? await Promise.all([listVideos().catch(() => []), watchedVideos(user.email).catch(() => new Set<string>())])
    : [[], new Set<string>()];
  const shown = onTrack(mergeVideos(stored, watched), track.slug);

  return (
    <TradeShell user={user} active="tools" title="Videos" sub="Method videos from the crew">
      <nav className="tr-pills" aria-label="Tracks">
        {LEARNING_TRACKS.map((t) => (
          <Link key={t.slug} href={`/trade/videos?track=${t.slug}`} aria-current={t.slug === track.slug ? "page" : undefined} className={`tr-pill${t.slug === track.slug ? " is-on" : ""}`}>{t.label}</Link>
        ))}
      </nav>
      <p className="tr-muted" style={{ fontSize: 17 }}>{track.blurb}</p>

      {shown.length ? (
        <div className="tr-grid tr-grid--3">
          {shown.map((v) => (
            <Link key={v.id} href={`/trade/videos/${encodeURIComponent(v.id)}`} className="tr-card tr-vid">
              <span className="tr-vid__art">
                <span className="tr-vid__play"><TradeIcon path="M8 5v14l11-7z" size={24} /></span>
                {v.minutes && <span className="tr-vid__len">{v.minutes} min</span>}
              </span>
              <span className="tr-vid__b">
                <em>{v.category}</em>
                <strong>{v.title}</strong>
                {v.description && <span className="tr-small">{v.description}</span>}
                {!v.youtubeId ? <span className="tr-small" style={{ fontWeight: 700 }}>Not loaded in yet</span> : v.watched && <span className="tr-small" style={{ fontWeight: 700, color: "var(--tr-green)" }}>✓ Watched</span>}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="tr-card tr-empty">Videos for this track get added as we film them.</p>
      )}

      <section className="tr-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <span className="tr-row__k">
          <strong>Want a job filmed?</strong>
          <span>Tell Dean or Kellie and it goes on the list.</span>
        </span>
        {/* A link, not a button: nothing here stores a suggestion, and a
            button that silently does nothing is worse than a sentence. */}
        <Link href="/trade/info?section=contact" className="tr-btn tr-btn--go">Who to ask</Link>
      </section>
    </TradeShell>
  );
}

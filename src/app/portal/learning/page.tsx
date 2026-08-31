import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { VIDEOS } from "@/lib/portal/content";

export const metadata = { title: "Learning videos — Team portal" };

export default async function LearningPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Learning</div>
        <h1>Method &amp; how-to videos.</h1>
        <p>Short videos on how we do the job — for new starters and for brushing up.</p>
      </div>

      <div className="pt-note">
        <strong>Setup note.</strong> Add a YouTube video id to each entry in <code>src/lib/portal/content.ts</code> and it embeds here. Unlisted YouTube uploads work well for internal videos.
      </div>

      <div className="pt-grid">
        {VIDEOS.map((v) => (
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
    </PortalShell>
  );
}

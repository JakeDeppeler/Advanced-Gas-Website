"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWatched } from "@/app/portal/learning/actions";
import { isStored, type Video } from "@/lib/portal/videos";

/**
 * One video, played.
 *
 * The frame is only loaded once somebody presses play — a YouTube embed brings
 * a lot of script with it, and loading three of them because a page listed
 * three videos is how a page on a van iPad over 4G stops being usable. Until
 * then it is a poster and a button.
 */
export function VideoPlayer({ video, sopHref }: { video: Video; sopHref: string | null }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState("");

  function toggle() {
    setMsg("");
    start(async () => {
      const res = await setWatched({ videoId: video.id, watched: !video.watched });
      if (!res.ok) { setMsg(res.error || "Couldn't save that."); return; }
      router.refresh();
    });
  }

  return (
    <div className="pt-vid">
      <div className="pt-vid__frame">
        {playing && video.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : video.youtubeId ? (
          <button type="button" className="pt-vid__play" onClick={() => setPlaying(true)} aria-label={`Play ${video.title}`}>
            <span aria-hidden="true">▶</span>
          </button>
        ) : (
          <div className="pt-vid__none">
            <strong>Not loaded in yet</strong>
            <span>
              This one is on the list. Once it is filmed and the link is added it plays here.
            </span>
          </div>
        )}
      </div>

      <div className="pt-vid__meta">
        <span className="pt-vid__cat">
          {video.category}
          {video.minutes ? ` · ${video.minutes} min` : ""}
        </span>
        <h1>{video.title}</h1>
        {video.description && <p>{video.description}</p>}
      </div>

      {msg && <div className="pt-note pt-note--warn">{msg}</div>}

      <div className="pt-vid__acts">
        <button
          type="button"
          className={`pt-btn ${video.watched ? "" : "pt-btn--orange"}`}
          disabled={busy || !isStored(video.id)}
          onClick={toggle}
          title={isStored(video.id) ? undefined : "Not loaded in yet"}
        >
          {busy ? "Saving…" : video.watched ? "✓ Watched — undo" : "Mark as watched"}
        </button>
        {sopHref && <a className="pt-btn" href={sopHref}>Open the procedure it shows</a>}
      </div>
    </div>
  );
}

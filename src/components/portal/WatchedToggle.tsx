"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWatched } from "@/app/portal/learning/actions";

/** Your own record of having watched it. */
export function WatchedToggle({ id, watched }: { id: string; watched: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [on, setOn] = useState(watched);
  const [err, setErr] = useState("");
  return (
    <>
      <button
        type="button" aria-pressed={on} disabled={busy}
        className={`tr-btn${on ? " tr-btn--added" : ""}`}
        onClick={() => start(async () => {
          const res = await setWatched({ videoId: id, watched: !on });
          if (!res.ok) { setErr(res.error || "Couldn't save that."); return; }
          setOn(!on); setErr(""); router.refresh();
        })}
      >
        {on ? "✓ Watched" : "Mark as watched"}
      </button>
      {err && <span className="tr-note tr-note--warn">{err}</span>}
    </>
  );
}

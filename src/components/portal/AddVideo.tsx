"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVideo } from "@/app/portal/learning/actions";

/**
 * Add a video to a track.
 *
 * Paste the whole YouTube URL — the id is pulled out server-side, because
 * nobody remembers which part of the link is the id and a validation error
 * about it is a worse experience than just handling it.
 */
export function AddVideo({ track }: { track: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ title: "", category: "", description: "", youtubeId: "", minutes: "", sopCode: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function save() {
    setMsg("");
    start(async () => {
      const res = await addVideo({ ...f, track });
      if (!res.ok) { setMsg(res.error || "Couldn't save it."); return; }
      setF({ title: "", category: "", description: "", youtubeId: "", minutes: "", sopCode: "" });
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" className="pt-btn pt-btn--orange" onClick={() => setOpen(true)} style={{ marginTop: 18 }}>
        + Add a video
      </button>
    );
  }

  return (
    <section className="pt-panel" style={{ marginTop: 18 }}>
      <h2 className="pt-panel__h">Add a video</h2>
      <div className="pt-mknew__grid">
        <label className="pt-field"><span>Title</span><input className="pt-inp" value={f.title} onChange={set("title")} placeholder="Back-to-back split install, start to finish" /></label>
        <label className="pt-field"><span>YouTube link</span><input className="pt-inp" value={f.youtubeId} onChange={set("youtubeId")} placeholder="Paste the whole link" /></label>
        <label className="pt-field"><span>Category</span><input className="pt-inp" value={f.category} onChange={set("category")} placeholder="Install standards" /></label>
        <label className="pt-field"><span>Minutes</span><input className="pt-inp" value={f.minutes} onChange={set("minutes")} inputMode="numeric" placeholder="12" /></label>
        <label className="pt-field"><span>What it shows</span><input className="pt-inp" value={f.description} onChange={set("description")} placeholder="The full method on a standard job." /></label>
        <label className="pt-field"><span>Procedure code</span><input className="pt-inp" value={f.sopCode} onChange={set("sopCode")} placeholder="A1 — optional" /></label>
      </div>
      {msg && <div className="pt-note pt-note--warn">{msg}</div>}
      <div className="pt-topic__acts">
        <button type="button" className="pt-btn" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="pt-btn pt-btn--orange" disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? "Saving…" : "Add it"}
        </button>
      </div>
    </section>
  );
}

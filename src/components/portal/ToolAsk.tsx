"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { askAboutTool } from "@/app/trade/van/actions";
import { TOOL_REQUEST, type ToolRequest } from "@/lib/portal/vanParts";

/** "What's up with it?" — tell the office a tool is broken, due, or done. */
export function ToolAsk({ toolId, current }: { toolId: string; current: ToolRequest | null }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [pick, setPick] = useState<ToolRequest | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  function send() {
    if (!pick) return;
    setMsg(null);
    start(async () => {
      const res = await askAboutTool({ toolId, request: pick, note });
      if (!res.ok) { setMsg({ text: res.error || "Couldn't send it." }); return; }
      setMsg({ ok: true, text: "Sent to the office." });
      setPick(null); setNote("");
      router.refresh();
    });
  }

  return (
    <div className="tr-stack tr-stack--sm">
      <strong style={{ fontSize: 18 }}>{current ? "Something else up with it?" : "What’s up with it?"}</strong>
      <div className="tr-grid tr-grid--2" style={{ gap: 8 }}>
        {TOOL_REQUEST.map((r) => (
          <button key={r.k} type="button" aria-pressed={pick === r.k} className={`tr-choice${pick === r.k ? " is-on" : ""}`} onClick={() => setPick(r.k)}>
            {r.ask}
          </button>
        ))}
      </div>
      {pick && (
        <>
          <textarea className="tr-input" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What’s it doing? e.g. won’t pull below 1,500 microns" aria-label="What's it doing" />
          <button type="button" className="tr-btn tr-btn--go" disabled={busy} onClick={send}>{busy ? "Sending…" : "Tell the office"}</button>
        </>
      )}
      {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
    </div>
  );
}

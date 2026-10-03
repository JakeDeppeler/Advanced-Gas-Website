"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { askForLeave } from "@/app/trade/me/actions";
import { LEAVE_KINDS, type LeaveKind } from "@/lib/portal/peopleParts";

/** Ask for time off. It lands on the office's Home until somebody answers it. */
export function LeaveForm() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [kind, setKind] = useState<LeaveKind>("annual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  function send() {
    setMsg(null);
    start(async () => {
      const res = await askForLeave({ kind, from, to: to || from, note });
      if (!res.ok) { setMsg({ text: res.error || "Couldn't send it." }); return; }
      setMsg({ ok: true, text: "Sent. The answer shows here." });
      setFrom(""); setTo(""); setNote("");
      router.refresh();
    });
  }

  return (
    <section className="tr-card tr-card--navy tr-stack" style={{ gap: 12 }}>
      <h2 style={{ color: "#fff" }}>Time off</h2>
      <label className="tr-field" style={{ color: "#fff" }}>
        Type
        <select value={kind} onChange={(e) => setKind(e.target.value as LeaveKind)}>
          {LEAVE_KINDS.map((k) => <option key={k.k} value={k.k}>{k.label}</option>)}
        </select>
      </label>
      <label className="tr-field" style={{ color: "#fff" }}>
        From
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (!to || to < e.target.value) setTo(e.target.value); }} />
      </label>
      <label className="tr-field" style={{ color: "#fff" }}>
        To
        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
      </label>
      <input className="tr-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the office should know? (optional)" aria-label="Note" />
      {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
      <button type="button" className="tr-btn tr-btn--go tr-btn--block" disabled={busy || !from} onClick={send}>{busy ? "Sending…" : "Ask for leave"}</button>
    </section>
  );
}

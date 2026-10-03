"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reportIncident, sendTake5 } from "@/app/trade/take5/actions";
import { HAZARDS } from "@/lib/portal/peopleParts";

/**
 * Take 5: what's here, how you'll control it, and that it's safe to start.
 * Saved with your name and the time, before the tools come out.
 */
export function Take5Form() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [job, setJob] = useState("");
  const [on, setOn] = useState<string[]>([]);
  const [controls, setControls] = useState("");
  const [safe, setSafe] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [incident, setIncident] = useState(false);
  const [what, setWhat] = useState("");
  const [imsg, setImsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const warns = HAZARDS.filter((h) => on.includes(h.k) && h.warn);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await sendTake5({ job, hazards: on, controls, safe });
      if (!res.ok) { setMsg({ text: res.error || "Couldn't save it." }); return; }
      setMsg({ ok: true, text: "Saved. Go well." });
      setOn([]); setControls(""); setSafe(false);
      router.refresh();
    });
  }

  function report() {
    setImsg(null);
    start(async () => {
      const res = await reportIncident({ job, detail: what });
      if (!res.ok) { setImsg({ text: res.error || "Couldn't send it." }); return; }
      setImsg({ ok: true, text: "Sent to the office." });
      setWhat("");
      router.refresh();
    });
  }

  return (
    <div className="tr-split" style={{ ["--tr-side" as string]: "320px" }}>
      <div className="tr-stack">
        <section className="tr-card tr-stack" style={{ gap: 12 }}>
          <div>
            <h2>What&rsquo;s here today?</h2>
            <p className="tr-small">Tap everything that applies.</p>
          </div>
          <input className="tr-input" value={job} onChange={(e) => setJob(e.target.value)} placeholder="Which job — customer, suburb or job number" aria-label="Which job" />
          <div className="tr-grid tr-grid--2" style={{ gap: 8 }}>
            {HAZARDS.map((h) => {
              const sel = on.includes(h.k);
              return (
                <button
                  key={h.k} type="button" aria-pressed={sel}
                  className={`tr-choice${sel ? " is-on" : ""}`}
                  style={sel ? { background: "var(--tr-navy)", color: "#fff", borderColor: "var(--tr-navy)" } : undefined}
                  onClick={() => setOn((s) => (sel ? s.filter((x) => x !== h.k) : [...s, h.k]))}
                >
                  {sel ? "✓ " : "+ "}{h.label}
                </button>
              );
            })}
          </div>
        </section>

        {warns.map((h) => <p key={h.k} className="tr-banner" style={{ margin: 0 }}>{h.warn}</p>)}

        <section className="tr-card tr-stack" style={{ gap: 10 }}>
          <label className="tr-field">
            How you&rsquo;ll control it
            <textarea value={controls} onChange={(e) => setControls(e.target.value)} placeholder="e.g. Ladder tied off, power isolated at the board, dog shut inside" />
          </label>
          <label className="tr-tick">
            <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
            It&rsquo;s safe to start
          </label>
        </section>
      </div>

      <div className="tr-stack">
        <section className="tr-card tr-card--navy tr-stack" style={{ gap: 12 }}>
          <h2 style={{ color: "#fff" }}>Stop. Look. Think. Control. Go.</h2>
          <p className="tr-muted">If you can&rsquo;t make it safe, don&rsquo;t start. Ring the office.</p>
          {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
          <button type="button" className="tr-btn tr-btn--go tr-btn--block" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save the Take 5"}</button>
        </section>

        <section className="tr-card tr-stack" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 18 }}>Something happened?</h2>
          <p className="tr-small">Incident, injury or near miss. Report it today.</p>
          {incident ? (
            <>
              <textarea className="tr-input" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="What happened, who was involved, is anyone hurt?" aria-label="What happened" />
              {imsg && <p className={imsg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{imsg.text}</p>}
              <button type="button" className="tr-btn tr-btn--go" disabled={busy} onClick={report}>Send to the office</button>
              <Link href="/trade/processes?sop=C5" className="tr-small" style={{ fontWeight: 800 }}>C5 · When something goes wrong →</Link>
            </>
          ) : (
            <button type="button" className="tr-btn tr-btn--block" onClick={() => setIncident(true)}>Report an incident</button>
          )}
        </section>
      </div>
    </div>
  );
}

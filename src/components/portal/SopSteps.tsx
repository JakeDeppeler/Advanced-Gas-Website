"use client";

import { useEffect, useState } from "react";

/**
 * A procedure's steps, tickable as you work through them.
 *
 * The ticks are this person's place in the list on this device and nothing
 * more — they are not a record that the job was done, so they are not saved to
 * the database. They do survive a tab switch or a dropped signal, which is the
 * thing that actually goes wrong on a roof, so they go in sessionStorage and
 * every read and write is wrapped: a locked-down iPad throws rather than
 * returning nothing.
 */
export function SopSteps({ code, items }: { code: string; items: string[] }) {
  const key = `aga.sop.${code}`;
  const [ticked, setTicked] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      setTicked(raw ? (JSON.parse(raw) as number[]).filter((n) => Number.isInteger(n)) : []);
    } catch { setTicked([]); }
  }, [key]);

  function toggle(i: number) {
    setTicked((prev) => {
      const next = prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i];
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* private window, locked-down iPad */ }
      return next;
    });
  }

  const done = ticked.filter((i) => i < items.length).length;

  return (
    <div className="tr-stack" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pt-ink-2)" }}>{done} of {items.length}</span>
        <span className="tr-bar" style={{ flex: "1 1 auto" }} aria-hidden="true">
          <span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </span>
      </div>
      <div className="tr-rows">
        {items.map((t, i) => {
          const on = ticked.includes(i);
          return (
            <button
              key={t} type="button" aria-pressed={on} onClick={() => toggle(i)}
              className="tr-row tr-steprow"
              style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, borderTop: i ? "1px solid var(--pt-tint)" : 0, cursor: "pointer", font: "inherit" }}
            >
              <span className={`tr-tick${on ? " is-on" : ""}`} style={{ width: 32, height: 32, borderRadius: 9 }} aria-hidden="true">
                {on ? "✓" : i + 1}
              </span>
              <span className="tr-row__k" style={{ flex: "1 1 auto" }}>
                <strong style={on ? { color: "var(--pt-ink-2)" } : undefined}>{t}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="tr-stack" style={{ gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="tr-small" style={{ fontWeight: 700 }}>{done} of {items.length} done</span>
        <span className="tr-bar tr-bar--thin" style={{ flex: "1 1 auto" }} aria-hidden="true">
          <span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </span>
      </div>
      <div>
        {items.map((t, i) => {
          const on = ticked.includes(i);
          // "Stock count (A4). Count the van against the list" reads as a
          // heading and its detail; a one-line step stays one line.
          const cut = t.search(/[.:—] /);
          const head = cut > 0 && cut < 70 ? t.slice(0, cut) : t;
          const rest = cut > 0 && cut < 70 ? t.slice(cut + 1).trim().replace(/^— /, "") : "";
          return (
            <button
              key={t} type="button" aria-pressed={on} onClick={() => toggle(i)}
              className="tr-sop__step"
              style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, borderTop: i ? "1px solid var(--tr-line)" : 0, cursor: "pointer", font: "inherit", color: "inherit" }}
            >
              <span className="tr-sop__n" style={on ? { background: "var(--tr-green-tint)", color: "var(--tr-green)" } : undefined} aria-hidden="true">
                {on ? "✓" : i + 1}
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={on ? { color: "var(--tr-ink-2)" } : undefined}>{head}</strong>
                {rest && <p>{rest}</p>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Ladder } from "@/lib/portal/roles/ladder";

/**
 * "How to move up": the ladder in a sheet in the middle of the screen, top
 * rung first, each seat with what it takes to step off it. On a role's own
 * page that seat is marked, so you can see where you are and what's next.
 */
export function LadderButton({ ladder, here, cls = "qp-btn line" }: { ladder: Ladder; here?: string; cls?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);
  const top = [...ladder.rungs].reverse();
  return (
    <>
      <button type="button" className={cls} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" /></svg>
        How to move up
      </button>
      {open && (
        <div className="qp-scrim mid" onClick={() => setOpen(false)}>
          <div className="qp-panel mid ld-ladder" role="dialog" aria-modal="true" aria-labelledby="ladder-h" onClick={(e) => e.stopPropagation()}>
            <div className="qp-ph">
              <span>The ladder</span>
              <button type="button" className="qp-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <h2 id="ladder-h" className="rl-h">How to move up</h2>
            <p className="qp-note">You climb as you earn it, not by time served. Each step says what it takes to go up to the next.</p>
            <ol className="lad">
              {top.map((rung, i) => (
                <li key={rung.map((r) => r.id).join("+")} className="lad-rung">
                  <span className="lad-n" aria-label={`Step ${top.length - i}`}>{top.length - i}</span>
                  <div className="lad-seats">
                    {rung.map((r) => (
                      <Link key={r.id} href={`/portal/roles/${r.id}`} className={`lad-seat${r.id === here ? " here" : ""}`} onClick={() => setOpen(false)}>
                        <b>{r.name}{r.id === here && <em> · this role</em>}</b>
                        {r.moveUp ? <span>{r.moveUp}</span> : <span>{r.tagline}</span>}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {ladder.others.length > 0 && (
              <section className="lad-other">
                <h3>Seats off the tools</h3>
                <div className="lad-seats">
                  {ladder.others.map((r) => (
                    <Link key={r.id} href={`/portal/roles/${r.id}`} className={`lad-seat${r.id === here ? " here" : ""}`} onClick={() => setOpen(false)}>
                      <b>{r.name}{r.id === here && <em> · this role</em>}</b>
                      <span>{r.moveUp || r.tagline}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

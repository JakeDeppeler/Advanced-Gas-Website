"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CREW_LEVELS } from "@/lib/portal/crew";
import { startPreview, endPreview } from "@/app/portal/admin/viewAsActions";

/**
 * The picker, on the Admin page.
 *
 * Pick a level, read what it means, then press the button — two steps rather
 * than one. A single click that drops you into somebody else's permissions is
 * easy to do by accident, and getting back out means finding the banner.
 */
export function ViewAsPicker({ current }: { current?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState(current ?? CREW_LEVELS[0].key);
  const level = CREW_LEVELS.find((l) => l.key === picked) ?? CREW_LEVELS[0];

  return (
    <section className="pt-va">
      <h2 className="pt-va__h">See it as they do</h2>
      <p className="pt-va__sub">
        Look at the portal through a crew level&rsquo;s eyes — the same nav, the same pages, the same locked doors. It
        only ever takes access away, never adds it, and while it&rsquo;s on you have that level&rsquo;s permissions for
        real, so you can&rsquo;t save anything they couldn&rsquo;t. It switches itself off after an hour.
      </p>

      <div className="pt-va__picks" role="radiogroup" aria-label="Crew level">
        {CREW_LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            role="radio"
            aria-checked={picked === l.key}
            className={`pt-va__pick${picked === l.key ? " is-on" : ""}`}
            onClick={() => setPicked(l.key)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="pt-va__go">
        <p>{level.blurb}</p>
        <button
          type="button"
          className="pt-btn pt-va__btn"
          disabled={pending}
          onClick={() => start(async () => { await startPreview(level.key); router.push("/portal"); router.refresh(); })}
        >
          {pending ? "Switching…" : `View as ${level.label}`}
        </button>
      </div>

      {current && (
        <button type="button" className="pt-va__stop" disabled={pending}
          onClick={() => start(async () => { await endPreview(); router.refresh(); })}>
          Stop previewing
        </button>
      )}
    </section>
  );
}

/** The banner, on every page while a preview is running. */
export function ViewAsBanner({ level }: { level: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const label = CREW_LEVELS.find((l) => l.key === level)?.label ?? level;

  return (
    <div className="pt-va__bar">
      <span>
        You&rsquo;re looking at the portal as a <strong>{label}</strong>. Nothing you do here can save — that&rsquo;s the point.
      </span>
      <button type="button" disabled={pending}
        onClick={() => start(async () => { await endPreview(); router.push("/portal/admin"); router.refresh(); })}>
        {pending ? "Ending…" : "Back to my own account"}
      </button>
    </div>
  );
}

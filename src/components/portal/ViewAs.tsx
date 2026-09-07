"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CREW_LEVELS } from "@/lib/portal/crew";
import { startPreview, endPreview } from "@/app/portal/admin/viewAsActions";

/** The picker, on the Admin page. */
export function ViewAsPicker({ current }: { current?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">See it as they do</h2>
      <p className="pt-panel__sub">
        Look at the portal through a crew level&rsquo;s eyes — the same nav, the same pages, the same locked doors. It only ever
        takes access away, never adds it, and while it&rsquo;s on you have that level&rsquo;s permissions for real, so you
        can&rsquo;t save anything they couldn&rsquo;t. It switches itself off after an hour.
      </p>
      <div className="pt-va__picks">
        {CREW_LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            className={`pt-va__pick${current === l.key ? " is-on" : ""}`}
            disabled={pending}
            onClick={() => start(async () => { await startPreview(l.key); router.push("/portal"); router.refresh(); })}
          >
            <strong>{l.label}</strong>
            <span>{l.blurb}</span>
          </button>
        ))}
      </div>
      {current && (
        <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" style={{ marginTop: 14 }} disabled={pending}
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

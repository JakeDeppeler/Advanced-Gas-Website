"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkLeadToJob, retryLeadUpload, unlinkLeadFromJob } from "@/app/portal/website/actions";

type Said = { ok: boolean; text: string } | null;

/** The job number box and Link, on an enquiry not linked yet. */
export function LinkJob({ id, who }: { id: string; who: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [job, setJob] = useState("");
  const [said, setSaid] = useState<Said>(null);
  return (
    <form className="wl-link" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await linkLeadToJob({ id, job });
        setSaid(r.ok ? { ok: true, text: r.note ?? "Linked." } : { ok: false, text: r.error ?? "Couldn't link it." });
        if (r.ok) router.refresh();
      });
    }}>
      <input id={`wl-job-${id}`} inputMode="numeric" value={job} onChange={(e) => setJob(e.target.value)} placeholder="ServiceTitan job #" aria-label={`ServiceTitan job number for ${who}`} disabled={busy} />
      <button type="submit" className="pk-btn" disabled={busy || !job.trim()}>{busy ? "Linking…" : "Link"}</button>
      {said && <em className={said.ok ? undefined : "bad"} role="status">{said.text}</em>}
    </form>
  );
}

/** Unlink, and try again when the form and photos didn't go onto the job. */
export function LeadButtons({ id, retry, unlink }: { id: string; retry: boolean; unlink: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [said, setSaid] = useState<Said>(null);
  const run = (fn: () => ReturnType<typeof retryLeadUpload>) => start(async () => {
    const r = await fn();
    setSaid(r.ok ? { ok: true, text: r.note ?? "Done." } : { ok: false, text: r.error ?? "Couldn't do that." });
    router.refresh();
  });
  return (
    <span className="wl-btns">
      {retry && <button type="button" className="pk-btn g" disabled={busy} onClick={() => run(() => retryLeadUpload(id))}>{busy ? "Trying…" : "Try again"}</button>}
      {unlink && <button type="button" className="pk-btn g" disabled={busy} onClick={() => { if (confirm("Unlink this enquiry from its job? Anything already put on the job in ServiceTitan stays there.")) run(() => unlinkLeadFromJob(id)); }}>Unlink</button>}
      {said && <em className={said.ok ? undefined : "bad"} role="status">{said.text}</em>}
    </span>
  );
}

/**
 * Try again, on the row itself where a failure shows. The row is a
 * <summary>, so the click is kept from opening it as well.
 */
export function RetryInline({ id }: { id: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [said, setSaid] = useState<Said>(null);
  return (
    <span className="wl-btns">
      <button type="button" className="pk-btn g wl-retry" disabled={busy} onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        start(async () => {
          const r = await retryLeadUpload(id);
          setSaid(r.ok ? { ok: true, text: r.note ?? "Done." } : { ok: false, text: r.error ?? "It didn't go again." });
          router.refresh();
        });
      }}>{busy ? "Trying…" : "Try again"}</button>
      {said && <em className={said.ok ? undefined : "bad"} role="status">{said.text}</em>}
    </span>
  );
}

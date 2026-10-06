"use client";

import { useState, useTransition } from "react";
import { sendAgain, sendNow, sendToMe } from "@/app/portal/board/reports/actions";
import type { ReportKind } from "@/lib/reports/types";

const NOW_WORD: Record<ReportKind, string> = { daily: "today's", weekly: "this week's", monthly: "this month's" };

/**
 * Under a preview: a copy to me, to see it in my own inbox, or the real thing
 * to everyone on the list now — which then counts as the period's report.
 */
export function PreviewSendButtons({ kind, everyone }: { kind: ReportKind; everyone: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? r.note ?? "Sent." : r.error ?? "Couldn't send." });
    });
  return (
    <div className="pt-rpt__now">
      <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending} onClick={() => run(() => sendToMe(kind))}>
        {pending ? "Sending…" : "Send it to me"}
      </button>
      <button
        type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending || everyone === 0}
        onClick={() => { if (confirm(`Send ${NOW_WORD[kind]} report to all ${everyone} on the list now? It then counts as the one for this period.`)) run(() => sendNow(kind)); }}
      >
        Send to everyone now
      </button>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
    </div>
  );
}

/** Send a kept report again, exactly as it was. */
export function SendAgainButton({ reportKey }: { reportKey: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="pt-rpt__again">
      <button
        type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending}
        onClick={() => start(async () => { const r = await sendAgain(reportKey); setMsg({ ok: r.ok, text: r.ok ? r.note ?? "Sent." : r.error ?? "Couldn't send." }); })}
      >
        {pending ? "Sending…" : "Send again"}
      </button>
      {msg && <span className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</span>}
    </span>
  );
}

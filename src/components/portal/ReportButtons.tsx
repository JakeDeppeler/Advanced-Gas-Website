"use client";

import { useState, useTransition } from "react";
import { sendAgain, sendNow } from "@/app/portal/board/reports/actions";
import type { ReportKind } from "@/lib/reports/types";

/** "Send today's now" and friends: the period's report, rebuilt and sent on the spot. */
export function SendNowButtons() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const go = (kind: ReportKind) =>
    start(async () => {
      const r = await sendNow(kind);
      setMsg({ ok: r.ok, text: r.ok ? r.note ?? "Sent." : r.error ?? "Couldn't send." });
    });
  return (
    <div className="pt-rpt__now">
      {(["daily", "weekly", "monthly"] as const).map((k) => (
        <button key={k} type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => go(k)}>
          {pending ? "Sending…" : `Send ${k === "daily" ? "today's" : k === "weekly" ? "this week's" : "this month's"} now`}
        </button>
      ))}
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

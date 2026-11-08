"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFollowUpsAction } from "@/app/portal/emails/actions";

/** The follow-ups' on/off button, with what switching it does said before it's pressed. */
export function FollowUpSwitch({ on, awaiting }: { on: boolean; awaiting: number | null }) {
  const router = useRouter();
  const [busy, run] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flip = () => {
    const ask = on
      ? "Switch the follow-up emails off? Nothing more goes until it's switched back on."
      : `Switch the follow-up emails on?${awaiting ? ` The ${awaiting} quote${awaiting === 1 ? "" : "s"} tagged Awaiting Quote Approval now ${awaiting === 1 ? "is" : "are"} left alone.` : ""} Quotes the office tags from now on start getting them, the first two days after.`;
    if (!confirm(ask)) return;
    run(async () => {
      const r = await setFollowUpsAction(!on);
      setMsg(r.ok ? { ok: true, text: r.said ?? "Done." } : { ok: false, text: r.error ?? "That didn't work." });
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="em-switchrow">
      <button type="button" className={`pt-btn ${on ? "pt-btn--ghost" : "pt-btn--orange"}`} disabled={busy} onClick={flip}>
        {busy ? "Working…" : on ? "Switch off" : "Switch on"}
      </button>
      {msg && <span role="status" className={msg.ok ? "em-ok" : "em-err"}>{msg.text}</span>}
    </div>
  );
}

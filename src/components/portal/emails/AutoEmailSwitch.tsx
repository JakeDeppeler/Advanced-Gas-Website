"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAutoEmailAction } from "@/app/portal/emails/actions";
import type { AutoKind } from "@/lib/autoEmails/rules";

/** One after-the-quote email's switch, saying what switching it does before it's pressed. */
export function AutoEmailSwitch({ kind, label, when, on, since, sent }: { kind: AutoKind; label: string; when: string; on: boolean; since: string | null; sent: number }) {
  const router = useRouter();
  const [busy, run] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const day = since ? new Date(since).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" }) : null;
  const flip = () => {
    const ask = on ? `Switch “${label}” off? Nothing more of it goes until it's switched back on.` : `Switch “${label}” on? It goes ${when}, to customers, from now on. Nothing from before now is sent.`;
    if (!confirm(ask)) return;
    run(async () => {
      const r = await setAutoEmailAction(kind, !on);
      setMsg(r.ok ? { ok: true, text: r.said ?? "Done." } : { ok: false, text: r.error ?? "That didn't work." });
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="em-auto">
      <span className="em-auto__t">
        <b>{label}: {on ? "on" : "off"}</b>
        <span>{on ? `Sending ${when}. On since ${day ?? "now"}${sent ? `, ${sent} sent in 30 days` : ""}.` : `When it's on, it goes ${when}.`}</span>
      </span>
      <button type="button" className={`pt-btn ${on ? "pt-btn--ghost" : "pt-btn--orange"}`} disabled={busy} onClick={flip}>{busy ? "Working…" : on ? "Switch off" : "Switch on"}</button>
      {msg && <span role="status" className={msg.ok ? "em-ok" : "em-err"}>{msg.text}</span>}
    </div>
  );
}

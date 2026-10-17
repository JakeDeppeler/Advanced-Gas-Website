"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setQuoteTag } from "@/app/portal/automatic/actions";

/** On or off, said in words beside the switch. */
export function AutoSwitch({ on, canEdit }: { on: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(on);
  const [err, setErr] = useState<string | null>(null);
  return (
    <label className={`au-sw${v ? " on" : ""}`}>
      <input type="checkbox" checked={v} disabled={!canEdit || pending} onChange={(e) => {
        const next = e.target.checked;
        setV(next);
        start(async () => { const r = await setQuoteTag(next); if (!r.ok) { setV(!next); setErr(r.error ?? "Couldn't save."); } router.refresh(); });
      }} />
      <span className="au-track" aria-hidden="true"><i /></span>
      <span>{v ? "On" : "Off"}</span>
      {err && <em>{err}</em>}
    </label>
  );
}

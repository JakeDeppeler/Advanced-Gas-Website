"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAuto, setOfficeTo } from "@/app/portal/automatic/actions";
import type { AutoKey } from "@/lib/automation/log";

/** On or off, said in words beside the switch. */
export function AutoSwitch({ k, on, canEdit, label }: { k: AutoKey; on: boolean; canEdit: boolean; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(on);
  const [err, setErr] = useState<string | null>(null);
  return (
    <label className={`au-sw${v ? " on" : ""}`}>
      <input type="checkbox" aria-label={label} checked={v} disabled={!canEdit || pending} onChange={(e) => {
        const next = e.target.checked;
        setV(next);
        start(async () => { const r = await setAuto(k, next); if (!r.ok) { setV(!next); setErr(r.error ?? "Couldn't save."); } router.refresh(); });
      }} />
      <span className="au-track" aria-hidden="true"><i /></span>
      <span>{v ? "On" : "Off"}</span>
      {err && <em>{err}</em>}
    </label>
  );
}

/** Who the office's automatic to-dos go to. */
export function OfficeTo({ people, value, canEdit, which = "officeTo", label = "Who gets the office's automatic to-dos" }: { people: { id: string; name: string }[]; value: string; canEdit: boolean; which?: "officeTo" | "accountsTo"; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(value);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="au-to">
      <select id={`au-${which}`} aria-label={label} value={v} disabled={!canEdit || pending} onChange={(e) => {
        const next = e.target.value;
        setV(next);
        start(async () => { const r = await setOfficeTo(next, which); setMsg(r.ok ? "Saved" : r.error ?? "Couldn't save."); router.refresh(); });
      }}>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {msg && <em>{msg}</em>}
    </span>
  );
}

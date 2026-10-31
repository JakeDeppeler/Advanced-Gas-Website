"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSorted, setAuto, setNotifyTo, setOfficeTo } from "@/app/portal/automatic/actions";
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

/** Takes a failure (or a group of them) off Needs a look, once it's been dealt with by hand. */
export function MarkSorted({ keys, label = "Sorted", what }: { keys: string[]; label?: string; what: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="au-sorted">
      <button type="button" className="pk-btn g ar-b" disabled={pending} aria-label={`${label}: ${what}`} onClick={() => start(async () => {
        const r = await markSorted(keys);
        if (!r.ok) setErr(r.error ?? "Couldn't save.");
        router.refresh();
      })}>{pending ? "Saving…" : label}</button>
      {err && <em>{err}</em>}
    </span>
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

/** The addresses told when the portal emails a supplier or trade by itself. */
export function NotifyTo({ value, canEdit }: { value: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(value);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="au-to au-notify" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await setNotifyTo(v); setMsg(r.ok ? "Saved" : r.error ?? "Couldn't save."); router.refresh(); }); }}>
      <input id="au-notify" type="text" value={v} onChange={(e) => setV(e.target.value)} disabled={!canEdit || pending} aria-label="Who's emailed when it sends something by itself" placeholder="you@advancedgas.com.au" />
      {canEdit && <button type="submit" disabled={pending || v === value}>Save</button>}
      {msg && <em>{msg}</em>}
    </form>
  );
}

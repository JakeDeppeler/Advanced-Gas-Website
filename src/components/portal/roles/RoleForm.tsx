"use client";

import { useState } from "react";
import { ROLE_LISTS, type Role } from "@/lib/portal/roles/types";

export const BLANK_ROLE: Role = { id: "", name: "", tagline: "", reportsTo: "", growsInto: "", manages: "", intro: "", day: [], owns: [], notOwns: [], measured: [], requires: [], moveUp: "" };

/** Every part of a role, one thing a line in the lists. */
export function RoleForm({ r, pending, onSave, onCancel, onRemove }: { r: Role; pending: boolean; onSave: (v: Role) => void; onCancel: () => void; onRemove?: () => void }) {
  const [v, setV] = useState(r);
  const [lists, setLists] = useState<Record<string, string>>(() => Object.fromEntries(ROLE_LISTS.map((l) => [l.k, r[l.k].join("\n")])));
  const set = (k: keyof Role, x: string) => setV((s) => ({ ...s, [k]: x }));
  const field = (k: "name" | "tagline" | "reportsTo" | "manages" | "growsInto", label: string) => (
    <label className="qp-field"><span>{label}</span><input id={`rl-${k}`} value={v[k]} onChange={(e) => set(k, e.target.value)} maxLength={k === "name" ? 80 : 200} /></label>
  );
  return (
    <form className="qp-form rl-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...v, ...Object.fromEntries(ROLE_LISTS.map((l) => [l.k, lists[l.k].split("\n").map((x) => x.trim()).filter(Boolean)])) } as Role); }}>
      {field("name", "Role")}
      {field("tagline", "In a line")}
      <div className="rl-two">{field("reportsTo", "Reports to")}{field("growsInto", "Grows into")}</div>
      {field("manages", "Manages (if anyone)")}
      <label className="qp-field"><span>What the job really is</span><textarea id="rl-intro" rows={4} value={v.intro} onChange={(e) => set("intro", e.target.value)} /></label>
      {ROLE_LISTS.map((l) => (
        <label key={l.k} className="qp-field"><span>{l.label} <em>one a line</em></span>
          <textarea id={`rl-${l.k}`} rows={5} value={lists[l.k]} onChange={(e) => setLists((s) => ({ ...s, [l.k]: e.target.value }))} />
        </label>
      ))}
      <label className="qp-field"><span>To move up</span><textarea id="rl-up" rows={2} value={v.moveUp} onChange={(e) => set("moveUp", e.target.value)} /></label>
      <div className="qp-acts">
        <button type="submit" className="qp-btn dark" disabled={pending || !v.name.trim()}>Save</button>
        <button type="button" className="qp-btn" onClick={onCancel}>Cancel</button>
        {onRemove && <button type="button" className="td-del" onClick={onRemove}>Take this role away</button>}
      </div>
    </form>
  );
}

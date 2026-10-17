"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignRole, removeRole, saveRole } from "@/app/portal/roles/actions";
import { ROLE_LISTS, type Role } from "@/lib/portal/roles/types";

type Person = { id: string; name: string };
const first = (n: string) => n.trim().split(/\s+/)[0];

/**
 * The roles, as cards: each seat's name and line, and who's in it. Open one
 * for the whole of it: the day, what you own and don't, what you're measured
 * on, what the seat needs and how you move up. The office can change any of
 * it, add a role, and click people in or out of one.
 */
export function RolesBoard({ roles, assign, people, canEdit, everyone }: {
  roles: Role[]; assign: Record<string, string>; people: Person[]; canEdit: boolean;
  everyone: { standards: string[]; attitude: string[]; deal: string[] };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const inRole = (id: string) => people.filter((p) => assign[p.id] === id);
  const unplaced = people.filter((p) => !assign[p.id] || !roles.some((r) => r.id === assign[p.id]));
  const role = roles.find((r) => r.id === open) ?? null;
  const run = (fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, ok: string, after?: (id?: string) => void) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? ok : r.error ?? "Couldn't do that."); if (r.ok) after?.(r.id); router.refresh(); });

  return (
    <div className="rl">
      <details className="pk-card pk-pad rl-all">
        <summary><b>What we expect of everyone</b><span>the standard, the attitude, and our deal with you</span></summary>
        <div className="rl-cols">
          <div><h3>The standard, whoever you are</h3><ol>{everyone.standards.map((x) => <li key={x}>{x}</li>)}</ol></div>
          <div><h3>Attitude</h3><ul>{everyone.attitude.map((x) => <li key={x}>{x}</li>)}</ul><h3>Our deal with you</h3><ul>{everyone.deal.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </details>

      <div className="rl-grid">
        {roles.map((r, i) => {
          const who = inRole(r.id);
          return (
            <button key={r.id} type="button" className={`rl-card t-${["gold", "forest", "orange", "dark"][i % 4]}`} onClick={() => { setOpen(r.id); setEditing(null); }}>
              <span className="rl-name">{r.name}</span>
              <span className="rl-tag">{r.tagline}</span>
              <span className="rl-foot">
                <span className="rl-who">
                  {who.length ? who.map((p) => <span key={p.id} className="qp-av" title={p.name}>{p.name.slice(0, 1)}</span>) : <em>Nobody in it yet</em>}
                </span>
                {r.reportsTo && <span className="rl-rep">reports to {r.reportsTo}</span>}
              </span>
            </button>
          );
        })}
        {canEdit && (
          <button type="button" className="qp-drop rl-add" onClick={() => { setOpen(null); setEditing({ id: "", name: "", tagline: "", reportsTo: "", growsInto: "", manages: "", intro: "", day: [], owns: [], notOwns: [], measured: [], requires: [], moveUp: "" }); }}>
            <span className="qp-dropi x" aria-hidden="true">+</span>
            <b>Add a role</b>
            <span>a seat of its own</span>
          </button>
        )}
      </div>
      {canEdit && unplaced.length > 0 && <p className="pk-note">Not in a role yet: {unplaced.map((p) => p.name).join(", ")}. Open a role and click their name to put them in it.</p>}

      {(role || editing) && (
        <div className="qp-scrim" onClick={() => { setOpen(null); setEditing(null); }}>
          <div className="qp-panel rl-panel" role="dialog" aria-modal="true" aria-label={editing ? "Edit the role" : role?.name} onClick={(e) => e.stopPropagation()}>
            <div className="qp-ph">
              <span>{editing ? (editing.id ? "Editing the role" : "A new role") : "Role"}</span>
              <button type="button" className="qp-x" onClick={() => { setOpen(null); setEditing(null); }} aria-label="Close">×</button>
            </div>
            {editing ? (
              <RoleForm r={editing} pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(v) => run(() => saveRole(v), "Saved.", (id) => { setEditing(null); if (id) setOpen(id); })}
                onRemove={editing.id ? () => { if (confirm(`Take the ${editing.name} role away?`)) run(() => removeRole(editing.id), "Role taken away.", () => { setEditing(null); setOpen(null); }); } : undefined} />
            ) : role ? (
              <>
                <h2 className="rl-h">{role.name}</h2>
                <p className="rl-tagline">{role.tagline}</p>
                <dl className="qp-facts">
                  {role.reportsTo && <div><dt>Reports to</dt><dd>{role.reportsTo}</dd></div>}
                  {role.manages && <div><dt>Manages</dt><dd>{role.manages}</dd></div>}
                  {role.growsInto && <div><dt>Grows into</dt><dd>{role.growsInto}</dd></div>}
                </dl>
                {role.intro && <p className="rl-intro">{role.intro}</p>}
                {ROLE_LISTS.map((l) => role[l.k].length ? (
                  <section key={l.k} className={`rl-sec k-${l.k}`}>
                    <h3>{l.label}</h3>
                    <ul>{role[l.k].map((x) => <li key={x}>{x}</li>)}</ul>
                  </section>
                ) : null)}
                {role.moveUp && <section className="rl-sec rl-up"><h3>To move up</h3><p>{role.moveUp}</p></section>}
                <section className="rl-sec">
                  <h3>Who&rsquo;s in this role</h3>
                  <div className="qp-opts">
                    {people.map((p) => {
                      const on = assign[p.id] === role.id;
                      const other = !on && assign[p.id] ? roles.find((r) => r.id === assign[p.id])?.name : null;
                      return canEdit ? (
                        <button key={p.id} type="button" className={on ? "on" : undefined} aria-pressed={on} disabled={pending} title={other ? `Now: ${other}` : undefined}
                          onClick={() => run(() => assignRole(p.id, on ? "" : role.id), on ? `${first(p.name)} taken out of ${role.name}.` : `${first(p.name)} is now ${role.name}.`)}>
                          <span className="qp-av" aria-hidden="true">{p.name.slice(0, 1)}</span>{p.name}{other ? <em> · {other}</em> : null}
                        </button>
                      ) : on ? <span key={p.id} className="qp-chip"><span className="qp-av" aria-hidden="true">{p.name.slice(0, 1)}</span>{p.name}</span> : null;
                    })}
                  </div>
                  {canEdit && <p className="qp-note" style={{ marginTop: 8 }}>Click a name to put them in this role, or take them out. One role each.</p>}
                </section>
                {canEdit && <div className="qp-acts"><button type="button" className="qp-btn dark" onClick={() => setEditing(role)}>Edit this role</button></div>}
              </>
            ) : null}
          </div>
        </div>
      )}
      {msg && <p className="qp-toast" role="status">{msg}</p>}
    </div>
  );
}

/** Every part of a role, one thing a line in the lists. */
function RoleForm({ r, pending, onSave, onCancel, onRemove }: { r: Role; pending: boolean; onSave: (v: Role) => void; onCancel: () => void; onRemove?: () => void }) {
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

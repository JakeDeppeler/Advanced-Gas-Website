"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignRole, removeRole, saveRole } from "@/app/portal/roles/actions";
import { ROLE_LISTS, type Role } from "@/lib/portal/roles/types";
import type { Ladder } from "@/lib/portal/roles/ladder";
import { RoleForm } from "./RoleForm";
import { LadderButton } from "./LadderButton";

type Person = { id: string; name: string };
const first = (n: string) => n.trim().split(/\s+/)[0];

/** How each list reads: a day is a sequence, so numbered; the rest are points. */
const MARK: Record<string, "num" | "yes" | "no" | "dot"> = { day: "num", owns: "yes", notOwns: "no", measured: "dot", requires: "dot" };

/**
 * A role on its own page: the line and what the job really is, then each list
 * as dot points in its own card, how to move up, and who's in it. The owner
 * can change any of it and put people in or out.
 */
export function RoleView({ role, roles, assign, people, canEdit, ladder }: {
  role: Role; roles: Role[]; assign: Record<string, string>; people: Person[]; canEdit: boolean; ladder: Ladder;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, ok: string, after?: (id?: string) => void) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? ok : r.error ?? "Couldn't do that."); if (r.ok) after?.(r.id); router.refresh(); });
  const who = people.filter((p) => assign[p.id] === role.id);

  if (editing) {
    return (
      <section className="pk-card pk-pad rv-edit">
        <h2 className="rl-h">Change the {role.name} role</h2>
        <RoleForm r={role} pending={pending}
          onCancel={() => setEditing(false)}
          onSave={(v) => run(() => saveRole(v), "Saved.", (id) => { setEditing(false); if (id && id !== role.id) router.push(`/portal/roles/${id}`); })}
          onRemove={() => { if (confirm(`Take the ${role.name} role away?`)) run(() => removeRole(role.id), "Role taken away.", () => router.push("/portal/roles")); }} />
        {msg && <p className="qp-toast" role="status">{msg}</p>}
      </section>
    );
  }

  return (
    <div className="rv">
      <div className="rl-bar">
        <LadderButton ladder={ladder} here={role.id} />
        {canEdit && <button type="button" className="qp-btn dark" onClick={() => setEditing(true)}>Change this role</button>}
      </div>

      <section className="pk-card pk-pad rv-lead">
        <p className="rv-tagline">{role.tagline}</p>
        {role.intro && <p className="rv-intro">{role.intro}</p>}
        <dl className="rv-facts">
          {role.reportsTo && <div><dt>Reports to</dt><dd>{role.reportsTo}</dd></div>}
          {role.manages && <div><dt>Manages</dt><dd>{role.manages}</dd></div>}
          {role.growsInto && <div><dt>Grows into</dt><dd>{role.growsInto}</dd></div>}
        </dl>
      </section>

      <div className="rv-grid">
        {ROLE_LISTS.map((l) => role[l.k].length ? (
          <section key={l.k} className={`pk-card pk-pad rv-sec k-${l.k}`}>
            <h2>{l.label}</h2>
            {MARK[l.k] === "num"
              ? <ol className="rv-points num">{role[l.k].map((x) => <li key={x}>{x}</li>)}</ol>
              : <ul className={`rv-points ${MARK[l.k]}`}>{role[l.k].map((x) => <li key={x}>{x}</li>)}</ul>}
          </section>
        ) : null)}
      </div>

      {role.moveUp && (
        <section className="rv-up">
          <div>
            <h2>To move up</h2>
            <p>{role.moveUp}</p>
          </div>
          <LadderButton ladder={ladder} here={role.id} cls="qp-btn rv-upbtn" />
        </section>
      )}

      <section className="pk-card pk-pad">
        <h2 className="rv-h2">Who&rsquo;s in this role</h2>
        {canEdit ? (
          <>
            <div className="qp-opts">
              {people.map((p) => {
                const on = assign[p.id] === role.id;
                const other = !on && assign[p.id] ? roles.find((r) => r.id === assign[p.id])?.name : null;
                return (
                  <button key={p.id} type="button" className={on ? "on" : undefined} aria-pressed={on} disabled={pending} title={other ? `Now: ${other}` : undefined}
                    onClick={() => run(() => assignRole(p.id, on ? "" : role.id), on ? `${first(p.name)} taken out of ${role.name}.` : `${first(p.name)} is now ${role.name}.`)}>
                    <span className="qp-av" aria-hidden="true">{p.name.slice(0, 1)}</span>{p.name}{other ? <em> · {other}</em> : null}
                  </button>
                );
              })}
            </div>
            <p className="qp-note" style={{ marginTop: 10 }}>Click a name to put them in this role, or take them out. One role each.</p>
          </>
        ) : who.length ? (
          <div className="qp-opts">{who.map((p) => <span key={p.id} className="qp-chip"><span className="qp-av" aria-hidden="true">{p.name.slice(0, 1)}</span>{p.name}</span>)}</div>
        ) : <p className="qp-note">Nobody in this role yet.</p>}
      </section>
      {msg && <p className="qp-toast" role="status">{msg}</p>}
    </div>
  );
}

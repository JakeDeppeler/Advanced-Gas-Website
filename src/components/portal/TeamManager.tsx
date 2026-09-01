"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CAPS,
  ROLES,
  ROLE_LABELS,
  ROLE_BLURB,
  roleDefault,
  effectiveCaps,
  type Cap,
  type Role,
  type PortalUser,
} from "@/lib/portal/caps";
import { addMember, updateMember, removeMember } from "@/app/portal/admin/team/actions";

type Row = PortalUser & { isOwner?: boolean; invitedBy?: string | null };

const CAP_STATE = (u: Pick<PortalUser, "role" | "caps">) => effectiveCaps(u);

export function TeamManager({ users, meEmail, dbReady }: { users: Row[]; meEmail: string; dbReady: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddMsg(null);
    startTransition(async () => {
      const res = await addMember({ name, email, role });
      if (res.ok) {
        setName("");
        setEmail("");
        setRole("member");
        setAddMsg({ ok: true, text: `Added ${email}. They can sign in now.` });
        router.refresh();
      } else {
        setAddMsg({ ok: false, text: res.error || "Couldn't add them." });
      }
    });
  }

  const active = users.filter((u) => u.active);
  const inactive = users.filter((u) => !u.active);

  return (
    <div className="pt-tm">
      {!dbReady && (
        <div className="pt-note pt-note--warn">
          <strong>Database not connected.</strong> Adding and editing people needs the Supabase keys set on the
          server (<code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>). Until then you&rsquo;re the
          only one who can sign in, and changes here won&rsquo;t save.
        </div>
      )}

      <section className="pt-panel pt-tm__add">
        <h2 className="pt-panel__h">Add someone to the team</h2>
        <p className="pt-panel__sub">They&rsquo;ll be able to request a sign-in link straight away. Set their role now — you can fine-tune what they see below.</p>
        <form className="pt-tm__addform" onSubmit={submitAdd}>
          <label className="pt-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dean" required />
          </label>
          <label className="pt-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dean@advancedgas.com.au" required />
          </label>
          <label className="pt-field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="pt-btn pt-btn--orange" disabled={pending}>
            {pending ? "Adding…" : "Add person"}
          </button>
        </form>
        <p className="pt-tm__rolehint">{ROLE_BLURB[role]}</p>
        {addMsg && <div className={`pt-inline ${addMsg.ok ? "is-ok" : "is-err"}`}>{addMsg.text}</div>}
      </section>

      <section className="pt-tm__list">
        <div className="pt-tm__listhead">
          <h2 className="pt-panel__h">The team <span className="pt-tm__count">{active.length}</span></h2>
        </div>
        {active.map((u) => (
          <UserRow key={u.id || u.email} u={u} isMe={u.email === meEmail} onChanged={() => router.refresh()} />
        ))}

        {inactive.length > 0 && (
          <>
            <div className="pt-tm__listhead pt-tm__listhead--muted">
              <h2 className="pt-panel__h">Switched off <span className="pt-tm__count">{inactive.length}</span></h2>
            </div>
            {inactive.map((u) => (
              <UserRow key={u.id || u.email} u={u} isMe={u.email === meEmail} onChanged={() => router.refresh()} />
            ))}
          </>
        )}
      </section>
    </div>
  );
}

function UserRow({ u, isMe, onChanged }: { u: Row; isMe: boolean; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const locked = !!u.isOwner;

  const [role, setRole] = useState<Role>(u.role);
  const [caps, setCaps] = useState<Record<Cap, boolean>>(CAP_STATE(u));
  const [activeOn, setActiveOn] = useState<boolean>(u.active);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const original = { role: u.role, caps: CAP_STATE(u), active: u.active };
  const dirty =
    role !== original.role ||
    activeOn !== original.active ||
    CAPS.some(({ key }) => caps[key] !== original.caps[key]);

  function changeRole(r: Role) {
    setRole(r);
    // Pick a role → snap to that role's defaults, then tweak individual toggles.
    setCaps({
      overhead: roleDefault(r, "overhead"),
      manage_users: roleDefault(r, "manage_users"),
      reports_read: roleDefault(r, "reports_read"),
      reports_write: roleDefault(r, "reports_write"),
    });
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateMember({ id: u.id!, email: u.email, role, caps, active: activeOn });
      if (res.ok) {
        setMsg({ ok: true, text: "Saved." });
        onChanged();
      } else {
        setMsg({ ok: false, text: res.error || "Couldn't save." });
      }
    });
  }

  function remove() {
    setMsg(null);
    startTransition(async () => {
      const res = await removeMember({ id: u.id!, email: u.email });
      if (res.ok) onChanged();
      else {
        setMsg({ ok: false, text: res.error || "Couldn't remove." });
        setConfirmRemove(false);
      }
    });
  }

  return (
    <div className={`pt-user${u.active ? "" : " is-off"}`}>
      <div className="pt-user__id">
        <span className="pt-user__avatar" aria-hidden="true">{u.name.slice(0, 1).toUpperCase()}</span>
        <div className="pt-user__idtxt">
          <strong>{u.name}{isMe && <span className="pt-user__you">you</span>}{locked && <span className="pt-user__owner">owner</span>}</strong>
          <span>{u.email}</span>
        </div>
      </div>

      <div className="pt-user__controls">
        <label className="pt-field pt-field--inline">
          <span>Role</span>
          <select value={role} onChange={(e) => changeRole(e.target.value as Role)} disabled={locked || pending}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>

        <div className="pt-user__caps">
          {CAPS.map(({ key, label, desc }) => (
            <label key={key} className={`pt-switch${caps[key] ? " is-on" : ""}`} title={desc}>
              <input
                type="checkbox"
                checked={caps[key]}
                disabled={locked || pending}
                onChange={(e) => setCaps((c) => ({ ...c, [key]: e.target.checked }))}
              />
              <span className="pt-switch__track" aria-hidden="true"><span className="pt-switch__thumb" /></span>
              <span className="pt-switch__label">{label}</span>
            </label>
          ))}
        </div>

        <div className="pt-user__foot">
          <label className={`pt-switch pt-switch--sm${activeOn ? " is-on" : ""}`} title="Switch this person's access on or off">
            <input
              type="checkbox"
              checked={activeOn}
              disabled={locked || isMe || pending}
              onChange={(e) => setActiveOn(e.target.checked)}
            />
            <span className="pt-switch__track" aria-hidden="true"><span className="pt-switch__thumb" /></span>
            <span className="pt-switch__label">{activeOn ? "Access on" : "Access off"}</span>
          </label>

          <div className="pt-user__actions">
            {msg && <span className={`pt-inline pt-inline--sm ${msg.ok ? "is-ok" : "is-err"}`}>{msg.text}</span>}
            {!locked && !isMe && (
              confirmRemove ? (
                <>
                  <span className="pt-user__confirm">Remove {u.name}?</span>
                  <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" onClick={remove} disabled={pending}>Yes, remove</button>
                  <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setConfirmRemove(false)} disabled={pending}>Cancel</button>
                </>
              ) : (
                <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setConfirmRemove(true)} disabled={pending}>Remove</button>
              )
            )}
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" onClick={save} disabled={!dirty || locked || pending}>
              {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

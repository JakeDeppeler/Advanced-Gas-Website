"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRole } from "@/app/portal/roles/actions";
import type { Role } from "@/lib/portal/roles/types";
import type { Ladder } from "@/lib/portal/roles/ladder";
import { BLANK_ROLE, RoleForm } from "@/components/portal/roles/RoleForm";
import { LadderButton } from "@/components/portal/roles/LadderButton";

type Person = { id: string; name: string };

/**
 * The roles, as cards: each seat's name and line, and who's in it. A card
 * opens the role's own page with the whole of it. The owner adds roles here.
 */
export function RolesBoard({ roles, assign, people, canEdit, everyone, ladder }: {
  roles: Role[]; assign: Record<string, string>; people: Person[]; canEdit: boolean;
  everyone: { standards: string[]; attitude: string[]; deal: string[] }; ladder: Ladder;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [all, setAll] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); }, [msg]);
  const inRole = (id: string) => people.filter((p) => assign[p.id] === id);
  const unplaced = people.filter((p) => !assign[p.id] || !roles.some((r) => r.id === assign[p.id]));

  return (
    <div className="rl">
      <div className="rl-bar">
        <LadderButton ladder={ladder} />
        <button type="button" className="qp-btn line" onClick={() => setAll(true)}>What we expect of everyone</button>
      </div>

      <div className="rl-grid">
        {roles.map((r, i) => {
          const who = inRole(r.id);
          return (
            <Link key={r.id} href={`/portal/roles/${r.id}`} className={`rl-card t-${["gold", "forest", "orange", "dark"][i % 4]}`}>
              <span className="rl-name">{r.name}</span>
              <span className="rl-tag">{r.tagline}</span>
              <span className="rl-foot">
                <span className="rl-who">
                  {who.length ? who.map((p) => <span key={p.id} className="qp-av" title={p.name}>{p.name.slice(0, 1)}</span>) : <em>Nobody in it yet</em>}
                </span>
                {r.reportsTo && <span className="rl-rep">reports to {r.reportsTo}</span>}
              </span>
            </Link>
          );
        })}
        {canEdit && (
          <button type="button" className="qp-drop rl-add" onClick={() => setAdding(true)}>
            <span className="qp-dropi x" aria-hidden="true">+</span>
            <b>Add a role</b>
            <span>a seat of its own</span>
          </button>
        )}
      </div>
      {canEdit && unplaced.length > 0 && <p className="pk-note">Not in a role yet: {unplaced.map((p) => p.name).join(", ")}. Open a role and click their name to put them in it.</p>}

      {all && (
        <div className="qp-scrim mid" onClick={() => setAll(false)}>
          <div className="qp-panel mid rl-everyone" role="dialog" aria-modal="true" aria-labelledby="rl-all-h" onClick={(e) => e.stopPropagation()}>
            <div className="qp-ph">
              <span>Every role</span>
              <button type="button" className="qp-x" onClick={() => setAll(false)} aria-label="Close">×</button>
            </div>
            <h2 id="rl-all-h" className="rl-h">What we expect of everyone</h2>
            <section className="tb-points"><h3>The standard, whoever you are</h3><ol className="rv-points num">{everyone.standards.map((x) => <li key={x}>{x}</li>)}</ol></section>
            <section className="tb-points"><h3>Attitude</h3><ul className="rv-points dot">{everyone.attitude.map((x) => <li key={x}>{x}</li>)}</ul></section>
            <section className="tb-points"><h3>Our deal with you</h3><ul className="rv-points yes">{everyone.deal.map((x) => <li key={x}>{x}</li>)}</ul></section>
          </div>
        </div>
      )}
      {adding && (
        <div className="qp-scrim mid" onClick={() => setAdding(false)}>
          <div className="qp-panel mid rl-panel" role="dialog" aria-modal="true" aria-label="A new role" onClick={(e) => e.stopPropagation()}>
            <div className="qp-ph">
              <span>A new role</span>
              <button type="button" className="qp-x" onClick={() => setAdding(false)} aria-label="Close">×</button>
            </div>
            <RoleForm r={BLANK_ROLE} pending={pending} onCancel={() => setAdding(false)}
              onSave={(v) => start(async () => {
                const r = await saveRole(v);
                setMsg(r.ok ? "Role added." : r.error ?? "Couldn't add the role.");
                if (r.ok && r.id) router.push(`/portal/roles/${r.id}`);
              })} />
          </div>
        </div>
      )}
      {msg && <p className="qp-toast" role="status">{msg}</p>}
    </div>
  );
}

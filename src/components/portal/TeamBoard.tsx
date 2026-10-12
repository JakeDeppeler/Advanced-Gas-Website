"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CREW_LEVELS, type CrewLevel } from "@/lib/portal/crew";
import type { Role } from "@/lib/portal/caps";
import { setPersonLevel, saveTeamOrder } from "@/app/portal/team/actions";

/** `licence`: the worst licence state, when one has run out or is close. */
export type TeamPerson = { id: string; name: string; email: string; level: CrewLevel | ""; role: Role; licence?: "bad" | "mid" | null };

export function TeamBoard({ initial, canManage }: { initial: TeamPerson[]; canManage: boolean }) {
  const [order, setOrder] = useState<TeamPerson[]>(initial);
  const [, start] = useTransition();

  const groups = useMemo(() => {
    const g: { key: string; label: string; people: TeamPerson[] }[] = CREW_LEVELS.map((l) => ({
      key: l.key, label: l.label, people: order.filter((p) => p.level === l.key),
    })).filter((x) => x.people.length > 0);
    const none = order.filter((p) => !p.level || !CREW_LEVELS.some((l) => l.key === p.level));
    if (none.length) g.push({ key: "none", label: "No level set", people: none });
    return g;
  }, [order]);

  const persist = (arr: TeamPerson[]) => start(async () => { await saveTeamOrder({ ids: arr.map((p) => p.id) }); });

  function move(p: TeamPerson, dir: -1 | 1) {
    const idx = order.findIndex((x) => x.id === p.id);
    let swap = -1;
    for (let i = idx + dir; i >= 0 && i < order.length; i += dir) { if (order[i].level === p.level) { swap = i; break; } }
    if (swap < 0) return;
    const next = [...order];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrder(next);
    persist(next);
  }

  function changeLevel(id: string, level: CrewLevel) {
    setOrder((o) => o.map((x) => (x.id === id ? { ...x, level } : x)));
    start(async () => { await setPersonLevel({ userId: id, level }); });
  }

  return (
    <>
      {groups.map((g) => (
        <section key={g.key}>
          <div className="pk-lh">{g.label} <span style={{ color: "var(--ink3)" }}>{g.people.length}</span></div>
          <div className="pk-grp">
            {g.people.map((p, i) => (
              <div key={p.id} className="pk-row pk-crew">
                <span className="pk-av" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase() || "?"}</span>
                <span className="t">
                  <b>{p.name}</b>
                  <span>
                    {/* No email means they can't sign in — worth seeing at a
                        glance, so it says so rather than leaving a blank. */}
                    {p.email ? p.email : <span style={{ color: "var(--bad)", fontWeight: 600 }}>No login email yet</span>}
                    {p.licence && <span style={{ color: p.licence === "bad" ? "var(--bad)" : "var(--ink2)" }}> · licence {p.licence === "bad" ? "to renew" : "due soon"}</span>}
                  </span>
                </span>
                {canManage && (
                  <>
                    <span className="pk-mv">
                      <button type="button" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(p, -1)}>↑</button>
                      <button type="button" aria-label={`Move ${p.name} down`} disabled={i === g.people.length - 1} onClick={() => move(p, 1)}>↓</button>
                    </span>
                    <select className="pk-in" style={{ width: 170 }} aria-label={`${p.name}'s level`} value={p.level} onChange={(e) => changeLevel(p.id, e.target.value as CrewLevel)}>
                      <option value="" disabled>Level…</option>
                      {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </select>
                  </>
                )}
                <Link href={`/portal/team/${p.id}`} className="pk-btn g">Open ›</Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

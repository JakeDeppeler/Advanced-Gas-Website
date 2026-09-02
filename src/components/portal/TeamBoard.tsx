"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CREW_LEVELS, type CrewLevel } from "@/lib/portal/crew";
import type { Role } from "@/lib/portal/caps";
import { setPersonLevel, saveTeamOrder } from "@/app/portal/team/actions";

export type TeamPerson = { id: string; name: string; email: string; level: CrewLevel | ""; role: Role };

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
        <section key={g.key} className="pt-teamgroup">
          <h2 className="pt-cathead">{g.label} <span className="pt-tm__count">{g.people.length}</span></h2>
          <div className="pt-grid">
            {g.people.map((p, i) => (
              <div key={p.id} className="pt-card pt-tcard">
                <div className="pt-tcard__top">
                  <span className="pt-tcard__id">
                    <strong>{p.name}</strong>
                    <span>{p.email || "no login email"}</span>
                  </span>
                  <Link href={`/portal/team/${p.id}`} className="pt-tcard__open">Open →</Link>
                </div>
                {canManage && (
                  <div className="pt-tcard__ctrls">
                    <select className="pt-cap__type" value={p.level} onChange={(e) => changeLevel(p.id, e.target.value as CrewLevel)}>
                      <option value="" disabled>Level…</option>
                      {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </select>
                    <span className="pt-tcard__move">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(p, -1)}>↑</button>
                      <button type="button" aria-label="Move down" disabled={i === g.people.length - 1} onClick={() => move(p, 1)}>↓</button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

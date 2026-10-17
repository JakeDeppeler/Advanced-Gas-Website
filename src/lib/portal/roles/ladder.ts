import type { Role } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, " ").trim();

export type Ladder = {
  /** The climb on the tools, bottom rung first; a rung can hold two seats side by side. */
  rungs: Role[][];
  /** Seats off that climb: the office, and the destination seats. */
  others: Role[];
};

/**
 * The ladder, worked out from each role's "Grows into": the role it names is
 * the next rung up. Read from the words rather than kept as its own list, so
 * editing a role's "Grows into" moves it on the ladder too.
 *
 * Field Manager's "Grows into" describes who grows into it ("a strong Leading
 * Hand..."), which would loop back down; an edge to a seat already on the way
 * up is ignored, so a loop can't stand the ladder on its head.
 */
export function ladderOf(roles: Role[]): Ladder {
  const ups = new Map<string, Role[]>();
  for (const r of roles) {
    const g = norm(r.growsInto);
    ups.set(r.id, g ? roles.filter((o) => o.id !== r.id && g.includes(norm(o.name))) : []);
  }
  const into = new Set([...ups.values()].flat().map((r) => r.id));
  const rung = new Map<string, number>();
  const climb = (r: Role, n: number, path: Set<string>) => {
    if ((rung.get(r.id) ?? -1) >= n) return;
    rung.set(r.id, n);
    path.add(r.id);
    for (const up of ups.get(r.id) ?? []) if (!path.has(up.id)) climb(up, n + 1, path);
    path.delete(r.id);
  };
  // The longest climb starts from a seat nobody grows into and that leads somewhere.
  const roots = roles.filter((r) => !into.has(r.id) && (ups.get(r.id)?.length ?? 0) > 0);
  const longest = roots
    .map((r) => { rung.clear(); climb(r, 0, new Set()); return { r, rung: new Map(rung) }; })
    .sort((a, b) => b.rung.size - a.rung.size)[0];
  if (!longest) return { rungs: [], others: roles };
  const rungs: Role[][] = [];
  for (const r of roles) {
    const n = longest.rung.get(r.id);
    if (n == null) continue;
    (rungs[n] ??= []).push(r);
  }
  return { rungs: rungs.filter(Boolean), others: roles.filter((r) => !longest.rung.has(r.id)) };
}

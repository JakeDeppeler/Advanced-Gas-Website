import "server-only";
import { cache } from "react";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { mondayOf } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";
import { LEVEL_BILLABLE } from "@/lib/portal/crew";

type Sheet = { technician_id: number | null; dispatched_on: string | null; arrived_on: string | null; done_on: string | null; active: boolean | null };

const hoursBetween = (a: string | null, b: string | null) => (a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 3_600_000) : 0);
/** A visit longer than a working day is a clock left running, not a day on site. */
export const MAX_VISIT_HRS = 12;

export type ToolsRow = { name: string; roster: number | null; field: boolean; lastOn: number; lastTravel: number; lastVisits: number; fourOn: number; fourTravel: number; fourVisits: number };
export type OnTheTools = { rows: ToolsRow[]; lastOn: number; lastTravel: number; lastRoster: number; lastVisits: number; lastMonday: Date };

/**
 * Time on the tools, by person, from ServiceTitan's own clock-ins: arrived to
 * done on each visit, with dispatched to arrived as the drive. Against the week
 * their card on Our numbers says they're rostered for. One loader, so the Hours
 * page and the Scoreboard tile can't disagree.
 */
export const onTheTools = cache(async (): Promise<OnTheTools> => {
  const thisMonday = mondayOf(localToday());
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86_400_000);
  const fourBack = new Date(thisMonday.getTime() - 28 * 86_400_000);

  const ready = dbConfigured();
  const [sheets, techs, users] = ready
    ? await Promise.all([
        sbSelect<Sheet>("st_timesheets", [q.select("technician_id,dispatched_on,arrived_on,done_on,active"), q.gte("arrived_on", fourBack.toISOString()), "limit=5000"].join("&")).catch(() => [] as Sheet[]),
        sbSelect<{ id: number; name: string | null }>("st_technicians", q.select("id,name")).catch(() => []),
        listUsers().catch(() => []),
      ])
    : [[] as Sheet[], [], []];

  const techName = new Map(techs.map((t) => [t.id, t.name ?? `Tech ${t.id}`]));
  // ServiceTitan spells some names differently from the portal ("Winbanks"),
  // so the rostered week is matched on first name, then on the whole name.
  const rostered = (name: string) => {
    const first = name.trim().split(/\s+/)[0].toLowerCase();
    const u = users.find((x) => x.active && x.name.trim().toLowerCase() === name.trim().toLowerCase())
      ?? users.find((x) => x.active && x.name.trim().split(/\s+/)[0].toLowerCase() === first);
    return { hrs: u?.costing?.hrsWeek ?? null, field: u?.level ? LEVEL_BILLABLE[u.level] : true };
  };

  type P = { name: string; lastOn: number; lastTravel: number; lastVisits: number; fourOn: number; fourTravel: number; fourVisits: number };
  const people = new Map<number, P>();
  for (const s of sheets) {
    if (s.active === false || !s.arrived_on || !s.done_on || s.technician_id == null) continue;
    const on = hoursBetween(s.arrived_on, s.done_on);
    if (on <= 0 || on > MAX_VISIT_HRS) continue;
    const travel = Math.min(3, hoursBetween(s.dispatched_on, s.arrived_on));
    const p = people.get(s.technician_id) ?? { name: techName.get(s.technician_id) ?? "Someone", lastOn: 0, lastTravel: 0, lastVisits: 0, fourOn: 0, fourTravel: 0, fourVisits: 0 };
    const at = Date.parse(s.arrived_on);
    if (at < thisMonday.getTime()) { p.fourOn += on; p.fourTravel += travel; p.fourVisits += 1; }
    if (at >= lastMonday.getTime() && at < thisMonday.getTime()) { p.lastOn += on; p.lastTravel += travel; p.lastVisits += 1; }
    people.set(s.technician_id, p);
  }
  const rows: ToolsRow[] = [...people.values()].map((p) => { const r = rostered(p.name); return { ...p, roster: r.hrs, field: r.field }; }).sort((a, b) => b.fourOn - a.fourOn);

  // The headline is the field crew's: the office's odd visit (an owner
  // quoting) would drag the share down for a reason that isn't the crew's.
  const field = rows.filter((r) => r.field);
  const lastOn = field.reduce((n, r) => n + r.lastOn, 0);
  const lastTravel = field.reduce((n, r) => n + r.lastTravel, 0);
  const lastRoster = field.filter((r) => r.lastVisits > 0 && r.roster).reduce((n, r) => n + (r.roster as number), 0);
  const lastVisits = field.reduce((n, r) => n + r.lastVisits, 0);
  return { rows, lastOn, lastTravel, lastRoster, lastVisits, lastMonday };
});

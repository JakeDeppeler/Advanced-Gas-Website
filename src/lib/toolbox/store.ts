import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { onOrAfter, SEED_TOPICS, type Schedule, type Session, type SessionNote, type ToolboxState } from "./types";

const KEY = "toolbox";
/** Kept a long way back: a talk record is what shows the crew was told. */
const KEEP_TALKS = 2000;

type Saved = Partial<ToolboxState> & { plan?: Partial<Schedule> };

/** Topics and talks; the starting topics until anything is saved. */
export async function loadToolbox(): Promise<ToolboxState> {
  const s = await getSettings<Saved>(KEY).catch(() => null);
  return {
    topics: Array.isArray(s?.topics) ? s.topics : SEED_TOPICS,
    talks: Array.isArray(s?.talks) ? s.talks : [],
  };
}

/** Kept with the topics, and the schedule with them, so saving one never drops the other. */
export async function saveToolbox(state: ToolboxState) {
  const s = await getSettings<Saved>(KEY).catch(() => null);
  return saveSettings(KEY, { ...(s ?? {}), topics: state.topics, talks: state.talks.slice(0, KEEP_TALKS) });
}

/** How often the talk is: every Monday until someone says otherwise. */
export async function loadSchedule(today: string): Promise<Schedule> {
  const p = (await getSettings<Saved>(KEY).catch(() => null))?.plan;
  const every = p?.every === "fortnight" || p?.every === "month" ? p.every : "week";
  const day = p?.day && p.day >= 1 && p.day <= 5 ? p.day : 1;
  return {
    every, day, start: typeof p?.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.start) ? p.start : onOrAfter(today, day),
    time: typeof p?.time === "string" && /^\d{2}:\d{2}$/.test(p.time) ? p.time : null,
    runBy: typeof p?.runBy === "string" && p.runBy.trim() ? p.runBy : null,
    expected: Array.isArray(p?.expected) ? p.expected.filter((x): x is string => typeof x === "string") : [],
  };
}

export async function saveSchedule(plan: Schedule) {
  const s = await getSettings<Saved>(KEY).catch(() => null);
  return saveSettings(KEY, { ...(s ?? {}), plan });
}

type Row = { on_date: string; notes: SessionNote[] | null; record: string | null; who: string[] | null; recorded_by: string | null; recorded_at: string | null };
const fromRow = (r: Row): Session => ({ on: r.on_date, notes: Array.isArray(r.notes) ? r.notes : [], record: r.record, who: r.who ?? [], recordedBy: r.recorded_by, recordedAt: r.recorded_at });

/** Every date between `from` and `to` (both included) with something on it. */
export async function loadSessions(from: string, to: string): Promise<Session[]> {
  const rows = await sbSelect<Row>("toolbox_sessions", `select=on_date,notes,record,who,recorded_by,recorded_at&on_date=gte.${from}&on_date=lte.${to}&order=on_date.desc`);
  return rows.map(fromRow);
}

export async function loadSession(on: string): Promise<Session | null> {
  const [r] = await sbSelect<Row>("toolbox_sessions", `select=on_date,notes,record,who,recorded_by,recorded_at&on_date=eq.${on}&limit=1`);
  return r ? fromRow(r) : null;
}

export async function saveSession(s: Session) {
  await sbUpsert("toolbox_sessions", [{
    on_date: s.on, notes: s.notes, record: s.record, who: s.who, recorded_by: s.recordedBy, recorded_at: s.recordedAt, updated_at: new Date().toISOString(),
  }], "on_date");
}

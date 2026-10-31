/**
 * Toolbox talks: the topics to walk the crew through, and a record of each
 * talk as it was given (when, who was there, what was said, what was agreed).
 * Shared by the page and the server.
 */
export type Topic = { id: string; title: string; points: string[]; addedBy: string | null; at: string };
export type Talk = { id: string; topicId: string | null; title: string; on: string; by: string | null; who: string[]; notes: string; actions: string; at: string };
export type ToolboxState = { topics: Topic[]; talks: Talk[] };

/**
 * Starting topics for a gas and air-con crew, until the office writes its own.
 * Each is a few points to walk through, not a lecture: the talk is the crew
 * talking, and the record is what they said.
 */
export const SEED_TOPICS: Topic[] = [
  { id: "heights", title: "Working on roofs and ladders", points: ["Ladder footed and tied off, three points of contact", "Roof pitch, wet or dusty tiles: when we don't go up", "Edge protection or a harness on two-storey jobs", "Carrying gear up: rope it, don't climb with it"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "gas-leak", title: "Smelling gas on a job", points: ["Isolate at the meter, no switches, no flames", "Get people out and ventilate", "Leak test before and after every gas connection", "Who to ring, and what goes in the job notes"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "refrigerant", title: "Refrigerant handling", points: ["ARC licence: who can recover, charge and decant", "Recover, never vent", "Bottles upright, chained and in date in the van", "Gloves and glasses when breaking a line"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "isolation", title: "Isolating power before work", points: ["Isolate, lock out, tag", "Test it's dead before touching", "What we wire and what the electrician wires", "Tell the customer before the power goes off"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "lifting", title: "Lifting condensers and ducted units", points: ["Two people for anything over 20 kg", "Trolley or lifting straps, not backs", "Plan the path before you pick it up", "Brackets and pads: check before the unit goes on"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "heat", title: "Heat stress in summer", points: ["Roof spaces over 40°C: work early, short stints", "Water on the van, drink before you're thirsty", "Signs in each other: dizzy, confused, stopped sweating", "It's fine to stop the job"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
  { id: "asbestos", title: "Asbestos in older homes", points: ["Pre-1990 homes: assume it until told otherwise", "Eaves, flues and old ducting are where we find it", "Don't drill, cut or break it: stop and ring the office", "Note it on the job for the next crew"], addedBy: null, at: "2026-10-01T00:00:00.000Z" },
];

/* ---------------------------------------------------------------- the schedule */

/**
 * How often the talk is: every week or fortnight on a weekday, or once a
 * month on the first of that weekday. `start` anchors a fortnight, so it
 * keeps falling on the same Mondays when the page is opened on an off week.
 */
export type Every = "week" | "fortnight" | "month";
export type Schedule = { every: Every; day: 1 | 2 | 3 | 4 | 5; start: string };
export const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const EVERY_WORDS: Record<Every, string> = { week: "Every week", fortnight: "Every fortnight", month: "Once a month" };

/** A note on what to talk about, with its heading. */
export type SessionNote = { id: string; head: string; text: string; by: string | null; at: string };
/** One date on the schedule and what's on it. A date with nothing on it has no row. */
export type Session = { on: string; notes: SessionNote[]; record: string | null; who: string[]; recordedBy: string | null; recordedAt: string | null };

const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** The first date on or after `iso` that falls on weekday `day` (1 Monday … 5 Friday). */
export const onOrAfter = (iso: string, day: number) => addDays(iso, (day - dow(iso) + 7) % 7);

/** The first `day` of the month `iso` is in. */
const firstOfMonth = (iso: string, day: number) => onOrAfter(`${iso.slice(0, 8)}01`, day);

/** The talk on or after `iso`. */
export function nextOn(s: Schedule, iso: string): string {
  if (s.every === "week") return onOrAfter(iso, s.day);
  if (s.every === "month") {
    const f = firstOfMonth(iso, s.day);
    if (f >= iso) return f;
    const n = new Date(`${iso.slice(0, 8)}01T12:00:00Z`); n.setUTCMonth(n.getUTCMonth() + 1);
    return firstOfMonth(n.toISOString().slice(0, 10), s.day);
  }
  const a = onOrAfter(s.start, s.day);
  const gap = Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
  // Before the anchor as well as after it: the fortnights run both ways.
  return addDays(a, Math.ceil(gap / 14) * 14 || 0);
}

/**
 * The talk before `iso`. A week or a fortnight back from it holds exactly one
 * talk, so it's the first on or after that day.
 */
export function prevOn(s: Schedule, iso: string): string {
  if (s.every === "week") return onOrAfter(addDays(iso, -7), s.day);
  if (s.every === "fortnight") return nextOn(s, addDays(iso, -14));
  const p = new Date(`${iso.slice(0, 8)}01T12:00:00Z`); p.setUTCMonth(p.getUTCMonth() - 1);
  const f = firstOfMonth(iso, s.day);
  return f < iso ? f : firstOfMonth(p.toISOString().slice(0, 10), s.day);
}

/** `n` talks from `iso` on, the first being the one on or after it. */
export function upcoming(s: Schedule, iso: string, n: number): string[] {
  const out: string[] = [];
  let d = nextOn(s, iso);
  while (out.length < n) { out.push(d); d = nextOn(s, addDays(d, 1)); }
  return out;
}

/** `n` talks before `iso`, newest first. */
export function past(s: Schedule, iso: string, n: number): string[] {
  const out: string[] = [];
  let d = iso;
  while (out.length < n) { d = prevOn(s, d); out.push(d); }
  return out;
}

/** What a talk is called: "Week of Mon 2 Nov", "November", "Fortnight from Mon 2 Nov". */
export function talkName(s: Schedule, iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (s.every === "month") return `${d.toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" })} toolbox talk`;
  const day = d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");
  return s.every === "week" ? `Week of ${day}` : `Fortnight from ${day}`;
}

/**
 * Which sound each of the wall board's pop-ups makes, and how loud.
 *
 * Shared by the portal's Sounds page, the server and the board itself, so it
 * carries no server code. The board is sent the choices with its remote and
 * plays them from there; nothing about a sound is fixed in the board's code
 * any more except the two clips that ship with it.
 */

export type SoundKind = "quote" | "done" | "sold";

export const SOUND_KINDS: Array<{ kind: SoundKind; label: string; when: string; holdSec: number }> = [
  { kind: "quote", label: "New quote", when: "A quote goes out on a job", holdSec: 7 },
  { kind: "done", label: "Job completed", when: "A job is finished — time to bill", holdSec: 9 },
  { kind: "sold", label: "Sold!", when: "A job is sold", holdSec: 11 },
];

/**
 * What a pop-up plays:
 *   builtin:quote / builtin:sold — the two clips in public/sounds
 *   file:<id>                    — one uploaded on the Sounds page
 *   notes                        — the board's own short beeps
 *   off                          — nothing
 */
export type SoundRef = string;

export const BUILTINS: Array<{ ref: SoundRef; name: string; file: string }> = [
  { ref: "builtin:quote", name: "Homer (built in)", file: "quote.mp3" },
  { ref: "builtin:sold", name: "Money bar (built in)", file: "sold.mp3" },
];

export type SoundChoice = { sound: SoundRef; volume: number };
export type SoundPlan = Record<SoundKind, SoundChoice>;

/** How the board sounded before anyone chose: what was in its code. */
export const DEFAULT_PLAN: SoundPlan = {
  quote: { sound: "builtin:quote", volume: 1 },
  done: { sound: "builtin:quote", volume: 1 },
  sold: { sound: "builtin:sold", volume: 0.85 },
};

/**
 * Loudness runs from silent to one and a half times the file as recorded. Past
 * that a clip that was already loud only distorts; a quiet one wants a louder
 * file, not more gain.
 */
export const MAX_VOLUME = 1.5;

export type SoundFile = {
  id: string;
  name: string;
  /** Where it sits in storage. Never sent to the board. */
  path: string;
  bytes: number;
  /** Measured in the browser when it was uploaded. Null if it couldn't be. */
  seconds: number | null;
  addedBy: string | null;
  addedAt: string;
};

const ID = /^[0-9a-f-]{36}$/i;

export function isRef(v: unknown): v is SoundRef {
  return typeof v === "string" && (v === "notes" || v === "off" || BUILTINS.some((b) => b.ref === v) || (v.startsWith("file:") && ID.test(v.slice(5))));
}

const vol = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(MAX_VOLUME, Math.max(0, Math.round(v * 100) / 100)) : d);

/** Whatever arrived, as a plan the board can trust; anything unreadable falls back to how it sounded before. */
export function normalisePlan(v: unknown): SoundPlan {
  const r = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const out = { ...DEFAULT_PLAN };
  for (const { kind } of SOUND_KINDS) {
    const c = r[kind] as Record<string, unknown> | undefined;
    out[kind] = c && typeof c === "object"
      ? { sound: isRef(c.sound) ? c.sound : DEFAULT_PLAN[kind].sound, volume: vol(c.volume, DEFAULT_PLAN[kind].volume) }
      : DEFAULT_PLAN[kind];
  }
  return out;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

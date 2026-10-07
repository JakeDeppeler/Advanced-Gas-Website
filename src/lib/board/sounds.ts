import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { deletePhoto } from "@/lib/portal/storage";
import { DEFAULT_PLAN, normalisePlan, SOUND_KINDS, type SoundFile, type SoundPlan } from "@/lib/board/soundTypes";

/**
 * The wall board's sounds: the files uploaded for it, and which one each
 * pop-up plays at what volume.
 *
 * One settings row, because it is a handful of choices and a short list of
 * files, written by a person on a page and read by the board with its remote.
 * The files themselves sit in storage beside the van photos, under
 * board-sounds/, and reach the television through /api/screen/sound.
 */

const KEY = "board-sounds";

type Stored = { plan?: unknown; files?: SoundFile[] };

export async function readSounds(): Promise<{ plan: SoundPlan; files: SoundFile[] }> {
  const s = await getSettings<Stored>(KEY).catch(() => null);
  const files = Array.isArray(s?.files) ? s.files.filter((f) => f && typeof f.id === "string" && typeof f.path === "string") : [];
  const plan = normalisePlan(s?.plan);
  // A choice pointing at a file that has gone plays what the board played before.
  const have = new Set(files.map((f) => `file:${f.id}`));
  for (const { kind } of SOUND_KINDS) {
    if (plan[kind].sound.startsWith("file:") && !have.has(plan[kind].sound)) plan[kind] = { ...DEFAULT_PLAN[kind], volume: plan[kind].volume };
  }
  return { plan, files };
}

/** What the board is sent: the plan alone. Where the files live stays on the server. */
export async function soundPlan(): Promise<SoundPlan> {
  return (await readSounds()).plan;
}

async function write(plan: SoundPlan, files: SoundFile[]): Promise<{ ok: boolean }> {
  return saveSettings(KEY, { plan, files });
}

export async function savePlan(next: SoundPlan): Promise<{ ok: boolean; error?: string }> {
  const { files } = await readSounds();
  const have = new Set(files.map((f) => `file:${f.id}`));
  const plan = normalisePlan(next);
  for (const { kind, label } of SOUND_KINDS) {
    if (plan[kind].sound.startsWith("file:") && !have.has(plan[kind].sound)) return { ok: false, error: `The sound picked for ${label} has been deleted.` };
  }
  return write(plan, files);
}

export async function addFile(f: SoundFile): Promise<{ ok: boolean }> {
  const { plan, files } = await readSounds();
  return write(plan, [...files, f].slice(-40));
}

export async function renameFile(id: string, name: string): Promise<{ ok: boolean }> {
  const { plan, files } = await readSounds();
  return write(plan, files.map((f) => (f.id === id ? { ...f, name: name.trim().slice(0, 80) || f.name } : f)));
}

/**
 * Delete an uploaded sound. Any pop-up using it goes back to what it played
 * before anyone chose, at the volume it was set to — so the wall never goes
 * quiet because a file was tidied away.
 */
export async function removeFile(id: string): Promise<{ ok: boolean; reset: string[] }> {
  const { plan, files } = await readSounds();
  const f = files.find((x) => x.id === id);
  if (!f) return { ok: true, reset: [] };
  const reset: string[] = [];
  for (const { kind, label } of SOUND_KINDS) {
    if (plan[kind].sound === `file:${id}`) {
      plan[kind] = { sound: DEFAULT_PLAN[kind].sound, volume: plan[kind].volume };
      reset.push(label);
    }
  }
  const res = await write(plan, files.filter((x) => x.id !== id));
  if (res.ok) await deletePhoto(f.path).catch(() => undefined);
  return { ok: res.ok, reset };
}

export async function fileById(id: string): Promise<SoundFile | null> {
  return (await readSounds()).files.find((f) => f.id === id) ?? null;
}

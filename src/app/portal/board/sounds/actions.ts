"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { uploadPhoto } from "@/lib/portal/storage";
import { addFile, removeFile, renameFile, savePlan } from "@/lib/board/sounds";
import { normalisePlan, type SoundKind, type SoundPlan } from "@/lib/board/soundTypes";
import { showDemo } from "@/app/portal/board/remote/actions";

export type SoundResult = { ok: boolean; error?: string; note?: string };

/** The same people who run the wall board's remote. */
async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

/**
 * Four megabytes is minutes of MP3 — far longer than any pop-up holds the
 * wall — and under what a request can carry here. A bigger file is almost
 * always the wrong one.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export async function uploadSound(form: FormData): Promise<SoundResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick an MP3 file." };
  const isMp3 = /\.mp3$/i.test(file.name) || file.type === "audio/mpeg" || file.type === "audio/mp3";
  if (!isMp3) return { ok: false, error: "That isn't an MP3. Save it as .mp3 and try again." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That file is over 4MB — far longer than a pop-up. Trim it to a few seconds." };
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || file.name.replace(/\.mp3$/i, "").slice(0, 80);
  const secs = Number(form.get("seconds"));
  const id = randomUUID();
  const path = `board-sounds/${id}.mp3`;
  const up = await uploadPhoto(path, await file.arrayBuffer(), "audio/mpeg");
  if (!up.ok) return { ok: false, error: up.error === "not-configured" ? "File storage isn't set up." : "Couldn't upload it. Try again." };
  const res = await addFile({
    id, name, path, bytes: file.size,
    seconds: Number.isFinite(secs) && secs > 0 ? Math.round(secs * 10) / 10 : null,
    addedBy: me.name, addedAt: new Date().toISOString(),
  });
  if (!res.ok) return { ok: false, error: "Uploaded, but couldn't add it to the list. Try again." };
  revalidatePath("/portal/board/sounds");
  return { ok: true, note: `${name} is uploaded. Pick it for a pop-up above.` };
}

export async function saveSounds(plan: SoundPlan): Promise<SoundResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const res = await savePlan(normalisePlan(plan));
  if (!res.ok) return { ok: false, error: res.error ?? "Couldn't save that." };
  revalidatePath("/portal/board/sounds");
  return { ok: true, note: "Saved. The TV picks it up within about ten seconds." };
}

export async function renameSound(id: string, name: string): Promise<SoundResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  if (!name.trim()) return { ok: false, error: "Give it a name." };
  const res = await renameFile(id, name);
  if (!res.ok) return { ok: false, error: "Couldn't rename it." };
  revalidatePath("/portal/board/sounds");
  return { ok: true };
}

export async function deleteSound(id: string): Promise<SoundResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const res = await removeFile(id);
  if (!res.ok) return { ok: false, error: "Couldn't delete it." };
  revalidatePath("/portal/board/sounds");
  return { ok: true, note: res.reset.length ? `Deleted. ${res.reset.join(" and ")} went back to the built-in sound.` : "Deleted." };
}

/** One run of the pop-up on the TV, to hear the sound in the room. */
export async function playOnTv(kind: SoundKind): Promise<SoundResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const r = await showDemo(kind, { once: true });
  return r.ok ? { ok: true, note: "Sent to the TV — it plays within about ten seconds." } : { ok: false, error: r.error ?? "Couldn't reach the TV." };
}

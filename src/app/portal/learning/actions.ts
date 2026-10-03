"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { createVideo, markWatched, unmarkWatched } from "@/lib/portal/db";
import { extractYouTubeId, isStored } from "@/lib/portal/videos";

export type LearningResult = { ok: boolean; error?: string };

/** Anyone can mark their own watching. It is their record, not a manager's. */
export async function setWatched(input: { videoId: string; watched: boolean }): Promise<LearningResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Not signed in." };
  // A video that only exists in the fallback constant has no row to point at,
  // so there is nothing to record against until it is added properly.
  if (!isStored(input.videoId)) {
    return { ok: false, error: "This one isn't loaded in yet, so there's nothing to tick." };
  }
  const res = input.watched
    ? await markWatched(input.videoId, me.email)
    : await unmarkWatched(input.videoId, me.email);
  if (!res.ok) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/portal/learning", "layout");
  revalidatePath("/trade/videos");
  return { ok: true };
}

export async function addVideo(input: {
  track: string; category: string; title: string; description: string;
  youtubeId: string; minutes: string; sopCode: string;
}): Promise<LearningResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can add a video." };
  if (!input.title.trim()) return { ok: false, error: "Give it a title." };

  // Paste a whole YouTube URL and it still works — pulling the id out here
  // beats a validation message about a format nobody remembers.
  const id = extractYouTubeId(input.youtubeId.trim());
  const mins = input.minutes.trim() === "" ? null : Number(input.minutes.replace(/[^0-9]/g, ""));

  const res = await createVideo({
    track: input.track, category: input.category.trim() || "Install standards",
    title: input.title.trim(), description: input.description.trim(),
    youtubeId: id, minutes: Number.isFinite(mins as number) ? (mins as number) : null,
    sopCode: input.sopCode.trim().toUpperCase(),
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected." : "Couldn't save it." };
  revalidatePath("/portal/learning", "layout");
  revalidatePath("/trade/videos");
  return { ok: true };
}

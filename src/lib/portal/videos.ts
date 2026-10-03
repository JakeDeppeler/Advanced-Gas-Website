/**
 * The method videos.
 *
 * The list used to be a constant with six entries and no video behind any of
 * them. It lives in the database now so a video can be added the day it is
 * filmed — but the constant stays as the fallback, so an empty table shows the
 * six titles that were always there rather than an empty shelf.
 */

import { VIDEOS, type LearningTrackSlug } from "./content";

export type Video = {
  id: string;
  track: LearningTrackSlug;
  category: string;
  title: string;
  description: string | null;
  /** Just the id. Null means it is on the list but not filmed or not loaded. */
  youtubeId: string | null;
  minutes: number | null;
  /** The procedure it shows, if it shows one. */
  sopCode: string | null;
  watched: boolean;
  /** When it was added, for "new this week". Absent on the built-in list. */
  addedAt?: string | null;
};

/** A stable id for a video that only exists in the constant. */
export const fallbackId = (track: string, title: string) =>
  `const:${track}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export const isStored = (id: string) => !id.startsWith("const:");

/**
 * The stored videos, topped up from the constant.
 *
 * A stored row wins over a constant entry with the same track and title, so
 * loading a youtubeId in for one of the original six replaces it rather than
 * listing it twice.
 */
export function mergeVideos(stored: Video[], watchedIds: Set<string>): Video[] {
  const seen = new Set(stored.map((v) => `${v.track}|${v.title}`));
  const fromConst: Video[] = VIDEOS.filter((v) => !seen.has(`${v.track}|${v.title}`)).map((v) => ({
    id: fallbackId(v.track, v.title),
    track: v.track,
    category: v.category,
    title: v.title,
    description: v.description,
    youtubeId: v.youtubeId ?? null,
    minutes: v.minutes ?? null,
    sopCode: null,
    watched: false,
  }));
  return [...stored, ...fromConst].map((v) => ({ ...v, watched: watchedIds.has(v.id) }));
}

export const onTrack = (all: Video[], track: string) => all.filter((v) => v.track === track);

/** The next two on the same track — what the player offers when one ends. */
export function upNext(all: Video[], current: Video, n = 2): Video[] {
  const same = onTrack(all, current.track);
  const at = same.findIndex((v) => v.id === current.id);
  return [...same.slice(at + 1), ...same.slice(0, Math.max(0, at))].slice(0, n);
}

/**
 * The id out of whatever got pasted.
 *
 * Accepts a bare id, a watch URL, a youtu.be link, a short or an embed URL.
 * Nobody remembers which part of a YouTube link is the id, and a validation
 * error about it is a worse experience than just handling every shape of it.
 */
export function extractYouTubeId(input: string): string {
  if (!input) return "";
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(input);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,}$/.test(input) ? input : "";
}

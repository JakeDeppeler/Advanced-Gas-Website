"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { readStandardTimes, saveStandardTimes, type StandardHours } from "@/lib/board/standardTimes";

export type TimesResult = { ok: boolean; error?: string };

/** The same people who run the wall board's remote. */
async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

export async function setStandardTime(jobType: string, hours: number | null): Promise<TimesResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const name = String(jobType ?? "").trim();
  if (!name) return { ok: false, error: "No job type." };
  if (hours != null && (!Number.isFinite(hours) || hours <= 0 || hours > 24)) {
    return { ok: false, error: "Give it between 0 and 24 hours." };
  }

  /*
   * Read, change one, write back.
   *
   * The whole map is one settings row, so two people editing different job
   * types at the same minute would otherwise have the last save win and throw
   * the other away. The window is small and the page is used by one person at a
   * time, but a lost setting here is a wrong figure on a wall that nobody would
   * trace back to a race.
   */
  const { rows } = await readStandardTimes();
  const map: StandardHours = {};
  for (const r of rows) if (r.hours != null) map[r.name] = r.hours;
  if (hours == null) delete map[name];
  else map[name] = hours;

  await saveStandardTimes(map);
  revalidatePath("/portal/board/times");
  return { ok: true };
}

/**
 * Which of ServiceTitan's job tags mean a job is waiting on something, and
 * whose move it is — the setting behind the portal's Stuck page.
 *
 * The office uses tags for exactly this, but it uses them for other things
 * too: of the 44 tags in use, "Potential Member" sits on 63 open jobs and means
 * somebody might buy a membership. So the page has to be told which ones are
 * holds, and the default (in `onHoldTypes.ts`) is a guess at the office's own
 * grammar of waiting, not the answer.
 */

import { getSettings, saveSettings } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";

import {
  HOLD_TAGS_KEY,
  blocksByDefault,
  holdRules,
  normaliseHoldTags,
  sideByDefault,
  tagIds,
  type HoldSide,
  type HoldTags,
} from "@/lib/dashboard/onHoldTypes";

export { HOLD_TAGS_KEY, type HoldTags, type HoldSide };

/** Statuses the board counts as open. Kept in step with onHold.ts. */
const OPEN = ["Scheduled", "InProgress", "Hold"];

export type HoldTagRow = {
  name: string;
  /** Open jobs carrying it, so the list sorts by what is actually in play. */
  open: number;
  /** Null when the tag is not a hold at all. */
  side: HoldSide | null;
  /** What the default would say, for the "back to the defaults" line. */
  byDefault: HoldSide | null;
};

export async function readHoldTags(): Promise<{ rows: HoldTagRow[]; configured: boolean; held: number }> {
  const [saved, tags, jobs] = await Promise.all([
    getSettings<unknown>(HOLD_TAGS_KEY).catch(() => null),
    sbSelect<{ id: number; name: string | null }>("st_job_tags", q.select("id,name")).catch(() => []),
    sbSelect<{ id: number; tags: unknown }>(
      "st_jobs",
      [q.select("id,tags:raw->tagTypeIds"), `status=in.(${OPEN.join(",")})`].join("&"),
    ).catch(() => []),
  ]);

  const byId = new Map(tags.map((t) => [Number(t.id), (t.name ?? "").trim()]).filter(([, n]) => !!n) as [number, string][]);
  const { side, configured } = holdRules(normaliseHoldTags(saved), [...byId.values()]);

  const open = new Map<string, number>();
  let held = 0;
  for (const j of jobs) {
    // Through the board's own reader, so the portal counts a job held on
    // exactly the rows the board does. See tagIds in onHoldTypes.ts.
    const ids = tagIds(j.tags);
    let isHeld = false;
    for (const id of ids) {
      const name = byId.get(id);
      if (!name) continue;
      open.set(name, (open.get(name) ?? 0) + 1);
      if (side.has(name)) isHeld = true;
    }
    if (isHeld) held++;
  }

  const rows: HoldTagRow[] = [...new Set(byId.values())].map((name) => ({
    name,
    open: open.get(name) ?? 0,
    side: side.get(name) ?? null,
    byDefault: blocksByDefault(name) ? sideByDefault(name) : null,
  }));

  // Holds first, then whatever is most in play: the tags worth arguing about
  // are the ones on open work, and forty rows sorted by name buries them.
  rows.sort((a, b) => Number(!!b.side) - Number(!!a.side) || b.open - a.open || a.name.localeCompare(b.name));
  return { rows, configured, held };
}

/** The whole list, written in one row. Null clears it back to the defaults. */
export async function saveHoldTags(next: HoldTags | null): Promise<void> {
  await saveSettings(HOLD_TAGS_KEY, next == null ? null : normaliseHoldTags(next));
}

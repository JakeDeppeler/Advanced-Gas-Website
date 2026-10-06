import "server-only";
import { stList } from "@/lib/dashboard/servicetitan";
import { q, sbSelect, sbSelectOne, sbUpdate, sbUpsert } from "@/lib/dashboard/db";

/**
 * ServiceTitan's journal entries, copied read-only into st_journal_entries.
 *
 * ServiceTitan's Xero integration does the posting — each entry becomes a
 * manual journal in Xero — and marks the entry Synced, or Error with a
 * message. This copies those marks so the portal can say when one fails. It
 * never writes back: a second poster would double the books.
 *
 * There is no export feed for journal entries (the other resources page
 * through `export/…` with a continuation token), so it reads the list three
 * ways each run:
 *
 *  1. everything modified since the last run, a little overlapped;
 *  2. every entry ServiceTitan currently has as Error, NotSynced, InProgress or
 *     OutOfSync — the open problems, read whole each time, so the count on the
 *     wall is ServiceTitan's count and not ours;
 *  3. anything we hold as a problem that (2) didn't return, by id, so an entry
 *     fixed in ServiceTitan clears here even if fixing it didn't move its
 *     modified date.
 *
 * Needs the API app's Journal Entries read scope (tn.acc.journalentries:r).
 * Without it every read is a 403, recorded in portal_sync_state like any
 * other resource, and the journals page says which box to tick.
 */

export const JOURNAL_RESOURCE = "journal-entries";
export const PROBLEM_STATUSES = ["Error", "NotSynced", "InProgress", "OutOfSync"] as const;

/** How far back the first run reads, and the open problems are looked for. */
const WINDOW_DAYS = 120;
/** Overlap on the modified-since cursor, for clocks and slow commits. */
const OVERLAP_MS = 10 * 60_000;

type StJournal = {
  id: string | null;
  createdOn: string;
  modifiedOn: string;
  number: number;
  name: string | null;
  source: string;
  status: string;
  syncStatus: string;
  versionId: number;
  lastSyncVersionId: number | null;
  message: string | null;
  postDate: string | null;
  exportedOn: string | null;
  exportedBy: { id: number; name: string | null } | null;
  url: string | null;
  isEmpty: boolean;
};

function toRow(j: StJournal, now: string) {
  return {
    id: String(j.id),
    number: j.number ?? null,
    name: j.name ?? null,
    source: j.source ?? null,
    status: j.status ?? null,
    sync_status: j.syncStatus ?? null,
    message: j.message ?? null,
    post_date: j.postDate ? j.postDate.slice(0, 10) : null,
    created_on: j.createdOn ?? null,
    modified_on: j.modifiedOn ?? null,
    exported_on: j.exportedOn ?? null,
    exported_by: j.exportedBy?.name ?? null,
    version_id: j.versionId ?? null,
    last_sync_version_id: j.lastSyncVersionId ?? null,
    url: j.url ?? null,
    is_empty: !!j.isEmpty,
    raw: j,
    synced_at: now,
  };
}

async function upsert(rows: ReturnType<typeof toRow>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 200) await sbUpsert("st_journal_entries", rows.slice(i, i + 200), "id");
}

export async function syncJournalEntries(): Promise<{ records: number }> {
  const startedAt = new Date();
  const now = startedAt.toISOString();
  const windowFrom = new Date(startedAt.getTime() - WINDOW_DAYS * 86_400_000).toISOString();

  try {
    const state = await sbSelectOne<{ continue_from: string | null }>(
      "portal_sync_state",
      [q.select("continue_from"), q.eq("provider", "servicetitan"), q.eq("resource", JOURNAL_RESOURCE)].join("&"),
    );
    const since = state?.continue_from && !Number.isNaN(Date.parse(state.continue_from)) ? state.continue_from : windowFrom;

    // 1. What changed since last time.
    const changed = await stList<StJournal>("accounting", "journal-entries", { modifiedOnOrAfter: since }, 10);

    // 2. The open problems, whole. One status a call: ServiceTitan's array
    //    parameters bind a single value reliably and a list less so.
    const problems: StJournal[] = [];
    for (const s of PROBLEM_STATUSES) {
      problems.push(...(await stList<StJournal>("accounting", "journal-entries", { syncStatuses: s, postedFrom: windowFrom, empty: "Exclude" }, 5)));
    }

    const seen = new Map<string, StJournal>();
    for (const j of [...changed, ...problems]) if (j.id) seen.set(String(j.id), j);
    await upsert([...seen.values()].map((j) => toRow(j, now)));

    // 3. Problems we hold that ServiceTitan no longer lists as problems.
    const held = await sbSelect<{ id: string }>(
      "st_journal_entries",
      [q.select("id"), `sync_status=in.(${PROBLEM_STATUSES.join(",")})`, "limit=1000"].join("&"),
    );
    const problemIds = new Set(problems.map((j) => String(j.id)));
    const stale = held.map((r) => r.id).filter((id) => !problemIds.has(id) && !seen.has(id));
    for (let i = 0; i < stale.length; i += 50) {
      const ids = stale.slice(i, i + 50);
      const back = await stList<StJournal>("accounting", "journal-entries", { ids: ids.join(",") }, 1);
      await upsert(back.filter((j) => j.id).map((j) => toRow(j, now)));
      const returned = new Set(back.map((j) => String(j.id)));
      const gone = ids.filter((id) => !returned.has(id));
      // Not returned by id: gone from ServiceTitan. Kept, but out of the count.
      if (gone.length) await sbUpdate("st_journal_entries", `id=in.(${gone.join(",")})`, { sync_status: "Missing", synced_at: now });
    }

    await sbUpsert(
      "portal_sync_state",
      [{
        provider: "servicetitan",
        resource: JOURNAL_RESOURCE,
        continue_from: new Date(startedAt.getTime() - OVERLAP_MS).toISOString(),
        last_run_at: now,
        last_success_at: new Date().toISOString(),
        last_status: seen.size ? "up-to-date" : "empty",
        last_error: null,
        records_synced: seen.size,
      }],
      "provider,resource",
    );
    return { records: seen.size };
  } catch (e) {
    await sbUpsert(
      "portal_sync_state",
      [{ provider: "servicetitan", resource: JOURNAL_RESOURCE, last_run_at: now, last_status: "error", last_error: (e as Error).message }],
      "provider,resource",
    ).catch(() => undefined);
    throw e;
  }
}

import "server-only";
import { cache } from "react";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { JOURNAL_RESOURCE } from "@/lib/journals/sync";

export type JournalEntry = {
  id: string;
  number: number | null;
  name: string | null;
  status: string | null;
  syncStatus: string | null;
  message: string | null;
  postDate: string | null;
  modifiedOn: string | null;
  exportedOn: string | null;
  exportedBy: string | null;
  url: string | null;
  isEmpty: boolean;
};

type Row = {
  id: string; number: number | null; name: string | null; status: string | null; sync_status: string | null;
  message: string | null; post_date: string | null; modified_on: string | null; exported_on: string | null;
  exported_by: string | null; url: string | null; is_empty: boolean | null;
};

const COLS = "id,number,name,status,sync_status,message,post_date,modified_on,exported_on,exported_by,url,is_empty";

const toEntry = (r: Row): JournalEntry => ({
  id: r.id, number: r.number, name: r.name, status: r.status, syncStatus: r.sync_status, message: r.message,
  postDate: r.post_date, modifiedOn: r.modified_on, exportedOn: r.exported_on, exportedBy: r.exported_by,
  // Only a web address is a link; anything else ServiceTitan hands back isn't.
  url: r.url && /^https?:\/\//i.test(r.url) ? r.url : null,
  isEmpty: !!r.is_empty,
});

/** How long an entry can sit closed and not synced before it counts as waiting. */
export const WAITING_AFTER_HOURS = 6;

/** The sync's own record: when it last ran, and what went wrong if it did. */
export const journalSyncState = cache(async () =>
  sbSelectOne<{ last_run_at: string | null; last_success_at: string | null; last_status: string | null; last_error: string | null }>(
    "portal_sync_state",
    [q.select("last_run_at,last_success_at,last_status,last_error"), q.eq("provider", "servicetitan"), q.eq("resource", JOURNAL_RESOURCE)].join("&"),
  ).catch(() => null),
);

/** Entries ServiceTitan says didn't reach Xero, newest first. */
export const journalErrors = cache(async (): Promise<JournalEntry[]> =>
  (await sbSelect<Row>("st_journal_entries", [q.select(COLS), "sync_status=eq.Error", "is_empty=eq.false", "order=post_date.desc.nullslast,number.desc", "limit=200"].join("&")))
    .map(toEntry),
);

/** Closed entries with something in them, not synced and not excluded, past the grace period. */
export const journalsWaiting = cache(async (now = new Date()): Promise<JournalEntry[]> => {
  const before = new Date(now.getTime() - WAITING_AFTER_HOURS * 3_600_000).toISOString();
  return (await sbSelect<Row>(
    "st_journal_entries",
    [q.select(COLS), "sync_status=in.(NotSynced,OutOfSync,InProgress)", "is_empty=eq.false", "status=eq.Closed", `modified_on=lt.${before}`, "order=post_date.asc.nullslast", "limit=200"].join("&"),
  )).map(toEntry);
});

export async function latestJournals(limit = 30): Promise<JournalEntry[]> {
  return (await sbSelect<Row>("st_journal_entries", [q.select(COLS), "order=number.desc.nullslast", `limit=${limit}`].join("&"))).map(toEntry);
}

export async function syncedSince(fromIso: string): Promise<number> {
  return (await sbSelect<{ id: string }>("st_journal_entries", [q.select("id"), "sync_status=eq.Synced", `exported_on=gte.${fromIso}`, "limit=5000"].join("&"))).length;
}

/**
 * What the wall board shows: how many entries didn't reach Xero, the first of
 * them, and how long the oldest has been failing. Null until the sync has
 * read journal entries successfully at least once — a board that can't see
 * them says nothing, rather than an all-clear it didn't measure.
 */
export type JournalHealth = {
  errors: number;
  waiting: number;
  first: { number: number | null; name: string | null; message: string | null } | null;
  oldestErrorDays: number | null;
  checkedAt: string | null;
};

export async function journalHealth(now = new Date()): Promise<JournalHealth | null> {
  const state = await journalSyncState();
  if (!state?.last_success_at) return null;
  const [errors, waiting] = await Promise.all([journalErrors(), journalsWaiting(now)]);
  const oldest = errors.reduce<string | null>((o, e) => (e.modifiedOn && (!o || e.modifiedOn < o) ? e.modifiedOn : o), null);
  return {
    errors: errors.length,
    waiting: waiting.length,
    first: errors[0] ? { number: errors[0].number, name: errors[0].name, message: errors[0].message } : null,
    oldestErrorDays: oldest ? Math.max(0, Math.floor((now.getTime() - Date.parse(oldest)) / 86_400_000)) : null,
    checkedAt: state.last_success_at,
  };
}

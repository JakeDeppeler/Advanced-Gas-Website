-- ServiceTitan's journal entries, and whether each one reached Xero.
--
-- ServiceTitan's own Xero integration does the posting: each journal entry
-- becomes a manual journal in Xero, synced in real time or when somebody
-- presses sync. This table is a read-only copy, kept by the portal's
-- ServiceTitan sync, so an entry that fails — sync_status 'Error', with
-- ServiceTitan's message — shows on the wall board and the portal and is
-- emailed to the office. Nothing here writes to ServiceTitan or to Xero: a
-- second poster would double the books.

create table if not exists public.st_journal_entries (
  id                    text primary key,          -- ServiceTitan's guid
  number                int,
  name                  text,
  source                text,                      -- 'ServiceTitan' or 'External'
  status                text,                      -- 'Open' or 'Closed'
  -- NotSynced, InProgress, Synced, OutOfSync, Error, Excluded — ServiceTitan's
  -- own values — or 'Missing' when an entry we hold stops coming back.
  sync_status           text,
  message               text,                      -- ServiceTitan's word on the last sync
  post_date             date,
  created_on            timestamptz,
  modified_on           timestamptz,
  exported_on           timestamptz,
  exported_by           text,
  version_id            int,
  last_sync_version_id  int,
  url                   text,                      -- the entry in ServiceTitan
  is_empty              boolean not null default false,
  raw                   jsonb,
  synced_at             timestamptz not null default now(),
  -- The error last emailed about, as its version and a hash of its message,
  -- so an error is emailed once — and again only if it changes.
  alerted_key           text,
  alerted_at            timestamptz
);

create index if not exists st_journal_entries_sync_status_idx on public.st_journal_entries (sync_status);
create index if not exists st_journal_entries_post_date_idx on public.st_journal_entries (post_date desc);
create index if not exists st_journal_entries_number_idx on public.st_journal_entries (number desc);

-- As every st_ table: the service role reads and writes, nothing else can.
alter table public.st_journal_entries enable row level security;

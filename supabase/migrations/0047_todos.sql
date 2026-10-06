-- The office's to-do lists.
--
-- A to-do is given to one person and has the day it has to be done by. Past
-- that day and not ticked off, the portal flags it — on the To-do page, the
-- bell, Home's "Needs someone" and the daily report — until somebody ticks it
-- or moves the date. Jake, Dean and Kellie see and add to each other's lists;
-- anyone else sees their own.
--
-- Removing one only stamps removed_at, so a to-do that was there yesterday can
-- still be found and nothing anybody typed is lost to a stray tap.
--
-- Additive only.

create table if not exists public.portal_todos (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (length(btrim(title)) between 1 and 300),
  notes            text,
  assignee_id      uuid references public.portal_users(id) on delete set null,
  due_on           date not null,
  done_at          timestamptz,
  done_by          text,                         -- the name of who ticked it
  created_by_id    uuid references public.portal_users(id) on delete set null,
  created_by       text,                         -- the name of who wrote it
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  removed_at       timestamptz
);

-- The page reads open to-dos by person and date, and done ones by when.
create index if not exists portal_todos_open_idx on public.portal_todos (assignee_id, due_on) where done_at is null and removed_at is null;
create index if not exists portal_todos_done_idx on public.portal_todos (done_at desc) where done_at is not null and removed_at is null;

-- As every portal_ table: the service role reads and writes, nothing else can.
alter table public.portal_todos enable row level security;

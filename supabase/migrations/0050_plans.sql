-- Future planning: what somebody wants to do for the business, as against the
-- day's work — a second crew, a new van, a website rebuild, an apprentice.
--
-- Each plan belongs to the person who wrote it and only they see it. It has
-- no due date and is never flagged: it sits under when they'd like to get to
-- it (this month, the next three months, this year, someday) and moves from
-- an idea to being worked on to done.
--
-- Removing one only stamps removed_at.
--
-- Additive only.

create table if not exists public.portal_plans (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.portal_users(id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 300),
  notes       text,
  area        text,                                -- growth, team, marketing, …: see src/lib/plans/types.ts
  horizon     text not null default 'year' check (horizon in ('month', 'quarter', 'year', 'someday')),
  status      text not null default 'idea' check (status in ('idea', 'doing', 'done')),
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  removed_at  timestamptz
);

create index if not exists portal_plans_owner_idx on public.portal_plans (owner_id) where removed_at is null;

-- As every portal_ table: the service role reads and writes, nothing else can.
alter table public.portal_plans enable row level security;

-- Crew & vans › a person's file: licences and tickets, and the commission
-- record. Idempotent.
--
-- portal_licences: one row per licence, ticket or card a person holds, with
-- when it runs out (null for ones that don't). The Team page names the one
-- running out soonest.
--
-- portal_commission: one row per person per month, written by the sync
-- while the month is running (sold so far, the target and rate in force,
-- whether it's hit and the bonus) and left alone once the month is over, so
-- the last write of a month is that month's record. The rule is one for
-- everyone: hit the month target and the bonus is the rate on everything sold
-- that month (portal_settings.commission).

create table if not exists public.portal_licences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.portal_users(id) on delete cascade,
  name text not null,
  number text,
  expires_on date,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists portal_licences_user on public.portal_licences (user_id);
alter table public.portal_licences enable row level security;

create table if not exists public.portal_commission (
  user_id uuid not null references public.portal_users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  sold numeric not null default 0,
  target numeric not null,
  rate numeric not null,
  hit boolean not null default false,
  bonus numeric not null default 0,
  saved_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.portal_commission enable row level security;

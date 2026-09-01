-- Per-person team files: expectations, goals & targets, reviews, and the
-- managers-only hidden notes.
--
-- The person can read their own expectations, goals and reviews (the /portal/me
-- page). Managers set and control them. The good/bad notes stay in
-- portal_reports (already managers-only via the reports_read capability) with
-- an optional sentiment, and the person never sees them.

alter table public.portal_users   add column if not exists expectations text;
alter table public.portal_reports add column if not exists sentiment text; -- 'good' | 'bad' | 'note'

create table if not exists public.portal_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.portal_users(id) on delete cascade,
  title       text not null,
  target      text,
  status      text not null default 'open' check (status in ('open','done')),
  due         date,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists portal_goals_user_idx on public.portal_goals (user_id, created_at desc);

create table if not exists public.portal_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.portal_users(id) on delete cascade,
  period        text,
  rating        int check (rating between 1 and 5),
  body          text not null,
  author_email  text,
  author_name   text,
  created_at    timestamptz not null default now()
);
create index if not exists portal_reviews_user_idx on public.portal_reviews (user_id, created_at desc);

alter table public.portal_goals   enable row level security;
alter table public.portal_reviews enable row level security;

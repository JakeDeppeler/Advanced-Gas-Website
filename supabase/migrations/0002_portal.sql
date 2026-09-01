-- Team portal: who can sign in, what each person can see, and the written
-- reports the crew keeps about one another so information moves without a
-- meeting.
--
-- The website's magic-link auth reads these with the service-role key. RLS
-- is on with no policies so a leaked anon/publishable key cannot read staff
-- emails or performance notes.
--
-- Run once against the project, then set SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY on Vercel. Until those are set the portal falls
-- back to the owner seed in src/lib/portal/team.ts, so nothing breaks on a
-- preview build without a database.

create table if not exists public.portal_users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text not null,
  role        text not null default 'member' check (role in ('admin','lead','member')),
  -- Per-person overrides on top of the role's defaults. Only keys that
  -- differ from the role default are stored, e.g. {"overhead": true}.
  caps        jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  invited_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists portal_users_email_idx on public.portal_users (lower(email));

create table if not exists public.portal_reports (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid references public.portal_users(id) on delete set null,
  subject_name  text not null,
  author_email  text not null,
  author_name   text,
  category      text not null default 'note' check (category in ('coaching','performance','handover','incident','note')),
  title         text,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists portal_reports_subject_idx on public.portal_reports (subject_id, created_at desc);
create index if not exists portal_reports_created_idx on public.portal_reports (created_at desc);

alter table public.portal_users   enable row level security;
alter table public.portal_reports enable row level security;

-- Seed the owner so the very first sign-in already has an admin, before
-- anyone has been added through the UI.
insert into public.portal_users (email, name, role) values
  ('jake@advancedgas.com.au', 'Jake Deppeler', 'admin'),
  ('jake@trusttrade.au',      'Jake Deppeler', 'admin')
on conflict (email) do nothing;

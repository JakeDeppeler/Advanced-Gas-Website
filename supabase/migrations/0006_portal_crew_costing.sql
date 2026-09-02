-- Crew costing on team members (the crew IS the team), plus a business-wide
-- key/value settings store (the capacity settings).
alter table public.portal_users add column if not exists level            text;
alter table public.portal_users add column if not exists wage             numeric;
alter table public.portal_users add column if not exists hrs_week         numeric;
alter table public.portal_users add column if not exists leave_days       integer;
alter table public.portal_users add column if not exists ph_days          integer;
alter table public.portal_users add column if not exists sick_days        integer;
alter table public.portal_users add column if not exists school_days      integer;
alter table public.portal_users add column if not exists travel_hrs_week  numeric;
alter table public.portal_users add column if not exists admin_hrs_week   numeric;
alter table public.portal_users add column if not exists office_hrs_week  numeric;
alter table public.portal_users add column if not exists rate_override    numeric;

create table if not exists public.portal_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.portal_settings enable row level security;

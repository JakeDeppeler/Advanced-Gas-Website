-- Adds what the daily-target, job-type-profit and sales-leaderboard tiles need.
--
-- ServiceTitan returns IDs, not names, on jobs and estimates (jobTypeId,
-- businessUnitId, soldById). These lookup tables are synced once per run and
-- joined locally, which keeps the hot path off the API.

create table if not exists public.st_technicians (
  id            bigint primary key,
  name          text,
  business_unit text,
  active        boolean,
  modified_on   timestamptz,
  raw           jsonb not null default '{}'::jsonb,
  synced_at     timestamptz not null default now()
);
alter table public.st_technicians enable row level security;

create table if not exists public.st_job_types (
  id          bigint primary key,
  name        text,
  active      boolean,
  modified_on timestamptz,
  raw         jsonb not null default '{}'::jsonb,
  synced_at   timestamptz not null default now()
);
alter table public.st_job_types enable row level security;

create table if not exists public.st_business_units (
  id          bigint primary key,
  name        text,
  active      boolean,
  modified_on timestamptz,
  raw         jsonb not null default '{}'::jsonb,
  synced_at   timestamptz not null default now()
);
alter table public.st_business_units enable row level security;

-- Raw foreign keys, resolved to names by the sync job.
alter table public.st_jobs      add column if not exists job_type_id      bigint;
alter table public.st_jobs      add column if not exists business_unit_id bigint;
alter table public.st_estimates add column if not exists sold_by_id       bigint;
alter table public.st_estimates add column if not exists sold_by          text;

-- Cost, where ServiceTitan exposes it, so job types can be ranked by gross
-- profit rather than revenue. Null cost falls back to a revenue ranking.
alter table public.st_invoices add column if not exists cost         numeric;
alter table public.st_invoices add column if not exists job_type     text;
alter table public.st_invoices add column if not exists sold_by      text;

create index if not exists st_estimates_sold_by_idx on public.st_estimates (sold_by);
create index if not exists st_invoices_job_type_idx on public.st_invoices (job_type);

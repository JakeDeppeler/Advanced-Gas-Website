-- Wall dashboard: website leads, ServiceTitan replica, sync state, metrics snapshot.
--
-- Naming: portal_* matches the existing internal-portal tables in this project.
-- st_* are a raw replica of ServiceTitan records, kept so new tiles can be added
-- (or metrics backfilled) without re-pulling history from the ServiceTitan API.
--
-- RLS is enabled with no policies on every table below: the sync job and the
-- screen both connect with the service_role key, which bypasses RLS. That means
-- anon/authenticated clients can read nothing here by default.

-- ---------------------------------------------------------------- website leads
create table if not exists public.portal_leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  source             text not null default 'website',
  service            text,
  property_type      text,
  timing             text,
  suburb             text,
  postcode           text,
  name               text not null,
  phone              text not null,
  email              text,
  notes              text,
  page_path          text,
  utm                jsonb not null default '{}'::jsonb,
  -- set once the lead has been pushed into ServiceTitan as a booking
  st_booking_id      text,
  st_pushed_at       timestamptz,
  -- set when someone first calls the lead back; drives time-to-first-contact
  first_contacted_at timestamptz
);
create index if not exists portal_leads_created_at_idx on public.portal_leads (created_at desc);
create index if not exists portal_leads_suburb_idx     on public.portal_leads (suburb);
alter table public.portal_leads enable row level security;

-- ------------------------------------------------------------ sync bookkeeping
-- One row per (provider, resource). continue_from holds the ServiceTitan export
-- continuation token, which is what makes each sync incremental.
create table if not exists public.portal_sync_state (
  provider        text not null,
  resource        text not null,
  continue_from   text,
  last_run_at     timestamptz,
  last_success_at timestamptz,
  last_status     text,
  last_error      text,
  records_synced  bigint not null default 0,
  primary key (provider, resource)
);
alter table public.portal_sync_state enable row level security;

-- -------------------------------------------------------- ServiceTitan replica
create table if not exists public.st_jobs (
  id             bigint primary key,
  job_number     text,
  status         text,
  job_type       text,
  business_unit  text,
  customer_id    bigint,
  customer_name  text,
  suburb         text,
  postcode       text,
  campaign       text,
  total          numeric,
  created_on     timestamptz,
  scheduled_on   timestamptz,
  completed_on   timestamptz,
  modified_on    timestamptz,
  raw            jsonb not null default '{}'::jsonb,
  synced_at      timestamptz not null default now()
);
create index if not exists st_jobs_completed_on_idx on public.st_jobs (completed_on desc);
create index if not exists st_jobs_scheduled_on_idx on public.st_jobs (scheduled_on);
create index if not exists st_jobs_created_on_idx   on public.st_jobs (created_on desc);
alter table public.st_jobs enable row level security;

create table if not exists public.st_invoices (
  id             bigint primary key,
  invoice_number text,
  job_id         bigint,
  customer_id    bigint,
  business_unit  text,
  status         text,
  subtotal       numeric,
  tax            numeric,
  total          numeric,
  balance        numeric,
  invoice_date   date,
  due_date       date,
  modified_on    timestamptz,
  raw            jsonb not null default '{}'::jsonb,
  synced_at      timestamptz not null default now()
);
create index if not exists st_invoices_invoice_date_idx on public.st_invoices (invoice_date desc);
alter table public.st_invoices enable row level security;

create table if not exists public.st_estimates (
  id          bigint primary key,
  job_id      bigint,
  customer_id bigint,
  status      text,
  subtotal    numeric,
  total       numeric,
  created_on  timestamptz,
  sold_on     timestamptz,
  modified_on timestamptz,
  raw         jsonb not null default '{}'::jsonb,
  synced_at   timestamptz not null default now()
);
create index if not exists st_estimates_created_on_idx on public.st_estimates (created_on desc);
create index if not exists st_estimates_sold_on_idx    on public.st_estimates (sold_on desc);
alter table public.st_estimates enable row level security;

create table if not exists public.st_leads (
  id          bigint primary key,
  status      text,
  customer_id bigint,
  campaign    text,
  created_on  timestamptz,
  modified_on timestamptz,
  raw         jsonb not null default '{}'::jsonb,
  synced_at   timestamptz not null default now()
);
create index if not exists st_leads_created_on_idx on public.st_leads (created_on desc);
alter table public.st_leads enable row level security;

-- ------------------------------------------------------------ metrics snapshot
-- The screen reads exactly one row from here. History is kept so a tile can be
-- charted over time later, and so a bad sync never blanks the board.
create table if not exists public.portal_metrics_snapshot (
  id          bigserial primary key,
  computed_at timestamptz not null default now(),
  metrics     jsonb not null,
  sources     jsonb not null default '{}'::jsonb
);
create index if not exists portal_metrics_snapshot_computed_at_idx
  on public.portal_metrics_snapshot (computed_at desc);
alter table public.portal_metrics_snapshot enable row level security;

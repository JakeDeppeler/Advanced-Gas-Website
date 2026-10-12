-- Compliance certificates: the five-day clock on Run the company › Jobs.
--
-- One row per job the office has dealt with: lodged with the VBA (and the
-- certificate number), or marked as not needing one. A job with no row and
-- the look of one that needs a certificate is on the clock. Idempotent.

create table if not exists public.portal_certs (
  job_id bigint primary key,
  status text not null check (status in ('lodged', 'not_needed')),
  number text,
  lodged_on date,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.portal_certs enable row level security;

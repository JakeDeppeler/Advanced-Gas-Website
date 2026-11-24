-- Job write-ups put on ServiceTitan (19 Nov).
--
-- Jobs › Write-up writes a quote's or an invoice's summary and puts its
-- labour, materials and electrical under one price. Each time it does, the
-- summary and every line it touched are kept here first, as they were, so a
-- write that doesn't read back right is put back from this row, and so is one
-- the office wants undone. One row per press of the button.

create table if not exists public.job_writeups (
  id uuid primary key default gen_random_uuid(),
  job_id bigint not null,
  job_number text,
  doc_kind text not null check (doc_kind in ('estimate', 'invoice')),
  doc_id bigint not null,
  -- started, done, restored (put back after a check failed), undone, failed
  status text not null default 'started',
  -- { summary, total, lines: [{ id, skuId, qty, unitPrice, description, ... }] } as read before writing
  before jsonb not null,
  -- the same shape, as written
  after jsonb,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists job_writeups_job_idx on public.job_writeups (job_id, created_at desc);

alter table public.job_writeups enable row level security;

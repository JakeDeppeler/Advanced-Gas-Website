-- Ducted designs kept against the job (28 Nov 2026).
--
-- Jake: "push this to a tool in the portal but have a way to link it to a job
-- and then it pulls the information and then i can design it and then it will
-- build a full quote in the job ... and then i can reopen it and if i move
-- vents or add i can push a button and it will update the quote".
--
-- Daily tools › Duct design opens the Trust Trade designer for a ServiceTitan
-- job. The design (the designer's own job file) is kept here, one row per job,
-- so it reopens on any computer; its plan images go in the private
-- "duct-plans" bucket under the job's id. The quote it last put on the job is
-- remembered so the next press offers to update that one.
--
-- ducted_part_picks remembers what the office picked for a part the pricebook
-- has no match for (a 450 take-off, a 1200 x 400 return air box), so the same
-- need is priced the same way next time (Jake: stop, list them, pick, and
-- remember the pick).
--
-- Service role only, like the other portal tables. Idempotent.

create table if not exists public.ducted_designs (
  job_id bigint primary key,
  job_number text not null,
  -- The designer's job file, as it last saved.
  project jsonb not null,
  -- What the designer said about it on the last Build quote: unit, outlets, zones and their rooms.
  summary jsonb,
  -- Plan image name -> storage path in duct-plans.
  images jsonb not null default '{}'::jsonb,
  -- The quote last put on the job from this design.
  estimate_id bigint,
  quoted_total numeric,
  quoted_at timestamptz,
  quoted_by text,
  -- The office's choices on the quote (unit, double storey, extra hours, notes), kept for the next update.
  quote_options jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists ducted_designs_number_idx on public.ducted_designs (job_number);
alter table public.ducted_designs enable row level security;

create table if not exists public.ducted_part_picks (
  -- The line as the quote names it, e.g. "3-way take-off Ø450 → Ø300 · Ø300 · Ø300".
  need text primary key,
  -- [{ skuId, skuType, name, per }]: what goes on for one of it.
  items jsonb not null,
  picked_by text,
  picked_at timestamptz not null default now()
);

alter table public.ducted_part_picks enable row level security;

insert into storage.buckets (id, name, public)
values ('duct-plans', 'duct-plans', false)
on conflict (id) do nothing;

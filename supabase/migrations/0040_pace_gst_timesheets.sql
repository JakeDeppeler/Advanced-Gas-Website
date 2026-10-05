-- GST on quotes, the price before GST on invoices, and hours on every job.
--
-- Three things the Pace page and Profit on every job need that the replica
-- didn't carry:
--
-- 1. Quotes with their GST. ServiceTitan writes an estimate's `total` before
--    GST and its tax beside it, while an invoice's `total` includes the GST.
--    The wall paced both against one target, so sold and invoiced were ten
--    per cent apart before anybody had done anything. The business works in
--    figures including GST (it's what people are paid on), so quotes gain a
--    `total_inc` and every quote figure reads it.
--
-- 2. Invoices before GST. `subtotal` has been null on every row: the mapper
--    read `subtotal` and ServiceTitan sends `subTotal`. Profit is worked out
--    on the price before GST — GST was never ours to keep — so it needs it.
--
-- 3. Who was on each job and for how long. Payroll's job timesheets carry
--    arrived and done times per technician, which is the labour half of what a
--    job cost. Optional: if the Payroll scope isn't granted the table stays
--    empty and profit falls back to the hours sold on the invoice.
--
-- Additive only. Nothing is dropped; the backfills write columns that were
-- null and are re-derivable from `raw`.

-- ---------------------------------------------------------------- quotes

alter table st_estimates add column if not exists tax numeric;

update st_estimates
   set tax = nullif(raw->>'tax', '')::numeric
 where tax is null
   and raw ? 'tax'
   and (raw->>'tax') ~ '^-?[0-9.]+$';

-- Generated, so the sync never has to remember to write it and no read can
-- disagree with another about how the GST was added.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'st_estimates' and column_name = 'total_inc'
  ) then
    alter table st_estimates
      add column total_inc numeric generated always as (coalesce(total, 0) + coalesce(tax, 0)) stored;
  end if;
end $$;

-- ---------------------------------------------------------------- invoices

update st_invoices
   set subtotal = nullif(raw->>'subTotal', '')::numeric
 where subtotal is null
   and raw ? 'subTotal'
   and (raw->>'subTotal') ~ '^-?[0-9.]+$';

-- ---------------------------------------------------------------- timesheets

create table if not exists public.st_timesheets (
  id              bigint primary key,
  job_id          bigint,
  appointment_id  bigint,
  technician_id   bigint,
  dispatched_on   timestamptz,
  arrived_on      timestamptz,
  done_on         timestamptz,
  canceled_on     timestamptz,
  active          boolean not null default true,
  modified_on     timestamptz,
  raw             jsonb not null default '{}'::jsonb
);

create index if not exists st_timesheets_job_idx on public.st_timesheets (job_id);
create index if not exists st_timesheets_done_idx on public.st_timesheets (done_on desc);

-- RLS on with no policies, as with the other st_* tables: the sync and the
-- portal both connect with the service_role key, which bypasses it.
alter table public.st_timesheets enable row level security;

-- ---------------------------------------------------------------- job cost

-- What an invoice's lines cost us and the hours they were sold with, summed
-- once in the database rather than by pulling every invoice's item list (and
-- its paragraphs of marketing copy) across the wire on every board refresh.
-- Equipment and materials carry their pricebook cost; labour lines carry the
-- hours they were sold at, which stand in for real hours until timesheets do.
create or replace function public.st_items_sum(items jsonb, key text)
returns numeric
language sql
immutable
as $$
  select coalesce(sum((x->>key)::numeric), 0)
    from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end) x
   where (x->>key) ~ '^-?[0-9]+(\.[0-9]+)?$'
$$;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'st_invoices' and column_name = 'items_cost') then
    alter table st_invoices add column items_cost numeric generated always as (public.st_items_sum(raw->'items', 'totalCost')) stored;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'st_invoices' and column_name = 'sold_hours') then
    alter table st_invoices add column sold_hours numeric generated always as (public.st_items_sum(raw->'items', 'soldHours')) stored;
  end if;
end $$;

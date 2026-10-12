-- The sales ledger: what each quote sold for, on the day it sold.
--
-- st_estimates holds one row per quote as ServiceTitan has it now. Un-sell a
-- quote and sell it again on another day and ServiceTitan moves its sold date,
-- so every sold figure read off that row moved the whole sale to the new day,
-- and the day it first sold quietly lost it. Jake's rule (12 Oct 2026):
--
--   * re-sold for the same amount: it stays a sale on the day it first sold,
--     and nothing new is counted;
--   * re-sold for a different amount: the first day keeps what it sold for,
--     and only the difference (more or less) goes on the day it was re-sold;
--   * un-sold and not re-sold: it comes off, including the day it first sold.
--
-- So each quote gets a first entry when it is first seen sold, and a
-- difference entry whenever it is sold again for another amount. What counts
-- is the entries of quotes that are sold now (st_sales). Idempotent.

create table if not exists public.st_sale_entries (
  estimate_id bigint not null,
  sold_at timestamptz not null,
  -- Before GST, as st_estimates.total; and with it, as total_inc.
  amount numeric not null default 0,
  amount_inc numeric not null default 0,
  -- The quote's first sale, rather than a change to one: counts of sales and
  -- the Sold pop-up go by these.
  first boolean not null default false,
  booked_at timestamptz not null default now(),
  primary key (estimate_id, sold_at)
);
alter table public.st_sale_entries enable row level security;

-- An un-sold quote has no sold date (stSync now clears it). Existing rows were
-- written before that; ServiceTitan's date is still in raw.
update public.st_estimates set sold_on = null
where sold_on is not null and coalesce(status, '') <> 'Sold';

create or replace function public.book_estimate_sales() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  m integer := 0;
begin
  -- A quote seen sold for the first time: the whole sale, on its day.
  insert into st_sale_entries (estimate_id, sold_at, amount, amount_inc, first)
  select e.id, e.sold_on, coalesce(e.total, 0), coalesce(e.total_inc, 0), true
  from st_estimates e
  where e.status = 'Sold' and e.sold_on is not null
    and not exists (select 1 from st_sale_entries s where s.estimate_id = e.id)
  on conflict do nothing;
  get diagnostics n = row_count;

  -- Sold again for a different amount: the difference, on the day it was
  -- re-sold. Same amount, nothing — it stays on the first day.
  insert into st_sale_entries (estimate_id, sold_at, amount, amount_inc, first)
  select e.id,
         case when e.sold_on > b.last_at then e.sold_on else now() end,
         coalesce(e.total, 0) - b.amount,
         coalesce(e.total_inc, 0) - b.amount_inc,
         false
  from st_estimates e
  join (
    select estimate_id, sum(amount) as amount, sum(amount_inc) as amount_inc, max(sold_at) as last_at
    from st_sale_entries group by estimate_id
  ) b on b.estimate_id = e.id
  where e.status = 'Sold' and e.sold_on is not null
    and abs(coalesce(e.total_inc, 0) - b.amount_inc) >= 0.01
  on conflict do nothing;
  get diagnostics m = row_count;

  return n + m;
end;
$$;

revoke all on function public.book_estimate_sales() from public, anon, authenticated;

-- What has sold, by day: the entries of quotes that are sold now. `total`,
-- `total_inc` and `sold_on` are the entry's, so readers that summed
-- st_estimates by sold_on read this the same way; `est_total` is the quote's,
-- for the size cap.
create or replace view public.st_sales with (security_invoker = true) as
select e.id, e.job_id, e.customer_id, e.created_on, e.created_by, e.sold_by, e.business_unit,
       e.total as est_total,
       s.sold_at as sold_on, s.amount as total, s.amount_inc as total_inc, s.first
from public.st_sale_entries s
join public.st_estimates e on e.id = s.estimate_id
where e.status = 'Sold';

revoke all on public.st_sales from anon, authenticated;

select public.book_estimate_sales();

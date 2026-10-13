-- Supply › Next week: "Order next week" on a line holds it off the drafts
-- until next week's ordering starts — so it goes with next week's order (one
-- delivery) rather than this one. Removing the row ("Order now") releases it.
--
-- One hold per job line. The job, item and supplier are kept on the row so
-- the page can list what's held without the line it came from, which is
-- taken off its draft.

create table if not exists public.order_holds (
  id bigint generated always as identity primary key,
  job_id bigint not null,
  sku_id bigint,
  supplier_id text not null,
  job_number text,
  customer_name text,
  install_date date,
  sku_name text,
  qty numeric,
  until date not null,
  held_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists order_holds_one_per_line on public.order_holds (job_id, coalesce(sku_id, -1));

alter table public.order_holds enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order_holds' and policyname = 'order_holds_service_role') then
    create policy order_holds_service_role on public.order_holds for all to service_role using (true) with check (true);
  end if;
end $$;

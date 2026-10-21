-- What an invoice's rebate lines bring back, as a positive figure.
--
-- The rebate items (REBATE-VEEC, REBATE-STC, REBATE-SOLARVIC…) are set up in
-- ServiceTitan as materials with a negative cost: the customer is charged less
-- and the certificate trader pays us. items_cost adds them in with the real
-- gear, so a month with $49k of rebates read as $49k less gear bought. This
-- keeps them apart: gear is items_cost + rebate_back, and the rebate is income.
-- A line counts as a rebate by its name, or by a cost below zero, which no
-- real unit or fitting has.

create or replace function public.st_rebate_back(items jsonb)
returns numeric
language sql
immutable
as $$
  select coalesce(-sum((x->>'totalCost')::numeric), 0)
    from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end) x
   where (x->>'totalCost') ~ '^-?[0-9]+(\.[0-9]+)?$'
     and (coalesce(x->>'skuName', x->'sku'->>'name', '') ~* '^rebate' or (x->>'totalCost')::numeric < 0)
$$;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'st_invoices' and column_name = 'rebate_back') then
    alter table st_invoices add column rebate_back numeric generated always as (public.st_rebate_back(raw->'items')) stored;
  end if;
end $$;

-- The billed view (0048) takes its columns from i.* when it's made, so it's
-- made again to carry the new one; it lands on the end, which a replace allows.
create or replace view public.st_invoices_billed
with (security_invoker = true) as
select i.*
  from public.st_invoices i
  join public.st_jobs j on j.id = i.job_id
 where j.status = 'Completed';

-- Reece product numbers, and copying people in on orders. Idempotent.
--
-- Reece's product number lives on the pricebook item as the primary vendor's
-- part number. Equipment already syncs (0064); materials now do too, as a
-- lookup into st_pricebook_materials, and upcoming_order_lines carries the
-- number as supplier_part so the Reece list can show it — and, once the Reece
-- API is connected, so the lines can go straight into a maX order.
--
-- Materials route by their vendor the same way equipment does (0065); in
-- practice that is Reece.
--
-- cc_emails: on a supplier, people copied on every order to them; on an
-- order, extra people for that one. admin@ is always copied as well.

create table if not exists public.st_pricebook_materials (
  id bigint primary key,
  code text,
  name text,
  vendor text,
  vendor_part text,
  active boolean,
  modified_on timestamptz,
  raw jsonb,
  synced_at timestamptz not null default now()
);
alter table public.st_pricebook_materials enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'st_pricebook_materials' and policyname = 'st_pricebook_materials_service_role') then
    create policy st_pricebook_materials_service_role on public.st_pricebook_materials for all to service_role using (true) with check (true);
  end if;
end $$;

alter table public.order_suppliers add column if not exists cc_emails text[] not null default '{}';
alter table public.purchase_orders add column if not exists cc_emails text[] not null default '{}';
alter table public.purchase_order_lines add column if not exists supplier_part text;

create or replace view public.upcoming_order_lines with (security_invoker = true) as
with install_jobs as (
  select j.id job_id, j.job_number, j.job_type, j.customer_name, j.suburb, j.status,
         (na.start_at at time zone 'Australia/Melbourne')::date as install_date,
         na.start_at as appointment_start,
         nullif(j.raw->>'createdFromEstimateId','')::bigint as from_estimate_id
  from public.st_jobs j
  left join public.job_next_appointment na on na.job_id = j.id
  where j.status in ('Scheduled','Hold')
    and (j.job_type ilike 'Install%' or j.job_type ilike 'Commercial%')
),
job_quote as (
  select ij.*, e.id as estimate_id
  from install_jobs ij
  left join lateral (
    select e.id from public.st_estimates e
    where e.status = 'Sold' and (e.job_id = ij.job_id or e.id = ij.from_estimate_id)
    order by (e.id = ij.from_estimate_id) desc, e.sold_on desc nulls last
    limit 1
  ) e on true
),
items as (
  select jq.*, (it->'sku'->>'id')::bigint sku_id, trim(it->'sku'->>'name') sku_name,
         it->'sku'->>'type' sku_type, coalesce((it->>'qty')::numeric,1) qty, (it->>'unitCost')::numeric unit_cost,
         it->'sku'->>'displayName' display_name
  from job_quote jq
  join public.st_estimates e on e.id = jq.estimate_id
  cross join lateral jsonb_array_elements(e.raw->'items') it
)
select i.job_id, i.job_number, i.job_type, i.customer_name, i.suburb, i.install_date, i.estimate_id,
       i.sku_id, i.sku_name, coalesce(nullif(trim(i.display_name),''), i.sku_name) as description, i.sku_type,
       i.qty, i.unit_cost,
       coalesce(m.supplier_id, v.supplier_id, r.supplier_id) as supplier_id,
       case when coalesce(m.supplier_id, v.supplier_id, r.supplier_id) is null then 'No supplier set for this item' end as issue,
       -- The model code the supplier needs: an override if one is set, then
       -- the Model on the ServiceTitan pricebook item (0064), and only then
       -- the item's code, which for most equipment is a name.
       coalesce(nullif(trim(m.supplier_model), ''), nullif(trim(pe.model), ''), i.sku_name) as supplier_model,
       i.appointment_start,
       -- The supplier's own product number (Reece's, mostly): the vendor part
       -- on the pricebook item's primary vendor, equipment or material.
       nullif(trim(coalesce(pe.raw->'primaryVendor'->>'vendorPart', pm.vendor_part)), '') as supplier_part
from items i
left join public.order_sku_map m on m.sku_id = i.sku_id
left join public.st_pricebook_equipment pe on pe.id = i.sku_id
left join public.st_pricebook_materials pm on pm.id = i.sku_id
-- The Primary Vendor on the pricebook item, matched to a supplier by name.
left join lateral (
  select os.id as supplier_id from public.order_suppliers os
  where os.active and coalesce(pe.vendor, pm.vendor) is not null
    and lower(trim(coalesce(pe.vendor, pm.vendor))) in (select lower(trim(x)) from unnest(os.st_vendor_names) x)
  limit 1
) v on true
left join lateral (
  select rr.supplier_id from public.order_supplier_rules rr
  join public.order_suppliers os on os.id = rr.supplier_id and os.active
  where rr.sku_type = i.sku_type and i.sku_name ~* rr.pattern
  order by rr.priority, rr.id limit 1
) r on true
where coalesce(m.ignore, false) = false
  and i.qty > 0
  and coalesce(i.unit_cost, 0) >= 0
  and i.sku_name !~* '^REBATE'
  and (i.sku_type in ('Equipment','Material') or r.supplier_id is not null or v.supplier_id is not null or m.supplier_id is not null)
union all
select jq.job_id, jq.job_number, jq.job_type, jq.customer_name, jq.suburb, jq.install_date, null,
       null, null, null, null, null, null, null,
       'No sold quote linked to this install job', null, jq.appointment_start, null
from job_quote jq where jq.estimate_id is null;

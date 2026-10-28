-- Order ahead: the gear on a sold quote that hasn't been booked in yet, so the
-- office can order it from a supplier with long lead times before the install
-- has a date.
--
-- A sale isn't booked until ServiceTitan has a job made from its estimate
-- (createdFromEstimateId), the same rule the quote pipeline uses for "Sold, to
-- be booked". Until then there is no install job to hang the order on, so a
-- line ordered ahead carries the estimate it's for instead. When the install
-- job is made from that estimate, upcoming_order_lines gives the same
-- estimate_id and the drafting sees the line as already ordered: estimate and
-- item, not job and item, is what stops it going twice.

alter table purchase_order_lines add column if not exists estimate_id bigint;
create index if not exists purchase_order_lines_estimate_idx on purchase_order_lines (estimate_id) where estimate_id is not null;

create or replace view public.sold_unbooked_order_lines with (security_invoker = true) as
with sales as (
  select
    e.id as estimate_id,
    e.sold_on,
    nullif(trim(e.raw ->> 'name'), '') as estimate_name,
    e.total_inc,
    oj.job_number as quote_job_number,
    coalesce(oj.customer_name, nullif(trim(l.raw ->> 'name'), '')) as customer_name,
    coalesce(oj.suburb, nullif(trim(l.raw -> 'address' ->> 'city'), '')) as suburb,
    e.raw
  from st_estimates e
  left join st_jobs oj on oj.id = e.job_id
  left join st_locations l on l.id = nullif(e.raw ->> 'locationId', '')::bigint
  where e.status = 'Sold'
    and e.sold_on >= now() - interval '90 days'
    -- Copied across from the old system: placeholders, not sales to order for.
    and coalesce(e.business_unit, '') !~* 'imported|default'
    -- Booked: a job made from this estimate that hasn't been cancelled.
    and not exists (
      select 1 from st_jobs j
      where nullif(j.raw ->> 'createdFromEstimateId', '')::bigint = e.id and j.status <> 'Canceled'
    )
    -- Sold on the job doing the work (a service or repair) isn't waiting on a
    -- booking: only a quote written on the customer, or on a quote visit.
    and (oj.id is null or oj.job_type ~* '(quot|assess|estimat|consult)' or coalesce(oj.business_unit, '') ~* 'assess')
),
items as (
  select
    s.*,
    ((it.value -> 'sku') ->> 'id')::bigint as sku_id,
    trim((it.value -> 'sku') ->> 'name') as sku_name,
    (it.value -> 'sku') ->> 'type' as sku_type,
    coalesce((it.value ->> 'qty')::numeric, 1) as qty,
    (it.value ->> 'unitCost')::numeric as unit_cost,
    (it.value -> 'sku') ->> 'displayName' as display_name
  from sales s
  cross join lateral jsonb_array_elements(s.raw -> 'items') it(value)
)
-- Routed to a supplier exactly as upcoming_order_lines routes an install's.
select
  i.estimate_id,
  i.sold_on,
  i.estimate_name,
  i.total_inc,
  i.quote_job_number,
  i.customer_name,
  i.suburb,
  i.sku_id,
  i.sku_name,
  coalesce(nullif(trim(i.display_name), ''), i.sku_name) as description,
  i.sku_type,
  i.qty,
  i.unit_cost,
  coalesce(m.supplier_id, v.supplier_id, r.supplier_id) as supplier_id,
  case when coalesce(m.supplier_id, v.supplier_id, r.supplier_id) is null then 'No supplier set for this item' end as issue,
  coalesce(nullif(trim(m.supplier_model), ''), nullif(trim(pe.model), ''), i.sku_name) as supplier_model,
  nullif(trim(coalesce((pe.raw -> 'primaryVendor') ->> 'vendorPart', pm.vendor_part)), '') as supplier_part
from items i
left join order_sku_map m on m.sku_id = i.sku_id
left join st_pricebook_equipment pe on pe.id = i.sku_id
left join st_pricebook_materials pm on pm.id = i.sku_id
left join lateral (
  select os.id as supplier_id from order_suppliers os
  where os.active and coalesce(pe.vendor, pm.vendor) is not null
    and lower(trim(coalesce(pe.vendor, pm.vendor))) in (select lower(trim(x)) from unnest(os.st_vendor_names) x)
  limit 1
) v on true
left join lateral (
  select rr.supplier_id from order_supplier_rules rr
  join order_suppliers os on os.id = rr.supplier_id and os.active
  where rr.sku_type = i.sku_type and i.sku_name ~* rr.pattern
  order by rr.priority, rr.id limit 1
) r on true
where coalesce(m.ignore, false) = false
  and i.qty > 0
  and coalesce(i.unit_cost, 0) >= 0
  and i.sku_name !~* '^REBATE'
  and (i.sku_type in ('Equipment', 'Material') or r.supplier_id is not null or v.supplier_id is not null or m.supplier_id is not null);

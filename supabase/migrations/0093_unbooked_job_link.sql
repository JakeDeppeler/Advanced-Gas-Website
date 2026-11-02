-- Sold, not booked: carry the quote's job and customer, so To order can open
-- the sale in ServiceTitan. Most sales here were sold without a job (from an
-- opportunity), so the customer is the fallback. New columns go on the end:
-- `create or replace view` can add columns but not reorder them.
create or replace view public.sold_unbooked_order_lines with (security_invoker = true) as
with sales as (
  select
    e.id as estimate_id,
    e.sold_on,
    nullif(trim(e.raw ->> 'name'), '') as estimate_name,
    e.total_inc,
    oj.job_number as quote_job_number,
    coalesce(oj.customer_name, nullif(trim(l.raw ->> 'name'), '')) as customer_name,
    coalesce(oj.suburb, nullif(trim((l.raw -> 'address') ->> 'city'), '')) as suburb,
    e.raw,
    oj.id as quote_job_id,
    nullif(e.raw ->> 'customerId', '')::bigint as customer_id
  from st_estimates e
    left join st_jobs oj on oj.id = e.job_id
    left join st_locations l on l.id = nullif(e.raw ->> 'locationId', '')::bigint
  where e.status = 'Sold'
    and e.sold_on >= now() - interval '90 days'
    and coalesce(e.business_unit, '') !~* 'imported|default'
    and not exists (
      select 1 from st_jobs j
      where nullif(j.raw ->> 'createdFromEstimateId', '')::bigint = e.id and j.status <> 'Canceled'
    )
    and (oj.id is null or oj.job_type ~* '(quot|assess|estimat|consult)' or coalesce(oj.business_unit, '') ~* 'assess')
), items as (
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
  nullif(trim(coalesce((pe.raw -> 'primaryVendor') ->> 'vendorPart', pm.vendor_part)), '') as supplier_part,
  i.quote_job_id,
  i.customer_id
from items i
  left join order_sku_map m on m.sku_id = i.sku_id
  left join st_pricebook_equipment pe on pe.id = i.sku_id
  left join st_pricebook_materials pm on pm.id = i.sku_id
  left join lateral (
    select os.id as supplier_id from order_suppliers os
    where os.active and coalesce(pe.vendor, pm.vendor) is not null
      and lower(trim(coalesce(pe.vendor, pm.vendor))) in (select lower(trim(x)) from unnest(os.st_vendor_names) x(x))
    limit 1
  ) v on true
  left join lateral (
    select rr.supplier_id from order_supplier_rules rr
      join order_suppliers os on os.id = rr.supplier_id and os.active
    where rr.sku_type = i.sku_type and i.sku_name ~* rr.pattern
    order by rr.priority, rr.id
    limit 1
  ) r on true
where coalesce(m.ignore, false) = false
  and i.qty > 0
  and coalesce(i.unit_cost, 0) >= 0
  and i.sku_name !~* '^REBATE'
  and (i.sku_type in ('Equipment', 'Material') or r.supplier_id is not null or v.supplier_id is not null or m.supplier_id is not null);

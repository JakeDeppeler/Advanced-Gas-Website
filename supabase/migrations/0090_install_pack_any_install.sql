-- Install packs on every install job, sold quote or not (Jake, 31 Oct).
--
-- 0086 listed only Install or Commercial jobs booked from a sold quote, so an
-- install the office booked straight in (20497, 20496, 20717 when this was
-- written) got nothing, and a Commercial repair with a sold quote got a pack
-- it had no use for. Now: any job type with "install" in it (every
-- Installation type and Commercial – Installation), with its sold quote when
-- there is one. The pack's scope is the job summary either way; the quote only
-- supplies the equipment and materials lists.
--
-- Same columns as 0086, estimate_id and quote_job_id now null without a
-- quote. Idempotent.

create or replace view public.install_pack_jobs with (security_invoker = true) as
with jobs as (
  select j.id job_id, j.job_number, j.job_type, j.customer_name, j.customer_id, j.location_id,
         nullif(j.raw->>'createdFromEstimateId','')::bigint as from_estimate_id,
         j.raw->>'summary' as job_summary
  from public.st_jobs j
  where j.status in ('Scheduled','Hold')
    and j.job_type ilike '%install%'
)
select jb.job_id, jb.job_number, jb.job_type, jb.customer_name, jb.job_summary,
       e.id as estimate_id, e.job_id as quote_job_id,
       na.start_at as appointment_start, na.end_at as appointment_end, na.all_visits,
       concat_ws(', ', nullif(trim(concat_ws(' ', nullif(l.raw->'address'->>'unit',''), l.raw->'address'->>'street')),''),
                 l.raw->'address'->>'city', concat_ws(' ', l.raw->'address'->>'state', l.raw->'address'->>'zip')) as site_address,
       coalesce(
         (select lc.value from public.st_location_contacts lc where lc.location_id = jb.location_id and lc.active and lc.type in ('MobilePhone','Phone') order by (lc.type='MobilePhone') desc, lc.id limit 1),
         (select cc.value from public.st_customer_contacts cc where cc.customer_id = jb.customer_id and cc.active and cc.type in ('MobilePhone','Phone') order by (cc.type='MobilePhone') desc, cc.id limit 1)) as site_phone,
       (select string_agg(distinct a.technician_name, ', ') from public.st_appointment_assignments a
         where a.job_id = jb.job_id and a.active) as crew
from jobs jb
left join lateral (
  select e.id, e.job_id from public.st_estimates e
  where e.status = 'Sold' and (e.job_id = jb.job_id or e.id = jb.from_estimate_id)
  order by (e.id = jb.from_estimate_id) desc, e.sold_on desc nulls last
  limit 1
) e on true
join public.job_next_appointment na on na.job_id = jb.job_id
left join public.st_locations l on l.id = jb.location_id
where na.start_at > now();

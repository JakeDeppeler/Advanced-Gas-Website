-- Install packs: when an install is booked from a sold quote, a PDF goes onto
-- the install job in ServiceTitan saying what's going in, the materials and
-- where they were ordered from, the scope word for word from the quote, and
-- the photos from the quote visit. See src/lib/installpack/.
--
-- install_pack_jobs is what qualifies: an Install or Commercial job, Scheduled
-- or on Hold, with a visit still to come and a sold quote, found the same way
-- upcoming_order_lines (0063) finds it: the quote the job was made from, else
-- one sold on the job itself. quote_job_id is where that quote was written,
-- which is where the quote visit's photos are, and is often not the install
-- job.
--
-- install_packs records the last pack put on each job, so one is only made
-- again when what it says has changed, and a failure is kept with the job.
--
-- Idempotent.

create table if not exists public.install_packs (
  job_id        bigint primary key,
  estimate_id   bigint,
  version       integer not null default 0,
  -- Hash of everything the pack says that comes from the database; photos
  -- are checked against ServiceTitan separately (photo_ids).
  fingerprint   text,
  -- The same, section by section, so an update can say what changed.
  parts         jsonb,
  photo_ids     bigint[],
  file_name     text,
  attached_at   timestamptz,
  photos_checked_at timestamptz,
  last_error    text,
  last_tried_at timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.install_packs enable row level security;

create or replace view public.install_pack_jobs with (security_invoker = true) as
with jobs as (
  select j.id job_id, j.job_number, j.job_type, j.customer_name, j.customer_id, j.location_id,
         nullif(j.raw->>'createdFromEstimateId','')::bigint as from_estimate_id,
         j.raw->>'summary' as job_summary
  from public.st_jobs j
  where j.status in ('Scheduled','Hold')
    and (j.job_type ilike 'Install%' or j.job_type ilike 'Commercial%')
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
join lateral (
  select e.id, e.job_id from public.st_estimates e
  where e.status = 'Sold' and (e.job_id = jb.job_id or e.id = jb.from_estimate_id)
  order by (e.id = jb.from_estimate_id) desc, e.sold_on desc nulls last
  limit 1
) e on true
join public.job_next_appointment na on na.job_id = jb.job_id
left join public.st_locations l on l.id = jb.location_id
where na.start_at > now();

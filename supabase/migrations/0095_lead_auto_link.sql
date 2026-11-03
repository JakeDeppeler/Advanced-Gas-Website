-- Website leads onto their ServiceTitan job without anyone typing the number.
--
-- Every enquiry ends up in ServiceTitan, so the portal finds the job itself:
-- first by the booking it was sent in as (a job made from that booking carries
-- its id), else the first job booked for the same customer or site, by phone
-- (last nine digits, so 0412… and 412… agree) or email, from the day before
-- the enquiry to 45 days after. The automatic run links it and puts the form
-- and photos on the job.
alter table public.portal_leads
  add column if not exists st_booking_id text, -- already there from an earlier, unused start; kept as text
  add column if not exists st_booking jsonb,
  add column if not exists link_how text;

-- Each contact's phone (last nine digits) or email (lower case) is stored
-- once, as a generated column with an index, so matching a lead is an index
-- lookup. Worked out inside the view it was 2.5 s, run every few minutes
-- from the sync; the sync writes named columns, so a generated one is safe.
alter table public.st_customer_contacts add column if not exists match_key text generated always as (
  case when type ilike '%phone%' or type ilike '%mobile%' then nullif(right(regexp_replace(value, '\D', '', 'g'), 9), '')
       when type ilike 'email' then nullif(lower(trim(value)), '') end) stored;
alter table public.st_location_contacts add column if not exists match_key text generated always as (
  case when type ilike '%phone%' or type ilike '%mobile%' then nullif(right(regexp_replace(value, '\D', '', 'g'), 9), '')
       when type ilike 'email' then nullif(lower(trim(value)), '') end) stored;
create index if not exists st_customer_contacts_match_key_idx on public.st_customer_contacts (match_key);
create index if not exists st_location_contacts_match_key_idx on public.st_location_contacts (match_key);

create or replace view public.lead_job_matches with (security_invoker = true) as
with l as (
  select id, created_at, st_booking_id,
    nullif(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9), '') as p,
    nullif(lower(trim(coalesce(email, ''))), '') as e
  from portal_leads
  where st_job_id is null and created_at > now() - interval '60 days'
), k as (
  select id, created_at, p as key from l where length(p) = 9
  union
  select id, created_at, e from l where e is not null
), hits as (
  select k.id, k.created_at, cc.customer_id as cid, null::bigint as lid from k join st_customer_contacts cc on cc.match_key = k.key
  union
  select k.id, k.created_at, null::bigint, lc.location_id from k join st_location_contacts lc on lc.match_key = k.key
), by_booking as (
  select l.id as lead_id, j.id as job_id, j.job_number, j.status, j.created_on, 'booking'::text as how
  from l join st_jobs j on l.st_booking_id is not null and (j.raw ->> 'bookingId') = l.st_booking_id
), by_contact as (
  select distinct h.id as lead_id, j.id as job_id, j.job_number, j.status, j.created_on, 'contact'::text as how
  from hits h
  join st_jobs j on (j.customer_id = h.cid or j.location_id = h.lid)
    and j.created_on >= h.created_at - interval '1 day'
    and j.created_on <= h.created_at + interval '45 days'
    and j.status <> 'Canceled'
), ranked as (
  select *, row_number() over (partition by lead_id order by (how = 'booking') desc, created_on) as rn
  from (select * from by_booking union all select * from by_contact) x
)
select lead_id, job_id, job_number, status, created_on, how from ranked where rn = 1;

-- Where each job is.
--
-- ServiceTitan's jobs export carries a locationId and nothing else about the
-- address: every one of the 1,223 jobs in the last ninety days has a null
-- suburb and a null postcode. The Areas heat map therefore had nothing to group
-- by and fell back to website leads — about thirty rows for a business doing
-- thousands of jobs, so the map named whichever couple of suburbs had filled in
-- the web form.
--
-- crm/export/locations carries the address. This table holds it, and the
-- resolver stamps the suburb and postcode onto the job so the map is one
-- grouped read rather than a join on every refresh.

create table if not exists public.st_locations (
  id          bigint primary key,
  customer_id bigint,
  suburb      text,
  postcode    text,
  state       text,
  active      boolean not null default true,
  modified_on timestamptz,
  raw         jsonb not null default '{}'::jsonb,
  synced_at   timestamptz not null default now()
);

create index if not exists st_locations_suburb_idx on public.st_locations (suburb);

alter table public.st_locations enable row level security;

-- Jobs need somewhere to put it. The columns already exist on st_jobs from the
-- original schema; the mapper was reading fields the payload never carried.
alter table st_jobs add column if not exists location_id bigint;
create index if not exists st_jobs_location_idx on st_jobs (location_id);

create or replace function public.dashboard_resolve_names()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update st_jobs j
     set job_type = t.name
    from st_job_types t
   where j.job_type_id = t.id
     and j.job_type is distinct from t.name;

  update st_jobs j
     set business_unit = b.name
    from st_business_units b
   where j.business_unit_id = b.id
     and j.business_unit is distinct from b.name;

  update st_estimates e
     set sold_by = tech.name
    from st_technicians tech
   where e.sold_by_id = tech.id
     and e.sold_by is distinct from tech.name;

  update st_estimates e
     set sold_by = emp.name
    from st_employees emp
   where e.sold_by_id = emp.id
     and e.sold_by is null
     and emp.name is not null;

  update st_estimates e
     set created_by = emp.name
    from st_employees emp
   where e.created_by_id = emp.id
     and e.created_by is distinct from emp.name;

  update st_estimates e
     set created_by = tech.name
    from st_technicians tech
   where e.created_by_id = tech.id
     and e.created_by is null
     and tech.name is not null;

  -- The job's place, from its location.
  update st_jobs j
     set suburb = l.suburb,
         postcode = l.postcode
    from st_locations l
   where j.location_id = l.id
     and (j.suburb is distinct from l.suburb or j.postcode is distinct from l.postcode);

  update st_invoices i
     set job_type = j.job_type
    from st_jobs j
   where i.job_id = j.id
     and i.job_type is null
     and j.job_type is not null;
end;
$$;

-- The replica already holds each job's payload, so the ids come from there
-- rather than from a re-export.
update st_jobs
   set location_id = (raw ->> 'locationId')::bigint
 where location_id is null
   and raw ->> 'locationId' ~ '^[0-9]+$';

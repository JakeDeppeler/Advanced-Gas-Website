-- Two gaps that each blanked a page of the board once real ServiceTitan data
-- arrived.
--
-- 1. Estimates carry `soldBy` as an *employee* id — a short number — while the
--    technicians this tenant syncs have nine-digit ids. The resolver only knew
--    about technicians, so sold_by stayed null on every row and the Team page
--    rendered with nobody on it.
--
-- 2. Invoices reference their job as a nested { id, type, number } object. The
--    mapper read a flat `jobId` that does not exist, so job_id was null on all
--    of them and the job-type tile had nothing to group by.
--
-- Idempotent throughout: create if not exists, and every update is conditional.

create table if not exists st_employees (
  id bigint primary key,
  name text,
  active boolean not null default true,
  modified_on timestamptz,
  raw jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists st_employees_name_idx on st_employees (name);

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

  -- Employees second, and only where a technician did not already match: the
  -- two id spaces are separate, and a seller is far more often an employee.
  update st_estimates e
     set sold_by = emp.name
    from st_employees emp
   where e.sold_by_id = emp.id
     and e.sold_by is null
     and emp.name is not null;

  -- Only fills what the invoice payload did not already carry. The nested job
  -- object names its own type, which beats a join onto st_jobs.job_type — that
  -- column resolves for a fraction of jobs because most predate the job-type
  -- lookup table.
  update st_invoices i
     set job_type = j.job_type
    from st_jobs j
   where i.job_id = j.id
     and i.job_type is null
     and j.job_type is not null;
end;
$$;

-- Backfill from what the replica already holds, so neither page waits on the
-- next full export pass.
update st_invoices
   set job_id = (raw -> 'job' ->> 'id')::bigint
 where job_id is null
   and raw -> 'job' ->> 'id' is not null;

update st_invoices
   set job_type = raw -> 'job' ->> 'type'
 where job_type is null
   and raw -> 'job' ->> 'type' is not null;

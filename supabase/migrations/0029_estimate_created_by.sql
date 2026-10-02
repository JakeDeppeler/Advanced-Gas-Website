-- Who wrote each quote.
--
-- The board attributed quotes to `soldBy`, which ServiceTitan only fills in once
-- an estimate closes. Two people had sold something this month, so the Team page
-- listed two names — while six people had written quotes. Crediting the work to
-- whoever wrote it is both what the business asked for and the only version that
-- shows the whole team.
--
-- `createdById` is on every estimate and resolves against either name table:
-- office staff come back from settings/employees, field staff from
-- settings/technicians, and the same person can hold an id in both.

alter table st_estimates add column if not exists created_by_id bigint;
alter table st_estimates add column if not exists created_by text;

create index if not exists st_estimates_created_by_idx on st_estimates (created_by);

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

  -- The author, from whichever table holds that id.
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

  update st_invoices i
     set job_type = j.job_type
    from st_jobs j
   where i.job_id = j.id
     and i.job_type is null
     and j.job_type is not null;
end;
$$;

-- The replica already holds the whole record, so neither page waits on a full
-- re-export.
update st_estimates
   set created_by_id = (raw ->> 'createdById')::bigint
 where created_by_id is null
   and raw ->> 'createdById' ~ '^[0-9]+$';

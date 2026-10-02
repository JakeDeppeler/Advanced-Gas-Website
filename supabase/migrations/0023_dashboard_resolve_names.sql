-- Resolves the ServiceTitan IDs stored on jobs/estimates into display names,
-- and denormalises job_type onto invoices so the profit-by-job-type tile is a
-- single grouped read rather than a join across three tables on every refresh.
-- Called by the sync job after each export pass.
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

  update st_invoices i
     set job_type = j.job_type
    from st_jobs j
   where i.job_id = j.id
     and i.job_type is distinct from j.job_type;
end;
$$;

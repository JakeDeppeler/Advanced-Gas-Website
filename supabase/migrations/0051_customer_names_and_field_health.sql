-- Customer names on jobs, and a way to notice a mapped column that never fills.
--
-- Two things that turned out to be the same problem.
--
-- st_jobs.customer_name has been null on all 5,445 rows since the table
-- existed. The sync maps it from `customerName`, and ServiceTitan's job export
-- does not send that — it sends customerId. The portal's job-profit list has
-- been quietly dropping the name ever since: `.filter(Boolean)` turns
-- "#20233 · Joel Shannon · 7 Oct" into "#20233 · 7 Oct" and nothing anywhere
-- says a name was meant to be there.
--
-- The name is recoverable. st_locations carries it — ServiceTitan's location
-- `name` is the customer's name, filled on all 2,741 rows — and jobs already
-- join to locations for suburb and postcode. So this stamps it on the same way.
--
-- The second half is the reason this went unnoticed for months: nothing checks
-- that a mapped column ever receives a value. dashboard_field_health() reports
-- how full each column is, so the sync can assert its own shape and say which
-- fields are empty, rather than leaving it to somebody to query the database on
-- a hunch. See src/lib/dashboard/syncShape.ts for what is expected of each.
--
-- Idempotent: safe to run against a database that already has it.

alter table st_locations add column if not exists name text;

-- Backfill from the payload already stored. Cheap, and it means the resolver
-- below has something to work with before the next sync runs.
update st_locations
   set name = nullif(trim(raw->>'name'), '')
 where name is distinct from nullif(trim(raw->>'name'), '');

/*
 * The existing resolver, with the customer name added.
 *
 * Rewritten whole rather than patched, because `create or replace` needs the
 * entire body and a partial definition would silently drop the other six
 * updates. Everything above the last block is unchanged.
 */
create or replace function dashboard_resolve_names() returns void
language plpgsql
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

  -- The customer, from the location they are at. ServiceTitan's job export has
  -- no customer name in it; the location's `name` is that name.
  update st_jobs j
     set customer_name = l.name
    from st_locations l
   where j.location_id = l.id
     and l.name is not null
     and j.customer_name is distinct from l.name;
end;
$$;

/*
 * How full each column is, for the sync's shape assertions.
 *
 * Counts non-null, non-blank values per column for the tables the board reads,
 * in one round trip, where the rows are. Only the columns the board depends on:
 * a census of every column would be noise nobody reads.
 *
 * **Both all-time and a recent window**, because the two say different things.
 * st_jobs.job_type is 5% full across the table and 100% full over the last
 * month: the 5,150 rows imported before go-live carry a job_type_id with no row
 * in the lookup, so the resolver cannot name them. They are excluded from every
 * count that cares, and an assertion made on the whole table would cry wolf
 * forever. The expectations are in src/lib/dashboard/syncShape.ts.
 */
create or replace function dashboard_field_health(days int default 30)
returns table (tbl text, col text, filled bigint, total bigint, recent_filled bigint, recent_total bigint)
language plpgsql
as $$
declare
  spec text[][] := array[
    ['st_jobs', 'job_type', 'created_on'], ['st_jobs', 'business_unit', 'created_on'],
    ['st_jobs', 'customer_name', 'created_on'], ['st_jobs', 'suburb', 'created_on'],
    ['st_jobs', 'postcode', 'created_on'], ['st_jobs', 'status', 'created_on'],
    ['st_jobs', 'completed_on', 'created_on'], ['st_jobs', 'scheduled_on', 'created_on'],
    ['st_jobs', 'campaign', 'created_on'], ['st_jobs', 'location_id', 'created_on'],
    ['st_invoices', 'job_id', 'invoice_date'], ['st_invoices', 'job_type', 'invoice_date'],
    ['st_estimates', 'sold_by', 'created_on'], ['st_estimates', 'created_by', 'created_on'],
    ['st_estimates', 'status', 'created_on'],
    ['st_locations', 'name', null], ['st_locations', 'suburb', null], ['st_locations', 'postcode', null],
    ['st_technicians', 'name', null], ['st_employees', 'name', null],
    ['st_payments', 'paid_on', null], ['st_timesheets', 'technician_id', null]
  ];
  i int; t text; c text; d text; cutoff timestamptz := now() - make_interval(days => days);
begin
  for i in 1 .. array_length(spec, 1) loop
    t := spec[i][1]; c := spec[i][2]; d := spec[i][3];
    -- A missing column is skipped rather than failing the whole report: this
    -- runs on every sync, and surviving a surprise is the point of it.
    if not exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name=c) then continue; end if;
    if d is not null and not exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name=d) then d := null; end if;
    if d is null then
      return query execute format(
        'select %L::text, %L::text, count(%I) filter (where %I::text <> %L), count(*),
                count(%I) filter (where %I::text <> %L), count(*) from %I',
        t, c, c, c, '', c, c, '', t);
    else
      return query execute format(
        'select %L::text, %L::text,
                count(%I) filter (where %I::text <> %L), count(*),
                count(%I) filter (where %I::text <> %L and %I >= $1),
                count(*) filter (where %I >= $1) from %I',
        t, c, c, c, '', c, c, '', d, d, t) using cutoff;
    end if;
  end loop;
end;
$$;

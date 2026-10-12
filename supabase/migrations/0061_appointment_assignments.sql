-- Who ServiceTitan dispatched to each appointment. Idempotent.
--
-- Crew & vans › Per van, per day needs every invoiced job tied to the tech
-- who did it. Timesheets only do that when the tech clocks in, which in
-- October 2026 covered $42.9K of $117.4K invoiced. An assignment is made for
-- every dispatched appointment whether or not anyone clocks in, so this is
-- the tie the page reads first, with timesheets behind it.

create table if not exists public.st_appointment_assignments (
  id bigint primary key,
  job_id bigint,
  appointment_id bigint,
  technician_id bigint,
  technician_name text,
  assigned_on timestamptz,
  active boolean,
  modified_on timestamptz,
  raw jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists st_appointment_assignments_job on public.st_appointment_assignments (job_id);
alter table public.st_appointment_assignments enable row level security;

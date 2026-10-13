-- ServiceTitan appointments: when each visit is booked for. Idempotent.
--
-- The job export carries no time at all — st_jobs.scheduled_on has been null
-- on every row since the table existed (syncShape.ts records it as "absent").
-- The time lives on the appointment. Supply › Next week needs it twice: to
-- know which installs fall next week, so their gear is ordered in time, and
-- to tell the electrician when to turn up.
--
-- Kept as its own table rather than stamped onto st_jobs.scheduled_on: that
-- column feeds the wall board's "scheduled next 7 days" tile, which is blanked
-- on purpose until someone decides what it should count (a job can have
-- several appointments). Filling it here would light that tile as a side
-- effect of an ordering feature.

create table if not exists public.st_appointments (
  id bigint primary key,
  job_id bigint,
  appointment_number text,
  start_at timestamptz,
  end_at timestamptz,
  arrival_window_start timestamptz,
  arrival_window_end timestamptz,
  status text,
  special_instructions text,
  active boolean,
  modified_on timestamptz,
  raw jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists st_appointments_job on public.st_appointments (job_id);
create index if not exists st_appointments_start on public.st_appointments (start_at);

alter table public.st_appointments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'st_appointments' and policyname = 'st_appointments_service_role') then
    create policy st_appointments_service_role on public.st_appointments for all to service_role using (true) with check (true);
  end if;
end $$;

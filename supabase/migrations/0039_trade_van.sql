-- What the trade portal's van screens, Take 5, time off and timesheet write.
--
-- Until now a tech could tell the office something about their van only as a
-- line in the van's log, with no way to say whether anybody had picked it up.
-- The new My van screens are built around the answer — "with the office",
-- "booked 14 Oct", "fixed" — so the office needs somewhere to put it, and the
-- tech needs somewhere to read it back.
--
-- Everything here is additive. Nothing existing is dropped or rewritten; the
-- one loosened constraint (a photo no longer has to belong to a check) is so a
-- damage report can carry its own photos.

-- ---------------------------------------------------------------- vans

-- Rego renewal, shown beside the odometer and the next service.
alter table portal_vehicles add column if not exists rego_due date;

-- A report's answer, and what the tech said about it.
--
-- status is null on every row written before this migration. Those are read
-- as "logged", not as open: an old tyre note that was dealt with months ago
-- must not come back as something the office is sitting on.
alter table portal_vehicle_logs add column if not exists status text;
alter table portal_vehicle_logs add column if not exists status_note text;
alter table portal_vehicle_logs add column if not exists title text;
alter table portal_vehicle_logs add column if not exists area text;
alter table portal_vehicle_logs add column if not exists drivable boolean;
alter table portal_vehicle_logs add column if not exists third_party boolean;
-- 'weekly' when it came off the weekly check, null when raised by hand.
alter table portal_vehicle_logs add column if not exists source text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portal_vehicle_logs_status_chk') then
    alter table portal_vehicle_logs add constraint portal_vehicle_logs_status_chk
      check (status is null or status in ('open', 'booked', 'quote', 'fixed'));
  end if;
end $$;

-- Photos on a report as well as on a check.
alter table portal_van_photos alter column check_id drop not null;
alter table portal_van_photos add column if not exists log_id uuid references portal_vehicle_logs(id) on delete cascade;
create index if not exists portal_van_photos_log_idx on portal_van_photos (log_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portal_van_photos_owner_chk') then
    alter table portal_van_photos add constraint portal_van_photos_owner_chk
      check (check_id is not null or log_id is not null);
  end if;
end $$;

-- ---------------------------------------------------------------- parts

-- A tech asking the office for parts: to restock the van, or for one job.
-- The lines are a list of {item, qty} — what was asked for, as it was asked,
-- whether or not it matches anything on a shelf.
create table if not exists portal_part_orders (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid references portal_vehicles(id) on delete set null,
  requested_by    text,
  requested_by_id uuid,
  for_what        text not null default 'van',
  job             text,
  lines           jsonb not null default '[]'::jsonb,
  deliver         text not null default 'factory',
  needed_by       text not null default 'week',
  note            text,
  status          text not null default 'requested',
  status_note     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint portal_part_orders_for_chk check (for_what in ('van', 'job')),
  constraint portal_part_orders_deliver_chk check (deliver in ('factory', 'pickup')),
  constraint portal_part_orders_needed_chk check (needed_by in ('today', 'tomorrow', 'week')),
  constraint portal_part_orders_status_chk check (status in ('requested', 'ordered', 'ready', 'done', 'cancelled'))
);
create index if not exists portal_part_orders_vehicle_idx on portal_part_orders (vehicle_id, created_at desc);
create index if not exists portal_part_orders_status_idx on portal_part_orders (status, created_at desc);

-- ---------------------------------------------------------------- tools

-- The tools signed to a van, one row each: what it is, how old, when it is
-- next due a service or a test-and-tag, and whether the tech has asked for
-- something to be done about it.
create table if not exists portal_van_tools (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references portal_vehicles(id) on delete cascade,
  name          text not null,
  model         text,
  kind          text not null default 'other',
  bought_on     date,
  -- How long one of these lasts, so "getting old" is measured, not guessed.
  life_years    numeric,
  last_done_on  date,
  last_done     text,
  next_due_on   date,
  next_due      text,
  -- What the tech asked for: 'broken', 'service' or 'replace'. Null when nothing is.
  request       text,
  request_note  text,
  requested_at  timestamptz,
  requested_by  text,
  -- The office's answer, in its own words — "Booked 14 Oct", "Approved · at the factory Thu".
  reply         text,
  replied_at    timestamptz,
  sort_order    int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint portal_van_tools_kind_chk check (kind in ('refrigeration', 'gas', 'power', 'safety', 'other')),
  constraint portal_van_tools_request_chk check (request is null or request in ('broken', 'service', 'replace'))
);
create index if not exists portal_van_tools_vehicle_idx on portal_van_tools (vehicle_id);

-- ---------------------------------------------------------------- safety

-- A Take 5 before the tools come out, or an incident report afterwards.
create table if not exists portal_take5 (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'take5',
  user_id     uuid,
  user_name   text,
  job         text,
  hazards     jsonb not null default '[]'::jsonb,
  controls    text,
  safe        boolean,
  detail      text,
  -- When somebody in the office read it. An incident is on Home until then.
  seen_at     timestamptz,
  seen_by     text,
  created_at  timestamptz not null default now(),
  constraint portal_take5_kind_chk check (kind in ('take5', 'incident'))
);
create index if not exists portal_take5_created_idx on portal_take5 (created_at desc);

-- ---------------------------------------------------------------- people

create table if not exists portal_leave (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  user_name    text,
  kind         text not null default 'annual',
  from_date    date not null,
  to_date      date not null,
  note         text,
  status       text not null default 'asked',
  answered_by  text,
  answered_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint portal_leave_kind_chk check (kind in ('annual', 'rdo', 'sick', 'unpaid')),
  constraint portal_leave_status_chk check (status in ('asked', 'approved', 'declined')),
  constraint portal_leave_dates_chk check (to_date >= from_date)
);
create index if not exists portal_leave_user_idx on portal_leave (user_id, from_date desc);
create index if not exists portal_leave_status_idx on portal_leave (status);

-- One row per person per week. The days are a map of ISO date to
-- {start, finish, note}; hours are worked out from them, never typed.
create table if not exists portal_timesheets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  user_name     text,
  week_of       date not null,
  days          jsonb not null default '{}'::jsonb,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint portal_timesheets_one_per_week unique (user_id, week_of)
);

-- ---------------------------------------------------------------- factory

-- So the shelf can be filtered the way the design does: units, copper, electrical.
alter table portal_stock_items add column if not exists category text;

-- ---------------------------------------------------------------- access

alter table portal_part_orders enable row level security;
alter table portal_van_tools enable row level security;
alter table portal_take5 enable row level security;
alter table portal_leave enable row level security;
alter table portal_timesheets enable row level security;

do $$
declare t text;
begin
  foreach t in array array['portal_part_orders', 'portal_van_tools', 'portal_take5', 'portal_leave', 'portal_timesheets'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_service_role') then
      execute format('create policy %I on %I for all to service_role using (true) with check (true)', t || '_service_role', t);
    end if;
  end loop;
end $$;

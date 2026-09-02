-- Fleet: vehicles and a shared log of servicing, fuel, km readings and damage.
--
-- Everyone signed in can see vehicles and add a log entry (fuel, a km reading,
-- a service, damage). Managing the vehicles themselves and the service
-- schedule is the 'vehicles' capability (admin + lead hand by default).

create table if not exists public.portal_vehicles (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  rego                text,
  details             text,           -- make / model / year
  odometer            integer,        -- latest known km
  service_interval_km integer,
  next_service_km     integer,
  next_service_date   date,
  active              boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.portal_vehicle_logs (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.portal_vehicles(id) on delete cascade,
  kind        text not null default 'service' check (kind in ('service','fuel','damage','reading')),
  log_date    date not null default (now() at time zone 'utc')::date,
  odometer    integer,
  cost        numeric(10,2),
  litres      numeric(8,2),
  detail      text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_vehicle_logs_idx on public.portal_vehicle_logs (vehicle_id, log_date desc, created_at desc);

alter table public.portal_vehicles     enable row level security;
alter table public.portal_vehicle_logs enable row level security;

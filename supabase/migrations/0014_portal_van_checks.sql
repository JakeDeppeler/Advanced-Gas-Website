-- The van stock and check sheets. One row per completed sheet: what kind it
-- was, who did it, and a jsonb blob of the per-item answers keyed by
-- "group|item" so a saved check still lines up if a list is ever reordered.
create table if not exists public.portal_van_checks (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.portal_vehicles(id) on delete cascade,
  kind         text not null check (kind in ('daily','monthly','stock','plant','bag')),
  checked_on   date not null default (now() at time zone 'Australia/Melbourne')::date,
  checked_by   text,
  notes        text,
  items        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists portal_van_checks_vehicle_idx
  on public.portal_van_checks (vehicle_id, kind, checked_on desc);

-- Photos of the van, taken during a check. The file itself lives in storage;
-- this is the path plus which angle it is.
create table if not exists public.portal_van_photos (
  id          uuid primary key default gen_random_uuid(),
  check_id    uuid not null references public.portal_van_checks(id) on delete cascade,
  vehicle_id  uuid not null references public.portal_vehicles(id) on delete cascade,
  path        text not null,
  label       text,
  created_at  timestamptz not null default now()
);

create index if not exists portal_van_photos_check_idx on public.portal_van_photos (check_id);

alter table public.portal_van_checks enable row level security;
alter table public.portal_van_photos enable row level security;

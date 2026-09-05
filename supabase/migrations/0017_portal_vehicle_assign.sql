-- The van is someone's. They do its checks, it shows on their profile, and the
-- fleet page says whose it is. Set null rather than cascade: losing a person
-- shouldn't take the van's history with it.
alter table public.portal_vehicles
  add column if not exists assigned_to uuid references public.portal_users(id) on delete set null;

create index if not exists portal_vehicles_assigned_idx on public.portal_vehicles (assigned_to);

-- Photos hang off a specific line of the check now — the tyres, the panels, the
-- km on the dash — not just the check as a whole.
alter table public.portal_van_photos add column if not exists item_key text;

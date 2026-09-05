-- When we got it and whether it was new or second hand. Without a start date
-- there is no way to say how much life a vehicle has left, which is the figure
-- the finance owing has to be read against.
alter table public.portal_vehicles add column if not exists purchased_on date;
alter table public.portal_vehicles add column if not exists condition   text;

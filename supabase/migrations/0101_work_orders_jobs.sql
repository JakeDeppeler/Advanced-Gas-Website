-- Work orders go in as a job on the agency's customer and the tenant's site
-- (lib/outlook/stPlace.ts), not as a Booking. Which customer and site, and
-- whether the site was already there or made for this. And a status for one
-- whose agency isn't a customer the portal can be sure of: left for the office.
alter table public.work_orders
  add column if not exists st_customer_id bigint,
  add column if not exists st_location_id bigint,
  add column if not exists location_how text;

alter table public.work_orders drop constraint if exists work_orders_status_check;
alter table public.work_orders add constraint work_orders_status_check
  check (status in ('working', 'booked', 'duplicate', 'not', 'failed', 'needs_agency'));

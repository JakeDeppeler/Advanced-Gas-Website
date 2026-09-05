-- What a service costs and how far the van goes in a year. Service interval
-- alone doesn't tell you what servicing costs: a Ford at 30,000km and $500 is a
-- different animal to an LDV at 10,000km and $700-$1,000, and without the km a
-- year neither the servicing nor the fuel can be turned into an annual figure.
alter table public.portal_vehicles add column if not exists service_cost numeric;
alter table public.portal_vehicles add column if not exists km_year      numeric;

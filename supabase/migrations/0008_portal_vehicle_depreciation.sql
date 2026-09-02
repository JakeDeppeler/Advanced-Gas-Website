-- Purchase/resale/lifespan for straight-line depreciation, and fuel economy.
alter table public.portal_vehicles add column if not exists purchase_price  numeric;
alter table public.portal_vehicles add column if not exists resale_value    numeric;
alter table public.portal_vehicles add column if not exists lifespan_years  numeric;
alter table public.portal_vehicles add column if not exists fuel_l_per_100  numeric;

-- Supply › Next week: suppliers whose orders carry a delivery fee each time
-- (Mitsubishi, Rinnai, iStore) get one order covering every job not yet
-- ordered from today to the end of next week, instead of one per week.
-- And who signs Mitsubishi's form, and the delivery instruction for orders
-- coming to the factory.
--
-- Idempotent. Settings are merged under what is there, so a value already
-- changed in the portal is kept.

alter table public.order_suppliers add column if not exists combine_orders boolean not null default false;

comment on column public.order_suppliers.combine_orders is
  'Put this week''s and next week''s unordered jobs on one order — one delivery fee instead of several.';

update public.order_suppliers set combine_orders = true
 where id in ('mitsubishi', 'rinnai', 'istore') and combine_orders = false;

update public.portal_settings
   set value = jsonb_build_object(
         'signName', 'Kellie Winbanks',
         'signPosition', 'Owner',
         'factoryInstructions', 'Deliver to our factory'
       ) || value,
       updated_at = now()
 where key = 'ordering'
   and not (value ? 'signName' and value ? 'signPosition' and value ? 'factoryInstructions');

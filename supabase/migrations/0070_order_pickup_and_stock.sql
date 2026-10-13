-- Supply › Next week: an order can be picked up rather than delivered, and
-- stock for the factory can be added to an order by hand.
--
-- purchase_orders.pickup — we collect it. The email, Mitsubishi's form and
-- the Reece list say so instead of giving a delivery address.
--
-- purchase_order_lines.manual — a line the office added (stock), not one
-- drafted from a job. Redrafting rewrites the job lines only; these stay, and
-- a draft holding them is never thrown away for having no job lines left.
--
-- Idempotent. The pick-up wording is merged under what's there.

alter table public.purchase_orders add column if not exists pickup boolean not null default false;
alter table public.purchase_order_lines add column if not exists manual boolean not null default false;

update public.portal_settings
   set value = jsonb_build_object('pickupInstructions', 'We''ll pick this up — please call 03 5947 8000 when it''s ready.') || value,
       updated_at = now()
 where key = 'ordering'
   and not (value ? 'pickupInstructions');

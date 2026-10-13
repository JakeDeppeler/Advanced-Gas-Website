-- Orders & stock › Factory stock: a stock line on a sent order (one added by
-- hand for the factory, not for a job) is "on its way" until someone marks it
-- arrived, which puts it on the shelf through portal_stock_move.
--
-- received_at / received_by — when it came in and who said so. Set once: the
-- update that sets it only matches a line where it's still null, so pressing
-- "Arrived" twice can't put two on the shelf.
-- stock_item_id — the factory line it went onto.
--
-- Idempotent.

alter table public.purchase_order_lines add column if not exists received_at timestamptz;
alter table public.purchase_order_lines add column if not exists received_by text;
alter table public.purchase_order_lines add column if not exists stock_item_id uuid;

-- Drafts are now made by a refresh after every ServiceTitan sync as well as
-- by the office's Redraft button. Two drafting at the same moment could each
-- find no draft and each create one — two orders, two deliveries. The
-- database refuses the second instead.
--
-- One draft goods order per supplier per week, and one draft work order per
-- visit (group key without its "#2" top-up suffix) per week. Sent and
-- cancelled orders are not affected. Idempotent.

create unique index if not exists purchase_orders_one_draft_order
  on public.purchase_orders (week_of, supplier_id)
  where status = 'draft' and kind = 'order';

create unique index if not exists purchase_orders_one_draft_work_order
  on public.purchase_orders (week_of, split_part(group_key, '#', 1))
  where status = 'draft' and kind = 'work_order';

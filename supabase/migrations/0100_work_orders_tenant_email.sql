-- The email to the tenant once a work order is booked (lib/outlook/workOrders.ts):
-- who it went to and when, or in tenant_email_note why none went (switched off,
-- no tenant email in the work order, one that looked like the agency's, or the
-- send refused).
alter table public.work_orders
  add column if not exists tenant_email_to text,
  add column if not exists tenant_emailed_at timestamptz,
  add column if not exists tenant_email_note text;

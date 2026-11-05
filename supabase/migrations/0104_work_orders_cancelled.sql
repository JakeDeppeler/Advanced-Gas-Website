-- A work order's job cancelled because the agency cancelled it by email
-- (lib/outlook/cancel.ts): when, and the memo put on the job.
alter table public.work_orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_note text;

-- Orders & stock › Sent: a sent order (Reclaim, the electrician's work order)
-- leaves a note on each job in ServiceTitan, with the order attached as a PDF,
-- so whoever opens the job sees what's coming and when.
--
-- st_notes — per job, what's been done: [{ job_id, note, file }]. A job with
--   its note and file already there is skipped, so a retry never doubles up.
-- st_note_error — ServiceTitan's answer when it refused, shown on the order.
--
-- Idempotent.

alter table public.purchase_orders add column if not exists st_notes jsonb not null default '[]'::jsonb;
alter table public.purchase_orders add column if not exists st_note_error text;

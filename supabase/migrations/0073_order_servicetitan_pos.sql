-- Orders & stock › Sent: each sent order goes into ServiceTitan as purchase
-- orders — one per job on it, and one for the factory's stock — so the job
-- shows what was ordered for it.
--
-- st_pos — what ServiceTitan made: [{ job_id, st_id, number }], one per group.
--   A group already listed is never sent again, so a retry after a partial
--   failure only makes the ones that are missing.
-- st_error — ServiceTitan's answer when it refused, shown on the order.
-- st_pushed_at — when the last one went in.
--
-- Idempotent.

alter table public.purchase_orders add column if not exists st_pos jsonb not null default '[]'::jsonb;
alter table public.purchase_orders add column if not exists st_error text;
alter table public.purchase_orders add column if not exists st_pushed_at timestamptz;

-- A claim on each job's install pack, so two runs that overlap (the board's
-- refresh, the Actions sync, the morning cron) can't both build and attach
-- the same pack. A run takes a job by setting claimed_at where it's empty or
-- stale; only one conditional update can win, and the claim is cleared when
-- the pack is done or has failed.
--
-- Idempotent.

alter table public.install_packs add column if not exists claimed_at timestamptz;

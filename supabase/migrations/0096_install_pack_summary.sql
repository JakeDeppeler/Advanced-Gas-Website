-- The install summary on an install pack (Jake, 4 Nov): read the Condition
-- Report from the visit before the install, its photos, the job summary and
-- the sold quote, and write how the install will go — where the indoor head
-- goes, pump or not, the pipe run, wall or roof bracket — with the Condition
-- Report itself in the same PDF. See src/lib/installpack/summary.ts.
--
-- visit_reports: the completed Condition Reports found on the install job,
-- its quote job and the earlier visits at the same address, as ServiceTitan
-- sent them, checked again every few hours.
-- summary: what was written ({ ok: {...} } or { error, at }), and
-- summary_key the hash of what it was written from, so it's only written
-- again when one of those changes.
--
-- Idempotent.

alter table public.install_packs add column if not exists visit_reports jsonb;
alter table public.install_packs add column if not exists reports_checked_at timestamptz;
alter table public.install_packs add column if not exists summary jsonb;
alter table public.install_packs add column if not exists summary_key text;

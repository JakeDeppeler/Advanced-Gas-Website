-- Two lookups the portal makes by job that had no index, so each read a whole
-- table: invoices by job (job profit, the pipeline's billed column — about
-- 77 ms a call, tens of thousands of calls), and the job made from an
-- estimate (the pipeline's "booked" column).
-- Built CONCURRENTLY so the sync keeps writing while they build; run outside
-- a transaction.
create index concurrently if not exists st_invoices_job_id_idx on public.st_invoices (job_id);
create index concurrently if not exists st_jobs_from_estimate_idx on public.st_jobs ((raw->>'createdFromEstimateId'));

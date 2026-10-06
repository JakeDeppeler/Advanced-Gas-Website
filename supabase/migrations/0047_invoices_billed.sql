-- Invoiced means the work was done.
--
-- ServiceTitan opens an invoice when a job is created and puts the priced lines
-- on it as the quote is built, so an invoice carries a total long before
-- anybody has done the work or sent a bill. The board summed those totals and
-- called it revenue.
--
-- On the financial year to date that was $172,612 of $559,922 — 31% — sitting
-- on jobs that had never been completed:
--
--   Completed    289 invoices   $387,309   175 of them paid against, $208,652 in
--   InProgress    46 invoices   $126,568     0 of them ever paid against, $0
--   Scheduled     16 invoices    $46,044     1 of them paid against, $1,531
--
-- The last column is what settles it. Invoices on completed jobs get paid; of
-- the forty-six on jobs still in progress, not one has ever had a cent applied
-- to it. They are not invoices anybody has sent — they are priced work sitting
-- on a job that has not finished. One of them put $5,814 on the wall under
-- "Invoiced today" on a morning when nothing had been done.
--
-- A view rather than a column on st_invoices, because the thing that makes an
-- invoice real lives on the job, and a copy of it on the invoice would go stale
-- the moment a job's status changed without its invoice being touched.
--
-- An inner join loses nothing here: every one of the 5,429 invoices carries a
-- job_id, and every one of those jobs is in the replica.
--
-- security_invoker so the view reads under the caller's rights rather than the
-- owner's, and the service-role-only rule on the base tables still holds.
--
-- Not for every question. `st_invoices` is still the right table for asking
-- whether a finished job has been billed yet — that one is about the invoices
-- that are still at zero, which this view is designed to hide.

create or replace view public.st_invoices_billed
with (security_invoker = true) as
select i.*
  from public.st_invoices i
  join public.st_jobs j on j.id = i.job_id
 where j.status = 'Completed';

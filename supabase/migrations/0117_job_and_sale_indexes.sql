-- Indexes for the lookups the portal makes all day that had none (11 Nov).
--
-- The order views (upcoming_order_lines, electrician_work_orders,
-- sold_unbooked_order_lines) took two to twelve seconds a read, and the
-- website-lead matching timed out outright. Each filters jobs by status or
-- customer and quotes by "Sold", and with no index on any of those every read
-- walked the whole of st_jobs and st_estimates. On a database this size that
-- is the difference between a page and a spinner.
--
-- Built concurrently so the live tables stay writable while they build; that
-- also means each statement must run on its own, outside a transaction.

create index concurrently if not exists st_jobs_customer_idx on public.st_jobs (customer_id);

-- Open jobs only: the order views and To-do read Scheduled and Hold jobs, a
-- few hundred of many thousands.
create index concurrently if not exists st_jobs_open_idx on public.st_jobs (id)
  where status in ('Scheduled', 'Hold');

-- Sold quotes by job and by sale date: what the order views and the sold
-- figures look up.
create index concurrently if not exists st_estimates_sold_job_idx on public.st_estimates (job_id)
  where status = 'Sold';
create index concurrently if not exists st_estimates_sold_on_sold_idx on public.st_estimates (sold_on desc)
  where status = 'Sold';

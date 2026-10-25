-- Reconciling the wall board against the database.
--
-- Every figure on the board is recomputed here straight from the tables, to the
-- rule the code says it uses, and set beside what the latest snapshot actually
-- published. Run it in the Supabase SQL editor against the live project; it is
-- read-only. `on_board` and `recomputed` must match, to the cent and to the job.
--
-- Why a .sql file rather than a check script: the scripts under this folder run
-- with no credentials, against fixtures, and that is the point of them — they
-- prove the *rules* are right. This proves the *published numbers* are right,
-- which needs the live replica, and the board's own service-role key never
-- leaves the deployment.
--
-- This was written after three wrong figures in a row on the Team page — a
-- column that summed quote options, a footer that divided month money by
-- thirty-day counts, and a footer that summed per-person rows for jobs two
-- people had quoted. None of them failed a typecheck and none of them looked
-- wrong until somebody did the arithmetic out loud. Run this after any change
-- to metrics.ts.

with snap as (select metrics as m, computed_at from portal_metrics_snapshot order by computed_at desc limit 1),
d as (
  select date_trunc('day',   (now() at time zone 'Australia/Melbourne')) at time zone 'Australia/Melbourne' as day_start,
         date_trunc('month', (now() at time zone 'Australia/Melbourne')) at time zone 'Australia/Melbourne' as month_start,
         (date_trunc('month',(now() at time zone 'Australia/Melbourne')))::date                             as month_date
),
-- The board's own population: under the $50,000 ceiling, Field Plus residue out,
-- both sides of the business in.
sales as (
  select * from st_sales, d
  where sold_on >= d.month_start and est_total < 50000
    and (business_unit is null or business_unit !~* '^imported default')
),
est as (
  select e.*, coalesce('j'||e.job_id, case when e.customer_id is not null and e.created_on is not null
         then 'c'||e.customer_id||'-'||to_char(e.created_on,'YYYY-MM-DD') else 'e'||e.id end) as qkey
  from st_estimates e, d
  where e.created_on >= d.month_start and e.total < 50000
    and (e.business_unit is null or e.business_unit !~* '^imported default')
),
est_opts as (select qkey, count(*) n from est group by qkey),
-- Open quotes: per job, at the average of its options, under the ceiling,
-- written inside the thirty days a quote is live for.
open_jobs as (
  select coalesce('j'||job_id, case when customer_id is not null and created_on is not null
         then 'c'||customer_id||'-'||to_char(created_on,'YYYY-MM-DD') else 'e'||id end) as qkey,
         avg(total_inc) as typical, max(total_inc) as biggest,
         bool_or(created_on is null or created_on >= now() - interval '30 days') as fresh
  from st_estimates
  where sold_on is null and status not in ('Dismissed','Expired')
    and (business_unit is null or business_unit !~* '^imported default')
  group by 1
),
-- To bill: finished since ServiceTitan took over invoicing, invoice still at
-- zero, quote visits out, and not waiting on the job its sale was booked as.
done_jobs as (
  select j.id, j.job_type from st_jobs j
  where j.completed_on >= '2026-09-17T00:00:00Z' and j.status = 'Completed'
),
unbilled as (
  select dj.id from done_jobs dj
  where coalesce((select sum(i.total) from st_invoices i where i.job_id = dj.id),0) = 0
    and coalesce(dj.job_type,'') !~* '^(quotation|quote|site assessment)'
),
followon as (
  select distinct u.id from unbilled u
  join st_estimates e on e.job_id = u.id and e.sold_on is not null
  join st_jobs nx on nx.raw->>'createdFromEstimateId' = e.id::text and nx.status <> 'Canceled'
)
select figure, on_board, recomputed,
       case when on_board is null or recomputed is null then 'skipped'
            when abs(on_board - recomputed) < 0.005 then 'ok'
            else 'MISMATCH' end as verdict
from (
  select 'soldMtd' as figure, (select (m->>'soldMtd')::numeric from snap) as on_board,
         (select round(sum(total_inc),2) from sales) as recomputed
  union all select 'soldCountMonth', (select (m->>'soldCountMonth')::numeric from snap),
         (select count(*) from sales where first)
  union all select 'soldToday', (select (m->>'soldToday')::numeric from snap),
         (select coalesce(round(sum(total_inc),2),0) from sales, d where sold_on >= d.day_start)
  union all select 'soldCountToday', (select (m->>'soldCountToday')::numeric from snap),
         (select count(*) from sales, d where first and sold_on >= d.day_start)
  union all select 'avgSoldValue', (select round((m->>'avgSoldValue')::numeric,2) from snap),
         (select round(sum(total_inc)/nullif(count(*) filter (where first),0),2) from sales)
  union all select 'quotesCreatedMonthValue', (select round((m->>'quotesCreatedMonthValue')::numeric,2) from snap),
         (select round(sum(e.total_inc / o.n),2) from est e join est_opts o using (qkey))
  union all select 'quotesCreatedMonthCount', (select (m->>'quotesCreatedMonthCount')::numeric from snap),
         (select count(*) from est_opts)
  union all select 'quotesCreatedTodayValue', (select round((m->>'quotesCreatedTodayValue')::numeric,2) from snap),
         (select coalesce(round(sum(e.total_inc / o.n),2),0) from est e join est_opts o using (qkey), d
           where e.created_on >= d.day_start)
  union all select 'quotesCreatedTodayCount', (select (m->>'quotesCreatedTodayCount')::numeric from snap),
         (select count(distinct e.qkey) from est e, d where e.created_on >= d.day_start)
  union all select 'avgQuoteMonth', (select round((m->>'avgQuoteMonth')::numeric,2) from snap),
         (select round(sum(e.total_inc / o.n) / nullif((select count(*) from est_opts),0),2)
            from est e join est_opts o using (qkey))
  union all select 'estimatesOpenCount', (select (m->>'estimatesOpenCount')::numeric from snap),
         (select count(*) from open_jobs where fresh and biggest < 50000)
  union all select 'estimatesOpenValue', (select round((m->>'estimatesOpenValue')::numeric,2) from snap),
         (select round(sum(typical),2) from open_jobs where fresh and biggest < 50000)
  union all select 'estimatesStaleCount', (select (m->>'estimatesStaleCount')::numeric from snap),
         (select count(*) from open_jobs where not fresh and biggest < 50000)
  union all select 'revenueInvoicedMtd', (select round((m->>'revenueInvoicedMtd')::numeric,2) from snap),
         (select round(sum(total),2) from st_invoices_billed, d where invoice_date >= d.month_date)
  union all select 'invoiceCountMonth', (select (m->>'invoiceCountMonth')::numeric from snap),
         (select count(*) from st_invoices_billed, d where invoice_date >= d.month_date)
  union all select 'avgInvoiceValue', (select round((m->>'avgInvoiceValue')::numeric,2) from snap),
         (select round(sum(total)/nullif(count(*),0),2) from st_invoices_billed, d where invoice_date >= d.month_date)
  -- Bookings: dated by creation, installs out (they exist because something
  -- already sold), cancelled out (a cancelled job is not work coming in).
  union all select 'bookingsMonth', (select (m->>'bookingsMonth')::numeric from snap),
         (select count(*) from st_jobs, d where created_on >= d.month_start
            and coalesce(job_type,'') !~* '^install' and status <> 'Canceled')
  union all select 'bookingsToday', (select (m->>'bookingsToday')::numeric from snap),
         (select count(*) from st_jobs, d where created_on >= d.day_start
            and coalesce(job_type,'') !~* '^install' and status <> 'Canceled')
  union all select 'jobsCompletedToday', (select (m->>'jobsCompletedToday')::numeric from snap),
         (select count(*) from st_jobs, d where completed_on >= d.day_start and status = 'Completed')
  union all select 'leadsToday', (select (m->>'leadsToday')::numeric from snap),
         (select count(*) from portal_leads, d where created_at >= d.day_start)
  union all select 'leadsMonth', (select (m->>'leadsMonth')::numeric from snap),
         (select count(*) from portal_leads, d where created_at >= d.month_start)
  union all select 'toBillCount', (select (m->>'toBillCount')::numeric from snap),
         (select count(*) from unbilled) - (select count(*) from followon)
  -- The Team foot must equal the board's own figures: it reads them rather than
  -- summing the cards, because seven jobs this month were priced by two people.
  union all select 'teamQuoted = quotesCreatedMonthValue',
         (select round((m->>'quotesCreatedMonthValue')::numeric,2) from snap),
         (select round(sum(e.total_inc / o.n),2) from est e join est_opts o using (qkey))
  union all select 'leaderboard quoted sums to the month',
         (select round(sum((r->>'quoted')::numeric),2) from snap, lateral jsonb_array_elements(m->'salesLeaderboard') r),
         (select round(sum(e.total_inc / o.n),2) from est e join est_opts o using (qkey)
           where e.created_by is not null)
) rows
order by 4, figure;

-- Pin search_path on the six public functions Supabase's advisor flags as
-- "role mutable search_path".
--
-- Without it a function resolves the tables it names (st_jobs, st_job_types,
-- ...) through whatever search_path the caller has set, so a caller who can
-- create objects in a schema earlier on that path could make it read or write
-- their own table instead. Pinning it to public (with pg_temp last, so a
-- temporary table can't shadow anything) makes every name mean the table this
-- repo created, whoever calls it.
--
-- Nothing else changes: same bodies, same callers (the sync and the board,
-- both on the service-role key). The SQL ones lose inlining, which costs
-- nothing at the sizes they're called on.
--
-- is_allowed() is the advisor's other warning and is deliberately left alone:
-- it is SECURITY DEFINER and executable by signed-in users because the
-- calculator's row-level security policies (calc_data, monthly_actuals,
-- commercial_jobs, job_checklist_items, job_outcomes, storage "plans") call it
-- for every signed-in user. Revoking it would lock the calculator out. All it
-- answers is whether the caller's own email is on allowed_users.
--
-- Idempotent.

alter function public.dashboard_resolve_names() set search_path = public, pg_temp;
alter function public.dashboard_field_fill() set search_path = public, pg_temp;
alter function public.dashboard_field_health(integer) set search_path = public, pg_temp;
alter function public.st_items_sum(jsonb, text) set search_path = public, pg_temp;
alter function public.st_items_last_day(jsonb) set search_path = public, pg_temp;
alter function public.st_rebate_back(jsonb) set search_path = public, pg_temp;

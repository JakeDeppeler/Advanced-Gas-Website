-- The quote pipeline: ServiceTitan says what was quoted and what sold; these
-- two tables hold what the office does in between.
--
-- portal_quote_follow is one row per quote (per job, not per option — the same
-- key as quoteKey() in src/lib/dashboard/metrics.ts): who's chasing it, the day
-- to ring next, and, if it's gone, why. A quote with no row is simply one
-- nobody has touched yet, which is what the pipeline needs to know.
--
-- portal_quote_touches is the log of every call, text or email, so whoever
-- picks a quote up next can see it was rung twice and the customer is waiting
-- on their strata. Nothing is deleted from either.
--
-- Additive only.

create table if not exists public.portal_quote_follow (
  quote_key    text primary key check (length(quote_key) between 2 and 80),
  owner        text,
  next_on      date,
  lost_at      timestamptz,
  lost_reason  text,
  updated_by   text,
  updated_at   timestamptz not null default now()
);
alter table public.portal_quote_follow enable row level security;

create table if not exists public.portal_quote_touches (
  id          uuid primary key default gen_random_uuid(),
  quote_key   text not null check (length(quote_key) between 2 and 80),
  how         text not null check (how in ('call', 'no_answer', 'text', 'email', 'visit', 'note')),
  note        text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_quote_touches_key on public.portal_quote_touches (quote_key, created_at desc);
alter table public.portal_quote_touches enable row level security;

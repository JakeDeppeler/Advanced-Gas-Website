-- The quote follow-up emails as they go (lib/quotes/followUps.ts, rules in
-- followUpRules.ts). One row per quote the sender has seen go out; status
-- 'before' is a quote already out when the follow-ups were switched on, left
-- alone (Jake, 8 Nov: "leave the older quotes alone").
create table if not exists public.portal_quote_followups (
  quote_key text primary key,
  job_id bigint,
  customer_id bigint,
  estimate_id bigint,
  email text,
  kind text,
  status text not null check (status in ('before', 'active', 'stopped', 'done')),
  reason text,
  started_at timestamptz not null default now(),
  last_sent_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists portal_quote_followups_status on public.portal_quote_followups (status, started_at desc);
alter table public.portal_quote_followups enable row level security;

-- Each email in a quote's series: claimed before it goes (unique per quote
-- and template), so two runs can't both send it.
create table if not exists public.portal_quote_followup_sends (
  id uuid primary key default gen_random_uuid(),
  quote_key text not null,
  template_key text not null,
  day int,
  status text not null check (status in ('sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 1,
  subject text,
  email text,
  error text,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quote_key, template_key)
);
create index if not exists portal_quote_followup_sends_created on public.portal_quote_followup_sends (created_at desc);
alter table public.portal_quote_followup_sends enable row level security;

-- Run with the review emails, every ten minutes; it sends only between 9am
-- and 7pm Monday to Saturday, and nothing while switched off.
select cron.schedule('portal-after-sync', '3-59/10 * * * *', $$
  select public.portal_cron_call('/api/ordering/draft?mode=refresh');
  select public.portal_cron_call('/api/install-packs');
  select public.portal_cron_call('/api/email/outlook/sweep');
  select public.portal_cron_call('/api/reviews/run');
  select public.portal_cron_call('/api/quotes/follow-ups');
$$);

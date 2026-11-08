-- The after-the-quote customer emails as they go (lib/autoEmails/run.ts):
-- thanks for going ahead, let's pick a day, all done, invoice reminders,
-- service reminders. Each claimed before it goes, unique per kind, thing
-- and step, so two runs can't send it twice. Every kind is off until it's
-- switched on at Marketing › Customer emails.
create table if not exists public.portal_auto_emails (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sold', 'pickaday', 'done', 'invoice', 'service')),
  ref text not null,
  step text not null,
  status text not null check (status in ('sending', 'sent', 'failed', 'skipped')),
  email text,
  subject text,
  error text,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, ref, step)
);
create index if not exists portal_auto_emails_sent on public.portal_auto_emails (status, sent_at desc);
alter table public.portal_auto_emails enable row level security;

select cron.schedule('portal-after-sync', '3-59/10 * * * *', $$
  select public.portal_cron_call('/api/ordering/draft?mode=refresh');
  select public.portal_cron_call('/api/install-packs');
  select public.portal_cron_call('/api/email/outlook/sweep');
  select public.portal_cron_call('/api/reviews/run');
  select public.portal_cron_call('/api/quotes/follow-ups');
  select public.portal_cron_call('/api/emails/auto');
$$);

-- Filing admin@ into its own folders (lib/outlook/filing.ts, rules in
-- filingTypes.ts). One row per Inbox email looked at: where it would go or
-- went, or why it stays. In trial nothing moves and the row says where it
-- would have; switched on, it records the move. Kept two months.
create table if not exists public.mail_filing (
  id uuid primary key default gen_random_uuid(),
  mailbox text not null,
  message_id text not null,
  received_at timestamptz,
  from_address text,
  subject text,
  status text not null check (status in ('stays', 'would', 'moved', 'kept', 'back', 'failed')),
  folder_id text,
  folder_name text,
  why text,
  -- Which flagged-word list it was checked against: an edited list checks it again.
  words_key text,
  decided_at timestamptz not null default now(),
  moved_at timestamptz,
  error text,
  unique (mailbox, message_id)
);
create index if not exists mail_filing_recent on public.mail_filing (mailbox, received_at desc);
alter table public.mail_filing enable row level security;

-- Where each sender's (and each company domain's) filed email sits, learned
-- once a day from a sample of every folder that isn't on the never list.
create table if not exists public.mail_folder_homes (
  mailbox text not null,
  kind text not null check (kind in ('sender', 'domain')),
  key text not null,
  folder_id text not null,
  n integer not null,
  total integer not null,
  learned_at timestamptz not null default now(),
  primary key (mailbox, kind, key)
);
alter table public.mail_folder_homes enable row level security;

select cron.schedule('portal-after-sync', '3-59/10 * * * *', $$
  select public.portal_cron_call('/api/ordering/draft?mode=refresh');
  select public.portal_cron_call('/api/install-packs');
  select public.portal_cron_call('/api/email/outlook/sweep');
  select public.portal_cron_call('/api/reviews/run');
  select public.portal_cron_call('/api/quotes/follow-ups');
  select public.portal_cron_call('/api/emails/auto');
  select public.portal_cron_call('/api/email/filing');
$$);

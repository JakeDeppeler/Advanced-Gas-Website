-- Emails asking us to ring them back (lib/outlook/handle.ts), listed on the
-- morning to-do email (lib/reminders/daily.ts) until the email's flag is marked
-- complete in Outlook.
alter table public.mail_drafts add column if not exists callback_at timestamptz;
alter table public.mail_drafts add column if not exists callback_name text;
alter table public.mail_drafts add column if not exists callback_phone text;
alter table public.mail_drafts add column if not exists callback_about text;
alter table public.mail_drafts add column if not exists callback_done_at timestamptz;
alter table public.mail_drafts add column if not exists callback_done_how text;

create index if not exists mail_drafts_callback_open
  on public.mail_drafts (callback_at)
  where callback_at is not null and callback_done_at is null;

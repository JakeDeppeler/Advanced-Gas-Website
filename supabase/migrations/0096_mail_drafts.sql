-- Outlook reply drafts: one row per email that arrived in a drafted mailbox
-- (admin@, jake@), and what became of it.
--
-- The row is written first, as a claim: the webhook and the sweep can both
-- reach the same email at once, and only the one whose insert lands drafts
-- it. After that it is the record of why an email did or didn't get a draft
-- (lib/outlook/handle.ts).
--
-- message_id is Graph's immutable id, which survives the email being filed
-- into another folder.
create table if not exists public.mail_drafts (
  id                  uuid primary key default gen_random_uuid(),
  mailbox             text not null,
  message_id          text not null,
  internet_message_id text,
  conversation_id     text,
  received_at         timestamptz,
  from_address        text,
  subject             text,
  status              text not null default 'working',
  reason              text,
  handoff             text,
  draft_id            text,
  attempts            integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint mail_drafts_status_check check (status in ('working', 'drafted', 'skipped', 'failed')),
  constraint mail_drafts_mailbox_message_key unique (mailbox, message_id)
);

create index if not exists mail_drafts_received_idx on public.mail_drafts (mailbox, received_at desc);

-- Customer emails: the service role only, like the chat inbox.
alter table public.mail_drafts enable row level security;

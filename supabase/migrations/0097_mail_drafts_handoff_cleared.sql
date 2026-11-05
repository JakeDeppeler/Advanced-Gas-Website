-- When the Needs a person tag came off an email, because a reply went out in
-- its thread (lib/outlook/handoff.ts). Null while the tag is still on. Only
-- rows with a handoff ever get one.
alter table public.mail_drafts add column if not exists handoff_cleared_at timestamptz;

create index if not exists mail_drafts_open_handoffs_idx on public.mail_drafts (mailbox, conversation_id)
  where handoff is not null and handoff_cleared_at is null;

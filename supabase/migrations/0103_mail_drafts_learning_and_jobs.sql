-- What the drafts learn from, and which job an email went onto.
--
-- draft_text is the reply as drafted; sent_text is what was actually sent in
-- the thread afterwards (from Sent Items), so new drafts can read the office's
-- recent replies beside the drafts they started from (lib/outlook/draft.ts).
--
-- job_* is the ServiceTitan job an email went onto as a note, and how it was
-- matched (lib/outlook/jobLink.ts): a later reply in the same thread goes on
-- the same job.
alter table public.mail_drafts
  add column if not exists draft_text text,
  add column if not exists sent_text text,
  add column if not exists sent_at timestamptz,
  add column if not exists job_id bigint,
  add column if not exists job_number text,
  add column if not exists job_how text,
  add column if not exists job_linked_at timestamptz;

create index if not exists mail_drafts_thread_job_idx on public.mail_drafts (mailbox, conversation_id) where job_id is not null;
create index if not exists mail_drafts_examples_idx on public.mail_drafts (mailbox, sent_at desc) where sent_text is not null;

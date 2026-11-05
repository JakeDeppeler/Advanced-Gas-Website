-- When a newer draft in the same thread made this one's draft out of date,
-- and it was dealt with: deleted if still as we wrote it, left if somebody
-- had edited it, or already gone (lib/outlook/drafts.ts). Null while it is
-- the thread's current draft.
alter table public.mail_drafts add column if not exists superseded_at timestamptz;

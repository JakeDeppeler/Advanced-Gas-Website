-- Row-level security on st_job_tags, which 0073 created without it.
--
-- With it off, anyone holding the project's public (anon) key could read and
-- change the tag names that decide what counts as held work. Nothing in the
-- site uses that key: the sync writes this table and the portal reads it
-- server-side with the service-role key, which row-level security doesn't
-- apply to. So, like 0057's six, it needs no policies: switching it on shuts
-- out the anon key and changes nothing for the portal.
--
-- Idempotent.

alter table public.st_job_tags enable row level security;

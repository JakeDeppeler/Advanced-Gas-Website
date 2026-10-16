-- Where a lead came from on the other side, so the same one cannot land twice.
--
-- Facebook retries any webhook delivery it did not get a 200 for, generously:
-- the same enquiry can arrive four times inside a minute. Without a unique key
-- of Meta's own, each retry would be another row — and every row is a
-- full-screen alert on the office wall telling somebody to ring a person they
-- have already rung.
--
-- Nullable, and unique only where it is set: the website's quote form has no
-- such id and never will, and a partial index keeps the forty-odd rows already
-- here out of it entirely.
--
-- Note for anyone adding another writer: this index is partial, and
-- `insert ... on conflict (external_id) do nothing` does NOT match a partial
-- index unless the statement repeats its predicate — it fails with 42P10, "no
-- unique or exclusion constraint matching the ON CONFLICT specification", and
-- PostgREST's `on_conflict=` gives you no way to add one. So the webhook does
-- not ask Postgres to ignore the duplicate; it lets the insert fail and reads
-- the 409. Same outcome, no dependency on the shape of this index. See
-- storeIncoming in src/lib/leads/meta.ts.
alter table public.portal_leads
  add column if not exists external_id text;

create unique index if not exists portal_leads_external_id_key
  on public.portal_leads (external_id)
  where external_id is not null;

comment on column public.portal_leads.external_id is
  'The id this lead has in the system it came from (fb-lead:<leadgen_id>, fb-msg:<sender>:<day>). Null for the website form.';

-- Every quote request, stored before anything is emailed.
--
-- Until now a lead existed in exactly one place: an email. If the key
-- was missing, the domain was suspended, or Resend had a bad minute,
-- the enquiry was gone and the customer had been told "thanks, we've
-- got it". This table is the record; the email is a notification.
--
-- Run once against the project, then set SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY on Vercel. Until those are set the API
-- route skips the insert, so nothing breaks in preview builds.

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  service       text not null,
  headline      text,
  summary       text,
  name          text not null,
  phone         text not null,
  email         text,
  postcode      text,
  address       text,
  notes         text,
  photo_count   integer not null default 0,
  -- The branching answers, as sent. Kept whole rather than flattened
  -- into columns: the quote form's shape changes often and a JSON blob
  -- doesn't need a migration every time it does.
  details       jsonb not null default '{}'::jsonb,
  -- Worked, or still to be rung. For the team, not the website.
  handled_at    timestamptz,
  handled_by    text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_unhandled_idx  on public.leads (created_at desc) where handled_at is null;

-- The API route writes with the service-role key, which bypasses RLS.
-- RLS is on with no policies so that an anon or leaked publishable key
-- cannot read customer phone numbers and addresses.
alter table public.leads enable row level security;

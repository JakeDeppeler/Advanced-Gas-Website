-- One-tap answers from the quote follow-up emails (lib/quotes/answers.ts):
-- "Let's go ahead", "I've got a question", "Not this time". One row per quote
-- and answer, so pressing twice doesn't tell the office twice. A "no" stops
-- that quote's follow-ups.
create table if not exists public.portal_quote_answers (
  id uuid primary key default gen_random_uuid(),
  estimate_id bigint not null,
  job_id bigint,
  customer_name text,
  answer text not null check (answer in ('yes', 'question', 'no')),
  note text,
  created_at timestamptz not null default now(),
  unique (estimate_id, answer)
);
create index if not exists portal_quote_answers_created on public.portal_quote_answers (created_at desc);
alter table public.portal_quote_answers enable row level security;

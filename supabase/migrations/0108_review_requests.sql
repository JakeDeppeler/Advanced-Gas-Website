-- Google review requests by email (lib/reviews/requests.ts): one row per job
-- asked, so nobody is asked twice for a job or more than once a year, and the
-- office can see who was asked, by which tech's job, and who opened the link.
create table if not exists public.portal_review_requests (
  id uuid primary key default gen_random_uuid(),
  job_id bigint not null unique,
  job_number text,
  customer_id bigint,
  customer_name text,
  email text,
  techs text[] not null default '{}',
  suburb text,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  error text,
  sent_at timestamptz,
  clicked_at timestamptz,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists portal_review_requests_customer on public.portal_review_requests (customer_id, created_at desc);
create index if not exists portal_review_requests_email on public.portal_review_requests (lower(email), created_at desc);
alter table public.portal_review_requests enable row level security;

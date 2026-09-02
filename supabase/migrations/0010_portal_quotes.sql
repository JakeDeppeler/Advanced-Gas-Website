-- Quotes issued and their outcome, for win-rate tracking and quoting targets.
-- ServiceTitan can populate this later (source/external_id); for now it's manual.
create table if not exists public.portal_quotes (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric not null default 0,
  status      text not null default 'quoted' check (status in ('quoted','won','lost')),
  customer    text,
  quoted_on   date not null default (now() at time zone 'utc')::date,
  source      text,
  external_id text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_quotes_idx on public.portal_quotes (quoted_on desc, created_at desc);
alter table public.portal_quotes enable row level security;

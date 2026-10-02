-- Call records, for the per-person call counts on the team page.
--
-- Populated only once ServiceTitan's Telecom scope is granted to the app — a
-- tenant re-authorisation, not a code change. Until then the table stays empty
-- and the board says the source isn't connected rather than showing zeroes.
--
-- RLS on with no policies, as with the other st_* tables: the sync and the
-- screen both connect with the service_role key, which bypasses it.
create table if not exists public.st_calls (
  id               bigint primary key,
  agent            text,
  agent_id         bigint,
  direction        text,
  outcome          text,
  duration_seconds numeric,
  customer_id      bigint,
  campaign         text,
  received_on      timestamptz,
  modified_on      timestamptz,
  raw              jsonb not null default '{}'::jsonb
);

-- The board groups by agent over a month window, which is exactly this index.
create index if not exists st_calls_received_idx on public.st_calls (received_on desc);
create index if not exists st_calls_agent_idx    on public.st_calls (agent, received_on desc);

alter table public.st_calls enable row level security;

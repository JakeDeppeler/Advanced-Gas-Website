-- Stored OAuth connection for third-party integrations (Xero to start).
-- One row per provider. Holds the rotating refresh token and the current
-- access token; service-role only (RLS on, no policies) so the tokens are
-- never reachable with an anon/publishable key.

create table if not exists public.portal_integrations (
  provider      text primary key,        -- 'xero'
  tenant_id     text,
  tenant_name   text,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  connected_by  text,
  connected_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.portal_integrations enable row level security;

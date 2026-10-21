-- Every email this business sends, and whether it arrived.
--
-- There was no record of a send at all. The quote form told the customer their
-- enquiry was in, the office waited for an email, and if Resend had refused it
-- the only trace was a line in a serverless log nobody reads. A bounce left
-- less than that: the provider knew, and nothing here ever asked.
--
-- A row per send rather than only per failure, because a bounce arrives later
-- and by itself — the webhook says "this message id bounced" and nothing about
-- what the message was. Without the send row, the wall could say an email
-- bounced and never say which one, which is the kind of alert a room learns to
-- walk past. Volume is tens a day.
create table if not exists public.portal_email_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- What the message was: 'quote-lead', 'order', 'report'… See EMAIL_KINDS.
  kind text not null default 'other',
  to_email text,
  subject text,
  -- 'sent' | 'delivered' | 'failed' | 'bounced' | 'complained'. Ours on the
  -- way out, the provider's on the way back.
  status text not null default 'sent',
  -- Resend's own id for the message, which is the only thing a bounce webhook
  -- and a send have in common.
  provider_id text,
  -- The error, or the bounce reason, as the provider gave it.
  detail text,
  -- What it was about, so a failure can point at the job or the lead.
  about jsonb not null default '{}'::jsonb,
  -- Set when somebody has dealt with it. The board counts what is unresolved,
  -- so this is the only thing that takes the alert down — a bounce has no
  -- underlying state that fixes itself, unlike a journal that syncs next run.
  resolved_at timestamptz,
  resolved_by text
);

-- The board's question: what is unresolved, oldest first. Partial, because the
-- rows it skips are the overwhelming majority and always will be.
create index if not exists portal_email_events_trouble_idx
  on public.portal_email_events (created_at desc)
  where resolved_at is null and status in ('failed', 'bounced');

-- The webhook's question: which send was this, by provider id.
create index if not exists portal_email_events_provider_idx
  on public.portal_email_events (provider_id)
  where provider_id is not null;

alter table public.portal_email_events enable row level security;

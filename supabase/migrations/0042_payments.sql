-- What customers have actually paid.
--
-- The board has had money quoted, sold, invoiced and owed since it went up, and
-- nothing at all about money arriving. Invoiced is what we asked for; this is
-- what turned up, and on a day the office is chasing debtors it is the only one
-- of the five that moves.
--
-- ServiceTitan records every payment against the invoice it was applied to —
-- the "Payment Applied" alert the office already gets by email is this row — and
-- it sits under the Accounting scope the invoice sync already uses, so nothing
-- new has to be granted.
--
-- `paid_on` is the day the payment is dated, kept as a Melbourne date the same
-- way `st_invoices.invoice_date` is, so "paid today" and "invoiced today" mean
-- the same today. `applied_to` keeps ServiceTitan's own split of one payment
-- across several invoices; the board only sums `total`, but a payment that
-- cleared three invoices is a thing somebody will ask about.
--
-- Additive only: creates a table, touches nothing that exists.

create table if not exists public.st_payments (
  id            bigint primary key,
  customer_id   bigint,
  business_unit text,
  -- "Cash", "Online Payments", "Credit Card" — how it arrived.
  type          text,
  status        text,
  memo          text,
  total         numeric,
  paid_on       date,
  -- The invoices it was applied to, as ServiceTitan splits it.
  applied_to    jsonb not null default '[]'::jsonb,
  created_on    timestamptz,
  modified_on   timestamptz,
  raw           jsonb not null default '{}'::jsonb,
  synced_at     timestamptz not null default now()
);

create index if not exists st_payments_paid_on_idx on public.st_payments (paid_on desc);

-- Service-role only, like every other replica table: the board reads it server
-- side and nothing in the browser ever holds the key.
alter table public.st_payments enable row level security;

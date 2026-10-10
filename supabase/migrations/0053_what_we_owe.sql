-- What we owe: Xero's unpaid bills are read live; these two tables hold what
-- the portal adds to them.
--
-- portal_supplier_priority says which suppliers come first when there isn't
-- enough to pay everyone, and why — "Reece: if we don't pay, we can't buy
-- stock". Keyed by the supplier's name as Xero has it.
--
-- portal_payables is money owed that Xero doesn't have a bill for (a Reece
-- account statement, a loan repayment, a handshake). Paying one stamps
-- paid_at; removing one stamps removed_at. Nothing is deleted.
--
-- Additive only.

create table if not exists public.portal_supplier_priority (
  supplier    text primary key check (length(btrim(supplier)) between 1 and 200),
  priority    text not null default 'normal' check (priority in ('must', 'high', 'normal', 'wait')),
  reason      text,
  updated_by  text,
  updated_at  timestamptz not null default now()
);
alter table public.portal_supplier_priority enable row level security;

create table if not exists public.portal_payables (
  id          uuid primary key default gen_random_uuid(),
  supplier    text not null check (length(btrim(supplier)) between 1 and 200),
  what        text,
  amount      numeric(12, 2) not null check (amount > 0),
  due_on      date not null,
  created_by  text,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz,
  removed_at  timestamptz
);
create index if not exists portal_payables_open on public.portal_payables (due_on) where paid_at is null and removed_at is null;
alter table public.portal_payables enable row level security;

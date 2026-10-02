-- Reece API: PunchOut carts carry Reece's cart token and the order they became;
-- invoices get a replica so they can be matched to ServiceTitan jobs and POs.
--
-- RLS on, no policies, service-role only, as with the rest of the pricebook tables.

alter table public.reece_punchout_carts add column if not exists cart_token      text;
alter table public.reece_punchout_carts add column if not exists customer_number text;
alter table public.reece_punchout_carts add column if not exists reece_order_id  bigint;
alter table public.reece_punchout_carts add column if not exists reece_order     jsonb;
create unique index if not exists reece_punchout_carts_cart_token_idx
  on public.reece_punchout_carts (cart_token) where cart_token is not null;

create table if not exists public.reece_invoices (
  document_number   bigint primary key,
  document_type     text not null,
  document_date     date,
  document_due_date date,
  customer_number   bigint,
  job_number        text,
  order_number      text,
  total_ex_gst      numeric,
  total_inc_gst     numeric,
  invoice_url       text,
  -- The full invoice-gateway/invoices record, lines included, once fetched.
  raw               jsonb,
  -- null until the detail call has run for this document.
  detail_fetched_at timestamptz,
  first_seen_at     timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists reece_invoices_document_date_idx on public.reece_invoices (document_date desc);
create index if not exists reece_invoices_order_number_idx on public.reece_invoices (order_number);
alter table public.reece_invoices enable row level security;

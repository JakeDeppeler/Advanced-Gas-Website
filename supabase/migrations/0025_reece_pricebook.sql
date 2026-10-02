-- Reece maX ↔ ServiceTitan pricebook link.
--
-- Three tables:
--   supplier_items        — a replica of the Reece catalogue with *our* contractor
--                           pricing, however it arrived (maX price file upload now,
--                           maX catalogue API nightly once Reece issues credentials).
--                           Everything downstream reads this, never the source.
--   pricebook_sync_runs   — one row per dry-run or apply against the ServiceTitan
--                           pricebook, with the full change list, so "what changed
--                           and when" is answerable without re-deriving it.
--   reece_punchout_carts  — carts posted back by maX PunchOut, stored verbatim and
--                           resolved to ServiceTitan material ids.
--
-- RLS on, no policies: service-role only, same as every other portal_* / st_* table.

create table if not exists public.supplier_items (
  supplier       text not null default 'reece',
  code           text not null,
  description    text,
  uom            text,
  pack_qty       numeric,
  -- Our contractor price from Reece, ex GST. ServiceTitan adds tax at the
  -- invoice line, so the pricebook holds ex-GST figures and a taxable flag.
  cost           numeric,
  gst_applies    boolean not null default true,
  list_price     numeric,
  category       text,
  barcode        text,
  -- 'file' (maX price file upload) or 'api' (maX catalogue pull).
  source         text not null default 'file',
  raw            jsonb not null default '{}'::jsonb,
  first_seen_at  timestamptz not null default now(),
  -- Bumped every time the item appears in an import. An item not seen for a
  -- while has been dropped by Reece; the sync reports it rather than deleting.
  seen_at        timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (supplier, code)
);
create index if not exists supplier_items_seen_at_idx on public.supplier_items (supplier, seen_at desc);
-- Local item search for quoting, used when the maX search API is not configured.
create index if not exists supplier_items_description_idx on public.supplier_items
  using gin (to_tsvector('simple', coalesce(description, '') || ' ' || code));
alter table public.supplier_items enable row level security;

create table if not exists public.pricebook_sync_runs (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  -- 'dry-run' computes and stores the plan; 'apply' also writes it to ServiceTitan.
  mode         text not null,
  supplier     text not null default 'reece',
  -- Counts: matched, updated, created, unchanged, missing_in_supplier, errors.
  summary      jsonb not null default '{}'::jsonb,
  -- The per-material change list (capped — see src/lib/stPricebook.ts).
  changes      jsonb not null default '[]'::jsonb,
  errors       jsonb not null default '[]'::jsonb,
  settings     jsonb not null default '{}'::jsonb
);
create index if not exists pricebook_sync_runs_started_at_idx on public.pricebook_sync_runs (started_at desc);
alter table public.pricebook_sync_runs enable row level security;

create table if not exists public.reece_punchout_carts (
  id                    uuid primary key default gen_random_uuid(),
  received_at           timestamptz not null default now(),
  -- 'received' → 'resolved' (lines mapped to ServiceTitan materials)
  --            → 'ordered' (purchase order created) | 'error'
  status                text not null default 'received',
  cart                  jsonb not null,
  -- The cart's lines joined to ServiceTitan material ids; null until resolved.
  resolved_lines        jsonb,
  st_purchase_order_id  bigint,
  st_job_id             bigint,
  error                 text
);
create index if not exists reece_punchout_carts_received_at_idx on public.reece_punchout_carts (received_at desc);
alter table public.reece_punchout_carts enable row level security;

-- Pricing rules live in portal_settings under key 'pricebook' so the office can
-- change the markup without a deploy. Documented in PRICEBOOK.md; the defaults
-- below are what the sync assumes when the row is absent.
insert into public.portal_settings (key, value)
values ('pricebook', jsonb_build_object(
  'vendorName', 'Reece',
  -- 'markup': sell price = cost × (1 + markupPercent/100), rounded.
  -- 'cost-only': update the vendor cost only and leave sell prices alone.
  'priceMode', 'cost-only',
  'markupPercent', 0,
  -- Round derived sell prices to this increment (1 = whole dollars, 0.05 = 5c).
  'roundTo', 1,
  -- Create ServiceTitan materials for Reece codes not yet in the pricebook.
  -- Off by default: the full Reece catalogue is tens of thousands of lines.
  'createMissing', false,
  -- Prefix on ServiceTitan material codes created by the sync, e.g. 'RE-'.
  'codePrefix', ''
))
on conflict (key) do nothing;

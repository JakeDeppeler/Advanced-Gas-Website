-- The email list: every address the business already holds, in one place to
-- run a campaign from or export.
--
-- ServiceTitan keeps a customer's email as a contact on the customer (and
-- sometimes on the service location), not on the job, so the sync now exports
-- both contact lists here. Phones come too — they're the same export — but the
-- list only reads the emails.
--
-- Opt-outs are kept by address, not by source, so someone who asked to be left
-- off stays off however many places their email turns up. Removing an opt-out
-- deletes its row; nothing else here is ever deleted by the portal.
--
-- Additive only.

create table if not exists public.st_customer_contacts (
  id           bigint primary key,
  customer_id  bigint,
  type         text,
  value        text,
  memo         text,
  active       boolean,
  modified_on  timestamptz,
  raw          jsonb,
  synced_at    timestamptz not null default now()
);
create index if not exists st_customer_contacts_customer on public.st_customer_contacts (customer_id);
create index if not exists st_customer_contacts_email on public.st_customer_contacts (lower(value)) where type ilike '%email%';
alter table public.st_customer_contacts enable row level security;

create table if not exists public.st_location_contacts (
  id           bigint primary key,
  location_id  bigint,
  type         text,
  value        text,
  memo         text,
  active       boolean,
  modified_on  timestamptz,
  raw          jsonb,
  synced_at    timestamptz not null default now()
);
create index if not exists st_location_contacts_location on public.st_location_contacts (location_id);
alter table public.st_location_contacts enable row level security;

create table if not exists public.portal_email_optouts (
  email       text primary key check (email = lower(btrim(email)) and length(email) between 3 and 320),
  reason      text,
  created_by  text,
  created_at  timestamptz not null default now()
);
alter table public.portal_email_optouts enable row level security;

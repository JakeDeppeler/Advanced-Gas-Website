-- Keep in touch: the people the business needs to stay close to — builders,
-- agents, suppliers, referrers — and when somebody last reached out to each.
--
-- Every contact has someone in the office who looks after them and how often
-- they want hearing from (a month unless said otherwise). The next one is due
-- that long after the last; past that day the portal flags it — on the Keep in
-- touch page, the bell, Home and the daily report — until somebody logs a call,
-- a text, an email or a visit.
--
-- Each reach-out is kept as its own row, so a contact's history reads back as
-- a list; the contact carries the latest one so the page needn't add them up.
-- Removing a contact only stamps removed_at.
--
-- Additive only.

create table if not exists public.portal_contacts (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(btrim(name)) between 1 and 200),
  company          text,
  kind             text,                          -- builder, agent, supplier, …: see src/lib/contacts/types.ts
  phone            text,
  email            text,
  notes            text,
  owner_id         uuid references public.portal_users(id) on delete set null,
  cadence          text not null default 'month' check (cadence in ('fortnight', 'month', '2months', 'quarter')),
  last_contact_on  date,
  last_contact_how text,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  removed_at       timestamptz
);

create table if not exists public.portal_contact_touches (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.portal_contacts(id) on delete cascade,
  on_date     date not null,
  how         text not null,                      -- call, text, email, visit, coffee, other
  note        text,
  by_id       uuid references public.portal_users(id) on delete set null,
  by_name     text,
  created_at  timestamptz not null default now()
);

create index if not exists portal_contacts_owner_idx on public.portal_contacts (owner_id) where removed_at is null;
create index if not exists portal_contact_touches_contact_idx on public.portal_contact_touches (contact_id, on_date desc);

-- As every portal_ table: the service role reads and writes, nothing else can.
alter table public.portal_contacts enable row level security;
alter table public.portal_contact_touches enable row level security;

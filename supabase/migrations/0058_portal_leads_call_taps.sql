-- Let a phone tap be recorded.
--
-- /api/track has inserted a `kind = 'call'` row for every tap on a phone
-- number since 0019 added the column, and every one of those inserts was
-- rejected: `name` and `phone` are NOT NULL, a tap carries neither, and the
-- route swallows the error by design. Five weeks of "which pages make people
-- ring" went into the void (0 call rows, 38 quote rows on 12 Oct 2026).
--
-- A quote still needs a name and a number; the check keeps that rule where
-- the column constraint used to. Everything that counts leads filters on
-- kind = 'quote' so a tap never reads as an enquiry.

alter table public.portal_leads alter column name  drop not null;
alter table public.portal_leads alter column phone drop not null;

alter table public.portal_leads drop constraint if exists portal_leads_quote_has_contact;
alter table public.portal_leads add constraint portal_leads_quote_has_contact
  check (kind = 'call' or (name is not null and phone is not null));

create index if not exists portal_leads_kind_created_idx on public.portal_leads (kind, created_at desc);

-- A quote lead has to carry a way of answering it — but a phone number is not
-- the only one.
--
-- The rule until now was "name and phone, or it isn't a quote", which was true
-- of every lead the business had: they all came from the website's own form,
-- and that form makes both fields required. Facebook does not work that way. A
-- lead-ad form only collects what the form asks for, and a Messenger enquiry
-- has no phone number at all — the reply goes back down the thread it came
-- from.
--
-- So the rule keeps its intent and loses its assumption: a quote has to have
-- something to answer on. A phone number, an email address, or an id in the
-- system it came from, which is what a Messenger thread amounts to.
--
-- Widening a check can never fail on rows already in the table, and every
-- existing quote row carries a phone, so this cannot reject anything that is
-- already here.
alter table public.portal_leads
  drop constraint if exists portal_leads_quote_has_contact;

alter table public.portal_leads
  add constraint portal_leads_quote_has_contact
  check (
    kind = 'call'
    or phone is not null
    or email is not null
    or external_id is not null
  );

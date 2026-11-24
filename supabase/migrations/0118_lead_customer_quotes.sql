-- Website leads quoted without a job (11 Nov).
--
-- Twenty of the thirty-three "not linked" enquiries had in fact been quoted:
-- the office makes the customer in ServiceTitan and writes the quote straight
-- on them, no job, so lead_job_matches (jobs only) never found them and the
-- page showed them as lost. A lead now links to the customer when that's
-- where its quotes are, and its stage follows those quotes.
--
-- The match is the one jobs use: the lead's phone or email on the customer's
-- or site's contacts, a quote made from a day before the enquiry to 45 days
-- after, and (checked in autoLink.ts) the names agreeing, so an agent's
-- number shared by a dozen rentals doesn't tie one tenant's enquiry to
-- another tenant's quote.

alter table public.portal_leads add column if not exists st_customer_id bigint;

create or replace view public.lead_quote_matches with (security_invoker = true) as
with l as (
  select id, created_at,
    nullif(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9), '') as p,
    nullif(lower(trim(coalesce(email, ''))), '') as e
  from portal_leads
  where st_job_id is null and st_customer_id is null and kind = 'quote'
    and created_at > now() - interval '120 days'
), k as (
  select id, created_at, p as key from l where length(p) = 9
  union
  select id, created_at, e from l where e is not null
), cust as (
  select k.id, k.created_at, cc.customer_id from k join st_customer_contacts cc on cc.match_key = k.key
  union
  select k.id, k.created_at, j.customer_id
  from k join st_location_contacts lc on lc.match_key = k.key
  join st_jobs j on j.location_id = lc.location_id
  union
  select k.id, k.created_at, e.customer_id
  from k join st_location_contacts lc on lc.match_key = k.key
  join st_estimates e on (e.raw ->> 'locationId') = lc.location_id::text
), quoted as (
  select c.id as lead_id, c.customer_id, min(e.created_on) as first_quote, count(*) as quotes
  from cust c
  join st_estimates e on e.customer_id = c.customer_id
    and e.created_on >= c.created_at - interval '1 day'
    and e.created_on <= c.created_at + interval '45 days'
  where c.customer_id is not null
  group by c.id, c.customer_id
), ranked as (
  select *, row_number() over (partition by lead_id order by first_quote) as rn from quoted
)
select lead_id, customer_id, first_quote, quotes from ranked where rn = 1;

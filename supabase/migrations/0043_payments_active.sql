-- Voided payments, and the customer a payment belongs to.
--
-- The first real sync brought 4,492 payments and showed up two things the
-- mapper had guessed wrong against the live payload:
--
-- 1. Thirty-two of them are `active: false` — reversed, voided, or entered
--    twice and backed out, $34,063 all up. They are still payment records and
--    they are not money that arrived, so nothing that says "paid" may count
--    them.
--
-- 2. ServiceTitan nests the customer as `{ id, name }`, not a flat
--    `customerId`, so `customer_id` came back null on every single row.
--
-- `active` is generated from `raw` rather than written by the sync, so it is
-- right for the 4,492 rows already in the table without a backfill and cannot
-- drift from the payload later. Unknown reads as active: a row whose payload
-- predates the key is a payment that happened.
--
-- `customer_id` stays a plain column — the mapper fills it from now on and the
-- update below catches up what is already here. Additive: one new column, one
-- backfill of a column that is null on every row.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'st_payments' and column_name = 'active'
  ) then
    alter table public.st_payments
      add column active boolean generated always as (
        case when raw->>'active' = 'false' then false else true end
      ) stored;
  end if;
end $$;

update public.st_payments
   set customer_id = (raw->'customer'->>'id')::bigint
 where customer_id is null
   and raw->'customer'->>'id' ~ '^\d+$';

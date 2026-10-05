-- The day an invoice was actually billed.
--
-- ServiceTitan's invoiceDate is the day the job was finished, not the day the
-- office priced it. Over September, 55 of 79 priced invoices had their lines
-- added or changed after that date — anywhere up to thirteen days later — so
-- "Invoiced today" counted by invoice date showed a job finished on the 1st
-- and billed on the 5th as the 1st's money, and the 5th looked like a quiet day
-- in the office when it wasn't.
--
-- `invoiced_on` is the Melbourne date of the latest change to any of the
-- invoice's lines: the day the last of it was put on the invoice. Where an
-- invoice has no lines it falls back to the invoice date. Generated, so the
-- sync never has to remember it and every reader agrees.
--
-- The month and the year keep counting by invoice date: that is the date the
-- invoice carries into Xero, and the year's running total has to match the
-- books. This column is for "what did the office bill today".
--
-- Additive only.

create or replace function public.st_items_last_day(items jsonb)
returns date
language sql
immutable
as $$
  -- ServiceTitan writes these as UTC ISO timestamps ("…Z"), which parse the
  -- same whatever the session's settings, so the function is safe to declare
  -- immutable for a generated column.
  select (max((x->>'modifiedOn')::timestamptz) at time zone 'Australia/Melbourne')::date
    from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end) x
   where (x->>'modifiedOn') ~ '^\d{4}-\d{2}-\d{2}T'
$$;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'st_invoices' and column_name = 'invoiced_on') then
    alter table st_invoices
      add column invoiced_on date generated always as (coalesce(public.st_items_last_day(raw->'items'), invoice_date)) stored;
  end if;
end $$;

create index if not exists st_invoices_invoiced_on_idx on public.st_invoices (invoiced_on desc);

-- Repair st_estimates.status, which every row held as the literal string
-- "[object Object]".
--
-- ServiceTitan returns the field as { name, value }, and the mapper called
-- String() on it. The damage was not the column but the filter built on it:
-- "status not in (Dismissed, Expired)" excluded nothing, so 1,235 dismissed
-- quotes counted as money still out and the board put four years of dead
-- pipeline on the wall.
--
-- The sync preserves the whole record in `raw`, so the real value is already
-- here and this needs no re-export. Idempotent: it only touches rows whose
-- status is unusable and whose raw payload carries a name.

update st_estimates
   set status = raw -> 'status' ->> 'name'
 where (status is null or status = '[object Object]')
   and raw -> 'status' ->> 'name' is not null;

-- Same shape of damage anywhere else it may have landed. Jobs and invoices read
-- clean today, but they go through the same mapper and a future field could
-- arrive as an enum object.
update st_jobs
   set status = raw -> 'jobStatus' ->> 'name'
 where status = '[object Object]'
   and raw -> 'jobStatus' ->> 'name' is not null;

update st_invoices
   set status = raw -> 'status' ->> 'name'
 where status = '[object Object]'
   and raw -> 'status' ->> 'name' is not null;

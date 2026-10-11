-- Invoices synced before the sync learned to read ServiceTitan's business unit
-- object kept "[object Object]" as their business unit — 5,309 rows, invoice
-- dates up to 2 October. The sync has read the name properly since, but the
-- export feed only resends an invoice when it changes, so the old rows were
-- never put right. The name is in the payload each row already stores.
--
-- Nothing on the board or in the portal reads an invoice's business unit yet,
-- so no figure moves; this is so the first report that does isn't wrong.
--
-- Idempotent: only touches rows still holding the placeholder.

update st_invoices
   set business_unit = coalesce(raw->'businessUnit'->>'name', raw->>'businessUnitName')
 where business_unit = '[object Object]'
   and coalesce(raw->'businessUnit'->>'name', raw->>'businessUnitName') is not null;

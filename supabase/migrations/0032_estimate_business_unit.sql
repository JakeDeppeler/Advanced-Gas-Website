-- Which side of the business each quote belongs to.
--
-- The board is a residential wall. Commercial work is real money and does not
-- belong on it: a $119,000 commercial project at the top of "still out" is not
-- something anybody in that room is going to ring about, and it pushed a week's
-- actual quoting off the bottom of the card.
--
-- A dollar ceiling alone could not do this. Half the quotes — 520 of 991 in the
-- last sixty days — carry "Imported Default Businessunit", the migration
-- placeholder, so the unit is unknown for most of them. The two filters are
-- complementary: the unit catches commercial work priced like residential, and
-- the ceiling catches the unclassified outliers.

alter table st_estimates add column if not exists business_unit text;
create index if not exists st_estimates_bu_idx on st_estimates (business_unit);

-- The payload is already stored, so this needs no re-export.
update st_estimates
   set business_unit = raw ->> 'businessUnitName'
 where business_unit is null
   and raw ->> 'businessUnitName' is not null;

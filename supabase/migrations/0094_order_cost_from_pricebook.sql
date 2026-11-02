-- Order lines priced from the pricebook, not the quote.
--
-- Both ordering views took each line's cost from the sold quote's unitCost:
-- whatever was typed when the job was quoted. Job 20401's quote had the 12kW
-- outdoor at $4,000 and five heads at $0, so Mitsubishi got an order with a
-- $0 line and an outdoor above our price, and asked for it to be reissued
-- (AGA-261102-MIT-3, 2 Nov). The pricebook item's primary vendor cost is what
-- the supplier actually charges us, and it's kept current. It wins whenever it
-- is set above $0; otherwise the quote's cost stands (COMM-SUNDRY has $0 in
-- the pricebook and its real figure on the quote).
--
-- Only the selected cost changes: the views' filters still read the quote's
-- own cost, and every other column is as it was. Rewritten from the live
-- definition so the rest of each view is untouched; guarded, so it runs once.
do $$
declare
  v text;
  d text;
  expr constant text := '    COALESCE(NULLIF(COALESCE(((pe.raw -> ''primaryVendor''::text) ->> ''cost''::text), ((pm.raw -> ''primaryVendor''::text) ->> ''cost''::text))::numeric, 0::numeric), i.unit_cost) AS unit_cost,';
begin
  foreach v in array array['upcoming_order_lines', 'sold_unbooked_order_lines'] loop
    d := rtrim(pg_get_viewdef(('public.' || v)::regclass, true), '; ');
    if position('primaryVendor''::text) ->> ''cost''' in d) = 0 then
      execute format('create or replace view public.%I with (security_invoker = true) as %s', v, replace(d, '    i.unit_cost,', expr));
    end if;
  end loop;
end $$;

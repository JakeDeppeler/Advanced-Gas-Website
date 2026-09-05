-- What is still owed on a vehicle. A van can be part-paid off and still carry a
-- resale value, so the two are separate figures, not one net number.
alter table public.portal_vehicles add column if not exists amount_owing numeric;

-- Road state as three options rather than a yes/no, so "in for repair" is not
-- filed under the same heading as one that has been retired. Null rows fall
-- back to the existing active flag.
alter table public.portal_vehicles add column if not exists status text;

-- What each van costs a month in finance repayments.
--
-- The vans already carry what was paid, what's still owing, resale and life
-- (for depreciation). The repayment is the other half of the loan: it's cash
-- out the door every month whether the van earns or not, and the planning page
-- needs it to say what another van really takes. Set on Finance → Our numbers.
--
-- Additive only.

alter table public.portal_vehicles add column if not exists monthly_repayment numeric(12, 2);

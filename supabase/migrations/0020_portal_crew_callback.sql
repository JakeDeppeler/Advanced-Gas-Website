-- Call-backs per person rather than one figure for the business. A first-year
-- apprentice and a tradesman of twenty years do not go back to fix their own
-- work at the same rate, and averaging them hides the one number worth acting
-- on. Null means fall back to the business-wide setting.
alter table public.portal_users add column if not exists callback_pct numeric;

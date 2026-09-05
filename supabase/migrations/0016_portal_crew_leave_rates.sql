-- An RDO a month, and the two rates that apply when the work isn't in normal
-- hours. Stored as multipliers on the base rate rather than dollar figures, so
-- a wage rise carries through to overtime and nights without being retyped.
alter table public.portal_users add column if not exists rdo_days   numeric default 12;
alter table public.portal_users add column if not exists ot_mult    numeric default 1.5;
alter table public.portal_users add column if not exists night_mult numeric default 2;

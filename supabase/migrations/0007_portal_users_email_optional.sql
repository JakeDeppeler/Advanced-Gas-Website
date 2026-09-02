-- Allow crew members with no login email (labourers/subbies you only cost).
alter table public.portal_users alter column email drop not null;

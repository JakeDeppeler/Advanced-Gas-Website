-- The Service manager role (lib/portal/caps.ts): runs the crew day to day,
-- sees each tech's performance (the "team" capability) but not pay or the bank.
alter table public.portal_users drop constraint if exists portal_users_role_check;
alter table public.portal_users add constraint portal_users_role_check
  check (role = any (array['admin'::text, 'service'::text, 'lead'::text, 'member'::text]));

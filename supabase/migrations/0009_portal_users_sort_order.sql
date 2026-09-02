-- Manual ordering of the team (drag with the up/down arrows on the Team page).
alter table public.portal_users add column if not exists sort_order integer;

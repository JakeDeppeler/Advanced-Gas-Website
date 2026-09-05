-- Whether someone runs their own van. A crew member riding with a tech isn't a
-- second chargeable body, so their hours don't count as billable hours — their
-- wage is carried as overhead and recovered through the tech's rate instead.
-- Existing rows default to true so nobody's billable hours vanish on deploy.
alter table public.portal_users add column if not exists own_van boolean default true;

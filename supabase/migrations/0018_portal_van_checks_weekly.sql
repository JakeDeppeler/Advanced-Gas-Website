-- The daily check became a weekly one, done on the Monday by whoever the van is
-- signed to. Any rows already saved as 'daily' carry over rather than being
-- stranded outside the new constraint.
alter table public.portal_van_checks drop constraint if exists portal_van_checks_kind_check;
update public.portal_van_checks set kind = 'weekly' where kind = 'daily';
alter table public.portal_van_checks
  add constraint portal_van_checks_kind_check
  check (kind in ('weekly','monthly','stock','plant','bag'));

-- The emails after the sale, when the job's done, invoice reminders and
-- service reminders join the follow-ups on Marketing › Customer emails
-- (lib/email/templates/defaults.ts), so a saved edit of one can be stored.
alter table public.portal_email_templates drop constraint if exists portal_email_templates_grp_check;
alter table public.portal_email_templates add constraint portal_email_templates_grp_check
  check (grp in ('followup', 'reply', 'sold', 'done', 'invoice', 'service'));

-- The 15 Nov quote templates are made by /api/pricebook/quote-templates, a
-- call's worth at a time, so it rides the after-sync schedule beside the other
-- portal jobs. Not inside /api/sync: that already takes half its minute, and a
-- hundred or so ServiceTitan writes would push the wall board's snapshot past
-- the end of it. Once everything is made the route answers "all done" and does
-- nothing, so it can stay on the list.
--
-- cron.schedule with an existing name replaces that job's command, which is
-- what keeps this idempotent.
select cron.schedule('portal-after-sync', '3-59/10 * * * *', $$
  select public.portal_cron_call('/api/ordering/draft?mode=refresh');
  select public.portal_cron_call('/api/install-packs');
  select public.portal_cron_call('/api/email/outlook/sweep');
  select public.portal_cron_call('/api/reviews/run');
  select public.portal_cron_call('/api/quotes/follow-ups');
  select public.portal_cron_call('/api/emails/auto');
  select public.portal_cron_call('/api/email/filing');
  select public.portal_cron_call('/api/pricebook/quote-templates');
$$);

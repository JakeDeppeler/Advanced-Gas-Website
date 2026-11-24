-- Equipment price plans go to ServiceTitan from the after-sync schedule too
-- (22 Nov). Jake approved the minimum markups in chat ("can you update the
-- equipment markups"), not with the button on Our prices, which needs a
-- signed-in admin; /api/pricebook/equipment-plan/run writes an approved plan a
-- slice at a time with the same checks as the button, and answers "nothing
-- approved" otherwise, so it can stay on the list.
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
  select public.portal_cron_call('/api/pricebook/equipment-plan/run');
$$);

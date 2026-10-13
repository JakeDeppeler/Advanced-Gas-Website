-- Every goods order tells the supplier we have no forklift to unload with,
-- wherever it is being delivered. Added after the delivery instructions on
-- the email and on Mitsubishi's form; shown on the Reece list for maX.
--
-- Idempotent; a note already changed in the portal is kept.

update public.portal_settings
   set value = jsonb_build_object('deliveryNote', 'We do not have a forklift.') || value,
       updated_at = now()
 where key = 'ordering'
   and not (value ? 'deliveryNote');

-- Row-level security on the six tables that were made without it.
--
-- With it off, anyone holding the project's public (anon) key could read and
-- change every row — and st_employees holds staff records. The site never
-- uses that key: the portal, the sync and the wall board all reach the
-- database server-side with the service-role key, which row-level security
-- doesn't apply to. So, like the 42 other tables already set up this way, these
-- need no policies: switching it on shuts out the anon key and changes
-- nothing for the portal.
--
-- Idempotent.

alter table public.st_employees           enable row level security;
alter table public.portal_campaigns       enable row level security;
alter table public.portal_brand_assets    enable row level security;
alter table public.portal_handbook_topics enable row level security;
alter table public.portal_videos          enable row level security;
alter table public.portal_video_watches   enable row level security;

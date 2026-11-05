-- The files library (Marketing › Materials, Team › Resources) gets a bucket of
-- its own. It was writing into van-photos, which only takes JPEG, PNG and
-- WebP up to 10MB, so every PDF, Excel price list and manual was refused and
-- no resource ever saved (5 Nov). Private like the rest: files go out as
-- short-lived signed links. 25MB each, any type: manuals and price files are
-- PDFs and spreadsheets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library', 'library', false, 26214400, null)
on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = null;

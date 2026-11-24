-- The van-photos bucket takes HEIC and HEIF as well as JPEG, PNG and WebP.
--
-- Phones save photos as HEIC, and the install pack photo export
-- (src/lib/installpack/photoExport.ts) copies a job's photos into this bucket
-- under install-pack/ for a pack made by hand. Every photo on jobs 20801 and
-- 20881 was HEIC, and the bucket turned all seven away (400). Applied by hand
-- on 22 Nov 2026; this file records it. Idempotent: it sets the whole list.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'van-photos';

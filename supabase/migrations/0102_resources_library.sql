-- Team › Resources: price lists, product and tech sheets, manuals, in folders,
-- on the same folders-and-files library as Marketing › Materials (0074). One
-- library with two shelves rather than a copy of it: `library` says which.
-- Everything already there is the marketing kit.
alter table public.portal_brand_folders add column if not exists library text not null default 'brand';
alter table public.portal_brand_assets add column if not exists library text not null default 'brand';
create index if not exists portal_brand_folders_library_idx on public.portal_brand_folders (library);
create index if not exists portal_brand_assets_library_idx on public.portal_brand_assets (library);

-- The shelves Jake asked for, made once; the office adds brands and more under them.
insert into public.portal_brand_folders (name, parent_id, created_by, library)
select v.name, null, 'Set up', 'resources'
from (values ('Price lists'), ('Product information'), ('Tech and install'), ('Manuals')) v(name)
where not exists (select 1 from public.portal_brand_folders f where f.library = 'resources' and f.parent_id is null and lower(f.name) = lower(v.name));

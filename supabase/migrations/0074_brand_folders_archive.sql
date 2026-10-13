-- Marketing › Files: folders, and archiving instead of deleting.
--
-- portal_brand_folders — a folder, inside another when parent_id is set.
--   Archiving a folder hides it and everything in it; restoring brings the
--   lot back. Nothing in it is moved or changed.
-- portal_brand_assets.folder_id — the folder a file sits in; null is the top.
-- portal_brand_assets.archived_at — archived files leave the list but keep
--   their file in storage until someone deletes them for good.
--
-- Idempotent.

create table if not exists public.portal_brand_folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  parent_id   uuid references public.portal_brand_folders(id) on delete cascade,
  archived_at timestamptz,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_brand_folders_parent_idx on public.portal_brand_folders (parent_id);
alter table public.portal_brand_folders enable row level security;

alter table public.portal_brand_assets add column if not exists folder_id uuid references public.portal_brand_folders(id) on delete set null;
alter table public.portal_brand_assets add column if not exists archived_at timestamptz;
create index if not exists portal_brand_assets_folder_idx on public.portal_brand_assets (folder_id);

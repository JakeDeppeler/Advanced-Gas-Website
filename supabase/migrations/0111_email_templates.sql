-- Customer emails the office edits on Marketing › Customer emails
-- (lib/email/templates). A standard email has no row until someone changes
-- it; "back to the standard wording" deletes its row. An email added to a
-- follow-up series is a row with built_in false.
create table if not exists public.portal_email_templates (
  key text primary key,
  grp text not null check (grp in ('followup', 'reply', 'sold')),
  name text not null,
  series text check (series in ('heat-pump', 'split', 'general')),
  day int check (day between 1 and 60),
  active boolean not null default true,
  subject text not null default '',
  preheader text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  signer text not null default 'quoter',
  built_in boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.portal_email_templates enable row level security;

-- Every version before a save, a reset or a delete, so a change can be undone
-- from the page. The last 25 per email are kept.
create table if not exists public.portal_email_template_versions (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  saved jsonb not null,
  saved_by text,
  saved_at timestamptz not null default now()
);
create index if not exists portal_email_template_versions_key on public.portal_email_template_versions (key, saved_at desc);
alter table public.portal_email_template_versions enable row level security;

-- Photos uploaded for emails. The files are in the email-images bucket and
-- served by /api/email-image, through Next's image optimiser, so they go out
-- at email size whatever came off the phone.
create table if not exists public.portal_email_photos (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  label text not null default '',
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.portal_email_photos enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('email-images', 'email-images', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 15728640, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

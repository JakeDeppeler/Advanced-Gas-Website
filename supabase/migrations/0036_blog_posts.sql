-- Blog posts written in the portal, over the ones in src/lib/blog.ts.
--
-- Same arrangement as the procedures: the constant keeps the eight posts
-- that are already written and indexed, and a row here is a new post or an
-- override of one by its slug. The public blog reads both.
--
-- This is the one store in the portal whose published rows reach the public
-- web, so the columns Google reads — slug, seo_title, blurb, published_on —
-- are first-class rather than squeezed into a body blob.

create table if not exists portal_posts (
  id uuid primary key default gen_random_uuid(),
  -- The URL. Unique, because it IS the page's address and two posts cannot
  -- share one.
  slug text not null,
  title text not null,
  -- The <title> tag, to Google's ~60 character budget. Falls back to title.
  seo_title text,
  -- The meta description and the card's standfirst — one field, because two
  -- would drift and the card is the honest preview of the page.
  blurb text not null default '',
  cat text not null default 'Heat pumps',
  -- A key into AUTHORS in blog.ts. A named author is the byline and the
  -- E-E-A-T signal; "the team" is nobody.
  author text not null default 'dean',
  -- A public URL in the blog-photos bucket, or a path under /public.
  photo text,
  photo_alt text not null default '',
  -- The markdown-lite the handbook uses: blank line splits a paragraph,
  -- "## " is a heading, "- " is a bullet. Parsed to the same Section[] the
  -- public post page already renders, so there is no second renderer.
  body text not null default '',
  -- Top of the list, and the three on the home page.
  featured boolean not null default false,
  on_home boolean not null default false,
  -- The date on the page and in the Article schema. A post scheduled for a
  -- future date stays off the site until that date.
  published_on date,
  updated_on date,
  status text not null default 'draft',
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists portal_posts_slug_key on portal_posts (slug);
create index if not exists portal_posts_live_idx on portal_posts (status, published_on desc);

alter table portal_posts enable row level security;

-- Server-side only, over PostgREST with the service-role key, like every
-- other portal table. The public blog reads it through the server too.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'portal_posts' and policyname = 'portal_posts_service_role'
  ) then
    create policy portal_posts_service_role on portal_posts
      for all to service_role using (true) with check (true);
  end if;
end $$;

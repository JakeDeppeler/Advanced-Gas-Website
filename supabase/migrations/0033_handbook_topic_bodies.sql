-- The handbook's written content, so a topic can be read rather than just listed.
--
-- content.ts holds the table of contents — shelf, title, note, status — and has
-- never held a word of the handbook itself. That is why every shelf opened to
-- five rows saying "HAVE IT" and nothing to read. The body lives here instead
-- of in the repo so the office can write it without a deploy.
--
-- Keyed on shelf + title rather than an id, because the contents list in
-- content.ts is the spine: a topic's body attaches to the entry that is
-- already there, and a topic with no row simply has nothing written yet.

create table if not exists portal_handbook_topics (
  id         uuid primary key default gen_random_uuid(),
  shelf      text not null,
  title      text not null,
  -- Markdown-ish: paragraphs split on blank lines, "- " for a list item,
  -- "## " for a heading. Deliberately small — this is a handbook, not a CMS.
  body       text not null default '',
  updated_by text,
  updated_at timestamptz not null default now(),
  unique (shelf, title)
);

create index if not exists portal_handbook_shelf_idx on portal_handbook_topics (shelf);

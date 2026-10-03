-- Everything marketing is running, as a list the office keeps itself.
--
-- The Marketing page's Campaigns tab is the one screen in the portal that is
-- nobody's report — it is a thing Jake maintains, the way the fleet is a thing
-- Kellie maintains. So it gets a table rather than a constant in a .ts file
-- that only a deploy can change.
--
-- `utm_campaign` is the join back to the website: a lead carries utm in
-- portal_leads, and matching on it is how a campaign gets a lead count without
-- anybody typing one in.

create table if not exists portal_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  blurb         text,
  -- Where it runs: "Facebook / Instagram", "Google (hiring)", "In person".
  channel       text,
  -- Who it is for. Drives the filter pills on the tab.
  audience      text not null default 'everyone',
  status        text not null default 'draft',
  -- Null means we don't record a spend for it, which is different from $0.
  monthly_spend numeric,
  owner         text,
  utm_campaign  text,
  sort_order    int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint portal_campaigns_status_chk
    check (status in ('draft', 'running', 'in-progress', 'always-on', 'paused', 'finished')),
  constraint portal_campaigns_audience_chk
    check (audience in ('homeowners', 'real-estate', 'retirement', 'hiring', 'everyone'))
);

create index if not exists portal_campaigns_status_idx on portal_campaigns (status);
create index if not exists portal_campaigns_utm_idx on portal_campaigns (utm_campaign);

-- Brand assets: the logo pack, the van wrap, the finished-job photos. Stored
-- in the same private bucket pattern the van photos use, with a row per file
-- so the portal can list them without walking the bucket.
create table if not exists portal_brand_assets (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  kind       text not null default 'other',
  -- Path inside the storage bucket.
  path       text not null,
  mime       text,
  bytes      bigint,
  added_by   text,
  created_at timestamptz not null default now(),
  constraint portal_brand_assets_kind_chk
    check (kind in ('logo', 'photo', 'document', 'other'))
);

create index if not exists portal_brand_assets_kind_idx on portal_brand_assets (kind);

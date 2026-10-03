-- Procedures the office can write and publish, over the top of the ones in
-- src/lib/portal/sops.ts.
--
-- The constant stays the source for everything nobody has edited: it is the
-- version agreed at the training day and it should not be migrated into a
-- table and then drift. A row here is an override for one procedure — the
-- office writes it, saves it as a draft only they can see, and publishes it
-- when it is right. Published rows win over the constant; drafts never do.
--
-- Deliberately not here: sections. A–F is the agreed structure of the manual
-- and adding a seventh is a decision somebody makes in a room, not a button.

create table if not exists portal_sops (
  id uuid primary key default gen_random_uuid(),
  -- The section's letter, as in the constant. A procedure can move between
  -- sections, which is why this lives on the row rather than being implied.
  section text not null,
  -- The code people quote: "A1", "D2". Unique, because that is how a
  -- procedure is referred to on a van and in the search box.
  code text not null,
  slug text not null,
  title text not null,
  -- The two meta lines the design asks for. Everything the constant can carry
  -- in `meta` is not reproduced here; this is the editor's field set, not a
  -- copy of the type.
  happens text,
  flag text,
  -- Who it is for. 'everyone' or a crew level key.
  audience text not null default 'everyone',
  -- [{ "do": "Stop work straight away", "note": "Tools down." }, …] in order.
  steps jsonb not null default '[]'::jsonb,
  -- What changed, shown to the crew as "Changed this week".
  changed text,
  status text not null default 'draft',
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists portal_sops_code_key on portal_sops (code);
create index if not exists portal_sops_section_idx on portal_sops (section, code);
-- The reader asks for published rows only, every time.
create index if not exists portal_sops_status_idx on portal_sops (status);

alter table portal_sops enable row level security;

-- Reached over PostgREST with the service-role key from the server only, the
-- same as every other portal table. No anon policy, on purpose.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'portal_sops' and policyname = 'portal_sops_service_role'
  ) then
    create policy portal_sops_service_role on portal_sops
      for all to service_role using (true) with check (true);
  end if;
end $$;

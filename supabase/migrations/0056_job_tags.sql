-- The names behind the tag ids on a job.
--
-- st_jobs.raw carries `tagTypeIds` — bare numbers — and they are how this
-- office records why a job is sitting still: 105 jobs carry tag 1161, 73 of
-- them still open, and 65 carry 301122752. Without the names none of that can
-- be read, so "what are we waiting on?" has no answer in the replica even
-- though the data is right there.
--
-- Filled by the `tag-types` lookup in stSync.ts from
-- settings/v2/tenant/{tenant}/tag-types, the same shape as technicians,
-- employees, job types and business units.
--
-- Idempotent.

create table if not exists st_job_tags (
  id bigint primary key,
  name text,
  -- ServiceTitan colours its tags; worth keeping so a board can use the
  -- office's own colour rather than inventing one.
  colour text,
  active boolean not null default true,
  modified_on timestamptz,
  raw jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists st_job_tags_name_idx on st_job_tags (name);

-- The shape report should cover the new table, or its emptiness is invisible.
-- (dashboard_field_health keeps its own column list; see 0051.)

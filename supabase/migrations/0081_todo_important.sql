-- A to-do marked important: flagged on its card and kept at the top of its
-- list, above the rest, which run soonest due first.
alter table portal_todos add column if not exists important boolean not null default false;

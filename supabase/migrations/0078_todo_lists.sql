-- To-do lists by subject, the way the pipeline has columns: Quoting, Advanced
-- Gas, and whatever else the office adds on the page. The names live in
-- portal_settings ("todo-lists"); each to-do carries the name of its list.
-- A to-do with none sits in the first list.
--
-- Additive only.

alter table public.portal_todos add column if not exists list text;

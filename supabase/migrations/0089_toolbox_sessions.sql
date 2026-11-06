-- Toolbox talks on a schedule: a talk every week, fortnight or month (the
-- schedule is in portal_settings, key "toolbox", under "plan"), and a row
-- here for each date that has something on it: the notes on what to talk
-- about, each with a heading, and what was said, typed or pasted as the
-- transcript from an AI note-taker.
--
-- A row only exists once a date has a note or a record. A date the schedule
-- no longer lands on keeps its row, and the page still shows it.
--
-- Its own table rather than the settings row the topics live in: a year of
-- transcripts is megabytes, and the settings row is read on every visit.
--
-- Idempotent.

create table if not exists public.toolbox_sessions (
  on_date     date primary key,
  -- [{ id, head, text, by, at }], in the order they were added.
  notes       jsonb not null default '[]'::jsonb,
  -- Notes from the talk, or the transcript pasted in.
  record      text,
  who         text[] not null default '{}',
  recorded_by text,
  recorded_at timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.toolbox_sessions enable row level security;

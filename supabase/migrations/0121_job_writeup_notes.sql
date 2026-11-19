-- The office's notes for a job's write-up (19 Nov).
--
-- Jake: "add a note like it's going to be a roof bracket and that we are
-- going to use a pump, and if we don't then it will be taken off the quoted
-- amount". The notes are what the write-up is written from first, so they're
-- kept with the job: whoever opens it next sees what was said, and writing it
-- again starts from the same notes. One row a job.

create table if not exists public.job_writeup_notes (
  job_id bigint primary key,
  notes text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.job_writeup_notes enable row level security;

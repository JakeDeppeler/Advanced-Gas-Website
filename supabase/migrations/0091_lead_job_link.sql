-- Website leads tied to the ServiceTitan job they became, and the form's
-- photos kept so they can go onto that job.
--
-- Until now a quote form's photos went out as email attachments and nowhere
-- else: the row recorded how many there were, not the photos. To put them on
-- the customer's job in ServiceTitan once someone links it, the portal has to
-- have them. They go into a private bucket, one folder per lead, and the row
-- keeps the paths. Leads from before this have a count and no paths: their
-- photos are in the office inbox only, and the page says so.
--
-- st_upload records what went onto the job and when, or why it didn't, so a
-- failed upload can be tried again and a successful one isn't repeated.
--
-- Idempotent, like the rest.

alter table public.portal_leads add column if not exists st_job_id bigint;
alter table public.portal_leads add column if not exists st_job_number text;
alter table public.portal_leads add column if not exists linked_at timestamptz;
alter table public.portal_leads add column if not exists linked_by text;
alter table public.portal_leads add column if not exists photo_paths text[] not null default '{}';
alter table public.portal_leads add column if not exists st_upload jsonb;

create index if not exists portal_leads_st_job_id_idx
  on public.portal_leads (st_job_id)
  where st_job_id is not null;

comment on column public.portal_leads.st_job_id is
  'The ServiceTitan job this enquiry became, linked by hand on Website leads.';
comment on column public.portal_leads.photo_paths is
  'The form''s photos in the private lead-photos bucket. Empty for leads from before photos were kept.';
comment on column public.portal_leads.st_upload is
  '{ at, jobId, ok, files: [...], error } — what was put on the linked job in ServiceTitan.';

-- Private: read only through short-lived signed URLs minted on the server.
insert into storage.buckets (id, name, public)
values ('lead-photos', 'lead-photos', false)
on conflict (id) do nothing;

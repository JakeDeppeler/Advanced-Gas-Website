-- The quote form has been writing to public.leads, which was never created, so
-- every insert failed and the enquiry survived only as an email. portal_leads
-- already existed with the better shape — page_path, utm, ServiceTitan fields —
-- so it becomes the record and gains the few columns the form actually sends.
alter table public.portal_leads add column if not exists kind        text not null default 'quote';
alter table public.portal_leads add column if not exists headline    text;
alter table public.portal_leads add column if not exists summary     text;
alter table public.portal_leads add column if not exists address     text;
alter table public.portal_leads add column if not exists details     jsonb not null default '{}'::jsonb;
alter table public.portal_leads add column if not exists photo_count integer not null default 0;
alter table public.portal_leads add column if not exists handled_at  timestamptz;

alter table public.portal_leads drop constraint if exists portal_leads_kind_check;
alter table public.portal_leads add constraint portal_leads_kind_check check (kind in ('quote','call'));

create index if not exists portal_leads_created_idx on public.portal_leads (created_at desc);
create index if not exists portal_leads_path_idx on public.portal_leads (page_path);

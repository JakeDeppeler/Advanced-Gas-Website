-- How many times each public page was read, per day.
--
-- The portal had no page-view figure anywhere it could read: Vercel Analytics
-- and Google Analytics both count, but neither has a connection into here, so
-- the Blog's views column and the Website section's "which pages get read"
-- had nothing to stand on. This is the smallest thing that does.
--
-- A counter per page per Melbourne day, not a row per visit. Nothing in it
-- identifies anybody — no IP, no user agent, no session — so there is nothing
-- here a privacy request could ever be about, and it stays a few thousand
-- rows a year however busy the site gets.

create table if not exists portal_page_views (
  path text not null,
  day date not null,
  views integer not null default 0,
  primary key (path, day)
);

create index if not exists portal_page_views_day_idx on portal_page_views (day desc);

alter table portal_page_views enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'portal_page_views' and policyname = 'portal_page_views_service_role'
  ) then
    create policy portal_page_views_service_role on portal_page_views
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- One call per view, atomic. An upsert from the route would be read-then-write
-- and two readers landing together would each write views + 1 over the same
-- old number.
--
-- The day is Melbourne's, decided here rather than by the caller, so a view at
-- 9am Pakenham time isn't filed under yesterday because the server runs on UTC.
create or replace function portal_count_view(p_path text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into portal_page_views (path, day, views)
  values (left(p_path, 200), (now() at time zone 'Australia/Melbourne')::date, 1)
  on conflict (path, day) do update set views = portal_page_views.views + 1;
$$;

revoke all on function portal_count_view(text) from public, anon, authenticated;
grant execute on function portal_count_view(text) to service_role;

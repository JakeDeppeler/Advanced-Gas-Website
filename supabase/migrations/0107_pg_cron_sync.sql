-- The portal's sync every ten minutes from the database itself.
--
-- GitHub's scheduled workflow (.github/workflows/dashboard-sync.yml) is meant
-- to run every ten minutes and ran every four to six hours (6 Nov): GitHub
-- treats schedules as best-effort. pg_cron is not. It calls the same routes
-- the workflow does, through pg_net, with a token of its own from the vault;
-- the site checks the token with portal_cron_token_ok() (lib/dashboard/cronAuth.ts).
-- The workflow stays as a second, slower runner.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'portal_cron_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'portal_cron_token',
      'Bearer token pg_cron sends to advancedgas.com.au for the scheduled sync; checked by portal_cron_token_ok()'
    );
  end if;
end $$;

-- Is this the scheduler's token? For the site, through the service role only.
create or replace function public.portal_cron_token_ok(token text)
returns table(ok boolean)
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    length(token) = 64
    and token = (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'portal_cron_token' limit 1),
    false
  );
$$;
revoke all on function public.portal_cron_token_ok(text) from public, anon, authenticated;
grant execute on function public.portal_cron_token_ok(text) to service_role;

-- One scheduled call to the site. pg_net is fire-and-forget: the reply lands
-- in net._http_response, which is where to look when a run goes wrong.
create or replace function public.portal_cron_call(path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
begin
  select s.decrypted_secret into t from vault.decrypted_secrets s where s.name = 'portal_cron_token' limit 1;
  return net.http_get(
    url := 'https://www.advancedgas.com.au' || path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || t),
    timeout_milliseconds := 120000
  );
end;
$$;
revoke all on function public.portal_cron_call(text) from public, anon, authenticated;

-- The sync on the tens; three minutes later, what the workflow ran after it:
-- orders drafted for anything newly booked, install packs, the Outlook catch-up.
select cron.schedule('portal-sync', '*/10 * * * *', $$select public.portal_cron_call('/api/sync')$$);
select cron.schedule('portal-after-sync', '3-59/10 * * * *', $$
  select public.portal_cron_call('/api/ordering/draft?mode=refresh');
  select public.portal_cron_call('/api/install-packs');
  select public.portal_cron_call('/api/email/outlook/sweep');
$$);

-- 7 Nov: the Google review emails (lib/reviews/requests.ts) run with the rest.
select cron.schedule('portal-after-sync', '3-59/10 * * * *', $$
  select public.portal_cron_call('/api/ordering/draft?mode=refresh');
  select public.portal_cron_call('/api/install-packs');
  select public.portal_cron_call('/api/email/outlook/sweep');
  select public.portal_cron_call('/api/reviews/run');
$$);

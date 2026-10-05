-- One refresher at a time, across serverless instances.
--
-- Xero rotates the refresh token on every refresh and kills the old one the
-- moment a new one is issued, so two concurrent refreshes leave the connection
-- dead until somebody re-authorises by hand. The code has always had an
-- in-flight guard for this, but it is a module-level promise and therefore
-- per-instance: it collapses two Finance page loads served by the same lambda
-- and does nothing at all about two served by different ones.
--
-- That was tolerable while the only refresher was a page load. It is not
-- tolerable now the wall board turns the handle, because the board polls from
-- every panel in the building and passes its staleness checks on several
-- instances at once — exactly the shape that kills the connection.
--
-- So the claim moves into the database, where it can be atomic:
--
--   update portal_integrations
--      set refresh_lock_at = now()
--    where provider = 'xero'
--      and refresh_lock_at < now() - <hold>
--
-- A second caller running the same statement blocks on the row lock, then
-- re-evaluates the where clause against the row the first one wrote, finds
-- refresh_lock_at fresh, and updates nothing. Whoever gets a row back owns the
-- refresh; everybody else carries on with the token already in the table, which
-- is still valid — the refresh fires minutes before expiry, not after.
--
-- The hold is deliberately short (see TOKEN_LOCK_HOLD_MS). A caller that claims
-- the lock and then fails must not lock the others out until the token dies; a
-- hold shorter than the refresh margin means the next poll claims it again.
--
-- The column is NOT NULL, defaulting to -infinity, so that "never locked" is a
-- timestamp rather than a null. That is the whole reason for the default: the
-- claim is then a single `lt` filter, which is the shape this codebase already
-- sends to PostgREST, instead of an `or=(is.null,lt.…)` group. One less piece
-- of query grammar to be right about, on the statement that protects the token.
--
-- Additive: one column with a default, on a table holding one row.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'portal_integrations' and column_name = 'refresh_lock_at'
  ) then
    alter table public.portal_integrations add column refresh_lock_at timestamptz;
  end if;
end $$;

alter table public.portal_integrations
  alter column refresh_lock_at set default '-infinity'::timestamptz;

update public.portal_integrations set refresh_lock_at = '-infinity'::timestamptz
 where refresh_lock_at is null;

alter table public.portal_integrations
  alter column refresh_lock_at set not null;

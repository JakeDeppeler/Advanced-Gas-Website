-- What's on the factory shelf, and who took what.
--
-- Nothing upstream knows: ServiceTitan's inventory module isn't in use and
-- Reece only knows what was ordered, not what is still on the shelf. So the
-- office keeps the list here, the way it keeps the fleet — a row per thing on
-- the shelf, and a row per time somebody takes some or puts some back.
--
-- The quantity on the item is kept by the movements, never typed over: every
-- change goes through portal_stock_move(), which records the movement and
-- moves the count in one statement. Two people taking from the same box at
-- once each take their own, rather than one overwriting the other's count.

create table if not exists portal_stock_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- "each", "m", "roll", "box" — what a count of one means.
  unit        text not null default 'each',
  qty         numeric not null default 0,
  -- At or under this the item reads as low, on its own page and on Home.
  min_qty     numeric not null default 0,
  -- Bay, shelf or bin, so a new starter can find it.
  location    text,
  sort_order  int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists portal_stock_moves (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references portal_stock_items(id) on delete cascade,
  -- Negative is taken off the shelf, positive is put on it.
  change      numeric not null,
  -- 'taken', 'delivered', 'returned' or 'count' (a stocktake correction).
  reason      text not null default 'taken',
  -- The portal user who recorded it.
  who         text,
  -- The job, van or person it went to.
  for_what    text,
  created_at  timestamptz not null default now(),
  constraint portal_stock_moves_reason_chk check (reason in ('taken', 'delivered', 'returned', 'count'))
);

create index if not exists portal_stock_moves_item_idx on portal_stock_moves (item_id, created_at desc);
create index if not exists portal_stock_moves_created_idx on portal_stock_moves (created_at desc);

alter table portal_stock_items enable row level security;
alter table portal_stock_moves enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'portal_stock_items' and policyname = 'portal_stock_items_service_role') then
    create policy portal_stock_items_service_role on portal_stock_items for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'portal_stock_moves' and policyname = 'portal_stock_moves_service_role') then
    create policy portal_stock_moves_service_role on portal_stock_moves for all to service_role using (true) with check (true);
  end if;
end $$;

-- One movement: record it and move the count, together. A stocktake ('count')
-- passes the counted quantity and the function records the difference.
create or replace function portal_stock_move(p_item uuid, p_change numeric, p_reason text, p_who text, p_for text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
begin
  if p_reason = 'count' then
    select p_change - qty into v_delta from portal_stock_items where id = p_item for update;
  else
    v_delta := p_change;
  end if;
  if v_delta is null then
    raise exception 'no such stock item';
  end if;
  insert into portal_stock_moves (item_id, change, reason, who, for_what)
  values (p_item, v_delta, p_reason, left(p_who, 80), left(p_for, 120));
  update portal_stock_items set qty = qty + v_delta, updated_at = now() where id = p_item;
end;
$$;

revoke all on function portal_stock_move(uuid, numeric, text, text, text) from public, anon, authenticated;
grant execute on function portal_stock_move(uuid, numeric, text, text, text) to service_role;

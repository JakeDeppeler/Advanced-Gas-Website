-- The factory in three: the materials on the shelf, the systems waiting to go
-- in, and the tools that go out and come back.
--
-- Materials and systems are counted lines, as 0038 made them: a quantity and
-- a low mark, moved only through portal_stock_move. Tools are kept one to a
-- row, because what matters about a tool is not how many there are but where
-- it is. A tool row is in (qty 1) or out (qty 0), says who has it, and when it
-- is next due a test & tag or a service.

alter table portal_stock_items add column if not exists section text not null default 'materials';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portal_stock_items_section_chk') then
    alter table portal_stock_items
      add constraint portal_stock_items_section_chk check (section in ('materials', 'systems', 'tools'));
  end if;
end $$;

-- Before the split, units were kept on the one shelf under the kind "Units".
update portal_stock_items set section = 'systems' where section = 'materials' and category = 'Units';

-- Systems: the make, so a line reads "Daikin · Cora 7.1 kW", and the pricebook
-- model it is when it was picked from there.
alter table portal_stock_items add column if not exists brand text;
alter table portal_stock_items add column if not exists product_id text;

-- Tools: the serial or asset number, who has it now, and the next test & tag
-- or service.
alter table portal_stock_items add column if not exists serial text;
alter table portal_stock_items add column if not exists holder text;
alter table portal_stock_items add column if not exists due_on date;

-- When the shelf was last counted for this line. A line nobody has counted has
-- no quantity anyone knows, so it can't be low; without this, a list started
-- from the van sheet would have put every one of its lines on Home as low.
alter table portal_stock_items add column if not exists counted_at timestamptz;
update portal_stock_items i
   set counted_at = (select max(m.created_at) from portal_stock_moves m where m.item_id = i.id and m.reason = 'count')
 where counted_at is null;

create index if not exists portal_stock_items_section_idx on portal_stock_items (section);

-- 0038's movement, now also stamping the count.
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
  update portal_stock_items
     set qty = qty + v_delta,
         counted_at = case when p_reason = 'count' then now() else counted_at end,
         updated_at = now()
   where id = p_item;
end;
$$;

revoke all on function portal_stock_move(uuid, numeric, text, text, text) from public, anon, authenticated;
grant execute on function portal_stock_move(uuid, numeric, text, text, text) to service_role;

-- A tool going out or coming back: the movement, the count and who has it, in
-- one statement, so the register and its log can't disagree about where the
-- core drill is. Out is a 'taken' movement to the holder; back is 'returned'
-- from them.
create or replace function portal_tool_sign(p_item uuid, p_out boolean, p_holder text, p_who text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty numeric;
  v_holder text;
  v_section text;
begin
  select qty, holder, section into v_qty, v_holder, v_section from portal_stock_items where id = p_item for update;
  if v_section is null then
    raise exception 'no such tool';
  end if;
  if v_section <> 'tools' then
    raise exception 'not a tool';
  end if;
  if p_out then
    if v_qty < 1 then
      raise exception 'already out';
    end if;
    insert into portal_stock_moves (item_id, change, reason, who, for_what)
    values (p_item, -1, 'taken', left(p_who, 80), left(p_holder, 120));
    update portal_stock_items set qty = qty - 1, holder = left(p_holder, 80), updated_at = now() where id = p_item;
  else
    if v_qty >= 1 then
      raise exception 'already in';
    end if;
    insert into portal_stock_moves (item_id, change, reason, who, for_what)
    values (p_item, 1, 'returned', left(p_who, 80), left(v_holder, 120));
    update portal_stock_items set qty = qty + 1, holder = null, updated_at = now() where id = p_item;
  end if;
end;
$$;

revoke all on function portal_tool_sign(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function portal_tool_sign(uuid, boolean, text, text) to service_role;

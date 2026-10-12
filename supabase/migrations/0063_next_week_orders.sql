-- Supply › Next week: order the gear for next week's installs, and book the
-- electrician, a week ahead. Idempotent.
--
-- Everything here reads what is already synced: the sold quote on each install
-- job says exactly which units and materials it needs (st_estimates.raw.items),
-- the appointment says when (st_appointments, 0062), the dispatch assignment
-- says who is going (0061), and the location and its contacts say where and
-- whom to ring. A Wednesday run drafts one order per supplier and one work
-- order per site visit for the electrician; nothing goes to anyone until the
-- office approves it on the page.
--
-- Parts of this were first applied by hand on 12 Oct 2026 while the routing
-- was worked out against live quotes. This file is the record of the result,
-- written so that running it again changes nothing. Three columns that early
-- version put on order_suppliers (sku_types, match_patterns, priority) were
-- replaced by order_supplier_rules and are no longer read; they are left
-- where they exist rather than dropped.

-- ---------------------------------------------------------------- suppliers

create table if not exists public.order_suppliers (
  id text primary key,
  name text not null,
  -- reece_cart: listed for the office to put through maX (no API adds lines to
  --             a maX cart; carts only come back from PunchOut).
  -- email:      emailed order. email_form: emailed with the supplier's own
  --             order form filled in and attached (Mitsubishi Electric).
  -- work_order: not an order — a booking sent to the subcontract electrician.
  method text not null check (method in ('reece_cart','email','email_form','work_order')),
  email text,
  form_template text,
  notes text,
  work_order_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.order_suppliers add column if not exists work_order_note text;

-- Which supplier gets each line on a quote: a case-insensitive pattern on the
-- ServiceTitan SKU code, per SKU type, lowest priority wins. Patterns rather
-- than a list of SKUs so a new Kaden size or Reclaim tank routes itself.
create table if not exists public.order_supplier_rules (
  id bigint generated always as identity primary key,
  supplier_id text not null references public.order_suppliers(id),
  sku_type text not null check (sku_type in ('Equipment','Material','Service')),
  pattern text not null,
  priority int not null default 10,
  note text,
  created_at timestamptz not null default now()
);

-- Exceptions to the rules for one pricebook item: send it elsewhere, never
-- order it, or put a different model code on the order than the SKU code.
create table if not exists public.order_sku_map (
  sku_id bigint primary key,
  sku_name text,
  supplier_id text references public.order_suppliers(id),
  ignore boolean not null default false,
  supplier_model text,
  supplier_description text,
  updated_at timestamptz not null default now()
);
alter table public.order_sku_map add column if not exists supplier_model text;
alter table public.order_sku_map add column if not exists supplier_description text;

-- ---------------------------------------------------------------- orders

create table if not exists public.purchase_orders (
  id bigint generated always as identity primary key,
  po_number text unique,
  supplier_id text not null references public.order_suppliers(id),
  week_of date not null,
  status text not null default 'draft' check (status in ('draft','approved','sent','cancelled')),
  delivery_address text default '1 Sierra Circuit, Pakenham VIC 3810',
  delivery_instructions text,
  approved_by text, approved_at timestamptz,
  sent_at timestamptz, sent_to text,
  attachment_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.purchase_orders alter column delivery_address set default '1 Sierra Circuit, Pakenham VIC 3810';
alter table public.purchase_orders add column if not exists delivery_to_site boolean not null default false;
-- order: goods from a supplier. work_order: the electrician's booking.
alter table public.purchase_orders add column if not exists kind text not null default 'order';
-- What one draft covers inside its week: "all" for a supplier's order, the
-- site and day for a work order. A top-up after the first draft went out
-- gets a new key, so an approved order is never edited underneath anyone.
alter table public.purchase_orders add column if not exists group_key text not null default 'all';
-- The work order as it was drafted (when, where, who, the system, the
-- customer's contact) — so what was sent can be shown exactly, later.
alter table public.purchase_orders add column if not exists details jsonb;
alter table public.purchase_orders add column if not exists send_error text;
create index if not exists purchase_orders_week on public.purchase_orders (week_of, supplier_id);

create table if not exists public.purchase_order_lines (
  id bigint generated always as identity primary key,
  po_id bigint not null references public.purchase_orders(id) on delete cascade,
  job_id bigint, job_number text, customer_name text, suburb text, install_date date,
  sku_id bigint, sku_name text, description text,
  qty numeric not null, unit_cost numeric,
  created_at timestamptz not null default now()
);
alter table public.purchase_order_lines add column if not exists sku_type text;
alter table public.purchase_order_lines add column if not exists supplier_model text;
alter table public.purchase_order_lines add column if not exists appointment_start timestamptz;
create index if not exists purchase_order_lines_po on public.purchase_order_lines (po_id);
create index if not exists purchase_order_lines_job on public.purchase_order_lines (job_id);

-- ---------------------------------------------------------------- access

alter table public.order_suppliers enable row level security;
alter table public.order_supplier_rules enable row level security;
alter table public.order_sku_map enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;

do $$
declare t text;
begin
  foreach t in array array['order_suppliers', 'order_supplier_rules', 'order_sku_map', 'purchase_orders', 'purchase_order_lines'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_service_role') then
      execute format('create policy %I on %I for all to service_role using (true) with check (true)', t || '_service_role', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- who supplies what

insert into public.order_suppliers (id, name, method, email, form_template, notes) values
  ('reece',        'Reece',                          'reece_cart', null,                                 null, 'All materials, plus Kaden, Zonemate and KN315. Put through maX.'),
  ('reclaim',      'Reclaim Energy',                 'email',      'orders@reclaimenergy.com.au',        null, 'Reclaim heat pumps'),
  ('istore',       'iStore',                         'email',      'orders@istore.net.au',               null, 'iStore heat pumps'),
  ('braemar',      'Braemar (Seeley International)', 'email',      'lcarter@seeleyinternational.com',    null, null),
  ('mitsubishi',   'Mitsubishi Electric',            'email_form', 'LEGCustomerService@meaust.meap.com', 'mitsubishi', 'Their order form, filled in and attached.'),
  ('rinnai',       'Rinnai (Brivis)',                'email',      'SalesOrders@rinnai.com.au',          null, 'Brivis heaters and Brivis evaporative coolers'),
  ('gt_electrics', 'GT Electrics (Geoff)',           'work_order', 'geoff@gtelectrics.com.au',           null, 'Electrical work order when the quote includes electrical')
on conflict (id) do nothing;

-- The first hand-applied version named the PDF file here; the form is now
-- built from code, keyed by this name.
update public.order_suppliers set form_template = 'mitsubishi' where id = 'mitsubishi';

update public.order_suppliers
   set work_order_note = 'Please attend on the date and time above. If you are coming on a different day to our install crew, call the customer to arrange access. If you can''t make the booked date or time, email us straight away so we can let the customer and crew know.'
 where id = 'gt_electrics' and work_order_note is null;

insert into public.order_supplier_rules (supplier_id, sku_type, pattern, priority, note)
select v.supplier_id, v.sku_type, v.pattern, v.priority, v.note
from (values
  ('reclaim',      'Equipment', 'reclaim',                            10, 'Reclaim heat pumps'),
  ('istore',       'Equipment', 'istore',                             10, 'iStore heat pumps'),
  ('braemar',      'Equipment', 'braemar|seeley',                     10, null),
  ('mitsubishi',   'Equipment', 'mitsubishi',                         10, null),
  ('rinnai',       'Equipment', 'brivis',                             10, 'All Brivis'),
  ('rinnai',       'Equipment', '^(P46CHAR|L76CHAR)$',                10, 'Brivis evaporative coolers'),
  ('reece',        'Equipment', 'kaden',                              10, 'Kaden via Reece maX'),
  ('reece',        'Equipment', 'zonemate',                           10, 'Zonemate via Reece maX'),
  ('reece',        'Equipment', '^KN315$',                            10, 'Via Reece maX'),
  ('reece',        'Material',  '.*',                                 90, 'All materials'),
  ('gt_electrics', 'Service',   'ELEC|^AC-DUCTED-ELE$|^HW-HP-HARD$',  10, 'Electrical on the quote -> work order')
) as v(supplier_id, sku_type, pattern, priority, note)
where not exists (
  select 1 from public.order_supplier_rules r
  where r.supplier_id = v.supplier_id and r.sku_type = v.sku_type and r.pattern = v.pattern
);

-- Who is ordering, where it goes, who hears back, and the account details the
-- Mitsubishi form asks for. Existing values win so an edit isn't undone.
insert into public.portal_settings (key, value, updated_at) values ('ordering', jsonb_build_object(
  'replyTo', 'admin@advancedgas.com.au',
  'deliveryAddress', '1 Sierra Circuit, Pakenham VIC 3810',
  'orderedBy', 'Kellie Winbanks',
  'runDay', 'Wednesday',
  'mitsubishi', jsonb_build_object(
    'accountName', 'ADVANCED GAS & AIRCONDITIONING SERVICES PTY LTD',
    'accountNumber', '116360',
    'abn', '35607575280',
    'salesRep', 'ALEX BETTIN',
    'contactName', 'KELLIE WINBANKS',
    'contactNumber', '0359478000')
), now())
on conflict (key) do update set value = excluded.value || public.portal_settings.value, updated_at = now();

-- ---------------------------------------------------------------- views

-- The next visit booked for each job: its first appointment that isn't
-- cancelled and hasn't already passed. A two-day ducted install has two; the
-- gear has to be there for the first, and both days are listed for the
-- electrician.
create or replace view public.job_next_appointment with (security_invoker = true) as
select a.job_id,
       min(a.start_at) as start_at,
       (array_agg(a.end_at order by a.start_at))[1] as end_at,
       (array_agg(a.arrival_window_start order by a.start_at))[1] as arrival_window_start,
       (array_agg(a.arrival_window_end order by a.start_at))[1] as arrival_window_end,
       count(*) as visits,
       string_agg(to_char(a.start_at at time zone 'Australia/Melbourne', 'Dy DD Mon FMHH12:MIam'), ', ' order by a.start_at) as all_visits
from public.st_appointments a
where a.active is not false
  and coalesce(a.status, '') not ilike 'cancel%'
  and a.start_at >= (date_trunc('day', now() at time zone 'Australia/Melbourne') at time zone 'Australia/Melbourne')
group by a.job_id;

-- Every unit, material and electrical line on the sold quote of each open
-- install job, with the supplier it goes to. Problems are rows too ("no sold
-- quote", "no supplier") so the page can say what it couldn't order.
create or replace view public.upcoming_order_lines with (security_invoker = true) as
with install_jobs as (
  select j.id job_id, j.job_number, j.job_type, j.customer_name, j.suburb, j.status,
         (na.start_at at time zone 'Australia/Melbourne')::date as install_date,
         na.start_at as appointment_start,
         nullif(j.raw->>'createdFromEstimateId','')::bigint as from_estimate_id
  from public.st_jobs j
  left join public.job_next_appointment na on na.job_id = j.id
  where j.status in ('Scheduled','Hold')
    and (j.job_type ilike 'Install%' or j.job_type ilike 'Commercial%')
),
job_quote as (
  select ij.*, e.id as estimate_id
  from install_jobs ij
  left join lateral (
    select e.id from public.st_estimates e
    where e.status = 'Sold' and (e.job_id = ij.job_id or e.id = ij.from_estimate_id)
    order by (e.id = ij.from_estimate_id) desc, e.sold_on desc nulls last
    limit 1
  ) e on true
),
items as (
  select jq.*, (it->'sku'->>'id')::bigint sku_id, trim(it->'sku'->>'name') sku_name,
         it->'sku'->>'type' sku_type, coalesce((it->>'qty')::numeric,1) qty, (it->>'unitCost')::numeric unit_cost,
         it->'sku'->>'displayName' display_name
  from job_quote jq
  join public.st_estimates e on e.id = jq.estimate_id
  cross join lateral jsonb_array_elements(e.raw->'items') it
)
select i.job_id, i.job_number, i.job_type, i.customer_name, i.suburb, i.install_date, i.estimate_id,
       i.sku_id, i.sku_name, coalesce(nullif(trim(i.display_name),''), i.sku_name) as description, i.sku_type,
       i.qty, i.unit_cost,
       coalesce(m.supplier_id, r.supplier_id) as supplier_id,
       case when coalesce(m.supplier_id, r.supplier_id) is null then 'No supplier set for this item' end as issue,
       -- The model code the supplier needs: an override if one is set,
       -- otherwise the ServiceTitan pricebook code, which is what the quote
       -- line carries as its SKU name.
       coalesce(m.supplier_model, i.sku_name) as supplier_model,
       i.appointment_start
from items i
left join public.order_sku_map m on m.sku_id = i.sku_id
left join lateral (
  select rr.supplier_id from public.order_supplier_rules rr
  join public.order_suppliers os on os.id = rr.supplier_id and os.active
  where rr.sku_type = i.sku_type and i.sku_name ~* rr.pattern
  order by rr.priority, rr.id limit 1
) r on true
where coalesce(m.ignore, false) = false
  and i.qty > 0
  and coalesce(i.unit_cost, 0) >= 0
  and i.sku_name !~* '^REBATE'
  and (i.sku_type in ('Equipment','Material') or r.supplier_id is not null or m.supplier_id is not null)
union all
select jq.job_id, jq.job_number, jq.job_type, jq.customer_name, jq.suburb, jq.install_date, null,
       null, null, null, null, null, null, null,
       'No sold quote linked to this install job', null, jq.appointment_start
from job_quote jq where jq.estimate_id is null;

-- One row per install job with electrical on its quote: what the electrician
-- needs to turn up — when, where, the system going in, our crew, and who to
-- ring. Site contact first (the tenant, on agency jobs), then the account.
create or replace view public.electrician_work_orders with (security_invoker = true) as
with elec as (
  select u.job_id, u.job_number, u.job_type, u.customer_name, u.estimate_id, u.supplier_id,
         string_agg(u.sku_name || ' x' || trim(to_char(u.qty, 'FM999990.##')), ', ' order by u.sku_name) as electrical_items
  from public.upcoming_order_lines u
  where u.supplier_id = 'gt_electrics'
  group by 1,2,3,4,5,6
),
contact as (
  select j.id job_id,
    coalesce(
      (select lc.value from public.st_location_contacts lc where lc.location_id = j.location_id and lc.active and lc.type in ('MobilePhone','Phone') order by (lc.type='MobilePhone') desc, lc.id limit 1),
      (select cc.value from public.st_customer_contacts cc where cc.customer_id = j.customer_id and cc.active and cc.type in ('MobilePhone','Phone') order by (cc.type='MobilePhone') desc, cc.id limit 1)) as phone,
    coalesce(
      (select lc.value from public.st_location_contacts lc where lc.location_id = j.location_id and lc.active and lc.type = 'Email' order by lc.id limit 1),
      (select cc.value from public.st_customer_contacts cc where cc.customer_id = j.customer_id and cc.active and cc.type = 'Email' order by cc.id limit 1)) as email
  from public.st_jobs j
)
select e.job_id, e.job_number, e.job_type, e.customer_name,
       concat_ws(', ', nullif(trim(concat_ws(' ', nullif(l.raw->'address'->>'unit',''), l.raw->'address'->>'street')),''),
                 l.raw->'address'->>'city', concat_ws(' ', l.raw->'address'->>'state', l.raw->'address'->>'zip')) as site_address,
       (na.start_at at time zone 'Australia/Melbourne') as appointment_start,
       (select string_agg(distinct a.technician_name, ', ') from public.st_appointment_assignments a
         where a.job_id = e.job_id and a.active) as crew,
       e.electrical_items,
       s.email as send_to,
       case
         when na.start_at is null then 'No upcoming appointment booked'
         when not exists (select 1 from public.st_appointment_assignments a where a.job_id = e.job_id and a.active) then 'No crew assigned yet'
         when c.phone is null and c.email is null then 'No customer contact on file'
       end as issue,
       c.phone as customer_phone,
       c.email as customer_email,
       (select string_agg(trim(u.description) || case when u.qty <> 1 then ' x' || trim(to_char(u.qty,'FM999990.##')) else '' end, ', ' order by u.unit_cost desc nulls last)
          from public.upcoming_order_lines u
         where u.job_id = e.job_id and u.sku_type = 'Equipment') as system_installed,
       s.work_order_note,
       na.start_at as appointment_start_at,
       na.end_at as appointment_end_at,
       na.all_visits,
       (na.start_at at time zone 'Australia/Melbourne')::date as install_date
from elec e
join public.st_jobs j on j.id = e.job_id
left join public.job_next_appointment na on na.job_id = e.job_id
left join public.st_locations l on l.id = j.location_id
left join contact c on c.job_id = e.job_id
join public.order_suppliers s on s.id = e.supplier_id;

-- Payment checks the office reads: the same amount applied to one invoice
-- twice in three days, an invoice paid past its total, money not yet put
-- against any invoice. Export to Xero is not checked here — it runs through
-- journal entries (st_journal_entries), not per payment.
create or replace view public.payment_flags with (security_invoker = true) as
with pay as (
  select p.id, p.paid_on, p.total, p.applied_to,
         p.raw->'customer'->>'name' as customer_name,
         coalesce((p.raw->>'unappliedAmount')::numeric, 0) as unapplied
  from public.st_payments p
  where p.active and p.paid_on >= current_date - 60
),
app as (
  select pay.id as pay_id, pay.customer_name, pay.paid_on,
         a->>'appliedTo' as inv_id, a->>'appliedToReferenceNumber' as inv_ref,
         (a->>'appliedAmount')::numeric as amt
  from pay, jsonb_array_elements(coalesce(pay.applied_to, '[]'::jsonb)) a
)
select 'Possible double payment'::text as flag, 1 as severity, y.pay_id as payment_id, y.customer_name as customer,
       y.paid_on, y.amt as amount, y.inv_ref as invoice,
       format('Same amount already applied to invoice %s on %s (payment %s)', x.inv_ref, x.paid_on, x.pay_id) as detail
from app x join app y on x.inv_id = y.inv_id and x.amt = y.amt and x.pay_id < y.pay_id and abs(y.paid_on - x.paid_on) <= 3
union all
select 'Invoice overpaid', 1, null, i.raw->'customer'->>'name', max(app.paid_on), sum(app.amt) - i.total,
       i.raw->>'referenceNumber', format('Invoice total %s but %s applied', i.total, sum(app.amt))
from app join public.st_invoices i on i.id::text = app.inv_id
group by i.id, i.total, i.raw
having sum(app.amt) > i.total + 0.01
union all
select 'Unapplied payment', 2, id, customer_name, paid_on, unapplied, null,
       format('%s of %s not applied to any invoice', unapplied, total)
from pay where unapplied > 0 and paid_on < current_date;

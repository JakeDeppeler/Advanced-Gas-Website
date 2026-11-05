-- Work orders from email into ServiceTitan's Bookings (lib/outlook/workOrders.ts).
--
-- One row per email read for a work order: the automatic read of everything
-- arriving in admin@ and jake@, a forward from the team, or an email given the
-- Work order category in Outlook. The row is claimed before anything is done,
-- so the webhook, the category check and the sweep can't book one twice.
-- dedupe_key (the platform's number, else the address, with the kind) is how a
-- reminder for a work order already booked is recognised.
create table if not exists public.work_orders (
  id             uuid primary key default gen_random_uuid(),
  mailbox        text not null,
  message_id     text not null,
  source         text not null default 'auto',
  status         text not null default 'working',
  reason         text,
  kind           text,
  dedupe_key     text,
  platform       text,
  agency         text,
  wo_number      text,
  address        text,
  subject        text,
  from_address   text,
  received_at    timestamptz,
  details        jsonb,
  st_booking_id  text,
  st_job_id      bigint,
  st_job_number  text,
  attached_at    timestamptz,
  attach_error   text,
  attempts       integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint work_orders_source_check check (source in ('auto', 'forward', 'category')),
  constraint work_orders_status_check check (status in ('working', 'booked', 'duplicate', 'not', 'failed')),
  constraint work_orders_mailbox_message_key unique (mailbox, message_id)
);

create index if not exists work_orders_booked_key_idx on public.work_orders (dedupe_key) where status = 'booked';
create index if not exists work_orders_to_attach_idx on public.work_orders (st_booking_id) where status = 'booked' and attached_at is null;

-- Customer and tenant details: the service role only.
alter table public.work_orders enable row level security;

-- The job lookup by the booking it was made from, as the website enquiries
-- do it (0095's view), indexed so it stays quick as st_jobs grows.
create index if not exists st_jobs_booking_id_idx on public.st_jobs ((raw ->> 'bookingId'));

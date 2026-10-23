-- Customer conversations: the website chat, Messenger and Instagram, in one
-- inbox the office answers from.
--
-- Every reply goes out by hand. The assistant writes a draft and somebody in
-- the office reads it, edits it if it needs it, and presses send — so the draft
-- lives on the thread rather than as a message. A draft is not something the
-- business said, and keeping it out of chat_messages means nothing that reads
-- the conversation (the widget, the inbox, the history the next draft is
-- written from) can ever mistake one for a reply.
--
-- Settings — whether the website shows the chat, the booking link, the notes
-- the assistant works from — are in portal_settings under 'chat', like every
-- other single-office setting.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- 'web' | 'messenger' | 'instagram'
  channel text not null,
  -- The person in the system they wrote from: a Messenger page-scoped id or an
  -- Instagram-scoped id. Null for the website, which has no such thing and is
  -- found by web_token_hash instead.
  external_user text,
  -- The page or account they wrote to, which is the one the reply goes out as.
  page_id text,
  -- The website visitor's key, hashed. The browser holds the token itself; a
  -- leaked table is not a way to read anybody's conversation.
  web_token_hash text,
  -- A hash of the visitor's address, only to stop one machine opening a
  -- hundred conversations. Never the address itself.
  ip_hash text,
  name text,
  phone text,
  email text,
  suburb text,
  -- What they're after, in a few words, as the assistant read it.
  topic text,
  -- 'open' | 'closed'. A new message from the customer reopens it.
  status text not null default 'open',
  last_in_at timestamptz,
  last_out_at timestamptz,
  -- When the website visitor last had the chat open. A reply sent after they
  -- have gone is emailed to them as well, where we have an address.
  web_seen_at timestamptz,
  draft text,
  -- When the draft was written, and the customer message it answers: a draft
  -- older than the latest message is stale and is written again.
  draft_at timestamptz,
  draft_for timestamptz,
  -- The assistant's reason to hand it to a person rather than answer it:
  -- a complaint, a gas smell, a question it had nothing to go on for.
  draft_flag text,
  constraint chat_threads_channel_check check (channel in ('web','messenger','instagram')),
  constraint chat_threads_status_check check (status in ('open','closed'))
);

create unique index if not exists chat_threads_user_key
  on public.chat_threads (channel, external_user)
  where external_user is not null;

create unique index if not exists chat_threads_web_token_key
  on public.chat_threads (web_token_hash)
  where web_token_hash is not null;

-- The inbox's question: what is open, most recent first.
create index if not exists chat_threads_recent_idx
  on public.chat_threads (status, last_in_at desc);

create index if not exists chat_threads_ip_idx
  on public.chat_threads (ip_hash, created_at desc)
  where ip_hash is not null;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 'in' from the customer, 'out' from us.
  direction text not null,
  body text not null default '',
  -- Photos and files, as Meta sends them: [{type, url}]. Meta's URLs expire,
  -- so this is a way to look at it today, not an archive.
  attachments jsonb not null default '[]'::jsonb,
  -- The id the message has in Meta. Meta retries deliveries and echoes our own
  -- sends back, so this is what stops either becoming a second message.
  external_id text,
  -- Ours only. 'sent' | 'failed'.
  status text not null default 'sent',
  -- Why a send failed, in words a person can act on. Never Meta's response.
  error text,
  -- Who pressed send, or 'Meta Business Suite' for a reply typed there.
  sent_by text,
  -- Whether the words started as the assistant's draft, and whether the
  -- person changed them before sending — the only honest measure of how
  -- useful the drafts are.
  from_draft boolean not null default false,
  edited boolean not null default false,
  constraint chat_messages_direction_check check (direction in ('in','out')),
  constraint chat_messages_status_check check (status in ('sent','failed'))
);

create unique index if not exists chat_messages_external_key
  on public.chat_messages (external_id)
  where external_id is not null;

create index if not exists chat_messages_thread_idx
  on public.chat_messages (thread_id, created_at);

-- Server-side only: the service role reads and writes both, nothing else may.
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

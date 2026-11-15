-- The website chat's instant answers, logged.
--
-- "Ask us anything" answers on its own, from the site's content, with no
-- person in the loop (Jake, Nov 2026: the hand-over to the team was taken out
-- and only the answers kept). So nobody in the office sees what was asked
-- unless it is written down somewhere: this is that somewhere, read on the
-- portal's Chat answers page.
--
-- One row per question and the answer it got. The visitor gives no name or
-- number here, so there is nothing personal beyond what they choose to type;
-- the address is kept only as a salted hash, as chat_threads keeps it.
--
-- A conversation is the rows sharing a session: a random id the widget makes
-- when it opens and keeps for that tab, so a follow-up question sits under
-- the one before it.

create table if not exists public.chat_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The widget's id for this conversation. Not a person and not a login.
  session text not null,
  -- The page they asked from, path only.
  page text,
  question text not null,
  answer text not null,
  -- 'ai': Claude, from the site's content. 'site': the site's own FAQ text,
  -- when there's no model or the model's answer was refused (llm.ts).
  answered_by text not null,
  -- 'answer' | 'unsure' | 'emergency'. Unsure is the list worth reading:
  -- questions the site has nothing on.
  kind text not null,
  -- The page the answer pointed to, and the site question it was matched to.
  link text,
  about text,
  ip_hash text,
  constraint chat_answers_by_check check (answered_by in ('ai','site')),
  constraint chat_answers_kind_check check (kind in ('answer','unsure','emergency'))
);

create index if not exists chat_answers_recent_idx
  on public.chat_answers (created_at desc);

create index if not exists chat_answers_session_idx
  on public.chat_answers (session, created_at);

-- Server-side only: the route writes with the service-role key and the portal
-- reads with it. Nothing in the browser touches this table.
alter table public.chat_answers enable row level security;

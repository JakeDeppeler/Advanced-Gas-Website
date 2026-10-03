-- The method videos, and who has watched them.
--
-- content.ts lists six videos and not one of them carries a youtubeId, so
-- every card on the Learning page was a play button over nothing. The list
-- moves here so a video can be added the day it is filmed rather than the day
-- somebody deploys.
--
-- `sop_code` is the join to the manual: a video of the weekly van check should
-- open A1, and a procedure should be able to say "there's a video of this".

create table if not exists portal_videos (
  id          uuid primary key default gen_random_uuid(),
  track       text not null,
  category    text not null default 'Install standards',
  title       text not null,
  description text,
  -- Just the id, e.g. dQw4w9WgXcQ — not the whole URL.
  youtube_id  text,
  minutes     int,
  sop_code    text,
  sort_order  int,
  created_at  timestamptz not null default now(),
  unique (track, title)
);

create index if not exists portal_videos_track_idx on portal_videos (track);

-- Who has watched what. One row per person per video; watching twice is still
-- watched, so the pair is unique.
create table if not exists portal_video_watches (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references portal_videos (id) on delete cascade,
  user_email text not null,
  watched_at timestamptz not null default now(),
  unique (video_id, user_email)
);

create index if not exists portal_video_watches_user_idx on portal_video_watches (user_email);

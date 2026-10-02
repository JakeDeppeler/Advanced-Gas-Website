# Working on this repo

## Ship by default

**Push changes live without being asked.** The standing instruction is: build it,
verify it, merge it to `main`, confirm it deployed. Don't park work in a draft PR
waiting for permission, and don't ask "shall I merge?" — the answer is yes unless
the change is one of the exceptions below.

Verify before merging, every time:

1. `npx tsc --noEmit` and `npx next build` both clean
2. anything visual rendered and **looked at**, not just compiled — see below
3. CI green on the head commit

A pending or failing check is not a reason to ask permission; it is a reason to
wait or to fix it. "Push it live" means merge it *working*.

Nor is it a reason to announce the intention. Saying "I'll merge once the checks
go green" reads as waiting to be told again, and Jake has had to say "merge it"
enough times to make the point. Wait for green, merge, then report what landed.

**Stop and ask first** for: anything that deletes data or drops a column, changes
how money is calculated once the business is relying on it, alters the public
site's appearance or content in a way nobody requested, touches credentials or
auth, or that you can't verify. Say what you'd do and why, then wait.

## Where things deploy

| | |
|---|---|
| Live site | built from **`main`** by the `advanced-gas-website-live` Vercel project |
| Default branch | `claude/seo-lead-conversion-optimization-W1U10` — **not** deployed |

That default branch is a stale side branch with an older design. Work merged
there changes nothing visible. **Branch from `main`, PR into `main`.** This has
already cost one full round of debugging; don't repeat it.

`main` also carries the internal portal (`src/lib/portal/`), the Xero OAuth
routes, and the quote form, which has written leads to `portal_leads` since
migration `0019`.

## Conventions

- **No new dependencies without a reason that survives scrutiny.** Supabase is
  reached over REST (`src/lib/portal/db.ts`, `src/lib/dashboard/db.ts`); there is
  no `supabase-js` and nothing needs one.
- Namespace a feature's modules in their own folder, as `portal/` and
  `dashboard/` do.
- Migrations are numbered sequentially (`0024_…`) and written idempotently.
- Comments explain **why**, especially where the obvious implementation was
  rejected. A comment restating the code is worse than none.

## Look at what you build

Anything that renders gets rendered and inspected before it ships. On the wall
dashboard that has caught, among others: a gauge arc off-centre and overflowing
its viewBox, a page filling two of three grid rows, labels ellipsing in a column
sized for shorter text, and a JSX line break swallowing a space. None of these
would have failed a typecheck or a build.

Server components can be rendered to static HTML with `sucrase-node` and
screenshotted with Playwright at `/opt/pw-browsers/chromium`, at 1920×1080 for
the wall board.

## Don't put numbers on a wall you can't stand behind

The dashboard is read from across a room by people who will act on it. A
confidently wrong figure is worse than an absent one, and a board that gets
caught being wrong stops being looked at.

- If the data doesn't support a metric, **leave the tile out** and say why in
  `DASHBOARD.md`. Two tiles have already been cut on these grounds: nothing
  writes `first_contacted_at` or `handled_at`, so "time to first call" would read
  `—` forever and "leads not yet called" would have claimed thirty uncontacted
  leads that had in fact been rung.
- A failed source carries its last known value forward behind an amber dot. It
  never blanks the board, and it never shows a zero it didn't measure.
- Targets that aren't configured blank their figure and say so.

## Colour is never the only signal

The board uses a fixed status palette (good / warning / serious / critical) that
is reserved for status and never reused decoratively. Red/green/gold on the pace
dials measures ΔE 5.2 under protanopia — below the readable floor — so those
dials carry fixed zone order, visible boundary gaps, a weight difference on the
active zone, and the status written out in words. Keep that property.

## Credentials

`SUPABASE_SERVICE_ROLE_KEY` and every `ST_*` value are server-side only and must
never reach the browser. ServiceTitan auth failures must not echo the response
body — it can contain the client id.

**Do not add a Xero token refresh to this codebase.** Xero rotates the refresh
token on every refresh and kills the old one the moment a new one is issued. The
portal already owns that loop and writes `portal_integrations`. A second
refresher would race it and silently break the live Xero connection. Read the
stored token; report `stale` when it has expired.

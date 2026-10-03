# Wall dashboard (`/screen`)

A Geckoboard-style board for an office TV. Dark, no interaction, auto-refreshing,
readable from 3–4 metres.

## How it works

```
ServiceTitan ──export API──┐
  (continueFrom tokens)    │
Xero (read-only) ──────────┼──> /api/sync ──> Supabase ──> /screen
Website quote form ────────┘   (Vercel Cron)   ├─ st_* replica
                                               └─ portal_metrics_snapshot
```

The TV never calls ServiceTitan or Xero. A sync pulls upstream data into
Supabase every few minutes, computes one snapshot row, and the screen reads only
that row. Three reasons:

- **Rate limits.** A panel polling upstream APIs every 30s gets throttled.
- **The board never blanks.** If a source fails, its tile carries the last known
  value and the source dot in the header turns amber or red. A dashboard that
  shows an error gets ignored within a week.
- **Secrets stay server-side.** No API credential ever reaches the browser.

`st_*` tables keep the raw ServiceTitan payload in a `raw` jsonb column, so new
tiles can be added — or metrics backfilled — without re-pulling history.

## The pages

The board cycles every 20 seconds through six pages. Past about eight tiles
nothing on a 1080p panel stays readable from four metres, so it rotates rather
than shrinks.

The chrome is the portal's: cream ground, navy for the one card per page that
matters most, Archivo for every figure, and the brand orange reserved for
attention. Where it is up to in the cycle is six dashes top-right and the orange
run under the header, which fills a sixth at a time — the room can see where it
is without reading six page names, which is what the tab strip asked of it.

**Today** is two rows of three. Sold today (navy), invoiced today and jobs
booked today across the top; quoted today, close rate and overdue beneath, each
with the two lines of context that stop a bare percentage being guessed at.

Eleven tiles became six. The page had grown a tile per available number, and at
that density nothing on it was bigger than anything else — which is the one
thing a wall needs. Nothing real was lost: jobs completed is the line under
Invoiced, the lead count is the line under Jobs booked, quotes out has a page
of its own, and the service mix is the job-type table on Performance.

**Pace** is three bands with their names down the left margin, because "63%"
means three different things on this page and the row it sits in is what says
which:

- **Today** — sold, invoiced and jobs booked against the day's share of the
  month, where the day's share is
  `(monthly target − achieved so far) ÷ working days remaining`.
- **The month** — four dials, each against its monthly target.
- **This year** — one navy strip: the year to date against the goal, a marker
  at where the goal says we should be by now, the margin against its target,
  and jobs a week.

Sold and invoiced are **two different measures, not two views of one**, and that
is why both are on the wall. Work sold today is invoiced days or weeks later, so
revenue alone reports on quotes closed well before this morning — by the time it
sags, the sales week that caused it is already over. Selling is the half the
room can still act on today; invoicing is the half already committed. The gap
between them is the pipeline.

**Quotes** is three figures — quoted today, sold today, average quote — over
what was written today and what is still out, biggest first.

**Team** is sold, out of quoted, per person. Sold is the headline and quoted is
the line under it; it used to be the other way round, on the grounds that too
little closed work carried a seller for a sold column to be anything but
zeroes. The bonus-tier bar beside it was always measured on sold, so the page
showed one figure big and ranked on another. Attribution is thin rather than
absent, so the fix is to lead with sold and say on the page how much of the
month it accounts for — the totals row does, whenever the named sales come to
less than 90% of the month.

**Performance** is four figures with margin as the navy one, over one table of
job types: jobs, revenue, profit, and a margin bar with the month's own goal
drawn on it. The goal is the month's profit target over its revenue target, both
set on the board's settings page; with no target set there is no line, rather
than a line at a number nobody chose.

**Areas** is where the work is over the last 60 days, on a real map. Tiles are
CARTO's light basemap — a full-colour one fights the orange heat sitting on it —
loaded by the browser on the panel, with the heat and the labels still drawing
on the cream if they never arrive. Each suburb's pool is sized by the square
root of its share, so area tracks job count rather than radius.

Labels are laid out against the fitted map in pixel space, busiest first: each
tries its preferred side then the others, and anything with nowhere to go keeps
its dot and loses its tag. Before that pass the three suburbs clustered around
Berwick printed on top of each other. A suburb with no coordinate on file is
named under the map rather than dropped.

`NEXT_PUBLIC_BOARD_TILES` overrides the tile URL. It exists so the board can be
rendered and looked at from an environment with no route to a tile CDN; leave
it unset everywhere but a dev box.

### The dials

Three zones in a fixed order — behind, on track, ahead — with the needle at the
current pace. **Colour deliberately does not carry the reading on its own.**
Red/green/gold is close to the worst case for red-green colour blindness: the
most separable gold still measures ΔE 5.2 against the green under protanopia,
which is below the usable floor. So the zone order never changes, the boundaries
have visible gaps, the active zone is the only one at full weight, and every dial
states its status in words. Someone who sees no colour difference at all still
reads it from needle position and text.

### The sale celebration

When a sold quote appears that the board hasn't shown before, a rocket crosses
the screen with the seller's name and the amount, for seven seconds.

**It is not instant.** The board learns about a sale on the next sync run, so the
rocket lands within about ten minutes of the quote being closed — not the moment
it happens. Worth knowing before anyone reads a quiet screen as proof that
nothing sold.

The screen seeds itself from the first snapshot it loads, so opening the board
doesn't replay every sale already on the books, and it won't cheer the same sale
twice. Motion is suppressed under `prefers-reduced-motion`; the name and the
number still appear, which is the part that matters.

### Theme

The board is light by default — deep navy on warm off-white with the brand
orange, matching the Advanced Gas identity. Dark is still there:

```
/screen?k=<SCREEN_TOKEN>&theme=dark
```

Dark is easier on a panel running twelve hours a day, so it is worth switching
to if the TV shows signs of burn-in. Each theme has its own steps chosen against
its own surface; neither is an inversion of the other.

The brand pair also fixed the dials. Red/green/gold measured ΔE 4.1 between its
adjacent zones under deuteranopia — effectively identical colours. The order is
now behind (orange) → on track (navy) → ahead (green), whose adjacent pairs
measure 28.2 and 30.5. Orange and green remain a weak pair at 4.8, and they sit
at opposite ends of the arc, never beside each other.

## Setup

### 1. Environment variables

Set these in Vercel (see `.env.example`):

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | already set — shared with the portal and the quote form |
| `SUPABASE_SERVICE_ROLE_KEY` | already set — bypasses RLS, server-side only |
| `SCREEN_TOKEN` | `openssl rand -hex 32` |
| `CRON_SECRET` | the sync workflow sends it as a bearer token |
| `ST_CLIENT_ID` / `ST_CLIENT_SECRET` / `ST_APP_KEY` / `ST_TENANT_ID` | ServiceTitan — where each comes from is step 4 |

Until the ServiceTitan variables are set, the sync skips ServiceTitan cleanly and
the board runs on website leads alone — every ServiceTitan tile shows `—` with the
source marked `not-configured`. Next.js reads these at runtime, but a running
instance keeps the values it started with, so redeploy after adding them.

### 2. Database

`supabase/migrations/0021_dashboard.sql`, `0022_dashboard_leaderboards.sql` and
`0023_dashboard_resolve_names.sql` — already applied to `advanced-calc`. They add
`portal_sync_state`, `portal_metrics_snapshot`, `portal_settings` and the `st_*`
replica. Existing tables are untouched.

`portal_leads` is **not** created here. It already exists and the quote form has
been writing to it since migration `0019`; the dashboard only reads it.

**Applying them is manual.** The deploy runs no migration tool, so a file in
`supabase/migrations/` changes nothing until it is run against the project.
`0024` — the calls table — was written while the Telecom scope was still
ungranted and never applied; the day the scope was turned on, ServiceTitan
started returning call records and every sync failed with *Could not find the
table 'public.st_calls'*. It cost nothing because `portal_sync_state` recorded
the error, but only because that table had been taught to record lookups a few
hours earlier.

After applying a batch, check the objects exist rather than assuming:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'st\_%' order by 1;
select proname from pg_proc where proname = 'dashboard_resolve_names';
```

### 3. Revenue target and working calendar

**Set the four monthly targets and the commission tiers in the portal**, at
**Finance → Wall board** (`/portal/finance/board`). That writes the same
`portal_settings` row the SQL below describes, merging rather than replacing, so
it leaves the working calendar alone. Anyone with the `overhead` capability can
change a target without needing a database client, which is the point: the board
is read by people who cannot edit it, and the number it measures against should
not need an engineer.

The same page now also carries **the working calendar** — which weekdays count
and the list of days off — and **where the revenue target comes from**. Holidays
turned out to be exactly the thing the office needed to correct and the one thing
it could not: they change every year, and "ask someone to run some SQL" is how a
calendar ends up a year out of date without anybody noticing.

**The monthly revenue target can follow the year goal** instead of being typed
in. Set the year once on `/portal/finance/goals` and each month's target is that
month's share of it, derived on every refresh — so November is right without
anybody going back to change October. It is derived at read time and never
written into the row, because a figure copied across in October is wrong in
November and nothing on the wall would say so. The other three stay explicit:
sold dollars lead invoiced ones by the length of the install backlog, gross
profit depends on what the work costs, and bookings is a count. None of them
follows from a revenue goal, and guessing would put a figure on the wall nobody
agreed to.

The SQL below is kept for the first install.

```sql
insert into portal_settings (key, value)
values ('dashboard', jsonb_build_object(
  -- What has to be invoiced in the month. Drives "to invoice per day".
  'revenueTargetMonthly', 240000,
  -- Gross profit and jobs-booked targets, for their dials on the Pace page.
  'profitTargetMonthly', 84000,
  'bookingsTargetMonthly', 60,
  -- Commission bands, applied marginally: crossing a threshold lifts the rate on
  -- the amount above it only, never retrospectively on the whole month. A cliff
  -- would make a single $1 sale worth thousands, which is how a scheme gets gamed.
  -- `from` is the monthly sold total at which the rate starts.
  'commissionTiers', jsonb_build_array(
    jsonb_build_object('from', 0,      'rate', 0.03),
    jsonb_build_object('from', 50000,  'rate', 0.05),
    jsonb_build_object('from', 100000, 'rate', 0.07)
  ),
  -- What has to be SOLD in the month — the value of quotes closed. Drives
  -- "to sell per day". Usually set above the revenue target: not everything
  -- sold this month gets installed and invoiced this month, and the backlog
  -- it builds is what next month invoices from.
  'salesTargetMonthly', 280000,
  -- 1 = Monday … 7 = Sunday. Add 6 if Saturdays count toward the target.
  'workingDays', jsonb_build_array(1,2,3,4,5),
  -- Victorian public holidays and any shutdown days, as YYYY-MM-DD.
  'holidays', jsonb_build_array('2026-11-03','2026-12-25','2026-12-26')
))
on conflict (key) do update set value = excluded.value;
```

Holidays live here rather than in code so the office can correct them without a
deploy. An empty list is fine — the number is just slightly optimistic in
months with a public holiday.

To change a target mid-month, update this row — the next sync picks it up and
both daily numbers re-derive from it. No deploy, no restart.

### 4. Link ServiceTitan

The four `ST_*` values come from two different systems, and the order matters —
the tenant side needs the app key before it will issue a client id.

**a. App key** — in the developer portal, under **My Apps → Register New App**
(`tenant-api-credentials-portal.servicetitan.io/apps`). Fill in the app details,
add the Advanced Gas tenant under **Tenant(s)**, and tick the scopes in **API
Scope** (see the table below). Then **Keys → Application Key** → copy it. That is
`ST_APP_KEY`, and it belongs to the app, not the tenant.

> **Check the environment badge first.** The portal opens in whichever
> environment you last used, shown as a coloured badge in the top-right corner,
> and the URL carries `-integration` when you are in the sandbox. An app
> registered in the Integration environment reads synthetic demo data and its
> credentials only work against the integration hosts — register in
> **Production** unless you are deliberately testing the pipeline first. Switch
> with the badge rather than by editing the URL.

The app is registered with **Client Credentials Management** set to *"I, the app
developer, will configure the credentials on behalf of each tenant"*. That is the
right choice here because the dashboard has no tenant-facing settings screen —
its credentials are environment variables. It also decides where step (b)
happens: the portal, not the tenant's own ServiceTitan.

**b. Tenant connects the app** — in ServiceTitan itself:
**Settings → Integrations → API Application Access**, where a tenant admin
approves it. Nothing can be collected until this is done, and it is the one step
that needs someone with admin rights on the tenant.

**c. Client id and secret** — back in the developer portal:
**My Apps → View Connections**. The client id is shown; the secret is generated
there. **The secret is shown only once** — if it is not recorded at that moment
it has to be regenerated. These are `ST_CLIENT_ID` and `ST_CLIENT_SECRET`, and
they are issued per tenant.

`ST_TENANT_ID` is the numeric tenant id entered under **Tenant(s)** when the app
was registered. It is always numeric; if what you have is a name, it is the wrong
field. Leave **Network ID** empty — Customer Global Networks is for franchise
groups spanning many tenants.

Scopes to tick, and what each one is holding up:

| API scope | Powers |
|---|---|
| Settings | business unit labels, sales leaderboard names |
| Job Planning & Management | jobs completed, jobs booked, job type labels |
| Accounting | revenue MTD, the daily number, job type profit |
| Sales & Estimates | quotes open, close rate, who sold the most |
| CRM | ServiceTitan lead counts |
| Pricebook (Materials: read + write) | Reece price sync on this same app — see [PRICEBOOK.md](PRICEBOOK.md) |
| Telecom | calls per person (optional — the rest of the board works without it) |

A missing scope is the most common failure, and it surfaces as a bare `403` on
whichever call happens to run first — which is why the next step exists rather
than going straight to the backfill.

**d. Verify the link** before syncing anything. Either run the **ServiceTitan
check** workflow from the Actions tab — no terminal, and the result renders as a
table on the run's summary page — or call it directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.advancedgas.com.au/api/servicetitan/check
```

On Windows PowerShell that must be `curl.exe`, not `curl`: the latter is an
alias for a command that does not accept `-H` and fails with an unrelated error.
The workflow exists partly to avoid that whole class of problem.

It walks the stages in dependency order — credentials present, credentials
well-formed, token exchange, then one cheap probe per scope — and stops at the
first failure, because every later probe would fail for the same reason. Each
failing stage carries a `fix` naming what to change. `"linked": true` means all
seven endpoints answered, and the `records` count per resource tells you the
tenant actually holds data before you commit to a backfill.

It returns 200 even when the link is broken: the body is the report, and a
non-2xx would be indistinguishable from the endpoint itself being misconfigured.
The route is read-only and guarded by `CRON_SECRET`.

Two failures worth knowing in advance, because neither is visible by inspection:

- **A credential pasted with a trailing newline.** It survives a copy out of the
  portal, is invisible in every dashboard that stores it, and comes back as
  `invalid_client`. The check reports it as a `format` stage failure. The client
  deliberately does not trim the values itself — silently accepting a malformed
  secret just hides the problem until the next rotation.
- **The app not authorised by the tenant at all**, as opposed to one missing
  scope. Both are 403s; the difference is that the first makes *every* endpoint
  fail, which the check calls out explicitly.

**Sandbox.** ServiceTitan runs a separate integration environment on different
hosts with its own portal login and its own credentials. To point at it, set
`ST_AUTH_URL=https://auth-integration.servicetitan.io/connect/token` and
`ST_API_BASE=https://api-integration.servicetitan.io`. The production hosts are
the defaults, so leave both unset for the live tenant.

### 5. First sync

Run once with `?reset=1` to backfill from the start of ServiceTitan history:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.advancedgas.com.au/api/sync?reset=1"
```

Or run the **Dashboard sync** workflow from the Actions tab with the *reset*
input ticked.

The export endpoints are paged and each run is capped, so a large backfill takes
several invocations — the stored continuation token means each run resumes where
the last stopped. Re-run until every resource reports `exhausted: true`.

### 6. Point the TV at it

```
https://www.advancedgas.com.au/screen?k=<SCREEN_TOKEN>
```

A Fire Stick or Raspberry Pi in kiosk Chromium is enough. Reboot it nightly.

## What the lead data supports

The board shows only what `portal_leads` actually records. Two tiles that an
earlier draft carried were removed rather than shipped blank:

| Wanted | Why it isn't there |
|---|---|
| Average time to first call | Nothing writes `first_contacted_at` or `handled_at`. Every row is null, so the figure would be permanently `—`. |
| Leads not yet called | Same columns. It would read "30 uncontacted" for leads that *have* been called but never recorded, which is worse than no tile. |
| Booking rate | Needs the calls behind it, which sit in ServiceTitan's Telecom scope. That is not granted, so the tile read `—` from the day it was added until the day it was removed. A tile that has never once shown a number is not holding a place, it is taking one. |
| Cancel rate | Cancellations are not pulled from ServiceTitan at all. Same reasoning. |
| Calls per person, on Team | Same Telecom scope. The column showed a dash for every person on the wall. |
| Best conversion by suburb | The design's third Areas card. Estimates carry no suburb, so quotes cannot be divided by place — only completed jobs can. Highest ticket and best average ticket are both on there; conversion is not. |

Both become possible the moment the portal stamps a contact time; the columns
already exist. Until then the slot holds **what they're asking for**, a breakdown
by requested service, which every lead does carry.

**Suburbs come from the postcode.** The quote form captures `postcode` on every
lead and `suburb` on none, so the board maps the postcode to a suburb name via
`src/lib/suburbs.ts` and falls back to the bare postcode for anywhere outside the
service area. If the form starts capturing a suburb, that value wins automatically.

**Job value by suburb now works.** `st_jobs` carries `suburb`, `postcode` and
`total`, so the Areas page reports jobs, revenue and average ticket per place
off completed jobs — thousands of rows — rather than off the thirty-odd website
leads the map used to be drawn from. Best average ticket is restricted to
suburbs with at least three jobs: one $15,000 job in a suburb that has had one
job is not an average, it is that job, and on a wall it reads as a place worth
chasing.

## Profit on every job isn't buildable yet

The portal design has a **Profit · every job** screen: equipment, materials and
labour per job, what each cost, what was charged, the mark-up on each and the
margin that fell out. The design's own footnote reads "Sample jobs for layout",
which is the right instinct — it cannot be drawn from anything we have.

`st_invoices` carries a `cost` column and the sync has never once written to
it: 5,399 invoices, zero with a cost (checked 3 Oct 2026). There is no
equipment or materials cost anywhere, and no labour hours per job, so every
figure on that screen would have to be invented. A made-up margin on a page
called "profit on every job" is the single most damaging number this product
could print — somebody would reprice off it.

What would make it real, in order of how much work each is:

1. **Labour.** `st_jobs` would need hours on site. The charge-out rate already
   exists and is correct (Costs & capacity derives it from the real crew), so
   hours alone give a labour cost.
2. **Materials.** Reece order lines already land in `portal_supply_orders` with
   a cost. They carry a job reference, so matching them to a job is the join
   that is missing, not the data.
3. **Equipment.** The pricebook has the cost of every unit we install; it needs
   to be recorded against the job it went onto.

Until at least labour and materials are there, the page is not built. The
figures that *are* sourced — revenue, margin by job type where ServiceTitan
reports a cost, the year against its goal — are on Finance already.

## Verify the ServiceTitan field mapping

The mappers in `src/lib/dashboard/stSync.ts` read the fields ServiceTitan's export payloads
are documented to carry, but nothing unmapped is lost — the full record is stored
in `raw`. After the first sync, check a real payload and tighten the mappers:

```sql
select raw from st_jobs limit 1;
```

`businessUnitId`, `jobTypeId` and `soldById` are handled: they are stored raw and
resolved to names by `dashboard_resolve_names()` against the `st_technicians`,
`st_job_types` and `st_business_units` lookup tables, which sync from the ordinary
list endpoints on every run.

Still to confirm against a real payload: the service address lives on the
location record rather than the job, so `suburb` and `postcode` on `st_jobs` stay
null until that lookup is added. (The suburb tile reads website leads, not jobs,
so it works regardless.)

**Job-type ranking basis.** If ServiceTitan returns a cost on at least half of
recent invoices, job types are ranked by gross profit; otherwise by revenue, and
the tile says so on its subtitle. If profit ranking never kicks in, cost is not
on the invoice export payload and needs pulling from invoice line items.

## Figures that are bounded, blanked or renamed

Changes made after the board was read back to us and the numbers were not
believed. Each is here because a figure that gets argued with once stops being
looked at afterwards.

**The close rate counts jobs, not options.** ServiceTitan writes one estimate
per *option* — good, better and best on the same job are three rows — and over
the last thirty days that is 4.1 options for every job actually quoted. Counted
per option the board reported **6%** on a month that had closed **14%**: 25 of
444 rather than 23 of 160. Everything built on that count moved with it —
quoted today, today's conversion, and the quote counts for the week and month.
Values still sum every option, because that is what was written; only the
counts are per job. The card says both, so nobody has to guess which it means:
`23 of 160 jobs quoted · last 30 days · 444 options`.

**What is still out is valued once per job.** Summing every open option counted
the same job three and four times and put **$1.35M** of pipeline on the wall
against **$755K** that could actually land — at most one option on a job ever
sells. Each job now counts once, at the average of the prices put in front of
that customer. The best case and the worst case are both a choice; the middle
of what was offered is the one that needs least defending. The "still out" list
is one row per job for the same reason: it used to name the same customer three
times and the room read it as three people to ring.

**The year is summed the same way the month is.** `revenueInvoicedYtd` is the
sum of `st_invoices.total` since the goal's year started — the identical query
to the month's, from a different date. `revenueYearByNow` is the goal's own
month shape, plus the elapsed part of the current month on calendar days: the
long view answers "are we on for the three million", and a long weekend does
not change that answer. Both are null with no year goal set, and the strip says
so rather than pacing against nothing.

**Jobs completed leads with today, and names the week.** The tile showed the
week's count on a page headed Today, and thirty jobs since Monday was read as
thirty since breakfast. It now reads `8 · today · 30 since Monday`.

**Quotes out is bounded to 30 days, not 90.** Estimates in ServiceTitan are never
dismissed when a customer goes quiet, so Open accumulates: 744 of them, 163 more
than ninety days old. The first bound was ninety days and it barely helped — 581
of the 744 fall inside it, so the wall still said 582 quotes and $5.0M and the
office still did not believe it. Thirty days is the window a quote is actually
live for, and it matches the close-rate window so the two tiles describe the same
pipeline. What falls outside is counted separately as "older, to close off",
because 471 quotes nobody has closed is a real job to do, just not pipeline. The
same backlog drags the close rate to 5%, which is arithmetically right and worth
fixing at the source rather than on the board.

**Jobs scheduled next 7 days reads "not available", not zero.** Every row in
`st_jobs` has `scheduled_on` null: ServiceTitan's jobs export does not return
appointment times — they are on the separate appointments resource, which the
sync does not pull. The metric is null so the board admits the gap instead of
claiming an empty week for a business doing eight jobs a day. Pulling
`jpm/appointments` would fix it properly.

**The Areas map draws jobs, not leads.** It was built from `portal_leads`, which
holds about thirty rows in total — the whole catchment drawn from a trickle,
naming whichever couple of suburbs had filled in the web form. Completed jobs
carry the same suburb and postcode columns and there are thousands, so the map
shows where the work is, over 90 days. The lead figures keep their own tile.

**The footer is a light, not a clock.** It read "Synced 4 min ago", which asks
the room to decide whether four minutes is fine. It now reads **Live · All feeds
connected** in green, or **Catching up** in amber when the snapshot is over two
minutes old or a feed is degraded — with the reason written out beside it, since
roughly one man in twelve cannot tell the two dots apart.

**The board refreshes every 30 seconds.** It recomputes the snapshot on every
poll, which only reads the local replica and is cheap. Pulling from ServiceTitan
stays on a two-minute floor, read from `portal_sync_state.last_run_at` rather
than a timer in the process — serverless instances are recycled constantly and a
per-instance timer reads as "due" on every cold start.

## Things worth knowing

**Do not add a Xero token refresh here.** Xero rotates the refresh token on every
refresh — the old one dies immediately. The internal portal already owns that loop
and writes to `portal_integrations`. If this app refreshed too, whichever went
second would silently break the live Xero connection. `src/lib/xero.ts` therefore
reads the stored token and reports `stale` when it has expired, rather than
refreshing. Persistent staleness is a portal-side fix.

**All date boundaries are Melbourne time**, computed in `src/lib/dates.ts` — never
the server's timezone and never an upstream system's. The Xero org is set to
Australia/Sydney and the HubSpot portal to US/Eastern; trusting either would roll
"leads today" over mid-afternoon.

**The sync is scheduled from GitHub Actions, not Vercel.** Vercel's Hobby plan
permits only daily cron jobs and *rejects the deploy outright* if `vercel.json`
asks for more — and a once-a-day sync makes a "live" board a day stale. So
`.github/workflows/dashboard-sync.yml` calls `/api/sync` every 10 minutes
instead. It needs two repository secrets:

| Secret | Value |
|---|---|
| `DASHBOARD_SYNC_URL` | `https://www.advancedgas.com.au/api/sync` |
| `CRON_SECRET` | the same value set in Vercel |

Caveats worth knowing: GitHub's scheduler is best-effort and can run several
minutes late at peak, and scheduled workflows are **disabled automatically after
60 days without repository activity** — if the board silently stops updating
months from now, check that first.

**In practice it is worse than "several minutes late".** On this repository the
`*/10` schedule fired once and then not again for over three hours, with the
workflow enabled and the previous run green. So the board no longer depends on
it: `/screen` calls `/api/screen/refresh` every five minutes, and that endpoint
runs the same sync if the stored snapshot is more than eight minutes old. The
panel is on all day, so the thing that needs the numbers is the thing that asks
for them. Actions stays scheduled as a backstop for the hours nobody is looking.

That endpoint is authorised by `SCREEN_TOKEN`, not `CRON_SECRET` — the caller is
the display. The eight-minute floor is what stops a tab left open in a dozen
browsers from hammering ServiceTitan.

On a Vercel Pro plan, delete that workflow and put the schedule back in
`vercel.json`, which is more reliable:

```json
{ "crons": [{ "path": "/api/sync", "schedule": "*/10 * * * *" }] }
```

**One source per metric.** ServiceTitan owns leads, jobs, quotes and invoiced
revenue; Xero owns overdue debtors and receivables. They are deliberately not
cross-checked on screen — two tiles disagreeing about revenue is how a board
loses the room.

# Wall dashboard (`/screen`)

A Geckoboard-style board for an office TV. Dark, no interaction, auto-refreshing,
readable from 3–4 metres.

## How it works

```
ServiceTitan ──export API──┐
  (continueFrom tokens)    │
Xero (read-only) ──────────┼──> /api/sync ──> Supabase ──> /screen
Website quote form ────────┘   (GH Actions)    ├─ st_* replica
                                               └─ portal_metrics_snapshot
```

The TV never calls ServiceTitan or Xero. A sync pulls upstream data into
Supabase every few minutes, computes one snapshot row, and the screen reads only
that row. Three reasons:

- **Rate limits.** A panel polling upstream APIs every 30s gets throttled.
  Xero is the one place this leaked — recomputing the snapshot used to re-read
  the receivables ledger each time, and that is now gated to five minutes. See
  the Xero notes below.
- **The board never blanks.** If a source fails, its tile carries the last known
  value and the source dot in the header turns amber or red. A dashboard that
  shows an error gets ignored within a week.
- **Secrets stay server-side.** No API credential ever reaches the browser.

`st_*` tables keep the raw ServiceTitan payload in a `raw` jsonb column, so new
tiles can be added — or metrics backfilled — without re-pulling history.

## Seeing it from the portal

**Wall board** on the portal home (`/portal/board`) is the board explained to
someone who isn't standing in front of it: the figures each of the six pages is
leading with right now, read from the same snapshot row the screen reads, which
of the four monthly targets are set (a dial with no target stays blank, and the
page says which), each source's state and age, and how the refresh works. Its
buttons open the live board, the Year goal and the commission/calendar page. **Integrations**
(`/portal/integrations`) carries the same source states beside Xero, Reece,
Google reviews, Instagram and the quote email.

### The remote

The board has its own tab in the portal's side bar, **Wall board**. Its first
page, **Remote** (`/portal/board/remote`), shows the board live — the real
thing, scaled, following the remote as the TV does — beside the buttons that
drive the TV:

- **Show a page** puts one up now and holds it there; **Turn the pages again**
  lets it rotate. A TV switched on while a page is held opens on that page.
- **Put a demo up** plays one of the board's alerts (SOLD!, New quote, Time to
  bill) on sample figures, on a loop for two minutes or until taken down. It
  is the same preview `?alert=` gives, so it says it's a sample on screen.
- **Light or dark**, or as the TV's own address says.
- **Reload** reloads the board on the TV.

The remote is one row in `portal_settings` ("board-remote"). It rides along
with the figures every thirty seconds at no extra cost; while somebody has
the Remote page open, boards also check it every four seconds, so a press
lands in a few seconds. Each press carries an id and is acted on once, so the
TV's own Skip and Hold still work after it. The tab's other pages are the
explainer above and the targets and commission page.

### The reports

**Wall board → Reports** (`/portal/board/reports`) keeps the board's figures
as reports and emails each one to a list kept on that page — Jake, and
whoever in the team list is called Dean or Kellie, until somebody changes it:

- **Daily**, every working day — sold and invoiced in the two big tiles, then
  paid, booked, quoted and leads; the week so far against the goal; what needs
  someone, including to-dos past their day (`/portal/todo`, by person); who sold.
- **Weekly**, on the week's last working day — the week's six figures beside
  last week's, each against what the goal needed of the week, the week's job
  profit, who sold, what needs someone.
- **Monthly**, on the month's last working day — the month against the goal,
  its job profit, the year so far and where it lands, the kinds of work, who
  sold.

Each goes at half past five, from the same snapshot the TV shows. Two things
send them: a Vercel cron each evening (`vercel.json`, 08:00 UTC — 7 pm in
summer, 6 pm in winter) calling `/api/reports/run`, and the ServiceTitan sync
as a backstop. Each report is claimed before it is built — it lives as one
document in `portal_settings` under `report:<kind>:<period>`, created with an
insert that does nothing if it exists — so two runs can't both send it. A
send that fails is kept as failed and tried again by the next runs, up to
three times. "Send again" resends a kept one.

The email is dressed as the board — cream ground, white tiles, the navy lead
tile, mono labels, pace bars with a mark where the goal says we should be by
now and the standing written beside each one. It is tables with inline
styles, because that is what Gmail and Outlook leave alone; a phone stacks the
two big tiles and keeps the small ones two-up. **Preview** (`/portal/board/reports/preview`)
shows each report as it will arrive, built from the figures right now and kept
nowhere. From there "Send it to me" mails a copy to whoever pressed it, not
kept and not counted; "Send to everyone now" sends the real one early, and it
then counts as the period's report. A kept report opens as the same email.

Each pace line is measured against where the goal says it should be *by now*,
whatever kind of report it is in. On the period's last working day that is the
whole of what the goal needed, and the line says so; in a preview mid-week it
isn't, and comparing a Tuesday against Friday's number had a preview reading
"ahead by $214,936" on a month a fifth done.

#### Two kinds of "invoiced"

"Invoiced today" is everything the office **billed** today — counted by
`invoiced_on`, the day the invoice's lines were put on, whichever day the job
was done. The week, the month and the year count invoices by **invoice date**,
ServiceTitan's day the job finished, which is the date Xero carries. On
6 October that made today read $29,441 and the week so far $23,521: $12,174 of
the day's billing was for jobs finished on earlier days ($8,236 of it for
September jobs), which belong to those weeks, and one $3,058 job dated today had
been priced on the 1st. Both are right; side by side unlabelled they look
wrong. The reports and the portal now say which each one is, and split today's
figure into today's jobs and earlier ones (`revenueTodayEarlier`). The board's
Pace page draws today's bar on the invoice-date basis too ($20,325 that day).
Whether the week should switch to the billing day is a money decision left
with Jake: `invoiced_on` only means "billed" from late September — older
invoices had their lines touched in bulk — so it can't carry the year.

## The pages

The board cycles every 20 seconds through six pages. Past about eight tiles
nothing on a 1080p panel stays readable from four metres, so it rotates rather
than shrinks.

The chrome is the portal's: cream ground, navy for the one card per page that
matters most, Archivo for every figure, and the brand orange reserved for
attention. Where it is up to in the cycle is six dashes top-right and the orange
run under the header, which fills a sixth at a time — the room can see where it
is without reading six page names, which is what the tab strip asked of it.

**Today** is two rows of three. Invoiced today, Sold today (navy) and jobs
booked today across the top, with Sold today in the middle because it is the
figure the room watches and the centre is where the eye lands first; quoted today, close rate and money in beneath, each
with the two lines of context that stop a bare percentage being guessed at.

Four of the six are cut down the middle: the figure on the left, its breakdown
on the right, a rule between. Invoiced today carries how long each billed job
had waited; jobs booked carries the kinds of work booked, because "19 jobs
booked" is a number and four split systems and a ducted heater is a day. Quoted
today leads with the figure and puts its context to the right of it.

**Money in** is one card cut in two: what customers paid today, and what is
still overdue. Payments come from ServiceTitan's accounting export (`st_payments`,
migration 0042) under the Accounting scope the invoices already use — the
"Payment Applied" alert the office gets by email is the same record. Invoiced is
what we asked for; paid is what turned up, and on a day spent chasing debtors it
is the only figure on the page that moves. The date is the Melbourne day, not
the UTC slice an invoice date takes: a payment banked at 9am here is 10pm
yesterday in UTC.

Voided payments do not count. Thirty-two of the 4,492 the first sync brought are
`active: false` — reversed, entered twice and backed out — $34K all up. They are
payment records and they are not money that arrived. `st_payments.active` is
generated from the raw payload (migration 0043) so it is right for rows already
in the table and cannot drift; unknown reads as real.

It reads **"—" until the first payment has ever synced**, never $0. The resource
is newer than the rest and an empty table would otherwise put "nothing banked
today" on the wall on a day the office took three cheques. Once one payment is
in, a genuinely quiet day reads $0 and means it.

**Invoiced today is everything billed today, whenever the job was done.** It
counts an invoice on the day its lines were last put on (`st_invoices.invoiced_on`,
migration 0041), not ServiceTitan's invoice date, which is the day the job was
finished. Over September 55 of 79 priced invoices had their lines added after
that date, up to thirteen days later, so a job done Thursday and billed Monday
was Thursday's money and Monday looked quiet while the office billed all
morning. Under the figure, what went out is aged by how long each job had been
waiting — done today, 1–3 days, 4–7 days, over a week — stacked, with the counts
on their own right-hand edge so the tall bucket is a shape to glance at rather
than a sentence to read. It was one run-on line and at four metres that is not
the same thing. "2 done on an
earlier day" said there was a lag and nothing about its size, and the size is
the point: two jobs billed a day late is the office keeping up, two billed a
fortnight late is money that sat there. Bucketed rather than averaged, because
one job from June would drag a mean into nonsense where the buckets show it for
what it is. All four always show, zeroes included, so the line is the same shape
every day and the room reads position rather than words. The month, the year and Pace still go
by invoice date: that is the date Xero carries, and the year has to match the
books.

Jobs billed are counted on an invoice carrying a value, never on an invoice
existing — ServiceTitan opens one with every job, so a count of records would
be a statement about its data model rather than about the office.

Eleven tiles became six. The page had grown a tile per available number, and at
that density nothing on it was bigger than anything else — which is the one
thing a wall needs. Nothing real was lost: jobs completed is the line under
Invoiced, the lead count is the line under Jobs booked, quotes out has a page
of its own, and the service mix is the job-type table on Performance.

**Pace** is the year goal worked back through every step the money moves
through — booked, quoted, quote value, sold, completed, invoiced — in three
bands with their names down the left margin, nearest first:

- **This week** — the six steps as dials, each done against what the goal needs
  of it this week, with the verdict in words: ▲ ahead, ● on track, ▼ behind, and
  how many a day it takes to catch up.
- **The month** — the same six dials, against the month's need, with the share
  of it landed, the pair behind that share, and where the month lands at this
  rate.
- **This year** — one navy strip: how far off the goal's line we are, where the
  last four weeks' rate lands it by year end, how it stands against the same
  date last year, whether the gap got better or worse over the week, what a week
  has to invoice from here, and the margin on this month's jobs.

Last year sits beside the goal because the goal is a stretch and last year is
the number the room actually feels: $1.9M invoiced in FY25/26 against a $3.2M
goal for FY26/27. "Up $219K" compares this year to date against the **same date**
last year; "Tracking to" is a flat run rate off the last four weeks, so the two
can disagree — being well up at October says nothing about a year that was
back-loaded, and the run rate has no idea it was.

It replaced "Since yesterday". A day's drift on a year-to-date figure is a
thousand dollars of noise, "Since last week" beside it carries the same signal
with a week of smoothing, and last year is the figure somebody repeats in the
van.

A quote is counted **on the day it was written**, not on the day the job was
first priced. Going back to a job you quoted a fortnight ago and pricing it
again is a quote you wrote today — a visit, an hour at a kitchen table and a
number sent — and keyed on the job alone that work landed on the wall a
fortnight ago while today's dial never moved. One job in seven here is quoted on
more than one day: 140 jobs over twelve weeks, 160 days of quoting. On 6 October
the old rule counted 1 quote for the day against the new rule's 2, and 25 for
the month against 32.

The *rates* still count jobs. A close rate asks what share of the work we price
comes back, and a job quoted twice is one job that either sold or didn't; the
period counts ask how much quoting got done, which is a different question with
a different answer.

**Leads came off the funnel.** Nothing counts the phone calls behind a lead —
ServiceTitan's Telecom scope is a separate grant — so the card drew no verdict,
said "calls not counted" underneath, and took a sixth of the row to do it. In
its place is **quote value**: what the quoting was worth, one figure per job at
the average of the options offered, against what the plan needs quoted to sell
its share at the measured close rate. Summing every option would count good,
better and best as three quotes when at most one of them sells — the same basis
the outstanding list and the close rate already use.

The arithmetic is `src/lib/dashboard/pace.ts` and is described under
[Pace: what the goal needs of every step](#pace-what-the-goal-needs-of-every-step).
The portal's Pace page runs the same code off the same snapshot.

### The pace dial

Every step on Pace is the same dial, over a week and over a month: three
quarters of a circle, four zones, the figure in the middle and a knob at how we
are actually going.

The knob is at **done ÷ what the goal says we should have by now**, not done ÷
the whole target. On the second of the month the second of those is 7% on every
dial on the page and tells the room nothing; the first means the same thing on
the first of the month and on the last. The dial runs to half as much again as
the line asks, so a step genuinely ahead has somewhere to show it.

**That ratio is the number beside the verdict** — "▼ Behind · 59%" — so the
dial, the words and the key in the footer are all quoting one scale. They were
three: the dial in this ratio, the week's shortfall in jobs, the month's in
points of the month, and none of the three answered "how close is close".

The four zones are fixed on that scale and in the same order on every dial —
**Behind** under three quarters of the line, **Close** to nine tenths, **On
track** a tenth either side of it, **Ahead** past that — with a gap between
each. Only the zone the knob landed in is at full strength; the rest sit back as
tints of themselves.

That is the same verdict three times over: where the knob sits, which zone is
lit, and the words underneath. The footer carries the key — Behind under 75% ·
Close 75–90% · On track 90–110% · Ahead over 110% — so the colours are not a
convention the room has to be told. Red and green are the worst pair under
red-green colour blindness and they are used here anyway, because nothing on
this dial is carried by hue alone.

**Quotes** is three figures — quoted today, sold today, average quote — over
what was written today and what is still out, biggest first. Both lists are one
row per **job**, at the average of the options put in front of that customer,
with the option count and ServiceTitan's own job number beside it.

**Team** is sold, out of quoted, per person. Sold is the headline and quoted is
the line under it; it used to be the other way round, on the grounds that too
little closed work carried a seller for a sold column to be anything but
zeroes. The bonus-tier bar beside it was always measured on sold, so the page
showed one figure big and ranked on another. Attribution is thin rather than
absent, so the fix is to lead with sold and say on the page how much of the
month it accounts for — the totals row does, whenever the named sales come to
less than 90% of the month.

**Performance** is four figures with job margin as the navy one — booked,
invoiced, paid, and what was left of it — over one table of job types: jobs booked, invoices, revenue, and a bar.

The margin tile is the **per-job** figure — price before GST, less equipment and
materials, less the hours at what an hour of the crew costs (see
`src/lib/dashboard/jobProfit.ts`) — against the year goal's profit percentage,
with the jobs it could cost said underneath, so a margin off four jobs never
passes as a margin off the month. It used to come off `st_invoices.cost`, which
is null on all 5,415 rows in the replica, so it read "—" on every day it was up.

The table's bar is still that invoice-level margin, and **when no invoice
carries a cost it is each type's share of the month instead.** The column was
five empty grey tracks and a column of dashes, which from four metres reads as a
broken chart rather than as missing data. A column that has never once held a
figure is not holding a place, it is taking one. Share of the month's invoicing
is measured, and it answers what the table is actually read for — where the
month's money came from. The margin comes back on its own the day ServiceTitan
starts sending a cost.

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

### Colour

Behind is red, close is amber, on track is green and ahead is gold — the set the
room reads without being taught, and the set that is worst under red-green
colour blindness. The board only ever uses them to *reinforce*: every figure
that takes a status colour carries the verdict in words beside it ("▲ Ahead
$4,200", "Behind pace by 19%"), the pace dials carry it again in needle
position, fixed zone order, visible boundary gaps and a weight difference on the
zone the needle landed in, and the footer names all four. Nothing here is
readable by hue alone, and that property is the thing to keep.

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

### A journal entry that didn't reach Xero

ServiceTitan's own Xero integration posts each journal entry to Xero as a
manual journal. The sync reads those entries read-only into
`st_journal_entries` (migration 0046) — what changed since the last run, plus
every entry ServiceTitan currently has as Error, NotSynced, InProgress or
OutOfSync — and when any is in **Error** the footer carries a chip on every
page: "Xero · 2 journal entries didn't sync · oldest 2 days". On Pace it drops
the age so the dial key fits.

- It shows only what ServiceTitan reports as Error. An entry that is merely
  waiting isn't on the wall; the portal's Journal entries page lists those.
- Until journal entries have been read once (the API app needs **Accounting ›
  Journal Entries (read)**, scope `tn.acc.journalentries:r`), there is no chip
  at all — not an all-clear the board never checked.
- It goes the sync after ServiceTitan says the entry is through.
- The same errors are on Home's "Needs someone today", on the bell, and emailed
  once each (again only if the error changes) to the list on the Journal
  entries page, which starts as jake@advancedgas.com.au. Email goes through
  Resend, as the sign-in links do.

Nothing here writes to ServiceTitan or Xero. Turning on real-time sync is a
setting in ServiceTitan's Xero integration, not something the portal does.

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

### 3. Targets, commission and working calendar

**Every target on the board comes from the year goal**, set on the portal's
**Year goal** page (`/portal/goal`, a tile on the portal home). It is the one
place the business says what it is aiming at; Finance's The year and Targets read
the same row (`portal_settings` key `yeargoal`). The month's four targets are
derived from it on every snapshot — never copied into the board's row, because a
figure copied in October is wrong in November and nothing on the wall would say
so:

| Dial | Target | From |
|---|---|---|
| Invoiced | this month's share of the year | revenue goal × the month's share (the goal's month shape, even if none is set) |
| Sold | the same figure | over a year, what is sold is what gets invoiced |
| Gross profit | invoiced target × profit % | the goal's "profit to keep" |
| Jobs booked | planned jobs a week × working days ÷ days a week | the goal's weekly job mix and the board's calendar |

A target the goal doesn't cover — no goal saved, a goal for a different year, no
profit percentage, no planned week — is null, and its dial says "no target" rather
than guessing. Nothing reaches the board until the goal is **saved**: the page
shows the design's starting figures ($3M at 25% and an example week) when nothing
is saved, labelled as such, and the board never reads those.

**Commission tiers and the working calendar** stay on **Wall board → Commission &
calendar** (`/portal/finance/board`), in the `dashboard` row. That page also shows
this month's four targets as the board will use them. Holidays live there rather
than in code so the office can correct them without a deploy; an empty list is
fine — the per-day figures are just slightly optimistic in months with a public
holiday.

The SQL below is kept for a first install with no portal.

```sql
insert into portal_settings (key, value)
values ('dashboard', jsonb_build_object(
  -- Commission bands, applied marginally: crossing a threshold lifts the rate on
  -- the amount above it only, never retrospectively on the whole month. A cliff
  -- would make a single $1 sale worth thousands, which is how a scheme gets gamed.
  -- `from` is the monthly sold total at which the rate starts.
  'commissionTiers', jsonb_build_array(
    jsonb_build_object('from', 0,      'rate', 0.03),
    jsonb_build_object('from', 50000,  'rate', 0.05),
    jsonb_build_object('from', 100000, 'rate', 0.07)
  ),
  -- 1 = Monday … 7 = Sunday. Add 6 if Saturdays count toward the target.
  'workingDays', jsonb_build_array(1,2,3,4,5),
  -- Victorian public holidays and any shutdown days, as YYYY-MM-DD.
  'holidays', jsonb_build_array('2026-11-03','2026-12-25','2026-12-26')
))
on conflict (key) do update set value = excluded.value;
```

Rows written before the targets moved to the year goal may still carry
`revenueTargetMonthly`, `salesTargetMonthly`, `profitTargetMonthly`,
`bookingsTargetMonthly` and `revenueFromYearGoal`. The board ignores them.

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

Once, on the panel itself:

```
https://www.advancedgas.com.au/tv?k=<SCREEN_TOKEN>
```

The middleware checks the token, moves it into an httpOnly cookie and redirects
to the clean URL. From then on the board is **`advancedgas.com.au/tv`** — an
address somebody can read out over the phone, and the secret is no longer in the
address bar of a screen the whole office walks past.

`/screen?k=<SCREEN_TOKEN>` still works and is unchanged; it is bookmarked, and
/tv is an addition rather than a replacement.

**The token itself is not shortened.** It is 64 characters because it is the
only thing between the public internet and the company's revenue, and a shorter
one is a weaker one. What got shorter is the URL the panel sits on.

A Raspberry Pi in kiosk Chromium is the setup to beat: it boots into the board,
survives a power cut, and shows nobody an advertisement. Three things that are
easy to get wrong:

- **Not incognito, and not guest mode.** The cookie is the sign-in. A private
  window throws it away on every restart and the panel is back to the long URL.
- **Screen blanking off** (`xset s off -dpms`, or raspi-config), or the Pi
  blanks after ten minutes and the television reports no signal.
- **Restart the browser from systemd with `Restart=always`**, not from an
  autostart line. A Chromium that dies at 3am otherwise stays dead until
  somebody notices at nine.

Reboot the box nightly. Set the TV's picture size to "Just scan" / "Screen fit"
/ "Full"; where the set has no such option, `?safe=3` insets the board instead.

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

## The portal home's "Needs someone today"

The office home (`/portal`) opens with the lines that need someone today. It
reads the board's latest snapshot, so it never disagrees with the wall:

- **Incidents reported**: an incident or near miss sent from the trade
  portal's Take 5 screen, until somebody marks it read on `/portal/requests`.
  It sits first.
- **Quotes gone quiet 7+ days**: still open, inside the 30-day window, nothing
  sold and no option added for a week (`quotesQuiet*` on the snapshot).
- **Invoices overdue**: Xero's count and total, the same as the Overdue tile.
- **Van reports to answer**: damage and service reports nobody in the office
  has answered yet (status `open` on `portal_vehicle_logs`) — a tech's own, or
  a line the weekly check flagged and sent — plus anything the monthly check
  marked as needing doing.
- **Tools to sort**: a tool a tech asked about with no answer yet, and the tool
  bag and plant counts under their minimum.
- **Parts orders to place**: orders sent from the trade portal still at
  "asked for".
- **Leave to answer**: time off asked for and not yet approved or declined.
- **Factory stock low**: lines at or under their minimum on `/portal/stock`.

Each line is hidden at zero. The design also has customer chats waiting, jobs
that lost money, payment plans and VEU claims to lodge. None of those has
anything behind it yet (no chat channel, no job costs, no finance-provider or
VEU log), so they are left off rather than shown as numbers nobody measured.
Their pages exist and say what each one needs. "First reply to a new lead" is
left off The numbers for the reason given under the lead data above.

## What the crew sends from the trade portal (migration 0039)

Everything a tech raises on the iPad has an office end, so nothing sent from a
van goes into a table nobody reads:

| Sent from | Stored in | Answered on |
|---|---|---|
| Weekly check, flagged line | `portal_vehicle_logs` (service, `source = weekly`) | The van's Damage & service tab |
| Damage & service | `portal_vehicle_logs` + photos on `portal_van_photos.log_id` | The van's Damage & service tab, `/portal/requests` |
| Order parts | `portal_part_orders` | `/portal/stock`, `/portal/requests`, the van's Order parts tab |
| Tools & gear ask | `portal_van_tools.request` | The van's Tools & gear tab |
| Factory stock take | `portal_stock_moves` (via `portal_stock_move`) | `/portal/stock` |
| Take 5 / incident | `portal_take5` | `/portal/requests` |
| Time off | `portal_leave` | `/portal/requests` |
| Timesheet | `portal_timesheets` | `/portal/hours` (paid hours) |

The tech reads each answer back on their own screen — "Booked in · 14 Oct",
"Ready to collect", "Approved". Reports written before 0039 have no status and
read as "Logged", not as open: an old note that was dealt with months ago must
not come back as something the office is sitting on.

Not built, and said so on the screens rather than faked: customer texting in
Messages (no SMS service is connected; Messages carries the office's notices),
sending a quote through ServiceTitan (no write to ServiceTitan exists; the quote
screen is what the quote is built from), weekly finance figures in the
pricebook (no finance product or rate is written down anywhere), and jobs per
day on the timesheet (ServiceTitan's job assignments aren't synced).

## Pace: what the goal needs of every step

Set on the portal's **Pace** page (`/portal/pace`), which writes the same
`yeargoal` row the Year goal page does. The goal is turnover **including GST**,
because that is what the business is paid on. Profit is the exception: GST goes
to the ATO, so 20% profit means 20% of the price before GST, and the monthly
profit target is the invoiced target ÷ 1.1 × the percentage.

Quotes are counted including GST too (`st_estimates.total_inc`, generated from
ServiceTitan's pre-GST total plus its tax — migration 0040). Before that, sold
was ex GST and invoiced was inc GST against one target, and the two dials sat
ten per cent apart before anybody had done anything.

### How the goal is worked back

The money doesn't flow down one pipe. Most of it comes through a quote —
booked, priced, sold, installed — while service and repairs are booked, done
and billed without one. So the goal splits by the share of invoiced money that
came through a quote (install and quotation jobs), and each half is worked back
on its own rates:

| Step | Need |
|---|---|
| Invoiced | the goal, shared across the months by the goal's shape |
| Sold $ | invoiced × share through a quote |
| Sold (jobs) | sold $ ÷ average sale |
| Quoted (jobs) | sold ÷ close rate (per job, not per option) |
| Completed | jobs sold (each becomes an install) + service jobs, where service jobs = the rest of the money ÷ the average service job |
| Booked | quote visits (quoted × visits booked per job quoted) + service calls (service jobs ÷ the share of service bookings that go ahead) |
| Leads | booked ÷ the share of leads that book |

A week is five of the month's working days at the month's rate; a day is one.
"By now" counts today's working hours (7am to 4pm) as they pass, so a step
doesn't read behind at 9am for work that happens after lunch. Within 5% of the
line is on pace.

### Where the rates come from

Measured off the replica over the last twelve weeks, but never before
**1 September 2026**: the Field Plus import landed on 31 August and stamped 985
jobs and 487 quotes with that date. A rate needs at least eight of whatever it
divides by (eight quotes, eight service jobs) before it counts. Close rate and
average sale can be overridden on the Pace page to see what a better close rate
does to the quoting; nothing reaches the wall until it is saved.

**The booking rate isn't measured, and leads carry no verdict.** Leads counted
are the website form and ServiceTitan's CRM leads; phone calls aren't recorded
anywhere the replica can read (ServiceTitan's call log has 17 in five weeks).
So the business sets the booking rate itself, and the leads step shows its
count but never "behind" — that would be a statement about the data, not the
phones.

### The year line

Invoiced since the goal's year started against where the goal says we should
be by this moment: whole months at their share, this month pro rata on calendar
days, and today by the hour. The same gap is worked out at the end of yesterday
and a week ago, so the board can say whether we moved closer or further. "To
catch up" is this month's planned week × (money left ÷ plan left). The run-rate
landing on the portal is the last 28 days carried to the year end, and says it
doesn't allow for the season.

## Profit on every job

`/portal/profit`, and the margin on the board's year strip. Each job's price
before GST, less the equipment and materials cost ServiceTitan's pricebook puts
on its invoice lines (`st_invoices.items_cost`, generated — migration 0040),
less its hours at the crew's fully loaded cost an hour from Costs & capacity
(wages and on-costs plus each billable hour's share of every overhead). What's
left is profit after overheads — the same thing the goal's percentage means.

Hours are Payroll's job timesheets (arrived to done, per tech) where that scope
is granted (`st_timesheets`), otherwise the hours the invoice's labour lines
were sold with (`st_invoices.sold_hours`). Sold hours are what the job was
priced to take, so until timesheets sync a job that ran long looks better than
it was; the page says which it used on every row.

A job is only costed when all three are known. An install with no equipment
cost on its invoice would otherwise read as 70% margin, so it is listed with
the reason instead. $0 invoices (warranty, quote visits) are left out. The
board shows a margin only once five jobs are costed.

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

**Commercial work is excluded, but an unknown business unit is not.** The board
is a residential wall and a $119K commercial project at the top of "still out"
is not what the room is going to ring about. The exclusion is applied in code
rather than in the query, because `business_unit` is null on **151 of the 273**
jobs completed in the last sixty days — ServiceTitan's import placeholder
resolves to no name in the lookup tables — and `NULL NOT LIKE 'Commercial%'` is
NULL in SQL, not true, so a `not.like` filter would have dropped every one of
those rows and taken most of the areas map with it. Unknown is not commercial;
it is unknown. The eight rows that are genuinely commercial are not worth a
filter that silently decides otherwise.

**Highest ticket only names a job it can classify.** The tile was showing
**$21,890 · Sale**, which is an imported legacy invoice with no job type and no
business unit, in a town 200km east of the corridor. The board could not say
what the work was or which side of the business it came from, and it was read
as commercial. The tile now skips any job missing either field, so it names
$7,145 · Install - Multi-Head · Sandhurst instead. Those jobs still count
towards the map — they happened, in a real suburb, for a real amount; they just
do not get named.

**The job types table totals the month under it.** Five ranked rows read as if
they add up, and they are a top five. The last row is every invoice this month,
untyped included, so the table and the Invoiced tile agree. The head card is
labelled "Jobs booked" rather than "Jobs", because it counts jobs created this
month while the totals row counts invoices, and two different job counts under
the same word is how a board gets argued with.

**Quote figures say when they are an average.** A quote priced three ways shows
the average of its options, not their sum, and the row says `avg of 3` under the
figure. An unlabelled average of three prices reads as a total and understates
the top option.

**The map is on OpenStreetMap tiles.** CARTO's light basemap now wants an API
key and serves "API KEY REQUIRED" across every tile, which is what the wall was
showing. OSM needs no key. The tile pane is desaturated and lightened in CSS so
a full-colour basemap does not fight the orange heat on top.
`NEXT_PUBLIC_BOARD_TILES` overrides the URL for rendering the board from an
environment with no route to a tile CDN.

**The Team page's last three columns are per job, over thirty days.** Close
rate, average ticket and average quote all come off one population: the jobs
each person put a price on in the last thirty days. Per option they would be
nonsense — three prices on one kitchen is one job quoted and at most one job
sold, so every close rate would read at about a third of the truth. Month to
date they would be nonsense too: on the third of October one person had eleven
jobs quoted and none closed, which is **0%** on a wall for the arithmetic
reason that nobody decides in three days. Over thirty days the same person
reads 12% of 65 and the person selling reads 31% of 42 — two figures you can
put beside each other. Average ticket is the option that actually sold, not the
average of the options offered, and it runs over the same thirty days as the
rate beside it rather than the calendar month, because a ticket averaged over a
different window than its own close rate is the trap the Performance totals row
exists to close. The money columns stay on the month, and the page subtitle
says which is which.

**Quotes are the ones written in ServiceTitan, not the Field Plus import.** The
migration brought 3,460 estimates across and stamped every one of them
"Imported Default Businessunit", authored by the import service account, named
with its Field Plus reference, and dated 30 August — the day the import ran.
**1,998 are still Open**, because a quote in the old system was never closed off
when a customer went quiet. On the wall that was a "still out" list of six rows
that all said *Quote*, all said *33 days*, and ran from $39,930 down: a page of
migration residue sitting where this week's quoting should be, and **1,673** of
them counted as a backlog to go and ring. They are not a backlog, they are the
old system. The business unit is the discriminator — all 3,460 carry it, nothing
written in ServiceTitan since the import does — and it is the same placeholder
the job-type ranking already sets aside. Applied to every estimate figure; jobs
are untouched, because an imported job still happened in a real suburb for a
real amount and the areas map says so.

**One grouping for every close rate on the board.** `byOpportunity` keyed on job
id alone and fell through to the estimate id, so every quote ServiceTitan left
without a job counted as its own job: **150** in the Today page's denominator
where there were **118**. The per-person rates on the Team page group the same
rows by customer and day as well, so the headline disagreed with the rows under
it. Both use the same key now.

**The Today page carries the split as two halves of one tile.** Three lines of
text under a single figure was a list; two halves with a rule between them is a
comparison, which is the only reason to split the rate at all. Each half keeps
its own count, because real estate is eight jobs deep and a percentage on its
own would hide that.

No combined figure on that tile on purpose: domestic and real estate are 110 of
the 118 jobs quoted — the remainder are quotation and site-assessment units,
which are not a side of the business — so an overall percentage sitting above
two that do not add up to it invites a question with a boring answer. The one
figure over everything is on Pace.

**The Today page carries the same split.** Close rate reads the overall figure,
then Domestic and Real Estate on their own lines with their own denominators,
then what a job was priced at. It is the first page the room sees and the one
anybody glances at in passing, so the split belongs there as much as on Pace.

**The close rate carries what a job was priced at, and how many ways.** "429
options" was a number nobody could act on. **3.6 options per job** says whether
we are putting a choice in front of people, and it is the figure that makes the
rate beside it legible: a close rate counted per job only means something once
you know a job is typically priced three or four ways.

**The close rate carries what a job was priced at.** The rate says how often we
win; the average says what winning one is worth, and the room asks both. Per job
over the same thirty days — an average counted per option under a rate counted
per job is one sentence disagreeing with itself.

**Render the board in Manrope or the check is worthless.** The static harness
loaded the font from Google, which this container cannot reach, so every render
fell back to system-ui — shorter lines, shorter rows. Six separate "nothing is
clipped at any size" checks passed while the Team totals row was being cut off
on a laptop, because the harness was measuring the wrong typeface. It now loads
the self-hosted face out of `.next/static/media/*.woff2`, the same file the app
serves. Any check that measures height has to use the real font.

**Every cell on the Team row is two lines, never three.** A third line on each
row is what pushed the totals off the bottom of the tile at 1512x820. Quoted and
sold get a column each — the month as the figure, today and the week under it —
so the periods are all there without a third line.

**The Team roster spans thirty days, not just the month.** It was built from
rows dated this month while three of its columns measure thirty days, so anybody
who quoted in late September and nothing since was absent from a table that
already held his close rate and his averages — on 3 October that was **two of
the seven people quoting**, Jackson Lane and Natasha Hahir. The roster is the
union of both populations now. ServiceTitan's own API user is excluded by name:
two estimates in the tenant were written by the integration account rather than
by a person, and widening the window brought it onto the leaderboard.

**One figure on the Team row is money won; everything under it is money out for
decision.** The small lines were sold today and sold this week, which read as
three sold figures of different sizes and said nothing about what is in front of
customers right now — and on most days all three were $0. They are what was
quoted today, this week and this month.

**Each person carries options per job.** 4.2 against 2.2 is the difference
between pricing a job three or four ways and pricing it once, which is the
lever behind the close rate beside it.

**The Team page is six columns, not nine.** Today read $0 against $0 for
everybody on most days, and in the first week of a month This week is the same
figure as the month beside it. Both came off, along with the options-written
note under each name. What is left is the month's sold, the three rates, and the
tier run.

**The board can be held.** A control top right stops the rotation so somebody can
read a page; space does the same from a keyboard. Polling carries on underneath,
so the figures stay live while the page stays put, and the footer clock keeps
running — a board that has stopped telling the time looks like a board that has
crashed. It releases itself after five minutes, because this runs on a wall and
somebody will stop it to read a figure and then get called away.

**The board scales to the screen it is given, not to 16:9.** Everything was
sized in `vw`, which is correct only while the viewport is exactly sixteen by
nine. A browser on the television has a toolbar: at 1920x937 the Quotes,
Performance and Areas pages were already losing tile labels off the bottom, and
below 1920x900 whole tiles went — silently, because the board is
`overflow: hidden`, so a crop looked like a layout choice. The unit is now
`--u: min(1vw, 1.7778vh)` and every size is `calc(n * var(--u))`. At a true 16:9
nothing moves, because 1.7778vh is 1vw there; anywhere else the whole board
shrinks to fit. Checked at 1080, 1017, 937 and 864 high, at 4K, at 16:10 and at
1366x768: every page fits with nothing clipped.

**`?safe=3` for a television that overscans.** Plenty of sets still crop a few
percent off every edge in their default picture mode, and the browser never
learns about it — it is handed a full 1920x1080 and the panel does not show the
outer band, which takes the footer and the hold control with it. The parameter
insets the whole board by that percentage, clamped to 10. Setting the TV's
picture size to "Just scan" / "Screen fit" / "Full" is the better fix; this is
for sets that do not offer one.

**Today and this week sit under the month on Team, not beside it.** They were
their own columns, which made six columns of money that nobody could take in at
four metres, and Today read $0 against $0 for everybody most days. Under the
month they are what they always were: how the month is tracking.

**Profit came off the Performance page; margin stayed.** Profit has read "—"
on every single day the board has run, because **0 of the 29 invoices** this
month carry a cost — ServiceTitan has 88 costed line items across 4,791 in the
whole replica. A tile that has never shown a number is not holding a place, it
is taking one. Margin stays because it was asked for, and it says "no cost on
any invoice yet" rather than showing a zero. Both come back on their own the day
costs start arriving.

**The Performance table counts invoices, not jobs.** The column said "Jobs" and
was counting rows of `st_invoices`. This month that is 29 invoices against 11
jobs completed and 20 booked — ServiceTitan bills a job when it is billed, not
when it is stamped complete, and a job can carry more than one invoice. The
heading says Invoices. Jobs completed appears on the Today page, under Invoiced
today; the Performance head card counts jobs booked and says so.

**Xero is judged on how old its figures are, not on whether the token is
alive.** A Xero access token lasts thirty minutes, and the portal refreshes it
when somebody opens a Finance page — the board must never refresh it, for the
reason at the top of `dashboard/xero.ts`. So on any evening or weekend with
nobody in the portal, the token lapsed within half an hour and the wall sat
amber with "xero access token expired" across the footer while the figures
behind it were perfectly good. A light that is permanently amber gets read
exactly as often as one that is permanently green. What the tile carries is
money owed to us, which moves when an invoice is raised or paid — daily, not
half-hourly — so a lapsed token holds the last reading and stays green for
twelve hours, then says `last read 14 hours ago`. A connection that is genuinely
broken still turns the light within the day. The rule is `xeroSourceState()`,
exported so it can be exercised on its own.

That also fixed the timestamp underneath it: on a failed read the source carried
the *snapshot's* time, which advances every thirty seconds whether or not Xero
answered, so it could never say how old the figures were. It carries the time of
the last successful read now.

**Something keeps the Xero token alive now, and a database lock makes that
safe.** The rule above stopped the board crying wolf, but the underlying fault
was real: nothing refreshed the token on a schedule, so the only reading Xero
ever gave was whatever happened to be fetched while somebody had a portal
Finance page open. The board showed `last read 13 hours ago` most mornings
because that is exactly what it was.

Both schedulable things call `ensureXeroToken()` — the Actions sync cron, and
`/api/screen/refresh`. Both, because neither works alone, for the same reason
the ServiceTitan pull is split the same way: GitHub does not honour a
ten-minute schedule on a repository this quiet (on 5 October the workflow fired
at 07:11, 16:10 and 22:45) and a Xero access token dies in thirty minutes, so
the cron alone leaves it dead for most of the day; the board, for its part, only
polls while a panel is switched on. The cron covers the night, the board covers
the working day.

The first attempt at this put the refresh in the cron **only**, on the reasoning
that the cron is single and non-overlapping and the board's refresh route is
neither. The reasoning was sound and the premise was wrong — the cron does not
run often enough to keep a half-hour token alive, which `/api/screen/refresh`
already says in its own header comment about ServiceTitan. Read that comment
before touching this.

So the board does call it, and the race that made it look unsafe is closed
properly instead of avoided. `tokenInFlight` in `portal/xero.ts` is a
module-level promise: it collapses concurrent refreshes inside one serverless
instance and does nothing about two instances, which is the case that matters,
because Xero rotates the refresh token on every use and a lost race does not
retry — it disconnects until somebody re-authorises by hand. The claim therefore
lives where every instance can see it, as an atomic `update … where` on
`portal_integrations.refresh_lock_at` (`claimIntegrationRefresh`, migration
`0045`): the second caller blocks on the row lock, re-reads the predicate
against what the first one wrote, and updates nothing. No row back, no claim,
and the loser does nothing at all — the token it already has is minutes from
expiry, not past it.

Three constants set the shape, all in `portal/xero.ts`:

| | |
|---|---|
| `READ_MARGIN_MS` (1 min) | how close to expiry a *reader* tolerates |
| `KEEPALIVE_MARGIN_MS` (5 min) | how close to expiry the keep-alive refreshes at |
| `TOKEN_LOCK_HOLD_MS` (90 s) | how long a claim stands |

The hold is deliberately shorter than the margin: a caller that claims the lease
and then dies must not shut the others out until the token expires, so at ninety
seconds against five minutes there are three attempts before anything is at
risk. And the due-check comes *before* the claim, because the common case is a
token with twenty minutes left and that case should cost one read and take no
lease.

**And the board only asks Xero every five minutes.** `computeSnapshot` pulls the
whole authorised-receivables ledger, and it was doing so on every recompute —
about 3,500 calls a day against a tenant limit of 5,000, sharing that allowance
with the portal's Finance pages. It went unnoticed only because the token was
usually dead and the calls failed before they counted. `XERO_READ_EVERY_MS`
gates it; a skipped read is spelled as a failed one, because the carry-forward
already does the right thing with that and nothing downstream has to learn a
third case. The gate only bites when a read *succeeded* recently, so a Xero that
starts failing is retried within five minutes.

**Every step of the funnel paces against a target.** The month's five tiles are
all dials, and today's five all carry a daily figure to go. Two of them needed a
new input, and both come off one number on the year goal:

| Target | Where it comes from |
|---|---|
| Win rate | `yeargoal.winRatePct`, a percentage |
| Quoted, this month | the sold target divided by that win rate |
| Quoted, today | what is left of the month's quoted target over the working days left |

Quoting is the figure anybody can act on before lunch. "Sell $12,000 today" is
not a thing a person does; "put $48,000 of work in front of customers today" is,
and selling a month's share at a 25% win rate means quoting four times it.
Nothing is stored — the daily number falls out of the monthly one each snapshot,
so it moves on its own as the month goes and as the goal changes.

**A win rate target is flat, and the dial says so.** It is 25% on the first of
the month and on the last; there is no share of it to have reached by now, so
that dial has no pace tick and its status reads "Below target by 28%" rather
than "Behind pace". Its centre shows the rate itself, not its share of the
target — 18% against a 25% target is 72% of the way there, and "72%" in the
middle of a dial labelled Win rate is read as the win rate by everybody who has
not been told otherwise.

**The dials and bars carry the status colour.** Blue when ahead or hit, orange
when behind. Colour never carries it alone: every dial writes the status out
underneath and every daily card puts "Target hit" or "Behind" beside its label,
which is what a viewer who cannot separate the two hues reads. The colour only
makes the answer available from further back in the room than the words are.

**Pace reads as a funnel: Quoted, Sold, Booked, Win rate, Invoiced.** It was
sold / invoiced / profit / booked in no particular order, which is four figures
rather than one story. Quoted has no target to pace against, so it is a figure
card rather than a dial — a dial with nothing to measure against is an empty arc
with the one number on the tile shrunk underneath it.

**Every tile in a Pace row is built the same way.** Quoted and win rate have no
target to pace against, so they carry no meter and no dial — but they were drawn
as centred stacks beside three left-aligned cards with their labels on top, and a
row where two tiles are built differently from the other three reads as a mistake
before it reads as a distinction. `DayFigure` takes the shape of the daily cards,
`MonthFigure` takes the shape of the dials: label on top, the figure where the
arc would be, its lines centred underneath.

**Since then Pace is laid out by step** (see [Pace: what the goal needs of every
step](#pace-what-the-goal-needs-of-every-step)). The year strip moved to the top
and says whether the gap moved since yesterday and last week; the Today row
became This week, six cards from leads to invoiced; and the month kept its
dials in the status colour, but six of them, one per step against the funnel's
month need — so Booked and Quoted mean the same thing in every row on the page.
The daily quoted target is still computed (`dailyQuotedTarget`) but nothing on
the wall shows it now; each week card's "N a day to catch up" carries the same
idea for its own step. `winRatePct` is set on the portal's Pace page as "Plan on
a close rate", and it is the close rate the funnel plans on.

**Win rate is split by the side of the business.** Real estate is an agent
deciding on behalf of a landlord; domestic is a householder spending their own
money, and one rate over both says nothing about either. Over thirty days that
is Domestic 20% of 102 jobs and Real Estate 25% of 8. Each row carries its
denominator, because the real estate side is eight jobs deep and a percentage
alone would hide that.

The Today band's win rate is today's own conversion — both halves are quotes
written today — and it says "same-day only", because it reads 0% most days and
that is the honest answer rather than a broken one.

**Performance shows booked beside invoiced.** Invoices are what has been billed,
which trails what has been taken on; a month that books a lot and bills little
read as quiet when it was anything but. This month that is 20 booked against 29
invoiced.

**The board can be skipped, and held means held.** Skip (or the right arrow)
moves one page; Hold (or space) stops the rotation. Skipping while held moves one
page and stays held, which is what stepping through by hand wants. The five
minute auto-release is gone: holding now holds until it is released, because
asking for a page to stop and having it move anyway is worse than a board left
on one page with an orange "Held" badge on it.

**A page arrives rather than appearing.** The swap was instantaneous, which from
across the room reads as a flicker — you look up because something moved and it
has already finished moving. Tiles rise and fade in over 380ms, staggered 45ms
by column and capped at nine so a long table does not take a second and a half
to finish. One animation per page change, on mount, driven by React's key rather
than by a ticking state, and off entirely under `prefers-reduced-motion`.

**Written today is one row a job, not one a option.** A single kitchen priced
four ways filled the card: ten rows that all said "Quotation", all said the same
name, all said 1:34pm, and differed only in the third digit of the price. That
is not a list of today's work, it is one job wearing ten hats, and at four
metres it reads as noise. One row a job now, at the average of what was put in
front of that customer, with `avg of 5` under the figure where there was more
than one price — the same convention the outstanding list already uses.

**Both quote lists carry ServiceTitan's job number.** The estimate id is ours;
the job number is theirs, and it is what somebody standing at the board types in
to find the thing. Quieter than the kind of work, on the same line.

**The win rate's denominator sits in the card's top-right corner.** It is a
thirty-day rate in a row headed Today, so it has to say so — and under the bar
it fell out of the bottom of the tile. Status over denominator where there is
both.

**The footer is a light, not a clock.** It read "Synced 4 min ago", which asks
the room to decide whether four minutes is fine. It now reads **Live · All feeds
connected** in green, or **Catching up** in amber when the snapshot is over two
minutes old or a feed is degraded — with the reason written out beside it, since
roughly one man in twelve cannot tell the two dots apart.

**The board refreshes every 30 seconds.** It recomputes the snapshot on every
poll, which only reads the local replica and is cheap. Pulling from ServiceTitan
stays on a two-minute floor, read from `portal_sync_state.last_run_at` rather
than a timer in the process — serverless instances are recycled constantly and a
per-instance timer reads as "due" on every cold start. Xero is two more floors
again, and for two different reasons: the receivables read is gated to five
minutes because of a tenant call limit, and the token refresh is gated by a
database claim because a lost race disconnects it. Both above.

## The Today page reads in two rows

**Money across the top, counts underneath.** Sold, Invoiced and Quoted are the
three figures the day is judged on and they sit on one line, left to right in
the order the work happens. Sold is leftmost because that is where the eye
starts.

**Jobs booked and jobs completed share a card.** Same unit, same day, and side
by side the gap between them is the thing worth seeing: a day that books eight
and finishes two is a different day from one that books two and finishes eight.
The job types the day was booked in stay, in the foot.

**Every one of them carries its verdict beside the label** — behind, close, on
track or ahead, against what the goal needs *by now*, with the glyph and the
word so it is never colour alone. The Quotes page shows the same two measures
against the same by-now, so the two pages cannot disagree about whether the day
is going well.

`Verdict` is one component and `headVerdictOf` is one function, used by the
Today cards, the Quotes tiles and the Performance head cards, because four
places each deciding what "on track" means is four chances to drift.

**Sold's by-now is computed, not read from `standing`.** The `sold` step there
counts jobs, so its `byNow` is in jobs — the same unit trap that once put
529,611% on a Team card. The day's sold *value* target is on the plan and how
much of the day has gone is on the calendar; the by-now for money is the two
multiplied.

**A cancelled job is not a completed job.** `jobsCompletedToday` and
`jobsCompletedWeek` counted by `completed_on` alone, which ServiceTitan stamps
on cancellations too — this week's figure was 18 where 16 jobs were actually
completed. Both now filter on `status = 'Completed'`, the same fix the billing
queue needed.

## Figures count up

`src/components/screen/Ticker.tsx`. A number that is replaced the instant a new
snapshot lands is, from four metres, indistinguishable from a number that was
always that. Counting up is what says *this just moved*, and on a wall that is
on all day it is most of what makes the board read as live rather than as a
printout.

**It takes the formatted string, not a number and a formatter.** Every figure
here already arrives formatted by one of half a dozen helpers (`$1.5M`,
`$14,850`, `34%`, `—`), so the string is read as a template — prefix, number,
suffix — and only the number moves. Threading a formatter through every card to
re-derive what the string already says would have meant touching forty call
sites to animate twenty.

**It counts only when the number went up since the room last saw it.** The
first version counted from zero on first sight, reasoning that first sight was
the page turning on. But every page is rebuilt each time it rotates in, so
every figure on the board counted up every thirty seconds all day, and the one
that had genuinely moved looked like all the rest. Jake asked for the numbers
to move only when an estimate is sold or a quote is written, so that a page
coming round shows it has updated.

So what each figure last showed is kept outside the page, keyed by page and
figure (`TickerScope` plus the `id` each `Ticker` is given), and mirrored to
`localStorage` so a reload or the morning switch-on knows what the board last
said. The rules, in `planRun`, which is pulled out of the effect so it can be
tested:

- never seen today → shows the number, no count;
- same number → no count;
- **lower** → no count. A sale or a quote only ever adds, so a figure going
  down is a cancellation, a correction or midnight, and counting it would
  dress a correction up as news;
- higher → counts from the number the room last saw.

Remembered values carry the day they were seen and lapse at midnight, so last
night's "Sold today" is never the baseline for this morning's.
`prefers-reduced-motion` skips straight to the value, and anything with no
number in it renders as itself.

`scripts/check-ticker.ts` covers every shape the board formats, including the
real minus sign the board uses and `7 of 11 jobs`, where only the 7 may move —
animating the numerator while the denominator sat still would read as the
denominator changing. Checked in a browser against a real snapshot with the
poll intercepted: a fresh load shows `$23,301` with no count, a full rotation
with nothing changed shows no count, and a $2,873 sale landing while Today was
off screen counts `$23,301 → … → $26,174` when Today comes back round.

**The Team page shows six.** Past six the cards narrow until the figures stop
being readable across the room, which costs more than the seventh card is worth.
The header says "top 6 of 7" when somebody is not shown, so six never reads as
everybody, and the team strip still counts them all.

**The Performance head cards carry their verdict**, each against the thing that
measures it: jobs booked and invoiced against the month's pace, margin against
the margin goal itself (a rate is not something you accumulate half of by
mid-month), and paid against the *same plan as invoiced* rather than against
what we happened to invoice — the goal is revenue, and revenue is not revenue
until it is banked. Paid will read behind invoiced most months because cash lags
billing, and that gap is the thing worth seeing.

## The Team page

One card a person, ordered best to worst, with a strip across the foot for the
team. It was a table: the right shape for comparing a column and the wrong one
for the question this page is actually asked from four metres, which is *who is
behind*. Every row looked the same until you read it.

Each card carries the month's verdict as a coloured band with the word written
out, the person's name and rank, three measures — quoted this week, sold this
week, sold this month — each with a dial on the board's one shared scale, and a
block of rates underneath.

**The targets are an equal share of the team's.** Nothing anywhere holds a
per-person number: not `portal_settings`, not a column, nothing. So each
person's week is the team's week divided by the people on the board. That is an
assumption about people rather than a fact about them, so it is written in the
page header and again on every card ("of $7,924 this week") instead of being
left implied. An equal share is not true of an apprentice and a lead hand, and
the room should be able to see the denominator it is being judged against.

**By-now is the target times how much of the period has gone**, computed from
the working calendar — not taken from `pace.standing`. The first version read
it from there and put **529,611%** on a card: the `sold` step in `standing` is a
count of jobs, so dividing a person's dollars by a share of a job count is a
unit error that still typechecks. The money steps (`quotedValue`, `invoiced`)
and the job steps (`sold`, `booked`, `completed`) share a shape and not a unit.

**The order is the band's own measure.** The leaderboard arrives sorted by what
has been quoted, which put the biggest quoter at number 1 under a red BEHIND
band — a rank and a verdict disagreeing on the same card.

**`MiniDial` shares ZONES and `paceIndex` with the full-size dial**, because the
Team page puts three per person and the Pace page puts six of its own, and the
moment those disagree about what 90% means the board is arguing with itself.

The design's per-person bonus bar is absent for the same reason it is absent
from the Sold alert: no commission tiers are configured.

## A read of more than one page must say what order it wants

`sbSelect` fetches in pages of a thousand. It used to page straight through
with `Range` offsets and no `ORDER BY`, and Postgres promises nothing about the
order of rows without one — so "rows 1000–1999" of an unordered result can hand
back rows the first page already gave and never hand back others.

It did. The Pace page reads two years of invoices — 2,023 rows, so three pages —
and put **$669,510** on the wall as the year to date against a true **$390,203**,
with last year short by whatever went missing. The Today page's month and year
were right the whole time, because their window fits in a single page. The board
was disagreeing with itself and only the three-page figure was wrong.

The shape of this bug is what makes it dangerous: the row *count* is right,
every row returned is real, nothing throws, and the total is simply wrong. There
is nothing to notice.

So a short first page is returned as it arrives — nothing was paged, so nothing
can have been doubled or dropped — and anything longer restarts under an order
that ends in the table's key. The extra page costs a few hundred milliseconds on
the handful of reads big enough to need it.

Three things that are easy to get wrong, each of which was:

- **An order isn't enough; it has to be unique.** The first fix left a read
  alone if it named any order of its own, which is no protection at all:
  `order=completed_on.desc` over a fortnight of jobs finished the same afternoon
  leaves the ties for the server to arrange as it likes, differently per request.
  The key now goes on the *end* of whatever the caller asked for, which keeps
  their meaning and makes it total.
- **The key is not always `id`.** `supplier_items` is keyed on
  (supplier, code), `portal_page_views` on (path, day), and four others on
  something other than `id`; they are listed in `lib/dashboard/paging.ts`, and a
  read that grows past one page on a table missing from that list answers 400
  rather than guessing.
- **`Range` and `limit`/`offset` never travel together.** They are two ways to
  ask for the same window and PostgREST does not promise which wins. If `limit`
  wins, every page comes back as the *first* thousand rows, full, for ever — a
  loop that never ends. A caller's `limit` is now lifted out of the query and
  applied by the loop as a ceiling, and a caller's `offset` is refused outright.
  `loadSupplierItems` was walking `offset=` by hand on top of the paging and had
  been getting away with it only because the table was empty.

`scripts/check-paging.ts` runs the loop against a fake PostgREST that honours
the order it was asked for and arranges everything that order does not separate
differently on every request, as the real one is entitled to. It also runs the
**old** loop against the same fake and asserts that one fails — a guard that
does not fail on the bug it was written for is decoration. Two details of the
fake are load-bearing, and both were wrong first time: its rows are each worth a
different amount, because with every row equal a doubled row and a dropped one
cancel in the total; and it shuffles tie groups outright rather than rotating
the table before a stable sort, which left most ties in place and let the broken
loop pass.

Elsewhere, the portal's own reads are nearly all one person's rows or a whole
table of a dozen, and are left unpaged. The two that count things — page views
and web leads — asked for 50,000 and 2,000 rows of tables PostgREST serves a
thousand of at a time, so they go through `sbSelect` like everything else. Page
views are one row per path per day and the site has sixty-one paths being read:
that read would have quietly stopped growing about seven weeks in.

## The unbilled backlog, and the run rate that was reading it

The To bill tile looked back a fortnight and said **39 jobs**. The year says
**146**, the oldest finished 96 days ago, and 51 of them are more than sixty days
old. That gap is not a tidy-up — it is most of why the year's revenue reads low.

| Work done | Jobs finished | Billed | Not billed |
|---|---|---|---|
| July | 156 | 123 | 33 |
| August | 150 | 99 | 51 |
| September | 110 | 53 | **57** |

Over half of September's completed work has nothing billed against it. The job
count has barely moved — 150 to 157 a month — and the average value of a *billed*
job has been flat all year ($1,515 in May, $1,336 in September). The work is
getting done and it is not getting invoiced.

Two things follow.

**The list is the year, oldest first.** A fortnight showed the tidy-up and hid
the backlog. The year is the boundary rather than all time, because the replica
holds 462 unbilled jobs going back through the import and a job from the old
system is not work anybody is going to invoice this week. Quote visits and site
assessments come out — 21 of the year's 167 — because finished work that was
never going to be invoiced is not a backlog anybody can clear. The rows show
days waited, not a weekday and a time: a job completed on 2 July rendered as
"Thu 9:33 am", which reads as last Thursday.

**The run rate is the year's own average day, not the last 28.** The last four
weeks are always the least-billed four weeks — a job is billed days after it is
finished and only counts once its status reads Completed — so the 28-day window
measured the billing backlog and called it a forecast.

| Basis | Per day | Lands at |
|---|---|---|
| Last 28 days (what it was) | $3,141 | **$1.23M** |
| Year to date (what it is) | $4,036 | **$1.47M** |
| Last year, for scale | — | $1.82M |

It is not immune to the same lag — nothing measured off billing can be while 146
jobs are unbilled — but it dilutes one slow month across the year instead of
letting it set the forecast. `scripts/check-pace.ts` pins it: move the 28-day
window from $104K to $10K and the landing must not change. Against the old
formula those assertions fail at $1.53M and $627K, which is what made them worth
writing.

## Time on the tools, and the margin that isn't there

The Performance page carries **Time on the tools**: hours the quote allowed
against hours the crew clocked, over the jobs that carry both. It is the one
figure on that page about doing the work rather than selling it, and it is
blunt — 91.5 allowed against 141.7 taken this financial year, 55% over, 17 of 37
jobs past their quoted time. A job priced at four hours that takes nine was sold
at a margin it never had.

Its population is narrower than the costed one and deliberately so: a job needs
sold hours on the invoice **and** a timesheet, where costing takes hours from
either. The job count is on the card for the same reason the margin's is.

**Quoted margin against achieved margin is not on the board, and this is why.**
The estimate line items do carry a cost — `totalCost` and `unitCost` on each item
of `st_estimates.raw`, which nothing had ever read. So a quoted margin is
computable: over the 29 of 132 sold quotes this year whose lines carry a cost, it
is 33.9%. The comparison is what fails. Putting quoted next to achieved means
jobs that have both a quoted cost and a billed one, and there are **seven**.
Seven jobs is an anecdote, and a wall that says "quoted 24%, achieved 50%" off
seven jobs is a number somebody will act on.

It becomes real on its own as ServiceTitan's costing coverage fills in. The
extraction is written down here rather than in a branch so the next person does
not have to rediscover that the cost was in `raw` all along.

## The year's margin is the year's, not the month's

The Pace strip's margin cell used to carry `jobProfitMonth` — a seven-job figure
sitting in a row headed "This year" beside a year of revenue, inviting the room
to read one as the margin on the other. It now carries `jobProfitYear`, over the
same span the strip's own revenue covers.

Widening the window costs nothing in honesty, because there was nothing to lose:
**every costed job in the replica falls inside the last ninety days.** ServiceTitan
only started carrying a materials cost and clocked hours recently, so the windows
go:

**It is a rolling thirty days**, because prices changed and a margin is only
worth reading at the prices being charged now. That costs nothing today:
ServiceTitan began carrying a materials cost and clocked hours in **September
2026** — before that, `items_cost > 0` and `sold_hours > 0` appear on zero
invoices in every month back to January — so every costable job in the year
falls inside the last thirty days. The window and the year are the same 56 jobs,
the same $71,379, the same 21.07%. It matters from here on, not today.

| Window | Jobs priced | Of those, costable | Costed revenue | Share of revenue |
|---|---|---|---|---|
| Month to date | 11 | 10 | $22,889 | — |
| **Rolling 30 days** | **64** | **56** | **$71,379** | — |
| Financial year to date | 291 | 56 | $71,379 | 18.7% |
| Last 12 months | 1,449 | 56 | $71,379 | 3.5% |

So the year picks up all fifty-two rather than the seven invoiced since the
first, and going back further than the year would only add jobs that cannot be
costed. It reads 21.8% against a 20% goal, where the month alone read 27.5%.

A seventeenth of a per cent either way is not the point; what matters is that
**the costable set does not grow with the window.** Every one of the fifty-two
falls inside the last ninety days, because ServiceTitan only began carrying a
materials cost and clocked hours recently.

Seventeen per cent of revenue is not a year's margin and the cell does not claim
it is: the key line says **"Job margin · 52 jobs"**, because a margin over fifty-two
jobs is a different statement from a margin over the year and the strip has no
room to say it twice. If ServiceTitan's costing coverage improves, this figure
gets better on its own and the job count says so.

A note on counting them, because the first count of this was wrong by twenty-two.
`jobClass` calls everything that is not a quotation and not an install a
*service* job, which includes repairs, diagnostics, maintenance and warranty —
and a service job is costable without a materials line, since there may genuinely
be no parts in it. Counting only the job types whose name begins "Service" found
thirty where the board finds fifty-two. Check a coverage figure against
`jobClass`, not against what the job type looks like it says.

## Invoiced means the work was done

Every revenue figure on this board reads `st_invoices_billed` (migration
`0048`), a view of `st_invoices` inner-joined to jobs whose status is
`Completed`.

ServiceTitan opens an invoice when a job is **created** and puts the priced
lines on it as the quote is built, so an invoice carries a total long before
anybody has done the work or sent a bill. Summing those totals called priced
future work revenue. On the financial year to date it was **$172,612 of
$559,922 — 31%** — sitting on jobs that had never been completed:

| Job status | Invoices | Amount | Have a payment | Received |
|---|---|---|---|---|
| Completed | 289 | $387,309 | 175 | **$208,652** |
| InProgress | 46 | $126,568 | **0** | **$0** |
| Scheduled | 16 | $46,044 | 1 | $1,531 |

The last two columns settle it. Invoices on completed jobs get paid; of the
forty-six on jobs still in progress, not one has ever had a cent applied to it.
They are not bills anybody sent — they are priced work on a job that has not
finished. One of them put **$5,814 under "Invoiced today" on a morning when
nothing had been done**, which is how this was found.

It is a view rather than a column on `st_invoices` because the thing that makes
an invoice real lives on the **job**, and a copy of it on the invoice would go
stale the moment a job's status changed without its invoice being touched. An
inner join loses nothing: all 5,429 invoices carry a `job_id` and every one of
those jobs is in the replica.

**One query deliberately stays on the base table.** The to-bill feed asks which
finished jobs are still sitting at a zero invoice, and the view exists to hide
exactly those.

The year to date dropped from about $560K to about $387K when this landed. That
is the same work it always was; the board was counting it twice as early.

## The Invoices page

The fourth page in the rotation, and the only one that is a work list rather
than a score: four figures across the top — to bill, owed to us, overdue, paid
today — and three panels under them. Everything on it is something one person in
the office does next, which is what the subtitle says, so the crew can skip it.

**"Not invoiced" is an invoice still at zero, not a missing one.** ServiceTitan
opens an invoice the moment a job is created, so every completed job has an
invoice row: on sixty days of history, all 274 of them did. A to-bill tile built
on missing rows would have read a confident **0** forever. What marks a job as
unbilled is its invoice sitting at zero, which 136 of those 274 were.

**The to-bill figure is a count, not an amount.** Most service work is priced
after the visit, so the queue has no value until somebody puts one on it — of
136 unbilled jobs only 7 had been sold beforehand. The tile leads with the
number of jobs and adds "$X of it already sold" only for the part that can
honestly be valued; the rest says "not priced yet". The six jobs finished on
6 October were all diagnostics and service, all unpriced, which is the normal
case rather than a gap.

**The chase list names who owes it.** It was left off at first — the board
hangs where people walk past, and a named debt is a different thing from a
figure — but it is their office and their wall, and the list is useless for its
one job if whoever picks up the phone has to look up six invoice numbers before
they can ring anybody. The number sits under the name, quieter, and on its own
line: a property manager's full trading name and an invoice number do not fit
on one line in that column, and the number is the half you cannot afford to
truncate.

**A cancelled job is not work waiting to be billed.** ServiceTitan stamps a
`completed_on` on cancelled jobs too — seven of the last fortnight's — so the
to-bill list has to filter on `status = 'Completed'`, not on the date being
present. Without it the office was being sent to chase paperwork for jobs that
never happened, and the count read 47 where it should read 40.

**The ageing runs 1–7 and 8–14, not one fortnight.** A week late is a reminder
and a fortnight late is a phone call, and a single bucket hid which it was.
Snapshots written before the split hold neither key, and `receivablesAging` is
carried forward when a Xero read fails or is skipped — so the old shape outlives
the deploy. The page reads a missing bucket as zero: read loosely, those rows
came out as a dash beside a bar at full width, which says "everything is a week
late" on a board whose whole job is not to say things like that.

**The ageing bars are shares of everything owed**, not of the biggest bucket:
the question is how much of the money is late, and scaling to the largest row
makes a tidy ledger look like a bad one. They are stacked — label and figure on
one line, bar full width underneath — because side by side in a panel this
narrow the track came out about a centimetre long, and a bar too short to
compare is a dot with a number beside it. A due date Xero gives that cannot be
parsed counts as not due: putting money in the worst bucket on the strength of
a parse failure is the board inventing a problem.

### Two things from the design that are not here

- **VEU rebates to come.** Nothing in this database knows about a VEU
  lodgement — no table, no column, no field on the job. The figure would have
  been invented whole. **Paid today** takes the fourth tile instead, which is
  real and belongs on a money page. Building the real tile needs somewhere to
  record a lodgement first.
- **The paperwork each job needs** ("Plumbing cert + VEU form", "Gas compliance
  cert"). That is a rule about job type that nobody has written down anywhere
  this code can read. A chip guessed from a job-type string would be wrong on
  the job that matters, which is worse than no chip. Write the rule down and it
  becomes a lookup.

### And one from the Today page

**The "74% booking rate" pill is not buildable.** Every denominator available
makes the rate nonsense: `st_calls` holds 21 rows and `portal_leads` 33, against
237 jobs created in the last thirty days — website leads would put the booking
rate at 718%. It needs the ServiceTitan Telecom sync actually returning calls,
which it is not.

## The full-screen alerts

Three events take the whole wall for a few seconds: a quote written, a job
finished, a sale closed. `src/components/screen/Alert.tsx`, styled in the
`.alert` block at the end of `screen.css`.

They replace the rocket card, which only ever fired for a sale and was small
enough to miss from across the room. The point of a takeover is that it
interrupts: the room is four metres away and doing something else.

**The sizes are the design's own.** Each is the px the mockup specifies at 1920
wide, divided by 19.2 — the value of `--u` there. A 150px headline is
`calc(7.81 * var(--u))`, a 96px figure is `calc(5 * var(--u))`. Written that way
the picture is the design's exactly on the wall it was drawn for, and still
proportionate on a panel that isn't 1920. Checked at all six viewports the board
supports; nothing overflows.

| | Quote | Job done | Sold |
|---|---|---|---|
| Ground | `#ff8a3d → #c2521a` | `#1f9d4f → #0f6a31` | `#ffe066 → #f5b800 → #c98a00` |
| Headline | New quote, 150px | Time to bill, 150px | SOLD!, 170px |
| Figure | 96px | 96px | 150px |
| Holds for | 7s | 9s | 11s |

**Motion is decorative in all three.** Every word and figure is in the DOM from
the first frame, so `prefers-reduced-motion` drops the animation and loses
nothing. The one thing that needs handling is the digit roll: its strip has to
be pinned to the landing row, or it would sit showing the first digit of a
counter that never ran. The confetti is placed from a seeded generator rather
than `Math.random`, so the same alert looks the same on every panel and the same
in a screenshot as on the wall — a figure that can't be compared between two
renders can't be checked.

**`?alert=quote|done|sold` previews one on the board**, on a loop, so it can be
judged on the TV rather than in a screenshot. The sample figures say *Preview*
on screen. A full-screen "SOLD! $5,340" that nobody sold is exactly what this
board must never do, and a preview left running would otherwise be
indistinguishable from the real thing.

### What feeds them

`metrics.alertEvents` — one queue for all three kinds, oldest first, over the
same two-hour window the sale feed used: comfortably wider than the sync
interval, so nothing slips between runs, and the board de-dupes by id so nothing
is cheered twice. `seen` is seeded from the first snapshot, so the board does
not open by celebrating everything already on the books.

| Alert | Fires on | Value |
|---|---|---|
| New quote | an estimate created | the estimate total |
| Job completed | `st_jobs.completed_on` | what the job was sold for, else nothing |
| Sold | an estimate's `sold_on` | the estimate total |

**Arranging the facts is its own module.** `dashboard/alertCopy.ts` has no React
in it, so `scripts/check-alerts.ts` can exercise it directly — it is where a
missing suburb becomes "· Officer" with nothing in front of it, and that class
of mistake survives a typecheck and a screenshot of the one case that happens to
have every field. The checks cover each kind with each field missing.

**The bonus bar is still absent, and the code keeps it that way.** No commission
tiers are configured — `portal_settings` holds only `yeargoal` — so a person's
month has no threshold to be measured against. The Sold alert draws the team's
week, whose target is real, and simply omits the other bar; with no weekly
target either it draws none at all rather than an empty one. Set the tiers on
the portal and the bar appears.

**"3rd sale this month" carries no pronoun.** The design read "His 3rd sale this
month"; the board knows who closed the job and nothing else about them.

**The rocket card is gone.** It only ever fired for a sale and was small enough
to miss from across the room. Two celebration systems would have left the next
reader guessing which one fires.

## Things worth knowing

**Do not add a *second* Xero token refresh.** Xero rotates the refresh token on
every refresh — the old one dies immediately, so two refreshers each invalidate
the other's token and the connection stays broken until somebody re-authorises
by hand. `src/lib/portal/xero.ts` owns the one loop there is and writes
`portal_integrations`; `src/lib/dashboard/xero.ts` reads the stored token and
reports `stale` when it has expired, and must stay that way. Everything that
wants the handle turned goes through `ensureXeroToken()`, which claims the
refresh in the database before touching Xero — so adding a caller is fine and
adding a refresh is not. See the Xero notes above.

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

The portal's **Wall board → What it shows** page asks the same way while it is
open, through `/portal/board/refresh` — behind the portal sign-in instead of
the screen token, through the same `refreshBoard()` and the same floors — so its
"Last refreshed" tile counts up live and resets as new figures land, with the
TV switched off. Before, the tile was the age at the moment the page was drawn
and stayed there.

On a Vercel Pro plan, delete that workflow and put the schedule back in
`vercel.json`, which is more reliable:

```json
{ "crons": [{ "path": "/api/sync", "schedule": "*/10 * * * *" }] }
```

**One source per metric.** ServiceTitan owns leads, jobs, quotes and invoiced
revenue; Xero owns overdue debtors and receivables. They are deliberately not
cross-checked on screen — two tiles disagreeing about revenue is how a board
loses the room.

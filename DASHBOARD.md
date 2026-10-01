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

The TV never calls ServiceTitan or Xero. A cron job pulls upstream data into
Supabase every 10 minutes, computes one snapshot row, and the screen reads only
that row. Three reasons:

- **Rate limits.** A panel polling upstream APIs every 30s gets throttled.
- **The board never blanks.** If a source fails, its tile carries the last known
  value and the source dot in the header turns amber or red. A dashboard that
  shows an error gets ignored within a week.
- **Secrets stay server-side.** No API credential ever reaches the browser.

`st_*` tables keep the raw ServiceTitan payload in a `raw` jsonb column, so new
tiles can be added — or metrics backfilled — without re-pulling history.

## The two pages

The board cycles every 20 seconds. Past about eight tiles nothing on a 1080p
panel stays readable from four metres, so it rotates rather than shrinks.

**Today** leads with two daily numbers, side by side and given equal weight:

```
to sell per day    = (monthly sales target  − sold so far)     ÷ working days remaining
to invoice per day = (monthly revenue target − invoiced so far) ÷ working days remaining
```

They are **two different measures, not two views of one**, and that is why both
are on the wall. Work sold today is invoiced days or weeks later, so revenue
alone reports on quotes closed well before this morning — by the time it sags,
the sales week that caused it is already over. Selling is the half the room can
still act on today; invoicing is the half already committed. The gap between
them is the pipeline.

Each is recomputed every sync, so a big day visibly lowers tomorrow's bar and a
slow one raises it. That movement is the point; a static "1/20th of target"
figure doesn't change anyone's afternoon. Today counts as remaining — the crew
can still sell today.

Pace is measured against **working days elapsed, not calendar days**. Being
"80% through the month" means nothing if the days left are a long weekend.

Either target can be left unset. The board then blanks that number and says so,
rather than falling back to a figure nobody agreed to.

**Performance** carries the leaderboards: who has sold the most this month (by
value of quotes closed), top job types over 90 days, and top suburbs.

## Setup

### 1. Environment variables

Set these in Vercel (see `.env.example`):

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | the `advanced-calc` project |
| `SUPABASE_SERVICE_ROLE_KEY` | bypasses RLS — server-side only |
| `SCREEN_TOKEN` | `openssl rand -hex 32` |
| `CRON_SECRET` | the sync workflow sends it as a bearer token |
| `ST_CLIENT_ID` / `ST_CLIENT_SECRET` / `ST_APP_KEY` / `ST_TENANT_ID` | ServiceTitan — where each comes from is step 4 |

Until the ServiceTitan variables are set, the sync skips ServiceTitan cleanly and
the board runs on website leads alone — every ServiceTitan tile shows `—` with the
source marked `not-configured`. Next.js reads these at runtime, but a running
instance keeps the values it started with, so redeploy after adding them.

### 2. Database

`supabase/migrations/20260905000000_dashboard.sql` — already applied to
`advanced-calc`. Adds `portal_leads`, `portal_sync_state`, `st_jobs`,
`st_invoices`, `st_estimates`, `st_leads`, `portal_metrics_snapshot`. Existing
tables are untouched.

### 3. Revenue target and working calendar

The daily numbers need their monthly targets and a definition of a working day:

```sql
insert into portal_settings (key, value)
values ('dashboard', jsonb_build_object(
  -- What has to be invoiced in the month. Drives "to invoice per day".
  'revenueTargetMonthly', 240000,
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

**b. Client id and secret** — in ServiceTitan itself, not the portal:
**Settings → Integrations → API Application Access**. Find the app and generate
the credential pair. These are `ST_CLIENT_ID` and `ST_CLIENT_SECRET`, they are
issued **per tenant**, and **the secret is shown only once** — if it is not
recorded at that moment it has to be regenerated.

**c. Tenant id** — the numeric id on that same API Application Access page.
`ST_TENANT_ID` is always numeric; if what you have is a name, it is the wrong
field.

Scopes to tick, and what each one is holding up:

| API scope | Powers |
|---|---|
| Settings | business unit labels, sales leaderboard names |
| Job Planning & Management | jobs completed, jobs booked, job type labels |
| Accounting | revenue MTD, the daily number, job type profit |
| Sales & Estimates | quotes open, close rate, who sold the most |
| CRM | ServiceTitan lead counts |

A missing scope is the most common failure, and it surfaces as a bare `403` on
whichever call happens to run first — which is why the next step exists rather
than going straight to the backfill.

**d. Verify the link** before syncing anything:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.advancedgas.com.au/api/servicetitan/check
```

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

## Verify the ServiceTitan field mapping

The mappers in `src/lib/stSync.ts` read the fields ServiceTitan's export payloads
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

On a Vercel Pro plan, delete that workflow and put the schedule back in
`vercel.json`, which is more reliable:

```json
{ "crons": [{ "path": "/api/sync", "schedule": "*/10 * * * *" }] }
```

**One source per metric.** ServiceTitan owns leads, jobs, quotes and invoiced
revenue; Xero owns overdue debtors and receivables. They are deliberately not
cross-checked on screen — two tiles disagreeing about revenue is how a board
loses the room.

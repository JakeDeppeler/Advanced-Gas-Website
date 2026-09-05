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

## Setup

### 1. Environment variables

Set these in Vercel (see `.env.example`):

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | the `advanced-calc` project |
| `SUPABASE_SERVICE_ROLE_KEY` | bypasses RLS — server-side only |
| `SCREEN_TOKEN` | `openssl rand -hex 32` |
| `CRON_SECRET` | Vercel Cron sends it as a bearer token |
| `ST_CLIENT_ID` / `ST_CLIENT_SECRET` / `ST_APP_KEY` / `ST_TENANT_ID` | ServiceTitan |

Until the ServiceTitan variables are set, the sync skips ServiceTitan cleanly and
the board runs on website leads alone — every ServiceTitan tile shows `—` with the
source marked `not-configured`.

### 2. Database

`supabase/migrations/20260905000000_dashboard.sql` — already applied to
`advanced-calc`. Adds `portal_leads`, `portal_sync_state`, `st_jobs`,
`st_invoices`, `st_estimates`, `st_leads`, `portal_metrics_snapshot`. Existing
tables are untouched.

### 3. Revenue target

The hero tile's pace bar needs a monthly target:

```sql
insert into portal_settings (key, value)
values ('dashboard', '{"revenueTargetMonthly": 240000}'::jsonb)
on conflict (key) do update set value = excluded.value;
```

### 4. First sync

Run once with `?reset=1` to backfill from the start of ServiceTitan history:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.advancedgas.com.au/api/sync?reset=1"
```

The export endpoints are paged and each run is capped, so a large backfill takes
several invocations — the stored continuation token means each run resumes where
the last stopped. Re-run until every resource reports `exhausted: true`.

### 5. Point the TV at it

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

Known gaps to close once the payload is confirmed: jobs carry `businessUnitId` and
`jobTypeId` rather than names, and the service address lives on the location
record, so `business_unit`, `job_type`, `suburb` and `postcode` stay null until
those lookups are added.

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

**Cron frequency.** `vercel.json` schedules `/api/sync` every 10 minutes, which
needs a Vercel Pro plan. On Hobby, crons run daily — change the schedule or
trigger the endpoint from an external scheduler.

**One source per metric.** ServiceTitan owns leads, jobs, quotes and invoiced
revenue; Xero owns overdue debtors and receivables. They are deliberately not
cross-checked on screen — two tiles disagreeing about revenue is how a board
loses the room.

# Reece maX → ServiceTitan pricebook

Keeps the ServiceTitan pricebook's material costs in step with our Reece
contractor pricing, gives the office a Reece item search for quoting, and
receives maX PunchOut carts.

ServiceTitan's own Reece integration is for Reece's US business and is not
offered to Australian tenants. Reece's own API (docs.api.reecegroup.com.au)
is what this uses instead: Reece issues the app a client id and secret, and
every call names our account with a `Customer-Number` header.

## How it works

```
Reece price file (API, nightly) ──┐
Reece maX price file (upload) ────┼──> supplier_items ──plan/apply──> ServiceTitan pricebook
                                  │         │                          (materials, primary vendor = Reece)
                                  │         └──> /api/reece/search     (live Reece search when connected,
                                  │                                     the replica otherwise)
Reece PunchOut ──cart token──> reece_punchout_carts ──resolve──> ServiceTitan material ids
                                      └──/api/reece/order──> Reece order-gateway (preview / check / create)
Reece invoices (API, nightly) ──> reece_invoices
```

Two sources feed one table. The manual upload works with no credentials at all;
the API pull takes over the moment Reece's credentials are in, and nothing
downstream changes.

The pricebook sync is **plan, then apply**, and they are separate calls. A plan
reads the replica and the live pricebook, matches on Reece product code, and
lists exactly what it would write. An apply writes that list, one material at a
time, and **reads each one back**: ServiceTitan returns 200 for several fields it
silently ignores, so a successful HTTP status proves nothing. A read-back that
disagrees with what was sent is a failure in the report.

Matching key: the ServiceTitan material's **primary vendor supplier part number**
equals the Reece product id (with the vendor set to Reece). Materials that
predate the sync are also matched on their material code, with and without
`codePrefix`, and get the vendor link written on first apply.

## Setup

### 1. ServiceTitan: Pricebook scope on the existing dashboard app

This uses the **same app and credentials as the wall dashboard** — the
`ST_CLIENT_ID` / `ST_CLIENT_SECRET` / `ST_APP_KEY` / `ST_TENANT_ID` already set.
Do not register a second app. In the developer portal, open the dashboard app
under **My Apps → Edit**, tick **Pricebook** in API Scope with **write** access,
and save. The client id, secret and app key do not change. Then have the tenant
admin re-approve the app under **Settings → Integrations → API Application
Access** in ServiceTitan, because the scope set it was approved with has grown.
Confirm with the **ServiceTitan check** workflow: `pricebook/materials` should
show `ok` alongside the seven dashboard endpoints.

### 2. Pricing rules

The `pricebook` row in `portal_settings` (created by the migration):

```sql
update portal_settings set value = jsonb_build_object(
  'vendorName',    'Reece',      -- ServiceTitan vendor; created if missing
  'priceMode',     'cost-only',  -- 'cost-only' | 'markup'
  'markupPercent', 35,           -- markup mode: price = cost × 1.35
  'roundTo',       1,            -- round derived prices to whole dollars
  'createMissing', false,        -- create materials for Reece codes not in the pricebook
  'codePrefix',    'RE-'         -- material code prefix for created items
) where key = 'pricebook';
```

`cost-only` updates the vendor cost and leaves sell prices as the office set
them. `markup` also sets the sell price from cost. Leave `createMissing` off:
the full Reece catalogue is tens of thousands of lines, and the pricebook only
needs what gets quoted.

Once the real price file's headers are known, pin them so the parser stops
guessing:

```sql
update portal_settings set value = value || jsonb_build_object('fileColumns', jsonb_build_object(
  'code', 'Product Code', 'description', 'Product Description',
  'cost', 'Your Price (Ex GST)', 'gst', 'GST', 'uom', 'UOM'
)) where key = 'pricebook';
```

### 3. Load a price file

Download the price file from maX (save Excel exports as CSV), then dry-run the
import to see how the columns were read:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: text/csv" \
  --data-binary @reece-prices.csv \
  "https://www.advancedgas.com.au/api/reece/import?dryRun=1"
```

Check `columns`, `priceIncludedGst` and `sample`, then run again without
`dryRun=1` to store it. On Windows PowerShell use `curl.exe`, not `curl`.

### 4. Plan, then apply

Actions tab → **Pricebook sync** → Run workflow. Without *apply* ticked it is a
dry run and the summary page tables the planned changes. Tick *apply* to write
them; *limit* caps how many per run (default 100, which fits comfortably in the
function's time budget). Re-run until `remaining` is 0. The nightly schedule
only ever dry-runs.

Or directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.advancedgas.com.au/api/pricebook/sync"           # plan
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.advancedgas.com.au/api/pricebook/sync?apply=1"   # write
```

Every run, dry or applied, is a row in `pricebook_sync_runs` with its change
list, so "what changed and when" is a query, not a reconstruction.

### 5. Reece API credentials

Reece's API team issues a **client id and secret** per environment (test and
production are separate, with separate hosts). How the account is named on
each call depends on how Reece set us up:

- **Customer-Token (how Reece set us up in production, Oct 2026).** We sign in
  to maX once through Reece's onboarding page and Reece hands back a customer
  token. Once the keys below are in, **Settings › Integrations** shows a
  **Connect Reece** button on the Reece card (or open
  `https://www.advancedgas.com.au/api/reece/connect?k=<SCREEN_TOKEN>` in a
  browser). Sign in to maX with the account's login, pick the account, and you
  land back on Integrations via `/api/reece/callback`, which stores the token
  in `portal_integrations` (provider `reece`). The onboarding page is on
  `www.reece.com.au` (`stage.reece.com.au` for test), not the API host.
- **Customer-Number**, for a dedicated single-customer tool: Reece links our
  account number to the credentials and every call carries it. Set
  `REECE_CUSTOMER_NUMBER`. A stored customer token wins over it.

| Variable | Value |
|---|---|
| `REECE_CLIENT_ID` / `REECE_CLIENT_SECRET` | the issued credentials |
| `REECE_ENV` | `production` (default) or `test`, matching the credentials |
| `REECE_CUSTOMER_NUMBER` | only for the Customer-Number model |
| `REECE_PUNCHOUT_SECRET` | `openssl rand -hex 32`, see PunchOut below |
| `REECE_DOMAIN_KEY` | only if Reece's PunchOut "domain key" differs from the client id |

Then run **Reece check** from the Actions tab. It walks credentials → token →
customer identity → one call per capability (branches, search, price file,
invoices) and names what to fix at the first failure. A `price-file` stage
reading "no price file generated yet" is normal before step 6.

Until there are Reece prices in `supplier_items` (from the API or an upload),
the nightly pricebook sync reports *skipped* rather than planning against
nothing. Before that it went red every night from 2 October with nothing to
compare, and a failure that is always there is one nobody reads. A real
failure now prints the error body in the run log.

### 6. Price file from the API

Reece builds the price file on their side, so there are two one-off steps:

1. **Choose the price-file setting** in maX (Minimal / Typical / Complete).
   *Typical* is the right size: the popular products plus what we have bought
   in the last 12 months. *Complete* is the whole catalogue, which is far more
   than the pricebook needs and makes each nightly run slow.
2. Run **Pricebook sync** with *reset_catalogue* ticked, which asks Reece to
   generate the file. It is queued, so the first pull may report `pending`;
   the next nightly run picks it up.

From then on the nightly workflow fetches the current file, parses it through
the same column mapper as a manual upload (so `fileColumns` pinning applies),
and stores it in `supplier_items` with `source = 'api'`.

### 7. Item search

`GET /api/reece/search?q=copper%2020mm&k=<SCREEN_TOKEN>` (or the cron bearer).
Live Reece product search when connected (phrases of 3–30 characters, Reece's
limit; `page=` for more), otherwise the replica. Same response shape either way,
with our contractor price. This is the hook for a quoting tool.

### 8. PunchOut and ordering

Send the user to `https://www.advancedgas.com.au/api/reece/punchout/start?k=<SCREEN_TOKEN>`.
They land on Reece's site, build a cart, and Reece posts a cart token back to
`/api/reece/punchout`. That page fetches the cart with our credentials, stores
it in `reece_punchout_carts`, matches every line to a ServiceTitan material,
and shows the result with the cart id.

Placing the order is deliberate and separate, because it needs a branch, a
required-by time and a name:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://www.advancedgas.com.au/api/reece/order   # branch list
curl -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"cartId":"<id>","mode":"preview","orderByName":"Jake","orderByPhone":"+61 4…",
       "pickupBranch":3032,"requiredByDateTime":"2026-10-03T07:00:00","jobName":"ST 1234"}' \
  https://www.advancedgas.com.au/api/reece/order
```

`preview` prices it and `check` validates it, both without ordering. `create`
places it, and the cart row records Reece's order id so it cannot be placed
twice. A small office screen for this is the natural next step; the endpoint is
the part that had to exist first.

### 9. Invoices

The nightly workflow also pulls Reece tax invoices, credit notes and cash sales
for the last 35 days into `reece_invoices` (headers first, then the full
document with lines, totals and the PDF link). The 35-day window overlaps the
previous night, so a missed run loses nothing. Matching these to ServiceTitan
purchase orders is a follow-up; the data is there for it.

## Things worth knowing

**GST.** `supplier_items.cost` is ex-GST, and ServiceTitan adds tax at the
invoice line against the material's `taxable` flag. If the price file's price
column says "inc GST" in its header, the importer divides by 1.1 and says so in
its warnings. Check `priceIncludedGst` on the dry run.

**Never deactivates.** Materials attached to the Reece vendor whose code has
dropped out of the supplier file are listed under `missingInSupplier` and left
alone. A product Reece stops stocking may still be on an open estimate.

**Capped applies.** Vercel's function time budget is why an apply writes at most
`limit` changes. The plan is recomputed from the live pricebook each run, so
repeating until `remaining` is 0 is the whole procedure.

**Reece responses are mapped tolerantly.** The documented product shapes are
what `src/lib/pricebook/reece.ts` reads first, but the full record is kept in
`raw` on every table, so a field that turns out to live elsewhere is a mapper
fix, not a re-pull.

**Vendor.** The sync looks up the ServiceTitan vendor by `vendorName` and
creates it if absent. If the office already has a Reece vendor under a slightly
different name, set `vendorName` to that exact name before the first apply, or
the sync will create a second one.

## Labour pricing

Jake, 5 Nov 2026: installation is priced for two people (a tech and an
apprentice), fixing a problem for one. An install done in part of a day (a
split, a heat pump or split hot water, continuous flow, gas storage, a cooktop)
is at the **part-day** rate, $350, because the drive to the next job comes out
of it; the all-day jobs (multi-head, ducted, Dominator) are at the crew rate,
$310. A diagnostic is the standard call-out
($200): it's the customer's first contact and how the job is won. Servicing is
left at its own prices for the same reason, since it's where problems are
found. The figures are the portal's, on **Pricing & costs › Rates & pricing**
(`portal_settings.pricing`: `callout` $200, `solo` $250, `partDay` $350,
`hourly` $310, `install` $360 at the time), so changing one there and re-running is how the
pricebook follows it.

**Services.** Diagnostics become the call-out fee; repairs and installation
become their own ServiceTitan hours × their crew's rate. The list is by service
code in `src/lib/pricebook/labour.ts`; a service not on it is never touched,
and a listed hourly one with no hours is reported, not priced at $0.
Electrical connections stay the electrician's price. Removing the old unit
(*Equipment – Decommission & Disposal*) is the two-person rate.

**Nothing goes down, and linked materials are on top (Jake, 8 Nov).** The
first apply wrote nothing to 30 services: they were on ServiceTitan's
**Dynamic Pricing**, which priced every one at about $327 an hour and ignores
a price sent to it. At that rate repairs ($330), multi-heads, ducted and the
Dominator were already above the new figures, and the heat pumps' price
included their linked install materials. So a service's price is the larger
of: its labour plus the materials and equipment linked to it (at pricebook
prices); and what it charges today. "Today" for a dynamic service is the
rule's price, not the unused static one. Switching a service to a static
price in ServiceTitan forgets the rule's figure, so every run first records
the highest it has seen in `portal_settings.labour_price_floor`, seeded from
the 8 Nov dry run, and never goes under it. To let a price come down on
purpose, take that service out of the floor.

The pricebook API can't switch Dynamic Pricing off (its update has no
`useStaticPrices`), so that's done on each service in ServiceTitan. It only
needs doing where the new rates go higher than the rule: a service the rule
already prices at or above them counts as already right and stays on it,
which keeps it following its linked materials' prices. On 8 Nov that was 21
of 30; the 9 part-day installs are the ones the $350 rate lifts. A run that
hits a service still on the rule says so on the failed line.

**Refrigerant.** R410A and R32 were $0 a kg. Their cost and the markup live in
`portal_settings.refrigerant` (`perKg` by material code, `markupPct`), and the
services run sets each to cost + markup, to the dollar: $106 → $133 and
$109 → $136 at 25%, the median markup across our priced materials. A material's
cost only sticks in ServiceTitan through its supplier; the refrigerant has
none, so if the cost doesn't take, the run says so and the price still goes in.

**Templates.** The old layout priced the install line to cover labour and
materials, put the electrician beside it, and left the materials loose at $0.
Rebuilt, each split and multi-head template has one installation header (a
ServiceTitan item group) holding the electrical and every material at its
pricebook price.

- Splits: the labour is on the header, at the install service's hours × the
  part-day $350.
  Each offers add-ons for the office to tick on the day: removing the old
  unit, a condensate pump, Blygold, and a second coil of the template's own
  size for runs over 20 m.
- Hot water (heat pump, split, continuous flow, gas storage) and cooktops:
  the same, labour on the header at $350. This is what fixes the $0 install
  lines on the Continuous Flow and Thermann 135L templates.
- Multi-heads: a condenser goes out with two heads or five, so the labour
  isn't fixed. *Multi Head Labour (2 head)* to *(6 head)* go on as add-ons at
  hours × $310 and the office ticks the one the job needs, as with rebates.
- Ducted and the Dominator aren't rebuilt: they turn on the house's outlets,
  duct runs and zones, and get priced from the job's design instead.

A doubled install line or certificate comes off. Rebates, the unit, the
certificate and add-ons stay where they are. A template already grouped is
left alone.

Writing templates needs the app's **Estimate Templates** write scope
(`tn.sal.estimatetemplates:w`) in the developer portal, then re-approval in
ServiceTitan, as for the Pricebook scope above.

Actions → **Pricebook labour** → choose *services* or *templates*. Without
*apply* it's a dry run and the summary tables every change; with it, re-run
until `remaining` is 0. Each run is a row in `pricebook_sync_runs` with
`supplier` = `labour-services` or `labour-templates`. `npm run check:labour`
holds the rules.

## Quote wording

Jake, 6 Nov 2026: every template summary and service description reads the
same way. A summary says what the job is and what it involves, then the brand,
then how we install it (our own licensed team, the materials actually on the
template, pressure test and vacuum, sealed penetrations, the clean-up): that's
where a quote shows why we cost more than the cheapest one. Last, what's
included and what's quoted separately. It's all in
`src/lib/pricebook/wording.ts`.

- A template's facts come from its own lines, not its name: the size from the
  unit on it, internal or external from the heater, wifi from the unit. That's
  what stopped Kaden quotes saying Mitsubishi Electric and a 250L saying 160L.
- Product claims are the ones the old wording made, carried over. Anything new
  is in `NEW_CLAIMS` and gets checked before it goes on a quote.
- Removing the old unit is part of every install. The removal service is for a
  visit where nothing goes in. The $200 call-out covers the first hour.
- Servicing, leak detection, commercial and the deposit keep their wording.

**Internal gas heaters.** The Wombat, Compact Classic and StarPro were quoted
on *Gas Ducted Heater - External*, whose words put the heater outside. Jake,
6 Nov: an internal changeover is 3 hours. The *services* run creates *Gas
Ducted Heater - Internal* (`GAS-DUCT-INT`, 3 h at the part-day rate, $1,050,
with the external one's category, account and cost). The next *templates* run
swaps it onto those templates and does only that, because a new line has no id
to group under until it's saved; the run after groups it like the rest. Both
heater services head their templates like the hot water ones do.

Actions → **Pricebook labour** → *wording*: a dry run lists every change against
the live text; *apply* writes the service descriptions, the template summaries
and the description on each template line that uses a reworded service, and
reads each back. Template summaries need the Estimate Templates write scope.
`npm run check:wording` holds it.

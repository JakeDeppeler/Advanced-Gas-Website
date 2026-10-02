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

Reece's API team (ConnectingCustomers@reece.com.au) issues a **client id and
secret** per environment (test and production are separate, with separate
hosts) and links our **account number** to them. That is the whole handshake
for a single-customer tool: no per-user login, no refresh tokens.

| Variable | Value |
|---|---|
| `REECE_CLIENT_ID` / `REECE_CLIENT_SECRET` | the issued credentials |
| `REECE_CUSTOMER_NUMBER` | our Reece account number |
| `REECE_ENV` | `production` (default) or `test`, matching the credentials |
| `REECE_PUNCHOUT_SECRET` | `openssl rand -hex 32`, see PunchOut below |
| `REECE_DOMAIN_KEY` | only if Reece's PunchOut "domain key" differs from the client id |

Then run **Reece check** from the Actions tab. It walks credentials → token →
customer identity → one call per capability (branches, search, price file,
invoices) and names what to fix at the first failure. A `price-file` stage
reading "no price file generated yet" is normal before step 6.

If Reece instead sets us up as a *platform* (the `Customer-Token` model), open
`https://www.advancedgas.com.au/api/reece/connect?k=<SCREEN_TOKEN>` once in a
browser with the maX login; the resulting token is stored in
`portal_integrations` and used instead of the customer number.

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

# Reece maX → ServiceTitan pricebook

Keeps the ServiceTitan pricebook's material costs in step with our Reece
contractor pricing, gives the office a Reece item search for quoting, and
receives maX PunchOut carts.

ServiceTitan's own Reece integration is for Reece's US business and is not
offered to Australian tenants, and Reece maX has no self-serve API. Reece issues
API access to the *software vendor* and the contractor authorises it from a maX
login, so this app is registered with Reece as that vendor.

## How it works

```
Reece maX price file ──upload──┐
                               ├──> supplier_items ──plan/apply──> ServiceTitan pricebook
Reece maX catalogue API ───────┘         │                          (materials, primary vendor = Reece)
  (nightly, once connected)              └──> /api/reece/search   (quoting lookup)

Reece maX PunchOut ──webhook──> reece_punchout_carts ──resolve──> ServiceTitan material ids
```

Two sources feed one table. The price file works today; the catalogue API takes
over the moment Reece's credentials are in, and nothing downstream changes.

The pricebook sync is **plan, then apply**, and they are separate calls. A plan
reads the replica and the live pricebook, matches on Reece product code, and
lists exactly what it would write. An apply writes that list, one material at a
time, and **reads each one back**: ServiceTitan returns 200 for several fields it
silently ignores, so a successful HTTP status proves nothing. A read-back that
disagrees with what was sent is a failure in the report.

Matching key: the ServiceTitan material's **primary vendor supplier part number**
equals the Reece code (with the vendor set to Reece). Materials that predate the
sync are also matched on their material code, with and without `codePrefix`, and
get the vendor link written on first apply.

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

### 5. Reece maX API (when Reece issues credentials)

Ask Reece (maxsupport@reece.com.au, or via the maX integrations page) to
register the Advanced Gas website as an integration partner, naming the three
capabilities: catalogue and contractor-pricing pull, item search, and PunchOut.
They will issue OAuth client credentials and partner documentation. From that:

| Variable | From |
|---|---|
| `REECE_CLIENT_ID` / `REECE_CLIENT_SECRET` | the issued credentials |
| `REECE_AUTHORIZE_URL` / `REECE_TOKEN_URL` | the OAuth endpoints in the docs |
| `REECE_API_BASE` | the API host |
| `REECE_SCOPES` | if the docs list scopes |
| `REECE_CATALOGUE_PATH` / `REECE_SEARCH_PATH` | the catalogue list and search endpoints — the defaults are placeholders |
| `REECE_PUNCHOUT_SECRET` | the shared secret for the PunchOut webhook |
| `REECE_REDIRECT_URI` | leave unset; defaults to `<site>/api/reece/callback`, which is what to register with Reece |

Then, in a browser with the maX login: `https://www.advancedgas.com.au/api/reece/connect?k=<SCREEN_TOKEN>`.
Tokens land in `portal_integrations` under `reece`, and the nightly workflow
starts pulling the catalogue (paged; the first full pull takes a few runs).

The response-shape normalisers in `src/lib/pricebook/reece.ts` cover the field names
seen across Reece's partner integrations. Tighten them to the documented names
once the docs are in hand — the first catalogue run's `supplier_items.raw`
column shows exactly what Reece sent.

Unlike Xero, this app owns the Reece connection, so it refreshes the token
itself.

### 6. Item search

`GET /api/reece/search?q=copper%2020mm&k=<SCREEN_TOKEN>` (or the cron bearer).
Live maX search when connected, otherwise the replica; same response either
way, with our contractor price. This is the hook for a quoting tool.

### 7. PunchOut

Register `https://www.advancedgas.com.au/api/reece/punchout` with Reece as the
PunchOut return URL and set `REECE_PUNCHOUT_SECRET` to the shared secret. The
receiver accepts the secret as a bearer token or as an HMAC-SHA256 signature of
the body — whichever Reece's docs specify. Carts are stored verbatim in
`reece_punchout_carts` and each line resolved to a ServiceTitan material id.

Creating the ServiceTitan purchase order from a resolved cart is the next step
and is not built: a PO needs a business unit and a job or inventory location,
which is a choice for whoever built the cart, so it wants a small screen rather
than a guess.

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

**Vendor.** The sync looks up the ServiceTitan vendor by `vendorName` and
creates it if absent. If the office already has a Reece vendor under a slightly
different name, set `vendorName` to that exact name before the first apply, or
the sync will create a second one.

# AGA Team Portal: make the new design the live portal

Work in the **advanced-calc** repo. It serves advancedgas.com.au, and the website and the portal are the same app on the same Supabase project (also called advanced-calc). This file and `portal-prototype.html` should sit in `docs/portal-new/`.

## What this is

The portal at advancedgas.com.au/portal currently has the original version plus a "try the new version" button. The new design has been finished as a clickable prototype (`portal-prototype.html`, one self-contained file, sample figures only). The job is to make that design **the** portal: replace both current versions, keep everything that already works underneath (logins, ServiceTitan sync, Xero connection, the TV board pairing, leads, blog), and wire each screen to the real data that already exists.

The point of the portal: show a trades business its real numbers (margin, overheads, cash, who is making money and who isn't) that ServiceTitan and Xero make hard to see. It is built for AGA first and will be rolled out to other trade businesses later, so business name, logo, and "what the business has" (wall board, vans, iPad, real estate agents) are settings, not hard-coded.

## Where things already live (checked, don't rebuild)

The Supabase project is **advanced-calc** (`pfvibwgusbfnjopqiszg`). Every table has RLS on. `portal_users` has 1 admin and 8 members with `role` and `caps`.

| Already working | Tables / keys |
|---|---|
| ServiceTitan sync, runs about every 10 min, all resources up to date | `st_jobs`, `st_invoices` (+ `st_invoices_billed`), `st_estimates`, `st_payments`, `st_calls`, `st_timesheets`, `st_technicians`, `st_employees`, `st_job_types`, `st_business_units`, `st_locations`, `st_customer_contacts`, `st_location_contacts`, `st_leads`, `st_journal_entries`; progress in `portal_sync_state` |
| Xero connected (Advanced Gas & Air Conditioning Services Pty Ltd), token refresh in place | `portal_integrations`; Xero account mapping in `portal_settings.capacity.xeroMap` |
| Rolled-up numbers | `portal_metrics_snapshot` (metrics + sources json), `monthly_actuals` |
| Staff, wages, hours, leave | `portal_users` (wage, hrs_week, leave/ph/sick/rdo days, travel/admin/office hrs, level, own_van, rate_override, callback_pct), `portal_leave`, `portal_timesheets`, `portal_reviews`, `portal_goals`, `portal_reports` |
| Vans | `portal_vehicles`, `portal_vehicle_logs`, `portal_van_checks`, `portal_van_photos`, `portal_van_tools` |
| Stock and orders | `portal_stock_items`, `portal_stock_moves`, `portal_part_orders`, `supplier_items`, `portal_supplier_priority`, Reece tables, `pricebook_sync_runs` |
| Quotes follow-up | `portal_quotes`, `portal_quote_follow`, `portal_quote_touches` |
| To-do, contacts, plans | `portal_todos`, `portal_contacts`, `portal_contact_touches`, `portal_plans` |
| Marketing and website | `portal_leads`, `portal_campaigns`, `portal_posts`, `portal_brand_assets`, `portal_page_views`, `portal_email_optouts` |
| How we work | `portal_sops`, `portal_handbook_topics`, `portal_videos`, `portal_video_watches`, `portal_take5` |
| Wall board / TV | `portal_settings` keys `board-pairing`, `board-remote`, `board-remote-live`, `board-sounds`; route `/tv` |
| Settings | `portal_settings` keys `capacity`, `dashboard`, `yeargoal`, `pricebook`, `report:*` |

## Step 1: look before changing anything

1. Find how `/portal` decides between the original and the new version (the toggle/button), and list the current portal routes and components.
2. Note the framework, styling approach, and how the portal reads Supabase (client vs server, which helpers).
3. Report back a short plan before editing: which existing components become which prototype screens, and anything in the current portal that the prototype doesn't cover (don't drop working features silently, list them).

## Step 2: replace the shell

- The new design becomes the only portal at `/portal`. Remove the version toggle. Keep the old one reachable at `/portal/classic` for admins only for two weeks, then delete it in a follow-up.
- Port the prototype's look exactly: neutral greys, red = bad, green = good, blue only for the page you're on, grey sidebar icons with colour only on the open section, small text, no em-dashes in copy. Light/dark theme toggle as in the prototype.
- Sidebar is the navigation. **No section tab rows inside pages**; pages only keep true sub-tabs (Cash flow / Cash to operate, Owed to us Real estate / Domestic, a person's file tabs, call booking period, etc.). Sidebar shows counts beside pages (red when something's wrong). The sidebar minimises to icons with « / », remembers that per user, and clicking a minimised icon goes to that section's first page and opens a flyout of its pages. Page title is the page name.
- Port the prototype as real components in the repo's framework; don't ship the prototype file itself, and don't keep localStorage as the source of truth (it's fine for per-user conveniences like the minimised sidebar and theme).

## Step 3: wire each screen to real data

The prototype keeps its state in these localStorage keys; each becomes real data:

| Prototype key | What it holds | Goes to |
|---|---|---|
| `aga-portal-our-numbers-v3` | year goal by month, GM/overhead/NP goals, team & wages, costs, rates, commission | `portal_settings.yeargoal`, `capacity`, `portal_users` wage fields; commission into `portal_settings.dashboard` (see rules) |
| `aga-portal-settings-v1` | business name/badge, what the business has, start page, notifications, theme | `portal_settings` key `business` (new), notifications per user |
| `aga-portal-todo-v5` | today's tasks, keep-in-touch contacts, ideas | `portal_todos`, `portal_contacts` + `portal_contact_touches`, `portal_plans` |
| `aga-portal-crew-v2` | people, levels, licences, expectations, goals, reviews, notes, leave, commission history; vans; stock; orders; tools; "from the crew" | `portal_users`, `portal_goals`, `portal_reviews`, `portal_reports`, `portal_leave`, vehicle/stock/order/tool tables |
| `aga-portal-quotes-v1`, `aga-portal-mix-v1` | quotes to chase, job mix | `st_estimates` + `portal_quote_follow`/`touches`; `yeargoal.mix` |
| `aga-portal-mkt-v1` | campaigns, blog, reviews, social, brand | `portal_campaigns`, `portal_posts`, `portal_brand_assets`, `portal_leads`, `portal_page_views` |
| `aga-portal-more-v1` | customer chats, pricebook, sites, handbook, procedures, videos, notifications, connections, access | `st_*` customers/locations, `supplier_items`, `portal_handbook_topics`, `portal_sops`, `portal_videos`, `portal_integrations`, `portal_users.caps` |
| `aga-portal-grow-v2`, `aga-portal-future-v1` | Future sliders (add a person, hybrid vs diesel, win more quotes, raise our rate) | per-user saved scenario in `portal_settings` key `future:<user>`; maths runs off real wages/overheads |
| wall board (`W`, IndexedDB `aga-sounds`) | screens, targets, sounds | existing `board-*` settings and `/tv`; uploaded sounds to Supabase Storage |

Where numbers come from:

- **Sales, invoiced, jobs, quotes, win rate, average job**: `st_estimates` (sold_on, sold_by, total), `st_invoices` (invoiced_on, total, cost, items_cost, sold_hours), `st_jobs`.
- **Owed to us / days to get paid**: `st_invoices.balance` and `due_date`, `st_payments`; Real estate vs Domestic split by customer type or business unit (confirm which with Jake).
- **P&L, spending by category then bills, we owe, cash**: Xero (P&L, bank, bills, aged payables) through the existing token; `portal_payables` for manual items.
- **Call booking rate**: `st_calls` (direction, outcome) against booked jobs.
- **Revenue per van per day**: `st_invoices` by tech (via jobs/timesheets) and `portal_vehicles.assigned_to`, divided by days worked from `st_timesheets`.
- **Drive time per person**: `st_timesheets` dispatched_on → arrived_on (driving) vs arrived_on → done_on (on the tools).
- **Labour cost, true hourly cost, billable %**: `portal_users` wage/hours fields plus `capacity.onCosts`.
- **Wall board live alerts (Sold / New quote / Job completed)**: new `st_estimates.sold_on`, new estimates, `st_jobs.completed_on` since the last sync.

New tables or columns needed (write migrations, RLS on, same pattern as existing tables):

- `portal_commission` (user_id, month, sold, target, rate, bonus, saved_at): written once a month closes or the target is hit, shown on the person's file.
- `portal_certs` (job_id, kind, due_on, lodged_on, number): compliance certificate 5-day clock.
- `portal_contacts`: add `role`, `looks_after`, `history`, `matters`, `decides` (the "What we know" fields) and allow kind = manager.
- `portal_sops`: the prototype has the full system (11 sections, 57 procedures with code, who, when, where, number, steps). Seed it from the prototype's `SYS` data; it's editable in the portal after that.

## Rules to keep

- **Benchmarks are fixed in code** (GM 40–60%, overheads 10–15%, net profit 15–25%, labour 20–24%, revenue per tech ~$155K median / $210K top, close rate above 70% means underpricing, 2 months of payroll in cash, drive time band). They are shown, never editable in the portal.
- **Commission**: one rule for everyone. Hit the month target (set in Settings, default $25,000 sold) and the bonus is 5% of everything sold that month, not just the part over. This replaces the tiered `dashboard.commissionTiers` (3/5/7%); confirm with Jake before removing the tiers. Bonuses save to the person's file. The wall board shows distance to target, never dollar amounts.
- **Who sees what**: wages, commission dollars, P&L and Xero pages are admin only; a member sees their own file and commission. Enforce in RLS, not just the UI.
- **Settings decide what shows**: if the business has no wall board, the Wall board section disappears and its routes redirect home; no vans hides Vehicles/Per van/Drive time; no agents hides the Real estate split.
- **Sample data**: anything published outside the repo (screenshots, demos, artifacts) uses sample names (Jake, Kim, Sam, Mia, Leo, Dan, Ava, Tom) and sample figures, never AGA's real numbers.
- Never enter or store anyone's ServiceTitan/Xero passwords; use the existing OAuth/API connections.

## Order of work (ship each as its own PR)

1. Shell: sidebar, theme, routing, minimise/flyout, Home, Settings (business + what the business has). Old portal moved to `/portal/classic`.
2. Run the company (Today with call booking, KPIs with benchmarks, Sales, Jobs with cert clock, Team, Pace) and Our numbers.
3. Profit & finance from Xero + ServiceTitan (Overview, P&L, Cash flow + Cash to operate, Owed to us with Real estate/Domestic, We owe, Spending drill-down, Profit on every job, Year goal).
4. Crew & vans (Team with person files, Vehicles, Supply, Tools, From the crew, Per van per day, Drive time) and commission.
5. Wall board (remote, six screens, targets & commission blocks, sounds upload, live alerts) on the existing `/tv` pairing.
6. To-do (Today, Keep in touch, Ideas & planning), Future, Customers & sales, Marketing, How we work (Scorecard, The system, Handbook, Learning), You & settings (My file, Notifications, Connections, Admin).

## Done means

- `/portal` shows only the new design; no version toggle; every sidebar page loads real data with no console errors.
- Works at phone width (400px) with no sideways scroll, and on the office TV at `/tv`.
- Numbers on Home, KPIs and Pace match ServiceTitan for the same date range (spot-check three).
- A member account can't read wages, other people's commission or Xero data (test with RLS, not just hidden buttons).
- Tests or a checklist run per PR; screenshots for Jake use sample data.

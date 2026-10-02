# Trade portal

What a tradesman sees on the iPad in the van, at `/trade`. Same sign-in as the
office portal, same database, same content — a second shell over the same
business, not a second application.

| | |
|---|---|
| Built for | iPad landscape, 1180 × 820 |
| Also works at | 390 × 844 — the rail becomes a bottom tab bar and the columns stack |
| Sign-in | the `ag_portal` cookie, gated in `src/middleware.ts` alongside `/portal` |
| Who gets it | anyone signed in. Every screen shows that person's own work and shared content; nothing on it is capability-gated |
| Way in | the "Trade portal" card on the office portal's home, under *On the job* |
| Way back | the **Office** link at the foot of the rail, shown only to someone the office portal would let in |

## The screens

| | Reads | Writes |
|---|---|---|
| **Home** | the week's four Monday jobs, your van, your goals, the newest entry in the procedure change log | — |
| **Monday van jobs** | `portal_van_checks` (weekly + stock), `portal_van_photos`, the last km reading | the weekly check sheet, the stock count, a `reading` log, walk-around photos |
| **My van** | the van signed to you, its logs and its checks | a service request or a damage report, as a log entry |
| **Pricebook** | the product catalogue, joined to the published price tiers | — |
| **Job calculator** | the crew's costed charge-out rates | — |
| **Tools** | the same four calculators the public site renders | — |
| **Processes** | `SOPS` | — |
| **Handbook** | `HANDBOOK` | — |
| **Videos** | `VIDEOS`, `LEARNING_TRACKS` | — |
| **Prices & info** | `INFO_SECTIONS` | — |
| **My file** | your costing, expectations, goals and reviews | — |
| **Notifications** | `listNotices`, the same derived list the office portal shows | — |

One manual, read from one place. A procedure that said one thing on the wall
and another in the van would be worse than no portal at all, so Processes,
Handbook, Videos and Prices & info all read the same modules `/portal` reads,
and the handful of procedures whose `doIt` points at an office page are mapped
to the trade equivalent rather than forked (`TRADE_DO_IT` in
`src/app/trade/processes/page.tsx`).

## Monday van jobs

Four steps over three records that already existed, so a check done on the iPad
is the same check the office fleet page sees:

| Step | Where it lands |
|---|---|
| Van wash & photos | the weekly check sheet, plus six photos keyed `walkaround\|<angle>` |
| Vehicle check | the same weekly sheet — `WEEKLY_CHECK`, eleven lines |
| Stock count | the stock sheet — `VAN_STOCK`, sixty lines over nine groups |
| Km reading | a `reading` entry in the van's log |

Each step commits as it is finished rather than everything landing at the end: a
tech who takes the photos and then gets called to a job keeps the photos. The
photos go up one at a time as they are taken, because a van behind a factory in
Pakenham has one bar of signal and six at once is what fails.

The two steps that share the weekly sheet merge into the one row via
`updateVanCheck`, and only while it is still *this week's* row — so the original
rule holds: a bad morning can't be quietly edited away later.

The pure logic is `src/components/portal/mondayJobs.ts`; the server read is
`src/lib/portal/monday.ts`. Both are covered by `npm run check:trade`.

## Prices that are real, and the ones that aren't

**Every figure in the pricebook is one the website already quotes.** The product
catalogue holds specs, not money — `installedPriceFrom` is empty on all 100
models — so the prices come from the published tiers on the service pages
(`serviceContent.ts`), which is what a customer reads on advancedgas.com.au.

A card shows a price only where a tier identifies that exact model: by its code
or family name, its size to one decimal, its tank in litres, or its head count.
Everything else says **Priced on site**, with the shelf's tiers above the cards
as what we quote from. The matcher was wrong three times before it was right —
a 2.5 kW tier on a 3.5 kW unit, the Wombat's price on a Buffalo, the two-head
price on a six-head system — and each of those is a job quoted at the wrong
number by somebody with no reason to doubt the screen. `scripts/check-trade.ts`
holds a case for each.

Fourteen of about a hundred models carry a matched price today. **Hot water heat
pumps carry none**: there is no published installed price for them anywhere in
this repo, and the design's figures for them exist only in the design.

## What the design has that this doesn't

Each of these needs something the business doesn't record yet, and each is left
out and said plainly on the screen rather than drawn as an empty control.

- **A per-week price.** The design's "or $xx/wk" is computed at 9.99% over 60
  months and labelled "sample terms" in the design itself. There is no finance
  product configured, so no weekly figure is shown.
- **Send the customer their quote link.** `advancedgas.com.au/q/[id]` needs a
  quote store, a public page and an SMS/email sender. Quotes still go out of
  ServiceTitan; the pricebook says so.
- **Ask for leave.** Nothing stores a leave request and nothing in the office
  shows one, so My file states the entitlements and says to ring Kellie
  instead of filing a request nobody would read.
- **Suggest a video / suggest a change.** Same reasoning: Videos names who to
  ask, and Processes links C6, which is the procedure for changing a procedure.
- **A margin warning on the job calculator.** It turns red on a loss, which is
  arithmetic. It has no amber, because no target margin is recorded anywhere —
  "2% left" and "40% left" are drawn the same. Record a target and it can.
- **Safety and asbestos procedures.** The design's Processes screen carries two
  sections (C Safety, D Asbestos) the manual doesn't have. Those are not
  invented here: `SOPS` is what the team agreed at the training day, and
  procedures people follow on a roof are not something to author from a mock.

## Checking it

```
npm run check:trade      # 82 assertions: the week boundary, the four steps, tier matching
npx tsc --noEmit
npx next build
```

Anything that renders gets rendered and looked at, at **both** 1180 × 820 and
390 × 844. That pass caught, among others: the public site's header sitting
above the whole portal, a km chart of four near-identical bars (it now charts
distance driven, which has shape), four fact tiles wrapping every value onto two
lines, a save button parked under the phone's tab bar, and the stock count's
"not counted" dash reading as a third button between the − and the +.

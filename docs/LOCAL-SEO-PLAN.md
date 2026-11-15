# Local SEO plan

What it takes to rank first for searches like *aircon installation Pakenham*,
*split system Berwick*, *gas ducted heating Officer*, *hot water Cranbourne*,
*heat pump rebate Pakenham* and *air conditioning service Narre Warren*.

This is the to-do list. The reasoning behind it is in
[`keywords.md` Part 3](keywords.md#part-3--how-we-actually-get-to-number-one),
and the keywords to track (and how to set the tracker up) are in
[`keyword-tracking.md`](keyword-tracking.md). Read Part 3 once and you'll see
why most of this list is off the website.

---

## The short version

A search like *split system Berwick* on a phone shows a **map pack** (three
businesses with pins) above the ordinary results. The map pack gets most of
the calls, and three things decide who's in it:

| Factor | What it means | Can we move it? |
|---|---|---|
| **Distance** | How far the business address is from the person searching | No. Pakenham is where we are. It's why Berwick is harder than Officer, and Narre Warren harder again. |
| **Relevance** | Whether the Google profile says we do the thing searched for: categories, services, and the words in reviews | Yes, in an afternoon |
| **Prominence** | Number of reviews and how recent they are, links to the site, mentions of the business elsewhere | Yes, slowly, and it never stops |

The ordinary results underneath are decided by the website: whether Google has
indexed the page, whether the page is genuinely about that job in that suburb,
and how many other sites link to ours.

**Nothing on the website moves the map pack much, and no single change
guarantees a ranking.** The site work done alongside this plan (below) makes
the pages easier for Google to read and better connected. Reviews, the Google
profile and links are what turn that into rankings.

---

## This week

In order. The first item probably matters more than everything else here put
together.

### 1. Merge the two Google listings

Google shows **two profiles** for the business (both read off Google for
`src/lib/reviews.ts` on 11 Oct 2026):

- "Advanced Gas & Air Conditioning Services Pty Ltd": 4.6 from 11 reviews
- "Advanced Gas and Air Con Services": 5.0 from 15 reviews

Two listings at one address split the reviews between them (26 reviews
counts for more than 15), confuse Google about which one is real, and can get
both of them filtered out of the map pack. Fix:

1. Sign in to Business Profile with the account that owns the better one
   (likely the 15-review one). Check you own or manage both.
2. Google Business Profile Help → Contact us → "Duplicate listing" (or
   *Suggest an edit → Close or remove → Duplicate* on the weaker one from
   Maps). Ask for the duplicate to be **merged** into the main one so its
   reviews come across. Reviews only carry over if Google support does the
   merge, so ask for that.
3. Once it's done, update `RATING_SUMMARY` in `src/lib/reviews.ts` to the
   merged totals. Never round up.

### 2. Settle one business name and use it everywhere

The site says **Advanced Gas & Aircon**, the legal name is **Advanced Gas &
Airconditioning Services Pty Ltd**, and the two Google listings use two more
names. Google wants the profile name to be the name on the van, the signage
and the invoices, with no keywords added. ("Advanced Gas – Aircon Pakenham"
is the kind of name that gets a profile suspended.) Pick the name the
customer sees, and use it everywhere: the Google profile, every listing below,
and the site.

The exact details for every listing, copied from `src/lib/site.ts`:

```
Advanced Gas & Aircon
1 Sierra Circuit, Pakenham VIC 3810
(03) 5947 8000
https://www.advancedgas.com.au
admin@advancedgas.com.au
Mon–Fri 7:00am–3:30pm
ABN 35 607 575 280
```

If you choose a different name, change `site.name` as well, so the site and
the listings stay identical. Use the **same phone number everywhere**. A
tracking number on one directory and the main number on another counts
against us.

### 3. Fix the Google profile

- **Primary category**: *Air conditioning contractor* or *HVAC contractor*,
  whichever brings in more of the work you want. The primary category counts
  for more than everything else on the profile. If heat pump hot water is
  where the margin is, consider *Plumber* or a hot water category as primary
  instead, and give it six weeks before judging.
- **Additional categories** (up to 9; pick from Google's list, and use these
  exact names where offered): HVAC contractor · Air conditioning contractor ·
  Air conditioning repair service · Heating contractor · Plumber · Gas
  installation service · Water heater installation service / Hot water system
  supplier · Air conditioning system supplier. Add a category only for work
  we actually do.
- **Service area**: list the suburbs with pages on the site, nearest first.
  Google allows 20; start with Pakenham, Officer, Beaconsfield, Berwick, Narre
  Warren, Cranbourne, Clyde North, Officer South, Pakenham Upper, Nar Nar
  Goon, Koo Wee Rup, Cardinia, Narre Warren South, Hampton Park, Lynbrook,
  Cranbourne East, Cranbourne North, Clyde, Drouin, Emerald.
- **Address**: if customers don't come to Sierra Circuit, Google's rules say
  hide the address and run it as a service-area business. If they do (pickups,
  counter), show it. Pick one honestly. Getting it wrong can suspend the
  listing.
- **Hours**: Mon–Fri 7:00–3:30, matching the site. Don't set 24 hours for the
  after-hours line unless a person always answers it.
- **Services**: add each one with a two-line description in plain words.
  Split system installation, ducted air conditioning, multi-head, evaporative
  cooling, aircon servicing and repairs, heat pump hot water (VEU rebate),
  gas ducted heating, continuous flow gas hot water, gas heater service and
  carbon monoxide test, temporary hot water hire. These are the same jobs the
  site has pages for, so link each one to its page.
- **Website link**: `https://www.advancedgas.com.au/`. Also add a *Book* or
  *Quote* link to `https://www.advancedgas.com.au/quote`.
- **Description**: 750 characters on who you are, how long you've worked the
  area, licences (Plumbing Licence 46828, ARC AU59557) and the 6-year
  workmanship warranty. No keyword lists.
- **Photos**: 10 real job photos to start (see *Photos* under Ongoing).

### 4. Two suburb testimonials need checking

`src/lib/suburbs.ts` prints a testimonial on seven suburb pages. Five match
reviews in `reviews.ts`, which is sourced from Google. **Ange P. (Belgrave)**
and **Marcus L. (Ferntree Gully)** aren't in that list. If they're real
reviews or customers who agreed to be quoted, add them to `reviews.ts`. If
not, delete them. A made-up testimonial is a fake review, and that rule
covers the whole site (see `docs/suburb-notes.md`).

### 5. Search Console

- Confirm the property is verified and the sitemap
  (`https://www.advancedgas.com.au/sitemap.xml`) is submitted and reads
  "Success".
- **Pages report**: write down how many pages are indexed today. August's
  crawl had 7 of 406. Note how many sit in *Discovered, currently not indexed*
  (fixed by links and reviews) and how many in *Crawled, currently not
  indexed* (fixed by the page itself).
- Use **URL inspection → Request indexing** on, at most, a few a day:
  `/`, `/services/air-conditioning-installation`,
  `/services/heat-pump-installation`, `/services/gas-plumbing`,
  `/services/aircon-servicing-repairs`, `/rebates`, `/areas/pakenham`,
  `/areas/officer`, `/areas/berwick`, `/areas/cranbourne`,
  `/areas/narre-warren`.
- Once this branch is live, run the
  [Rich Results Test](https://search.google.com/test/rich-results) on the
  homepage and `/areas/berwick` and check it finds the business, the
  breadcrumb and the Service.

---

## This month

### Ask for a review after every job

Review count and recency is the biggest factor we control. Today it's 26
reviews across two listings.

- **Get the review link**: Business Profile → *Ask for reviews* → copy the
  short link. That link goes straight to the stars.
- **Send it from ServiceTitan when the job is marked complete**, every job:
  installs, services, repairs. If the plan includes ServiceTitan's
  review-request texts, switch them on and paste in the link. If it doesn't,
  set up a job-complete SMS template with the link, or have the tech text it
  from the van before leaving. The ask works best within an hour of finishing,
  while the customer is still pleased.
- **Wording that works**: "Thanks for having us today. If you've got a
  minute, a Google review helps a small local business more than you'd think:
  \<link\>. Saying what we did and which suburb you're in helps other people
  find us." Asking them to mention the job and suburb is allowed and helps
  relevance. Writing the review for them is not.
- **Ask everyone.** Sending the link only to customers you expect to be happy
  ("review gating") is against Google's rules. The site already shows only 4-
  and 5-star reviews (`MIN_PUBLISHED_RATING`), and that's fine on our own
  site. The request itself has to go to everyone.
- **Never offer anything for a review**: no discount, no draw entry.
- **Reply to every review within two days**, good and bad. Thank them by
  first name and mention the job ("Glad the Reclaim's running quiet in
  Officer"). Answer a bad one once, calmly and briefly, and offer to fix it
  offline. Future customers read the reply more closely than the complaint.

**Targets.** Check the review counts of the three businesses in the map pack
for *aircon Pakenham* and *hot water Pakenham* today, and write them here:

| | Today | 3 months | 12 months |
|---|---|---|---|
| Our reviews (merged) | 26 | 45 | 100 |
| New reviews per month | — | 6+ | 6–8 |
| Days since the last review | — | under 14 | under 14 |
| Top map-pack competitor | _fill in_ | | |

Six a month is roughly one in every five or six completed jobs. Recency
matters as much as the total: a steady trickle beats a burst followed by
silence.

### Citations: same details on the directories that matter

Each listing should carry the exact details from *This week, step 2*. Do the
big ones properly before chasing a long tail:

1. **Apple Business Connect** (Apple Maps and Siri): free, often forgotten,
   and every iPhone uses it.
2. **Bing Places**: import from the Google profile once it's merged.
3. **Facebook page**: `site.social.facebook` in `src/lib/site.ts` is empty.
   If there's a page, add its URL there and the site's structured data picks
   it up. If not, make a basic one.
4. **Yellow Pages (yellow.com.au)**, **True Local**, **Localsearch**,
   **Hotfrog**, **StartLocal**, **Yelp AU**.
5. **hipages**, **ServiceSeeking**, **Oneflare**, **Word of Mouth**: lead
   sites, but a complete free profile still counts as a citation, and their
   reviews show up in search.
6. **Licence registers** (these come with the licences): check that the VBA
   practitioner register (Plumbing Licence 46828) and the ARC licence lookup
   (AU59557) show the same business name and phone.

Keep a sheet with each site, the login and the date you checked it. A
directory with an old phone number does more harm than having no listing, so
fix or delete those as you find them.

### Links from people we already work with

One link from a real local or trade site is worth more than fifty directory
entries.

- **Manufacturer installer finders.** Ask each brand to list us with a link
  to the matching brand page on our site: Mitsubishi Electric (dealer locator,
  link to `/brands/mitsubishi-electric`), Reclaim Energy (installer finder,
  `/brands/reclaim`), Brivis (`/brands/brivis`), Kaden (`/brands/kaden`),
  Thermann (`/brands/thermann`), iStore (`/brands/istore`), Zonemate
  (`/brands/zonemate`). Ask the rep. These lists usually depend on volume or
  accreditation, so ask what it takes.
- **Suppliers.** Reece and the other wholesalers sometimes run trade-customer
  showcases or case studies. Offer a job write-up with photos.
- **Rebates.** If we're an authorised provider for Solar Victoria's hot water
  rebate, get onto their provider list (a .vic.gov.au link). For VEU, ask our
  accredited provider whether they list installers.
- **Local clubs and schools.** `suburbs.ts` says we sponsor the Pakenham
  Bombers. Ask the club to link our name on the sponsors page to
  `/areas/pakenham`. Do the same for any other club, school fete or community
  event we put money into.
- **Council and business networks.** Cardinia Shire and City of Casey both
  run local business networks and directories. Join the one for where the
  workshop is (Cardinia), and list the business wherever members get a
  profile.
- **Trade associations.** If we're members of Master Plumbers (Victoria),
  AIRAH or similar, make sure the member directory links to the site.

**Don't buy links**, and don't pay anyone who sells "100 backlinks". Google
discounts them at best, and at worst penalises the site.

---

## Ongoing

### Every week: one Google post, one job photo

- **One post a week** on the Google profile. A finished job with a photo and
  two lines: what it was, which suburb, what changed for the customer ("Old
  Rinnai out, Reclaim heat pump in, Cameron Park, Pakenham. VEU rebate off
  the quote."). Posts fade after about a week, so keep it regular rather than
  long.
- **Photos.** Real job photos, taken on the day, a few a week. Outdoor units,
  neat pipework, controllers, the van on site, the crew. **No customer faces,
  house numbers or number plates without permission.** Adding fake GPS tags
  to photos does nothing (Google strips the data), so don't bother.
- **The same photo on Instagram**, captioned with the keywords in
  [`keywords.md` Part 1](keywords.md#part-1--instagram-caption-keywords), and
  it files itself onto the matching brand and service pages on the site. One
  photo, three places.
- **Q&A.** Google has been winding down the Q&A section on profiles. If ours
  still shows one, add three common questions yourself with short answers
  ("Do you handle the VEU rebate?", "Do you come to Drouin?", "Do you service
  brands you didn't install?") and answer any public question within two days.

### Every month: one guide, angled at one part of the area

One genuinely useful guide a month on the blog (publishable from the portal),
written about the season and pointed at one part of the area where it really
applies. Link it to the relevant service page and suburb pages. **No pages
that are just a suburb name swapped into a template**: WEB-008 removed 256 of
those because Google declined to index them.

| Month | Topic | Area angle |
|---|---|---|
| Jan | Split system breakdowns in a heatwave: what to check before you call | Cranbourne, Clyde North (newer estates, west-facing living areas) |
| Feb | Book your gas heater service and CO test before winter | Berwick, Narre Warren (older gas-heated homes) |
| Mar | Gas ducted vs reverse-cycle heating: running costs for a three-bedroom house | Pakenham, Officer |
| Apr | Getting a 15-year-old gas storage tank replaced before it fails | Cameron Park, Pakenham (estate-build tanks reaching end of life) |
| May | Zoning a ducted system so the upstairs actually heats | Officer, Beaconsfield (two-storey estates) |
| Jun | Hot water died: same-day options, temporary hire, and the heat pump swap | Whole area |
| Jul | Heat pump hot water in a Gippsland frost | Drouin, Warragul, Koo Wee Rup |
| Aug | VEU and Solar Victoria rebates: what's actually on offer this year | Whole area; update `/rebates` the same day |
| Sep | Aircon service before summer: what we check and why | Narre Warren, Berwick |
| Oct | Split, multi-head or ducted for a new build | Clyde North, Officer South (new estates) |
| Nov | Evaporative cooling in the hills | Emerald, Cockatoo, the Dandenongs |
| Dec | Christmas shutdown: who to call and the after-hours line | Whole area |

Each guide needs something only we'd know: a real job, a real fault, what a
particular estate's builders put in. That's what keeps it from reading like
anyone's article.

### Fill in the suburbs

`docs/suburb-notes.md` is the worksheet that feeds the suburb pages. The
suburbs with the most to gain are the ones we want to rank in but where the
page says least: Berwick, Narre Warren, Cranbourne, Clyde North. A few
minutes each with what you actually know (estates, common faults, a job
you're proud of) is the best content work available.

### Every month: measure

Ten minutes, first Monday of the month. Write the numbers down.

| Where | What | Why |
|---|---|---|
| Search Console → Pages | Indexed pages, total and under `/areas/` and `/services/` | Nothing ranks until it's indexed. This is the number to watch first. |
| Search Console → Performance → Queries | Filter "Query contains" each core suburb (pakenham, officer, berwick, narre warren, cranbourne). Impressions, clicks, average position | Shows which suburb and job pairs are starting to show up |
| Search Console → Performance → Pages | Filter `/areas/`: which suburb pages get impressions | Tells you which suburb pages are worth more work |
| Business Profile → Performance | Calls, website clicks, direction requests, and the *searches* list | The map pack's own numbers. Calls are the one that pays. |
| Business Profile → Reviews | Count, new this month, days since the last | The review targets above |
| Rank tracker (`keyword-tracking.md`) | Tier 1 keywords from Pakenham, Berwick and Cranbourne, on mobile | Position in the map pack and the ordinary results, from where customers actually search |
| Portal → website leads | Leads by page and suburb | Whether any of the above is turning into work |

Expect weeks for the Google profile changes and reviews to show in the map
pack, and months for the website results. If indexed pages haven't moved
after two months of steady reviews and a handful of real links, that's the
time to look again at the pages themselves.

---

## What changed on the site with this plan

Already done in code, on the redesign branch:

- **Structured data is now in the page HTML.** It used to be added by
  JavaScript after the page loaded, so crawlers that don't run JavaScript
  (and Google's first pass) saw none of it on any page.
- **The business record was fixed.** The opening hours said "Mon-Fri", which
  schema.org doesn't understand, so Google was reading hours for no day at
  all. The business is now typed as both an HVAC business and a plumber, and
  each suburb it serves is listed as a place in Victoria with its own page.
- **Suburb pages** now have "Hot Water" in the title, structured data saying
  which suburb they serve, links to the system pages that suburb actually
  asks for (read from its own record), and reviews from customers in that
  suburb where we have them.
- **Every service and system page** links to the sixteen suburb pages
  nearest the workshop, and to the full list.
- **The duplicate split-system product pages** (the same product under both
  Cooling and Heating) now have one canonical copy.
- **The over-long /about title and three over-long descriptions** were cut to
  fit what Google displays.

Still to do in code, once you've done your part above:

- **Swap the Google link in `site.social.google`** for the profile's full
  Maps URL (`https://www.google.com/maps?cid=…`, from the merged profile) and
  add the Facebook URL. Both feed the `sameAs` field in the structured data,
  which is how Google connects the website to the profile.
- **Update `RATING_SUMMARY`** after the merge, and monthly after that.

# Keywords

Three sections that do three different jobs. Don't mix them up.

- **Part 1 — Instagram caption keywords.** These are live code. Type one
  of these words in a caption and the post files itself onto the matching
  page on the site. Nothing else does anything.
- **Part 2 — SEO keywords.** What the site is built to rank for. Nothing
  to type; it's already in the page titles, headings and copy.
- **Part 3 — How we actually get to number one.** The keywords are the
  easy half. This is the half that decides whether any of them rank, and
  most of it happens off the website.

If Part 1 changes, `src/lib/instagram.ts` and
`scripts/instagram-check.mjs` both need editing. They're checked against
each other by the diagnostic script.

---

## Part 1 · Instagram caption keywords

**How it works.** Every 6 hours the site reads the Instagram feed and
sorts posts by what the caption says. Matching is case-insensitive and
matches inside words, so `#brivis` and `Brivis` both count. A post can
land on several pages at once.

**A post with none of these words only ever reaches the gallery.**

Hyphens don't matter: "split system", "split-system", "multi head",
"multi-head", "air con" and "air-con" all match. The lists below show one
spelling of each; the code carries the variants.

### Brand pages

| Post it on | Caption must contain one of |
|---|---|
| `/brands/mitsubishi-electric` | mitsubishi · mitsi · msz · mxz · pea-m · pead |
| `/brands/reclaim` | reclaim · co2 split · r290 |
| `/brands/brivis` | brivis · wombat · buffalo · starpro |
| `/brands/kaden` | kaden · ksi · kci · kdm |
| `/brands/thermann` | thermann · g-series · gseries |
| `/brands/istore` | istore · i-store |
| `/brands/zonemate` | zonemate · milieu |

### Service pages

| Post it on | Caption must contain one of |
|---|---|
| Air conditioning installation | split system · multi head · multihead · ducted air · ducted aircon · ducted a/c · reverse cycle · aircon · air con · evap · evaporative · mitsubishi · kaden |
| Heat pump installation | heat pump · heatpump · reclaim · istore · i-store · thermann · co2 · veu · hot water heat pump |
| Aircon servicing & repairs | service · serviced · servicing · repair · repaired · fault · breakdown · clean · regas · re-gas · maintenance |
| Gas & plumbing | gas ducted · gas heater · gas heating · ducted heater · brivis · wombat · buffalo · starpro · continuous flow · gas line · gas fit · carbon monoxide · co test |

### Fallback words

install · installed · installation · fitted · changeover · change over ·
swap · upgrade

These are a **safety net only**. If a service page finds nothing on its
own words, it falls back to these so the section isn't empty. On their
own they can't file a post, because if they could, every service page
would show the same feed.

### Writing a caption that files itself

Name the **brand** and the **system**, and you've hit both lists:

> New **Kaden ducted** going in at Officer today. Old **gas heater**
> out, new **ductwork** and controller, tidy finish.

That lands on the Kaden brand page, the aircon installation page, the
gas page and the gallery, from one caption.

Adding a suburb doesn't file it anywhere — suburb pages don't read the
feed — but it's worth writing for anyone reading the post.

### Checking your work

```
node scripts/instagram-check.mjs 'YOUR_TOKEN'
```

Prints what matched each brand and service, anything dropped for having
no usable image, and — most useful — every caption that matched
**nothing**. That last list is your to-do list for future captions.

---

## Part 2 · SEO keywords

Already built into the site. Here so you know what it's aiming at, and
so anything you write elsewhere (Google Business posts, ads, flyers)
pulls in the same direction.

### The pattern that matters

Almost all local search is **service + suburb**:

> heat pump installation Pakenham · split system installation Berwick ·
> gas ducted heating Officer · aircon service Cranbourne

The site covers **64 suburbs × 4 services** automatically, so those
pages already exist. You don't need to write them.

### Primary services

heat pump hot water · heat pump installation · hot water heat pump ·
air conditioning installation · split system installation · multi-head
air conditioning · ducted air conditioning · reverse cycle air
conditioning · evaporative cooling · gas ducted heating · ducted heater
replacement · continuous flow hot water · gas hot water · gas fitting ·
gas leak detection · aircon service · aircon repair · gas heater service
· carbon monoxide testing

### Buying-intent terms

The ones worth the most, because someone typing these is ready:

heat pump installer near me · aircon installation cost · ducted heating
replacement cost · how much does a heat pump cost · VEU rebate heat pump
· Victorian Energy Upgrades hot water · Solar Homes hot water rebate ·
best heat pump hot water Australia · which heat pump for 4 people ·
270L vs 315L heat pump · gas vs heat pump running cost

### Brand + product terms

Reclaim CO₂ · Reclaim heat pump price · Reclaim 250L / 315L / 400L ·
Panasonic CO₂ heat pump · iStore 180L · iStore 270L · Thermann heat pump
· Thermann G-Series · Brivis Wombat · Brivis Buffalo · Brivis StarPro ·
Kaden ducted · Kaden KSI · Mitsubishi MSZ-AP · Mitsubishi MXZ multi-head
· Mitsubishi PEAD-M ducted · Zonemate · Milieu zoning

### Problem-first terms

These bring people in before they know what they want, which is where
the tools earn their keep:

no hot water · hot water running cold · aircon not cooling · aircon
blowing warm · ducted heater not working · [brand] fault code · gas
heater smell · carbon monoxide heater · evap cooler blowing warm ·
heat pump making noise

### Local modifiers

Pakenham · Officer · Beaconsfield · Berwick · Narre Warren · Endeavour
Hills · Hallam · Hampton Park · Cranbourne · Clyde North · Drouin ·
Warragul · Melbourne's south-east · south-east Melbourne · Casey ·
Cardinia

---

## Part 3 · How we actually get to number one

The honest version. Read this before spending money on anyone who
promises a ranking.

### First: "number one" isn't one thing

There is no single number one. Google returns a different page for
every query, every suburb, every device, and increasingly every person.
"Number one for aircon" is not a goal anyone can hit. "Number one for
*heat pump installation Pakenham*, on a phone, inside 10 km of the
shop" is a goal, and it's a different job from ranking in Warragul.

More importantly, a search like `aircon installation Pakenham` returns
**two separate results in one page**, and they are won in completely
different ways:

| | The map pack (top 3 pins) | The blue links below it |
|---|---|---|
| What decides it | Google Business Profile, distance from the searcher, reviews | The website: content, links, technical health |
| What we control | Profile completeness, review count and recency, categories, photos, posts | Everything in this repo |
| How fast it moves | Weeks | Months |
| Which gets the clicks | **Most of them, on a phone** | The rest |

**The map pack is the bigger prize and the website barely touches it.**
Anyone quoting for "SEO" who only talks about the website is quoting
for the smaller half.

### Where we actually stand

From the SE Ranking crawl, August 2026:

| Metric | Value | What it means |
|---|---|---|
| Health score | 99/100 | Technically the site is done. This is not the constraint. |
| Pages built | 432 | 406 in the sitemap |
| **Pages in Google** | **7** | **This is the constraint.** |
| Backlinks | 38 | Thin |
| Referring domains | 31 | Thin |
| Domain trust | 9/100 | Low, which is normal for a young site |

Read that table again. We have built four hundred pages and Google has
indexed seven of them. Nothing that isn't indexed can rank for
anything, so every hour spent writing new pages right now is an hour
spent on pages Google has not looked at.

### The order to do things in

**1. Get the pages indexed.** Nothing else matters until this moves.

The Search Console Pages report splits non-indexed pages into two
buckets, and they mean opposite things:

| Status | What it means | What fixes it |
|---|---|---|
| **Discovered, currently not indexed** | Google knows the URL exists and hasn't bothered crawling it | Domain authority. Links and reviews. Nothing on the page will change it. |
| **Crawled, currently not indexed** | Google read the page and decided it wasn't worth keeping | The page. Usually because it's too similar to another one. |

Do these, in order:

- **Verify the property in Search Console** and submit
  `https://www.advancedgas.com.au/sitemap.xml`.
- **Request indexing manually** on the ten pages that matter most: the
  four service pages, `/rebates`, `/pricing`, and the four biggest
  suburbs. It's rate-limited to a handful a day and it works.
- **Read the Pages report** and see which bucket the 425 are in. That
  single number decides whether the work is links or content.

### The duplication problem, and what was done about it

Measured on the build: the `/areas/<suburb>/<service>` pages were
**93% identical to each other**, 95% of characters shared. That is the
textbook profile for "Crawled, currently not indexed". Google fetched
them, saw 128 pages that differed only by a suburb name appearing 22
times, and declined to keep them.

The cause wasn't the template. It was that the template only ever read
`sub.name`, `sub.slug` and `sub.postcode`, while `suburbs.ts` already
carried real per-suburb detail (`housingStock`, `commonInstall`,
`landmark`, `localHooks`, and for some suburbs `commonProblems`,
`knownEstates`, `whyLocal` and a testimonial) that nothing rendered.

Wiring that in, angled per service, took the pages from **5% unique to
31% unique**, and from ~1,190 words to ~1,610. See `src/lib/localAngle.ts`.

**What still needs doing by hand:** the richest fields are only filled
in for a handful of suburbs.

| Field | Filled in | Effect |
|---|---|---|
| `landmark`, `housingStock`, `commonInstall`, `localHooks` | 64 / 64 | Now rendered |
| `testimonial` | 7 / 64 | Strongest signal on the page |
| `whyLocal` | 4 / 64 | Second strongest |
| `commonProblems` | 4 / 64 | Genuinely useful to a reader |
| `knownEstates` | 2 / 64 | Names nobody else can fake |

Filling `commonProblems` and `whyLocal` for the next ten suburbs, in
distance order, is the highest-value hour anyone can spend on this
site. It has to come from Jake or Chaz, because the whole point is that
it's the stuff only someone who has been on those streets knows.

### The sitemap was lying, and that's fixed

Every URL carried `lastmod` set to the build timestamp, so every deploy
told Google that all 406 pages had changed. Google's guidance is that
they only use `lastmod` where it's consistently accurate and ignore it
where it obviously isn't, which is exactly the signal we can't afford
to waste while 425 pages sit unindexed. The field is now omitted rather
than faked.

**2. Reviews, relentlessly.** This is the single biggest lever on the
map pack, and the map pack is where the phone calls come from.

- **Recency beats volume.** Twenty reviews this year outrank two
  hundred from 2019. A steady trickle is worth more than a burst.
- **Ask on the day, on site, before you drive off.** Response rates
  collapse the moment someone gets on with their day.
- **Reply to every single one**, including the bad ones, especially the
  bad ones. Google reads the replies.
- **The words in the review matter.** Someone who writes "replaced our
  hot water in Officer" has just put a keyword on the profile that we
  can't put there ourselves. Never script it, but "if you mention what
  we did and where, it helps us a lot" is a fair thing to say.

**3. Finish the Google Business Profile.**

- Primary category matters more than anything else on the profile. For
  us it should be the one that matches the majority of the work.
- Add every relevant secondary category (plumber, air conditioning
  contractor, heating contractor, hot water system supplier).
- Service area set to the suburbs we actually cover.
- Photos, weekly. Geotagged install shots beat stock every time.
- Products and services filled out with the terms from Part 2.
- Posts weekly. Cheap, and almost nobody local does it.

**4. Links from local sites.** 31 referring domains is the gap between
us and the established competitors. In order of ease:

- Supplier and manufacturer installer locators. Reece, Reclaim,
  Mitsubishi, Kaden, Brivis, iStore, Zonemate. Ask every one of them to
  list us. This is the highest-value, lowest-effort link there is and
  it's a phone call.
- Local directories that a human would actually use: the Cardinia and
  Casey business listings, the local chamber, sponsorship of a junior
  club with a link on the club site.
- Trade associations: VBA, Master Plumbers, ARC. Membership listings
  carry weight because they're verified.
- Supplier case studies. Earthworker, Reclaim and Reece all publish
  installer stories, and we have real ones.

**5. Then, and only then, more content.** And for tracking which of
these actually move, see `keyword-tracking.md`. The site already covers
64 suburbs by 4 services. Adding a 65th suburb is not the bottleneck.
What earns links is the stuff nobody else has built:

- `/brands/reclaim/models` — the only page in Australia that decodes
  every Reclaim system code. That's a reference other installers will
  link to.
- The nine calculators and tools.
- The blog comparison posts.

### What to measure, monthly

Not rankings. Rankings lie: they're personalised, localised and they
bounce. Track these instead, all free:

1. **Indexed pages** (Search Console → Pages). Should climb from 7.
2. **Total impressions and clicks** (Search Console → Performance).
   Impressions rising before clicks is normal and it's the leading
   indicator.
3. **Queries we appear for that we didn't expect.** The best content
   ideas are already in this report.
4. **Google Business Profile calls, direction requests and website
   clicks** (Business Profile → Performance).
5. **Review count and average**, and how many days since the last one.

### The honest timeline

- **Weeks 1 to 4:** indexation moves, map pack starts responding to
  review velocity.
- **Months 2 to 4:** suburb pages begin appearing for long-tail terms
  like *heat pump installation Clyde North*. These are the easy wins
  and they convert well.
- **Months 4 to 9:** the competitive head terms, *aircon installation
  Pakenham*, start moving, assuming the link profile has grown.
- **Beyond:** holding it. Rankings are a subscription, not a purchase.

Anyone who promises number one in 30 days is selling something. Anyone
who says the website alone will do it hasn't looked at where the clicks
actually go.

### What not to bother with

- **Buying links or directory blasts.** Cheap, fast, and the reason
  sites get penalised.
- **Keyword stuffing.** The tone document exists partly to stop this.
  Copy written for a crawler reads like it, and it converts worse.
- **Chasing Core Web Vitals further.** The site scores 99 on health and
  the CWV report says "no results found", which means not enough real
  traffic yet, not that anything is broken.
- **New suburb pages** until the 64 we have are indexed.

---

## What actually moves the needle

Ranked by effort against return, given the site already covers the
service+suburb grid:

1. **Get indexed.** Search Console, sitemap, manual requests. Nothing
   below this line matters while 7 pages of 432 are in the index.
2. **Google reviews.** More of them, recent, and replies to all of
   them. This outweighs anything on the page for local search.
3. **Installer-locator links** from Reece, Reclaim, Mitsubishi, Kaden,
   Brivis, iStore and Zonemate. A phone call each, and they're the
   most relevant links we can get.
4. **Instagram captions with brand and system words.** Free content on
   the pages that need it most, and it takes ten extra seconds.
5. **Google Business posts** using the terms above, weekly.
6. **Real install photos** into `public/jobs/`. Own photography beats
   manufacturer renders for both buyers and image search.
7. **Answering questions in the FAQs** as customers ask them. Every real
   question is a search someone else is running.

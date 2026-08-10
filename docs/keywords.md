# Keywords

Two different lists that do two different jobs. Don't mix them up.

- **Part 1 — Instagram caption keywords.** These are live code. Type one
  of these words in a caption and the post files itself onto the matching
  page on the site. Nothing else does anything.
- **Part 2 — SEO keywords.** What the site is built to rank for. Nothing
  to type; it's already in the page titles, headings and copy.

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

## What actually moves the needle

Ranked by effort against return, given the site already covers the
service+suburb grid:

1. **Google reviews.** More of them, and replies to all of them. This
   outweighs anything on the page for local search.
2. **Instagram captions with brand and system words.** Free content on
   the pages that need it most, and it takes ten extra seconds.
3. **Google Business posts** using the terms above, weekly.
4. **Real install photos** into `public/jobs/` — own photography beats
   manufacturer renders for both buyers and image search.
5. **Answering questions in the FAQs** as customers ask them. Every real
   question is a search someone else is running.

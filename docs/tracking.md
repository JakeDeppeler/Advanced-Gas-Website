# Tracking the website on Google

Until now the site had no analytics at all. Vercel Speed Insights was
wired up, but that measures how fast a page loads, not whether anyone
visited it, so there was no way to answer "did that change bring in any
work". This is the stack, why each piece is there, and what to ignore.

---

## The three that matter

| | What it answers | Cost | Set-up |
|---|---|---|---|
| **Google Search Console** | What Google thinks of us. Which pages are indexed, what we appear for, how often | Free | 10 min |
| **Google Business Profile** | The map pack. Calls, direction requests, website clicks | Free | Already exists, just read it |
| **Google Analytics 4** | What people do once they arrive, and which pages produce quote requests | Free | 15 min |

That's it. Everything else is a nice-to-have.

---

## 1. Search Console, first and most important

**This is the only tool that tells you what Google actually thinks.**
Everything else is inference.

### Set-up

1. Go to `search.google.com/search-console` and add
   `https://www.advancedgas.com.au` as a **Domain** property if you
   control the DNS (better, survives a redesign), or a **URL prefix**
   property otherwise.
2. For URL-prefix verification, choose the **HTML tag** method, copy the
   `content="..."` value, and set it in Vercel as
   `NEXT_PUBLIC_GSC_VERIFICATION`. The site renders the tag
   automatically. Redeploy, then hit Verify.
3. Submit the sitemap: **Sitemaps → add
   `https://www.advancedgas.com.au/sitemap.xml`**.

### The four reports worth opening

**Pages.** The one that matters right now. It splits every URL into
indexed and not-indexed, and the not-indexed reasons are the whole
diagnosis:

- *Discovered, currently not indexed* → Google knows the URL and hasn't
  bothered crawling it. Fixed by domain authority: links and reviews.
  Nothing on the page will change it.
- *Crawled, currently not indexed* → Google read it and decided it
  wasn't worth keeping. Fixed by the page. Usually duplication.

**Performance.** Impressions, clicks, average position, and every query
we appear for. Set the date range to 3 months and compare periods.

**URL Inspection.** Paste any URL to see whether it's indexed and why
not. There's a **Request Indexing** button, rate-limited to a handful a
day, and it works. Use it on the ten pages that matter most rather than
spraying it at everything.

**Sitemaps.** Shows how many URLs Google read versus how many we
submitted. A big gap is a signal in itself.

---

## 2. Google Business Profile Insights

**Most of the phone calls come from here, not from the website.** On a
phone, the map pack sits above every blue link, and it's decided by the
profile, proximity and reviews rather than by anything in this repo.

Open the profile → **Performance**. Track monthly:

- Calls
- Direction requests
- Website clicks
- Searches that showed the profile, split into direct (people looking
  for us by name) and discovery (people looking for a plumber and
  finding us). **Discovery going up is the number that means the
  marketing is working.**

---

## 3. Google Analytics 4

Answers the question the other two can't: **which pages produce quote
requests**.

### Set-up

1. `analytics.google.com` → create a property → create a Web data
   stream for `www.advancedgas.com.au`.
2. Copy the Measurement ID (`G-XXXXXXXXXX`).
3. Set `NEXT_PUBLIC_GA_ID` in Vercel and redeploy.

Nothing loads until that variable exists, so the ~45 KB stays off every
page until someone decides it's wanted.

### The conversion is already wired

`trackLead()` fires a `generate_lead` event when the quote form submits
successfully. It's fired from the form, not inferred from a `/thanks`
pageview, because a pageview can't tell you which form produced it and
people land on `/thanks` by accident.

In GA4, mark `generate_lead` as a **Key event** (Admin → Events). Then
**Reports → Engagement → Landing page** with that as the conversion
tells you which pages actually bring in work.

**This becomes necessary the day the first Google ad runs**, because
Ads conversion tracking hangs off the same gtag.

---

## Already on, needs nothing

**Vercel Analytics.** Page views and referrers, about 1 KB, cookieless
so no consent banner. Turn it on in the Vercel dashboard under the
project's Analytics tab. Not a replacement for GA4, but it answers
"what are people landing on" without a third-party script.

**Vercel Speed Insights.** Real load times from real visits. Worth a
look after a big change; not a marketing metric.

---

## What to actually look at, monthly

Fifteen minutes, in this order:

1. **Search Console → Pages**: is the indexed count climbing?
2. **Search Console → Performance**: are impressions climbing?
3. **Business Profile → Performance**: are calls and discovery searches
   climbing?
4. **GA4 → Landing page, filtered to `generate_lead`**: which pages are
   producing work?
5. **Reviews**: how many this month, and how many days since the last
   one?

---

## The trap

**Impressions move before positions. Positions move before clicks.**

If impressions are climbing and rankings look flat, it's working, keep
going. If impressions are flat and rankings are flat, nothing is
working and refreshing the rank tracker won't change it.

Rank tracking is a lagging indicator and it's addictive. Search Console
impressions are the leading one, and they're free.

## What to ignore

- **"SEO score" numbers** from any tool, including the audits. The site
  scores 99 and has 7 pages indexed. The score is not the goal.
- **Bounce rate.** On a page that answers a question and produces a
  phone call, a "bounce" is a success.
- **Anyone selling rank reports** as the deliverable. Rankings are the
  output. Calls are the outcome.

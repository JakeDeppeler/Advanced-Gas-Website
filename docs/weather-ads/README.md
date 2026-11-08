# Weather-triggered ads

Roofers point their ads at suburbs a hailstorm just hit. This does the same
for us: when the forecast is about to send heating, cooling, hot water or
storm work from part of the service area, those suburbs are flagged and the
ads lean into them. When the weather passes, the flags clear and the ads go
back to how they were.

- **See it:** portal › Marketing › Weather targets (`/portal/marketing/weather`)
- **Data:** `https://www.advancedgas.com.au/api/weather-triggers` (JSON), `?format=csv` for a location list
- **Rules:** `src/lib/weather-triggers/rules.ts` (thresholds and the reason for each)
- **Tests:** `npm run check:weather`

No new logins or API keys are involved anywhere. The forecast comes from
Open-Meteo, which is free and keyless. Google Ads fetches our endpoint from
inside your own account, using a script you paste in.

> **Not yet tested against a live Google Ads account.** The script has been
> syntax-checked and run against a stand-in for Google Ads with real forecast
> output, but never inside Google Ads. Preview it before you schedule it (step 4).

## The triggers

The area is split into 12 forecast zones (Pakenham & Officer, Berwick & Narre
Warren, Cranbourne & Clyde, Dandenong & Springvale, Western Port, Garfield &
Bunyip, Drouin & Warragul, Belgrave & Upwey, Emerald & Gembrook, Dandenong
Ranges, Ferntree Gully & Rowville, Ringwood & Glen Waverley). The split follows
height and the bay, because that's what changes the weather: on a cold morning
the ranges sit 3–4° under Pakenham.

Temperatures are judged in whole degrees, the same as the portal shows them.

| Trigger | Pushes (flag `campaign`) | Fires when | Strong when |
|---|---|---|---|
| Heat | Aircon install & repair (`cooling`) | a day of 35°+, or 3 days running at 32°+, in the next 5 days | 38°+, or the 3-day run |
| First warm day | Aircon service (`aircon_service`) | the first 30° day after 30 days without 28° | always moderate |
| Cold snap | Heater repair & ducted heating (`heating`) | min 2° or under, or max 12° or under, in the next 5 days | min 0° or under, or max 10° or under |
| First cold of autumn | Heater service (`heater_service`) | Mar–Jun only: the first min of 5° or max of 14° after 30 days without one | always moderate |
| Cold mornings | Hot water repair & replacement (`hot_water`) | 2 mornings running at 3° or under | 2 running at 0° or under |
| Storm | Storm damage check (`storm_check`) | gusts of 80 km/h+, or a thunderstorm with 65 km/h gusts or 20 mm of rain, from 2 days ago to 2 days ahead; runs 2 more days after | gusts of 90 km/h+, or hail |

These are starting points. None has been checked against our own call volume
yet. After a season, compare the flags with ServiceTitan bookings and tune
`RULES` in `rules.ts`. The portal page and this table both come from those
numbers. (This table is a copy, so update it too.)

**About hail.** Open-Meteo only forecasts hail over central Europe, so the
hail codes never show up here. A hailstorm gets flagged through its wind or
rain, or it doesn't get flagged at all. If you hear about a hail hit, the CSV
route below works by hand.

## Google Ads: the script

`google-ads-script.js` runs inside your Google Ads account every hour. It can
do two things. Use either one, or both.

**A. Weather campaigns (recommended).** You build paused campaigns once, with
weather-specific ads and keywords. While a flag for one is live, the script
points it at the flagged zones (a radius target per zone) and enables it.
When the flags clear, it pauses it again. This works with any bidding
strategy, including Maximise conversions.

**B. Bid adjustments on your existing campaigns.** Each zone gets a radius
target on the campaign, with a bid adjustment that rises while a matching
flag is live (+15% moderate, +30% strong) and drops back to +0% when it
clears. **This only does anything on Manual CPC.** Smart Bidding (Maximise
conversions, target CPA, target ROAS) ignores location bid adjustments. If
the always-on campaigns use Smart Bidding, use A.

### Campaign names it expects

You can change all of these in `CONFIG` at the top of the script.

| Campaign name | Switched on by |
|---|---|
| `Weather \| Cooling` | `cooling`, `aircon_service` |
| `Weather \| Heating` | `heating`, `heater_service` |
| `Weather \| Hot water` | `hot_water` |
| `Weather \| Storm check` | `storm_check` |

If a campaign doesn't exist, the script logs "no such campaign" and skips it.
That means you can start with just one, for example `Weather | Cooling` before
summer.

### Setup

1. **Build the weather campaign(s), paused.** Search campaigns, named exactly
   as above. Give each one ads that name the weather ("Heatwave this weekend?
   Aircon installed this week"), a modest daily budget you're happy to spend
   while it's on, and a location target of Pakenham + 75 km to begin with (the
   script replaces this with zone circles the first time a flag fires).
   Under Locations › Location options, choose **Presence: people in or
   regularly in your targeted locations**. Otherwise people elsewhere who
   search about our area will see the ads.
2. **Paste the script.** Google Ads › Tools › Bulk actions › Scripts › **+** ›
   New script. Delete the sample, paste the whole of `google-ads-script.js`,
   and name it "Weather targets".
3. **Edit `CONFIG`.** Put your email in `EMAIL`. Fill `BID_CAMPAIGNS` only if
   you want option B, and list only Manual CPC campaigns there. Leave
   `MAX_LEAD_DAYS` at 3 to begin with: a 35° day five days out is a guess, but
   two days out it's a plan.
4. **Authorise and Preview.** Click Authorise (it asks to manage your Ads
   account, to fetch external URLs and to send email as you). Then click
   **Preview**. Preview runs the whole script but saves nothing. Read the
   Logs tab: it should say which zones are flagged and what it *would* enable
   or change. Check that against the portal page. On a quiet day you'll see
   "no live flags, stays paused". That's normal and correct.
5. **Run once, then schedule hourly.** Click Run. Check the campaigns look
   right, then set Frequency to **Hourly**. The forecast underneath refreshes
   hourly, so a more frequent schedule changes nothing.

### When something goes wrong

- If the endpoint is down, or the forecast failed or is over 6 hours old, the
  script **changes nothing** and emails you. It never reads "couldn't check" as
  "no weather".
- Zones with no forecast are left exactly as they were. Only zones with a
  fresh forecast are changed.
- **To undo everything:** set `RESET_ALL: true`, click Run once, then set it
  back to `false`. That pauses the weather campaigns and puts every zone's bid
  adjustment back to +0%. To stop the script for good, set its frequency to
  none or delete it.
- When there are no flags, a weather campaign is paused with its last zone
  targets left in place. Removing every location would leave a campaign that
  Google treats as targeting everywhere.

## Meta (Facebook / Instagram)

Switching Meta ad sets on and off automatically needs a Meta Marketing API
app and a token, and this setup deliberately has neither. The manual route
takes about two minutes when a flag goes up:

1. Download the list from the portal page ("download the suburbs as a CSV"),
   or open `https://www.advancedgas.com.au/api/weather-triggers?format=csv`.
2. In Ads Manager, open (or duplicate) the matching weather ad set. Go to
   Audience › Locations › **Add locations in bulk** › Postal code, and paste
   the `postcode` column. Remove the standing location first, or the ad set
   will cover both.
3. Set the ad set's end date to the flag's `to` date, so it switches itself off.

The same CSV works in Google Ads for a one-off: Locations › Advanced search ›
Bulk locations, and paste the `google_ads_location` column ("3810, Victoria,
Australia").

Several suburbs share a postcode (3977 covers seven of ours), so the platform
will show fewer locations than the CSV has rows. That's expected.

If the forecast couldn't be fetched, the CSV answers `503` with the reason
rather than an empty list. A CSV with only its header row always means
"checked, nothing flagged".

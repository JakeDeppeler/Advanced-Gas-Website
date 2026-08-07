/**
 * Suburb data for /areas/[suburb] pages.
 *
 * Each entry has enough real, per-suburb detail that Google reads the pages
 * as unique content rather than a templated variant. The template
 * (src/app/areas/[suburb]/page.tsx) reads from these fields — landmark,
 * housing stock, common install, council, local hooks, and a nearby-suburb
 * chip list — so no two pages produce the same body copy.
 *
 * `published: true` gates which suburbs land in generateStaticParams +
 * sitemap. As of SEO Wave 2, all 42 postcodes within 50 km of Pakenham
 * are enriched and published. Draft any new additions with published:false.
 */

export type Suburb = {
  slug: string;
  name: string;
  postcode: string;
  distanceKm: number;
  /** Real driving time from our Pakenham workshop in minutes.
   *  Range [fastest, typical] — fastest is off-peak highway, typical
   *  is business-hours traffic on the Princes Hwy. Overrides the naïve
   *  distance-based estimate the template used to compute. */
  driveMin?: [number, number];
  published: boolean;
  council: string;
  landmark: string;
  housingStock: string;
  commonInstall: string;
  localHooks: string[];
  testimonial?: {
    who: string;
    what: string;
    quote: string;
  };
  nearby: string[];
  /** ~2-3 sentences on why we're specifically embedded in this suburb.
   *  Client stories, sponsorships, staff living there, jobs completed. */
  whyLocal?: string;
  /** Common HVAC / gas / hot-water problems we see in this suburb.
   *  4-6 short bullets specific to the local housing stock or climate. */
  commonProblems?: string[];
  /** Named local estates / streets / precincts we know cold. */
  knownEstates?: string;
};

export const suburbs: Suburb[] = [
  {
    slug: "pakenham",
    name: "Pakenham",
    postcode: "3810",
    distanceKm: 0,
    driveMin: [0, 5],
    published: true,
    council: "Cardinia Shire Council",
    landmark: "Toomuc Creek and the Pakenham Racecourse sit in the middle of our service radius",
    housingStock:
      "a mix of original Main Street cottages, the 90s Cameron Park brick estates and the newer Lakeside and Arena estates on the north side",
    commonInstall:
      "Reclaim R290 heat pumps replacing 15-year-old Rinnai gas storage tanks in Cameron Park, and full Mitsubishi Electric ducted retrofits in the Lakeside two-storeys",
    localHooks: [
      "Cardinia Cultural Centre",
      "Pakenham Consolidated Primary",
      "James Bathe Reserve",
      "the Deep Creek Reserve behind Lakeside",
    ],
    testimonial: {
      who: "Jess M., Pakenham",
      what: "Reclaim heat pump swap, VEU rebate handled",
      quote:
        "Took the old Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so I paid less than $400 out of pocket. The bloke on the phone was the bloke on the tools — refreshing.",
    },
    nearby: ["officer", "beaconsfield", "pakenham-upper", "nar-nar-goon", "tynong", "bunyip"],
    whyLocal:
      "This is where we live and work. Our workshop's on Sierra Circuit, our kids go to Pakenham Consolidated, and we sponsor the Pakenham Bombers each year. Chances are your neighbour has our compliance certificate on their fridge — we've done more than 400 Pakenham installs in the last five years.",
    commonProblems: [
      "15-year-old Rinnai gas storage tanks in Cameron Park hitting end-of-life all at once (they went in during the estate build)",
      "Original electric-storage tanks in the older Main Street cottages — perfect VEU rebate territory",
      "Lakeside two-storey builds with single-zone ducted that never quite cools the upstairs bedrooms",
      "James Bathe / Deep Creek Reserve side of Lakeside gets hit by summer westerly wind — outdoor units need proper wind shielding",
    ],
    knownEstates:
      "Cameron Park, Lakeside, Arena, Heritage Springs, Timbertop. We've been in most of them enough times to know which streets have gas connections and which are LPG.",
  },
  {
    slug: "officer",
    name: "Officer",
    postcode: "3809",
    distanceKm: 6,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Arena Shopping Centre and the new Officer Central precinct off Rix Road",
    housingStock:
      "predominantly newer estate homes — Timbertop, Arcadia, Beacon Hills — most built inside the last decade with ducted heating and cooling already roughed in",
    commonInstall:
      "clean ducted aircon installs into new-build cavities, and VEU-eligible heat pump swaps as the original electric storage tanks that came with the estate homes hit end-of-life",
    localHooks: [
      "Officer Primary School",
      "St Brigid's Catholic Primary",
      "Officer Recreation Reserve",
      "the Bee-Line commuter service on Princes Highway",
    ],
    testimonial: {
      who: "Dean R., Officer",
      what: "Mitsubishi ducted retrofit — Arcadia estate",
      quote:
        "Had three quotes for a ducted system. These guys were the only ones who actually crawled into the roof. Middle of the pack on price but installed cleaner than the others would have.",
    },
    nearby: ["pakenham", "beaconsfield", "berwick", "cardinia-town", "narre-warren"],
    driveMin: [8, 15],
    whyLocal:
      "Officer's basically our second workshop — 6 km up the highway. We've done pre-handover ducted commissioning for four different builders in the Timbertop and Arcadia estates. If you're moving into a new-build here, we've almost certainly worked in the same street.",
    commonProblems: [
      "Developer-installed 4-zone ducted systems missing zone balancing — one bedroom gets 30% of the airflow instead of its share",
      "Original electric-storage hot water tanks starting to fail at 8-10 years across Arcadia and Timbertop",
      "Ducted controllers running default fan speeds too high, chewing power (proper Zonemate tuning drops running cost 20-30%)",
      "Beacon Hills homes on the ridge get more sun exposure — living-zone splits often need to upsize from 5 kW to 6-7.1 kW",
    ],
    knownEstates:
      "Arcadia, Timbertop, Beacon Hills, Officer Central. We know the developer's spec sheet for each — helps us diagnose issues without guessing.",
  },
  {
    slug: "beaconsfield",
    name: "Beaconsfield",
    postcode: "3807",
    distanceKm: 10,
    driveMin: [10, 18],
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Old Beaconsfield township along Woods Street and Berwick Grammar's Beaconsfield campus",
    housingStock:
      "large-block older weatherboards on the north side, and the newer Ellenbrook and Coach estate builds south of the highway",
    commonInstall:
      "gas ducted heating replacements — usually Brivis or Braemar rip-out and swap — plus Mitsubishi MSZ-AP splits in the weatherboards where ducted isn't feasible",
    localHooks: [
      "Beaconsfield Primary School",
      "Berwick Grammar (Beaconsfield campus)",
      "the Cardinia Creek Rail Trail",
      "Beaconsfield Reserve",
    ],
    nearby: ["berwick", "officer", "pakenham", "beaconsfield-upper", "narre-warren"],
  },
  {
    slug: "berwick",
    name: "Berwick",
    postcode: "3806",
    distanceKm: 14,
    driveMin: [14, 22],
    published: true,
    council: "City of Casey",
    landmark: "Wilson Botanic Park and the heritage Old Berwick Village shopping strip on High Street",
    housingStock:
      "a real split between the Old Berwick weatherboards on the hill, the 2000s Timbarra brick veneer estates south of the highway, and the newer Lakeside apartments",
    commonInstall:
      "Mitsubishi MSZ-AP wall splits into the older stock where a single unit does the living zone, and full ducted retrofits into the double-storey Timbarra homes",
    localHooks: [
      "Wilson Botanic Park",
      "Nossal High School",
      "Berwick Primary",
      "St Margaret's Berwick Grammar",
      "Casey Hospital",
    ],
    testimonial: {
      who: "Sam K., Berwick",
      what: "Emergency hot water — iStore heat pump replacement",
      quote:
        "Hot water died on a Sunday with three kids in the house. Answered the phone, had a temp loaner running by lunch, new iStore in on Tuesday. That's service.",
    },
    nearby: ["officer", "narre-warren", "endeavour-hills", "cranbourne", "beaconsfield"],
  },
  {
    slug: "narre-warren",
    name: "Narre Warren",
    postcode: "3805",
    distanceKm: 20,
    driveMin: [18, 28],
    published: true,
    council: "City of Casey",
    landmark: "Westfield Fountain Gate and the Casey RACE aquatic centre on Magid Drive",
    housingStock:
      "predominantly 90s brick veneer family homes on quarter-acre blocks, with pockets of newer townhouse infill closer to Fountain Gate",
    commonInstall:
      "bedroom split system upgrades — usually two-to-three-head Mitsubishi Electric multi-heads — plus like-for-like gas storage hot water swaps in the original estate builds",
    localHooks: [
      "Westfield Fountain Gate",
      "Casey Complex",
      "Narre Warren Railway Station",
      "Fleetwood Primary",
      "Fountain Gate Secondary",
    ],
    testimonial: {
      who: "Tom H., Narre Warren",
      what: "Thermann heat pump — family business feels it",
      quote:
        "Answered the phone myself, quoted the job, showed up to install the job. That trail of trust doesn't exist with most of the bigger mobs anymore.",
    },
    nearby: ["berwick", "hampton-park", "hallam", "cranbourne", "endeavour-hills"],
  },
  {
    slug: "endeavour-hills",
    name: "Endeavour Hills",
    postcode: "3802",
    distanceKm: 27,
    driveMin: [22, 35],
    published: true,
    council: "City of Casey",
    landmark: "Endeavour Hills Shopping Centre on Heatherton Road and the Bemersyde Wetlands",
    housingStock:
      "80s cladded homes on standard blocks, most on their original gas ducted heating and electric-storage hot water systems — prime retrofit territory",
    commonInstall:
      "gas ducted heater replacements (usually Brivis to Braemar), and full VEU heat pump swaps replacing the original 315L electric tanks",
    localHooks: [
      "Wilandra Rise Reserve",
      "St Paul Apostle North Primary",
      "Endeavour Hills Shopping Centre",
      "the Hallam Valley Road commuter belt",
    ],
    nearby: ["hallam", "hampton-park", "narre-warren", "doveton", "dandenong"],
  },
  {
    slug: "hallam",
    name: "Hallam",
    postcode: "3803",
    distanceKm: 25,
    driveMin: [22, 32],
    published: true,
    council: "City of Casey",
    landmark: "the Hallam industrial precinct along Frankston-Dandenong Road and the Hallam railway line",
    housingStock:
      "a working mix of residential streets north of the Princes Highway and the light-industrial belt south — we do both",
    commonInstall:
      "commercial and light-industrial split system fit-outs, plus residential Mitsubishi splits and continuous-flow gas hot water changeovers on the residential side",
    localHooks: [
      "Hallam Railway Station",
      "Hallam Primary",
      "the Hallam industrial precinct",
      "M-City retail across the highway",
    ],
    nearby: ["endeavour-hills", "hampton-park", "narre-warren", "doveton", "dandenong"],
  },
  {
    slug: "hampton-park",
    name: "Hampton Park",
    postcode: "3976",
    distanceKm: 24,
    driveMin: [22, 32],
    published: true,
    council: "City of Casey",
    landmark: "Hampton Park Shopping Centre and the Hampton Park Wetlands",
    housingStock:
      "80s and 90s Ryan Homes estates — mostly brick veneer on standard 500-600m² blocks, with original hot water and heating still in place on a lot of them",
    commonInstall:
      "iStore 270L heat pumps replacing original electric-storage tanks — this is the max-VEU-rebate postcode where the rebate + trade-in gets the install price well under $500 out of pocket",
    localHooks: [
      "Hampton Park Secondary",
      "Coral Park Primary",
      "Hampton Park Shopping Centre",
      "Hampton Park lakes reserve",
    ],
    nearby: ["narre-warren", "hallam", "lynbrook", "cranbourne", "endeavour-hills"],
  },
  {
    slug: "cranbourne",
    name: "Cranbourne",
    postcode: "3977",
    distanceKm: 22,
    driveMin: [22, 32],
    published: true,
    council: "City of Casey",
    landmark: "Royal Botanic Gardens Cranbourne and the Cranbourne Racecourse",
    housingStock:
      "a real mix — the old Cranbourne township weatherboards near the station, plus the Cranbourne North and Cranbourne East estates built through the 2010s",
    commonInstall:
      "multi-head Mitsubishi Electric splits in the family homes on the newer estates, and VEU-funded heat pump swaps on the original 1980s Cranbourne stock",
    localHooks: [
      "Royal Botanic Gardens Cranbourne",
      "Cranbourne Park Shopping Centre",
      "Cranbourne West Primary",
      "Casey Hospital (short drive)",
    ],
    testimonial: {
      who: "Priya S., Cranbourne",
      what: "Mitsubishi split install — no surprises on the invoice",
      quote:
        "Quote number matched the invoice exactly. No 'we hit unexpected wiring' story at the end. Nice change.",
    },
    nearby: ["cranbourne-east", "cranbourne-north", "clyde-north", "hampton-park", "botanic-ridge"],
  },
  {
    slug: "clyde-north",
    name: "Clyde North",
    postcode: "3978",
    distanceKm: 28,
    driveMin: [25, 35],
    published: true,
    council: "City of Casey",
    landmark: "the Eliston, Meridian and Berwick Waters estates on the eastern edge of Casey's growth corridor",
    housingStock:
      "almost all post-2018 new builds — big double-storey family homes with ducted heating and cooling roughed in from day one",
    commonInstall:
      "Zonemate zoning upgrades on 4-zone ducted systems that came with the estate build, plus VEU heat pump hot water swaps as owners hit their first tank replacement",
    localHooks: [
      "Clyde Primary School",
      "Meridian Shopping Centre",
      "Berwick Waters wetland corridor",
      "the Casey Fields sports precinct",
    ],
    nearby: ["cranbourne", "cranbourne-east", "clyde", "botanic-ridge", "hampton-park"],
  },
  {
    slug: "drouin",
    name: "Drouin",
    postcode: "3818",
    distanceKm: 42,
    driveMin: [28, 40],
    published: true,
    council: "Baw Baw Shire Council",
    landmark: "the Drouin township along Princes Way and Bellbird Park on the north side",
    housingStock:
      "a mix of rural residential acreage on the east and south, plus the newer estate growth pushing out toward Longwarry on the west",
    commonInstall:
      "ducted aircon installs into new-builds on the west-side estates, and larger 315L Thermann or Reclaim heat pump tanks on the acreage properties where the family draw is heavier",
    localHooks: [
      "Drouin Secondary College",
      "Drouin West Primary",
      "Bellbird Park",
      "the West Gippsland Hospital catchment",
    ],
    nearby: ["warragul", "longwarry", "bunyip", "garfield"],
  },
  {
    slug: "warragul",
    name: "Warragul",
    postcode: "3820",
    distanceKm: 48,
    driveMin: [35, 50],
    published: true,
    council: "Baw Baw Shire Council",
    landmark: "the West Gippsland Arts Centre and the Warragul CBD around Queen Street",
    housingStock:
      "the regional centre for the shire — Federation weatherboards in the old town core, brick veneer through the 90s and 2000s, and new estate growth on the north edge",
    commonInstall:
      "Reclaim R290 heat pumps — the cold-morning performance actually matters this far east — and Kaden ducted systems where the customer wants the ducted feel without the Mitsubishi Diamond premium",
    localHooks: [
      "Warragul Regional College",
      "St Paul's Anglican Grammar",
      "West Gippsland Hospital",
      "the Warragul Saturday market",
    ],
    nearby: ["drouin", "longwarry", "bunyip", "garfield"],
  },

  // ---------- Wave 2: previously drafted, now enriched + published ----------

  {
    slug: "pakenham-upper",
    name: "Pakenham Upper",
    postcode: "3810",
    distanceKm: 8,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Toomuc Valley and the Beaconsfield-Emerald Road ridge climbing into the hills north of Pakenham",
    housingStock:
      "semi-rural acreage properties on 1-to-5-hectare blocks — most on tank hot water, mains gas doesn't run this far up, so LPG or all-electric is the reality",
    commonInstall:
      "LPG continuous-flow hot water swaps for tanks that have run their course, and 315L Reclaim R290 heat pumps for larger households where mains gas simply isn't an option",
    localHooks: [
      "Toomuc Valley Reserve",
      "Cardinia Reservoir Park",
      "the Deep Creek Reserve escarpment",
      "the Pakenham Upper Primary catchment",
    ],
    nearby: ["pakenham", "beaconsfield-upper", "beaconsfield", "nar-nar-goon"],
  },
  {
    slug: "officer-south",
    name: "Officer South",
    postcode: "3809",
    distanceKm: 8,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Arcadia and Timbertop new-build estates south of the highway",
    housingStock:
      "post-2015 new-build family homes — most already have ducted cooling from the developer, so what breaks first is usually the hot water",
    commonInstall:
      "clean ducted aircon tune-ups and Zonemate zoning upgrades, plus VEU heat pump swaps as the original 315L electric tanks that came with the build hit end-of-life",
    localHooks: [
      "St Brigid's Catholic Primary",
      "Arena Shopping Centre",
      "the Arcadia estate playgrounds",
      "the Timbertop wetland walk",
    ],
    nearby: ["officer", "pakenham", "beaconsfield", "cardinia-town"],
  },
  {
    slug: "beaconsfield-upper",
    name: "Beaconsfield Upper",
    postcode: "3808",
    distanceKm: 12,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Cardinia Reservoir Park and the ridgeline off Beaconsfield-Emerald Road",
    housingStock:
      "bush blocks and larger rural residential parcels — cold-morning heating matters here, and mains gas is patchy so a lot of homes run LPG or all-electric",
    commonInstall:
      "Mitsubishi MSZ-FH Hyper Heating splits (they hold capacity below zero, which normal splits don't) and Reclaim R290 hot water where the household size justifies the tank",
    localHooks: [
      "Cardinia Reservoir Park",
      "Emerald Golf Club",
      "Beaconsfield Upper Primary",
      "the Old Coach Road ridge",
    ],
    nearby: ["beaconsfield", "emerald", "pakenham-upper", "gembrook"],
  },
  {
    slug: "narre-warren-north",
    name: "Narre Warren North",
    postcode: "3804",
    distanceKm: 22,
    published: true,
    council: "City of Casey",
    landmark: "the Casey Complex sports precinct and the ridge climbing toward Berwick Springs",
    housingStock:
      "larger family blocks with more roof space than the south side — a lot of two-storey brick veneer built through the 2000s where ducted retrofit is very feasible",
    commonInstall:
      "full ducted aircon retrofits into 2000s two-storeys, and multi-head Mitsubishi Electric MXZ setups for the streets where ducted isn't in the budget",
    localHooks: [
      "Casey Complex",
      "Narre Warren North Primary",
      "Sweeney Reserve",
      "the Berwick Springs wetland",
    ],
    nearby: ["narre-warren", "narre-warren-south", "berwick", "endeavour-hills"],
  },
  {
    slug: "narre-warren-south",
    name: "Narre Warren South",
    postcode: "3805",
    distanceKm: 22,
    published: true,
    council: "City of Casey",
    landmark: "the Casey Central shopping corridor and Amberley Park",
    housingStock:
      "mid-2010s brick veneer family homes — most were built with either ducted or single-head splits, and most are hitting the age where the first component (usually the hot water) needs replacing",
    commonInstall:
      "ducted service and rebalance work, Mitsubishi MXZ multi-head installs adding a second and third head, and VEU-funded heat pump hot water swaps",
    localHooks: [
      "Casey Central",
      "Narre Warren South P-12 College",
      "Amberley Park Primary",
      "the Casey Fields sports complex",
    ],
    nearby: ["narre-warren", "hampton-park", "cranbourne", "berwick"],
  },
  {
    slug: "lynbrook",
    name: "Lynbrook",
    postcode: "3975",
    distanceKm: 26,
    published: true,
    council: "City of Casey",
    landmark: "the Marriott Waters estate and the Lynbrook Village shopping centre",
    housingStock:
      "2000s Marriott Waters estate homes with ducted cooling from build, laid out around the man-made lake — mostly double-storey brick veneer",
    commonInstall:
      "Zonemate zoning controller upgrades on the original 4-zone ducted systems, plus VEU heat pump hot water swaps as the developer-installed tanks reach end-of-life",
    localHooks: [
      "Lynbrook Station",
      "Marriott Waters lake",
      "Lynbrook Primary",
      "Lynbrook Village Shopping Centre",
    ],
    nearby: ["hampton-park", "lyndhurst", "cranbourne", "hallam"],
  },
  {
    slug: "lyndhurst",
    name: "Lyndhurst",
    postcode: "3975",
    distanceKm: 27,
    published: true,
    council: "City of Casey",
    landmark: "the Marriott Waters wetland corridor east of Thompsons Road",
    housingStock:
      "new estates carved out east of Thompsons Road through the 2010s — most homes fully ducted from day one with electric-storage hot water",
    commonInstall:
      "ducted rebalance and Zonemate upgrades, and iStore or Thermann heat pump swaps to unlock the VEU rebate on the original electric tanks",
    localHooks: [
      "Lyndhurst Primary",
      "Marriott Waters wetland",
      "Boyd's Reserve",
      "the Thompsons Road commuter belt",
    ],
    nearby: ["lynbrook", "hampton-park", "cranbourne", "clyde-north"],
  },
  {
    slug: "doveton",
    name: "Doveton",
    postcode: "3177",
    distanceKm: 29,
    published: true,
    council: "City of Casey",
    landmark: "the Doveton Recreation Reserve and Power Reserve",
    housingStock:
      "post-war fibro and brick homes — Doveton is one of the older postcodes in the corridor and most homes are on their original hot water and heating",
    commonInstall:
      "gas heater replacements (usually Brivis or Braemar rip-and-replace), and iStore heat pump swaps where the household qualifies for the max VEU rebate",
    localHooks: [
      "Doveton College",
      "Power Reserve",
      "Doveton Neighbourhood Centre",
      "the Autumn Place shopping strip",
    ],
    nearby: ["endeavour-hills", "hallam", "dandenong", "hampton-park"],
  },
  {
    slug: "dandenong",
    name: "Dandenong",
    postcode: "3175",
    distanceKm: 32,
    published: true,
    council: "City of Greater Dandenong",
    landmark: "Dandenong Market and the Drum Theatre on Walker Street",
    housingStock:
      "a real mix — post-war units and weatherboards near the station, newer high-density apartments through the CBD, and light-industrial commercial buildings south of the Princes Highway",
    commonInstall:
      "commercial split system fit-outs on Lonsdale and Foster Streets, and residential hot water swaps + Mitsubishi MSZ-AP wall splits in the older stock",
    localHooks: [
      "Dandenong Station",
      "Dandenong Market",
      "Chisholm TAFE",
      "the Drum Theatre",
      "Palm Plaza",
    ],
    nearby: ["doveton", "keysborough", "noble-park", "springvale"],
  },
  {
    slug: "keysborough",
    name: "Keysborough",
    postcode: "3173",
    distanceKm: 34,
    published: true,
    council: "City of Greater Dandenong",
    landmark: "the Somerfield estate and Parkmore Shopping Centre",
    housingStock:
      "Somerfield estate on the east side (2010s new builds, ducted from day one) and older Keysborough South weatherboards and brick veneer nearer Cheltenham Road",
    commonInstall:
      "ducted retrofit balancing and Zonemate upgrades in Somerfield, and VEU heat pump hot water swaps replacing the aging electric-storage tanks in Keysborough South",
    localHooks: [
      "Parkmore Shopping Centre",
      "Somerfield estate lakes",
      "Keysborough Secondary College",
      "the Kingston Heath Reserve edge",
    ],
    nearby: ["dandenong", "noble-park", "springvale", "lynbrook"],
  },
  {
    slug: "noble-park",
    name: "Noble Park",
    postcode: "3174",
    distanceKm: 33,
    published: true,
    council: "City of Greater Dandenong",
    landmark: "Noble Park Station and Ross Reserve",
    housingStock:
      "post-war fibro and brick veneer, one of the older postcodes in the south-east — most homes are on their original gas heater and electric hot water",
    commonInstall:
      "Mitsubishi MSZ-AP wall split upgrades (bedrooms first, living zone next), and iStore or Thermann heat pump hot water swaps timed to the VEU rebate",
    localHooks: [
      "Noble Park Station",
      "Ross Reserve",
      "Noble Park Secondary College",
      "the Douglas Street shopping strip",
    ],
    nearby: ["dandenong", "keysborough", "springvale", "doveton"],
  },
  {
    slug: "springvale",
    name: "Springvale",
    postcode: "3171",
    distanceKm: 34,
    published: true,
    council: "City of Greater Dandenong",
    landmark: "the Springvale Road commercial strip and Springvale Botanical Cemetery",
    housingStock:
      "older weatherboards on standard blocks through the residential streets, denser townhouse and apartment infill closer to Springvale Station and the CBD",
    commonInstall:
      "residential hot water swaps (a lot of end-of-life electric tanks), small commercial split fit-outs along the shopping strip, and Mitsubishi MSZ wall splits in the older houses",
    localHooks: [
      "Springvale Station",
      "Springvale Botanical Cemetery",
      "the Springvale Road commercial strip",
      "Springvale Reserve",
    ],
    nearby: ["dandenong", "keysborough", "noble-park"],
  },
  {
    slug: "cranbourne-east",
    name: "Cranbourne East",
    postcode: "3977",
    distanceKm: 24,
    published: true,
    council: "City of Casey",
    landmark: "the Livingston and Hunt Club estates east of the South Gippsland Highway",
    housingStock:
      "predominantly new-build family homes — Livingston, Hunt Club, and Cascades estates — most with ducted cooling from developer handover",
    commonInstall:
      "Zonemate zoning upgrades on 4-zone systems, ducted rebalancing after developer defects, and VEU-eligible heat pump swaps",
    localHooks: [
      "Cranbourne East Secondary",
      "Livingston Boulevard",
      "Hunt Club Community Centre",
      "the Cascades on Clyde estate",
    ],
    nearby: ["cranbourne", "clyde-north", "clyde", "cranbourne-north"],
  },
  {
    slug: "cranbourne-north",
    name: "Cranbourne North",
    postcode: "3977",
    distanceKm: 22,
    published: true,
    council: "City of Casey",
    landmark: "the Amstel Golf Club and the Grasmere estate",
    housingStock:
      "mid-2010s brick veneer builds through the Amstel and Grasmere estates — larger blocks than Cranbourne central, most with ducted cooling from build",
    commonInstall:
      "multi-head Mitsubishi Electric splits adding bedroom zones to homes that only came with living-zone ducted, and VEU heat pump hot water",
    localHooks: [
      "Amstel Golf Club",
      "Cranbourne North Primary",
      "Grasmere estate playgrounds",
      "the Casey Fields sports precinct",
    ],
    nearby: ["cranbourne", "cranbourne-east", "hampton-park", "clyde-north"],
  },
  {
    slug: "cranbourne-south",
    name: "Cranbourne South",
    postcode: "3977",
    distanceKm: 24,
    published: true,
    council: "City of Casey",
    landmark: "the rural fringe stretching south toward Devon Meadows and the Royal Botanic Gardens edge",
    housingStock:
      "semi-rural acreage properties on 1-to-4-hectare blocks — most on tank hot water, LPG common, no mains gas past a certain line",
    commonInstall:
      "LPG continuous-flow hot water swaps and larger 315L Reclaim R290 heat pumps sized for the higher family draw on acreage",
    localHooks: [
      "Royal Botanic Gardens Cranbourne edge",
      "Devon Meadows Road corridor",
      "the Cranbourne South rural residential streets",
    ],
    nearby: ["cranbourne", "devon-meadows", "botanic-ridge", "pearcedale"],
  },
  {
    slug: "cranbourne-west",
    name: "Cranbourne West",
    postcode: "3977",
    distanceKm: 25,
    published: true,
    council: "City of Casey",
    landmark: "the Selandra Rise estate and its Community Hub",
    housingStock:
      "new-build Selandra Rise family homes — most planned around the Community Hub and the Selandra Boulevard spine, all ducted from day one",
    commonInstall:
      "ducted rebalance and Zonemate upgrades on the original 4-zone systems, plus iStore heat pump swaps as the developer-installed tanks reach end-of-life",
    localHooks: [
      "Selandra Rise Community Hub",
      "Selandra Boulevard",
      "St Peter's College Cranbourne",
      "the Sladen Wetlands",
    ],
    nearby: ["cranbourne", "hampton-park", "lyndhurst", "cranbourne-north"],
  },
  {
    slug: "clyde",
    name: "Clyde",
    postcode: "3978",
    distanceKm: 29,
    published: true,
    council: "City of Casey",
    landmark: "the Clyde township area on Ballarto Road and the surrounding growth corridor",
    housingStock:
      "the fastest-growing corridor in the south-east — new estate builds through the 2020s, almost all with developer-installed ducted cooling from the moment keys are handed over",
    commonInstall:
      "Zonemate zoning tune-ups on ducted-from-day-one homes, VEU heat pump swaps on the developer-installed electric tanks, and Mitsubishi splits added to homes that skipped bedroom cooling",
    localHooks: [
      "Clyde Recreation Reserve",
      "Berwick Springs estate edge",
      "the Ballarto Road corridor",
      "the Casey Fields sports precinct",
    ],
    nearby: ["clyde-north", "cranbourne", "botanic-ridge", "cranbourne-east"],
  },
  {
    slug: "botanic-ridge",
    name: "Botanic Ridge",
    postcode: "3977",
    distanceKm: 27,
    published: true,
    council: "City of Casey",
    landmark: "the Settlers Run Golf & Country Club and the Royal Botanic Gardens Cranbourne boundary",
    housingStock:
      "semi-rural, larger footprint homes on 800-1500m² blocks — the higher-end end of the Cranbourne market, most fully ducted with heat pump hot water",
    commonInstall:
      "multi-head Mitsubishi MXZ multi-heads on the bigger single-storey layouts, ducted service work, and Reclaim R290 or Thermann Series 5 heat pumps sized for larger households",
    localHooks: [
      "Settlers Run Golf Club",
      "Royal Botanic Gardens Cranbourne",
      "St Peter's College Cranbourne",
      "the Sladen Wetlands",
    ],
    nearby: ["cranbourne", "clyde", "devon-meadows", "cranbourne-south"],
  },
  {
    slug: "devon-meadows",
    name: "Devon Meadows",
    postcode: "3977",
    distanceKm: 27,
    published: true,
    council: "City of Casey",
    landmark: "the Devon Meadows township and General Store on Browns Road",
    housingStock:
      "rural acreage — no mains gas past a certain distance from town, so LPG bottles and all-electric are the reality, tanks are common",
    commonInstall:
      "LPG continuous-flow gas hot water swaps and larger 315L Reclaim R290 heat pump tanks sized for the household draw on acreage",
    localHooks: [
      "Devon Meadows Primary",
      "Devon Meadows General Store",
      "Browns Road corridor",
      "the Cranbourne South rural residential fringe",
    ],
    nearby: ["botanic-ridge", "cranbourne-south", "pearcedale", "cranbourne"],
  },
  {
    slug: "pearcedale",
    name: "Pearcedale",
    postcode: "3912",
    distanceKm: 33,
    published: true,
    council: "City of Casey",
    landmark: "the Pearcedale township and the Coolart Wetlands over toward Western Port",
    housingStock:
      "rural residential on larger blocks — LPG or all-electric standard, tanks are heavy-use for large households, some hobby farms",
    commonInstall:
      "LPG conversions to continuous-flow hot water, Reclaim R290 315L heat pumps for higher family draw, and Mitsubishi FH cold-climate splits for the winter mornings",
    localHooks: [
      "Coolart Wetlands (Somers)",
      "Pearcedale Primary",
      "Pearcedale General Store",
      "the Baxter-Tooradin Road corridor",
    ],
    nearby: ["devon-meadows", "tooradin", "cranbourne-south"],
  },
  {
    slug: "tooradin",
    name: "Tooradin",
    postcode: "3980",
    distanceKm: 32,
    published: true,
    council: "City of Casey",
    landmark: "the Tooradin foreshore, the boat ramp on Sawtells Inlet, and the Tooradin Airfield",
    housingStock:
      "coastal-edge homes needing salt-tolerant hardware on the outdoor units — off-the-shelf split systems corrode within 3-5 years here, so we spec marine-grade finishes",
    commonInstall:
      "coastal-rated Mitsubishi Electric splits with marine-grade coil coating, and heat pump hot water tanks sited well away from the prevailing salt spray",
    localHooks: [
      "Tooradin Airfield",
      "Sawtells Inlet",
      "the Tooradin foreshore",
      "Tooradin Primary",
    ],
    nearby: ["pearcedale", "lang-lang", "koo-wee-rup"],
  },
  {
    slug: "nar-nar-goon",
    name: "Nar Nar Goon",
    postcode: "3812",
    distanceKm: 6,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Nar Nar Goon township and the Bunyip River crossing",
    housingStock:
      "rural blocks and older brick veneer homes — mains gas on the town blocks but LPG once you're out past the highway",
    commonInstall:
      "split system installs into the older brick veneers, and heat pump hot water upgrades from tank storage where the family draw doesn't justify LPG continuous flow",
    localHooks: [
      "Nar Nar Goon Primary",
      "Bunyip River",
      "the Nar Nar Goon Football Netball Club",
      "the Nar Nar Goon Racecourse",
    ],
    nearby: ["pakenham", "tynong", "bunyip", "pakenham-upper"],
  },
  {
    slug: "tynong",
    name: "Tynong",
    postcode: "3813",
    distanceKm: 11,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "Gumbuya World theme park and the Tynong Railway Station",
    housingStock:
      "rural residential, gas and LPG mix, some newer subdivision infill near the station",
    commonInstall:
      "LPG continuous-flow gas hot water swaps on the acreage, and Mitsubishi wall splits into the newer residential blocks",
    localHooks: [
      "Gumbuya World",
      "Tynong Railway Station",
      "Tynong Primary",
      "the Bunyip State Park western edge",
    ],
    nearby: ["nar-nar-goon", "bunyip", "garfield", "pakenham"],
  },
  {
    slug: "bunyip",
    name: "Bunyip",
    postcode: "3815",
    distanceKm: 17,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Bunyip township along Main Street and the Bunyip Football Netball Club oval",
    housingStock:
      "historic town centre with retrofit-heavy older stock — a lot of Federation weatherboards, then a ring of 90s brick veneer, then rural acreage past the town",
    commonInstall:
      "gas ducted heating replacements (Brivis and Braemar rip-and-replace), and Mitsubishi MSZ-AP wall splits into the weatherboards where ducted isn't feasible",
    localHooks: [
      "Bunyip Primary",
      "Bunyip FNC",
      "Bunyip State Park edge",
      "the Bunyip Main Street commercial strip",
    ],
    nearby: ["garfield", "tynong", "longwarry", "nar-nar-goon"],
  },
  {
    slug: "garfield",
    name: "Garfield",
    postcode: "3814",
    distanceKm: 14,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Garfield township along Main Street and Cannibal Creek Reserve",
    housingStock:
      "rural residential on standard blocks in the town, larger acreage on the outskirts — mostly weatherboard and older brick veneer",
    commonInstall:
      "Mitsubishi MSZ-AP splits into the town blocks, gas ducted heating tune-ups on the older systems, and Reclaim heat pump swaps where the family draw is heavy enough",
    localHooks: [
      "Garfield Primary",
      "Cannibal Creek Reserve",
      "Garfield Bowling Club",
      "the Iona Road corridor toward Bunyip",
    ],
    nearby: ["tynong", "bunyip", "longwarry"],
  },
  {
    slug: "cardinia-town",
    name: "Cardinia",
    postcode: "3978",
    distanceKm: 8,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Cardinia township and the shire's rural offices",
    housingStock:
      "semi-rural blocks with older brick veneer and weatherboard homes — small population, jobs here are usually acreage or rural residential",
    commonInstall:
      "LPG continuous-flow hot water swaps and Reclaim heat pumps sized for larger household draw, plus split-system installs into the residential blocks",
    localHooks: [
      "Cardinia Shire's rural office footprint",
      "the Cardinia Road corridor",
      "the Ballarto Road agricultural belt",
    ],
    nearby: ["pakenham", "officer", "clyde", "clyde-north"],
  },
  {
    slug: "koo-wee-rup",
    name: "Koo Wee Rup",
    postcode: "3981",
    distanceKm: 18,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Koo Wee Rup Swamp Historical Society and the Bunyip Main Drain running through town",
    housingStock:
      "farming and rural residential — LPG is common past town, tanks are usually large-format to match higher household draw, some newer estate infill near the town centre",
    commonInstall:
      "LPG continuous-flow hot water changeovers and 315L Reclaim R290 heat pump tanks for larger farming households, plus wall splits into the town blocks",
    localHooks: [
      "Koo Wee Rup Secondary",
      "Bunyip Main Drain",
      "Koo Wee Rup Primary",
      "the Koo Wee Rup Swamp Historical Society",
    ],
    nearby: ["lang-lang", "tooradin", "bayles", "yannathan"],
  },
  {
    slug: "lang-lang",
    name: "Lang Lang",
    postcode: "3984",
    distanceKm: 30,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Lang Lang township and the Western Port coastline south of the highway",
    housingStock:
      "rural coast — mostly older weatherboards and brick veneer, some newer coastal builds nearer Western Port, LPG common past town",
    commonInstall:
      "heat pump storage swaps and LPG continuous-flow hot water, plus salt-tolerant Mitsubishi splits for the coastal-edge properties",
    localHooks: [
      "Lang Lang Primary",
      "Western Port bay foreshore",
      "the Lang Lang Racecourse",
      "the Bass Highway commuter corridor",
    ],
    nearby: ["koo-wee-rup", "tooradin", "bayles"],
  },
  {
    slug: "bayles",
    name: "Bayles",
    postcode: "3981",
    distanceKm: 20,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Bayles township and the Bayles Fauna Park",
    housingStock:
      "farming country, low-density, larger blocks — LPG standard, tanks usually large-format to match household draw",
    commonInstall:
      "LPG continuous-flow hot water changeovers and Reclaim R290 heat pump storage sized for the farming-household draw",
    localHooks: [
      "Bayles Fauna Park",
      "Bayles Regional Primary",
      "the Bayles Cool Store on Koo Wee Rup Road",
      "the rural residential blocks along Bayles-Loch Road",
    ],
    nearby: ["koo-wee-rup", "yannathan", "lang-lang"],
  },
  {
    slug: "yannathan",
    name: "Yannathan",
    postcode: "3981",
    distanceKm: 22,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Yannathan township and the Lang Lang River crossing",
    housingStock:
      "rural farming community — LPG common, tanks usually large-format, homes further apart than any of the other Cardinia postcodes",
    commonInstall:
      "LPG continuous-flow hot water changeovers, and 315L Reclaim R290 heat pump tanks where the household draw is heavier",
    localHooks: [
      "Yannathan Primary",
      "Lang Lang River",
      "the Yannathan Bowling Club",
      "the rural residential blocks along Yannathan Road",
    ],
    nearby: ["bayles", "koo-wee-rup", "lang-lang"],
  },
  {
    slug: "longwarry",
    name: "Longwarry",
    postcode: "3816",
    distanceKm: 27,
    published: true,
    council: "Baw Baw Shire Council",
    landmark: "the Longwarry township and the Longwarry Football Netball Club oval",
    housingStock:
      "rural residential on standard blocks in the town, larger acreage on the outskirts, some newer subdivision infill along the highway",
    commonInstall:
      "ducted heating retrofits on the older stock, heat pump hot water swaps where the household draw suits it, and Mitsubishi wall splits into the newer builds",
    localHooks: [
      "Longwarry Primary",
      "Longwarry Football Netball Club",
      "the Longwarry Road corridor",
      "the West Gippsland Highway commuter belt",
    ],
    nearby: ["drouin", "bunyip", "garfield"],
  },
  {
    slug: "emerald",
    name: "Emerald",
    postcode: "3782",
    distanceKm: 27,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "Emerald Lake Park and the Puffing Billy Railway line running through town",
    housingStock:
      "Dandenong Ranges hills homes — older cottages tucked in the bush, larger newer builds on ridge blocks, most on cold-climate zones and mains gas is patchy",
    commonInstall:
      "Reclaim R290 heat pumps (they hold capacity down to -5°C, which off-the-shelf tanks don't), and Mitsubishi MSZ-FH Hyper Heating splits for the cold-morning heat load",
    localHooks: [
      "Puffing Billy Railway",
      "Emerald Lake Park",
      "Emerald Secondary College",
      "the Emerald Village shopping strip",
    ],
    nearby: ["gembrook", "cockatoo", "beaconsfield-upper", "menzies-creek", "the-patch"],
  },
  {
    slug: "cockatoo",
    name: "Cockatoo",
    postcode: "3781",
    distanceKm: 25,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Cockatoo township in the Dandenong Ranges and Wright Forest",
    housingStock:
      "hills homes on bush blocks — cold-climate zone, patchy mains gas, most on tank storage and older gas ducted heaters",
    commonInstall:
      "cold-climate Mitsubishi MSZ-FH Hyper Heating splits (they don't ice up like non-Hyper units do), and Reclaim R290 heat pumps built for the cold-morning draw",
    localHooks: [
      "Cockatoo Primary",
      "Wright Forest",
      "the Cockatoo Township shops",
      "the Puffing Billy Menzies Creek station edge",
    ],
    nearby: ["emerald", "gembrook", "beaconsfield-upper", "menzies-creek", "selby"],
  },
  // ---------- Wave 3: Dandenong Ranges + Knox hills ----------
  // These are the "higher up" homes — cold-climate zone, patchy mains gas,
  // cold-morning heat load that off-the-shelf splits struggle with. Every
  // brand recommendation here leans on Mitsubishi Hyper Heating and Reclaim
  // R290 because that's what actually holds capacity at 0–5 °C.

  {
    slug: "belgrave",
    name: "Belgrave",
    postcode: "3160",
    distanceKm: 22,
    driveMin: [28, 40],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the Puffing Billy Belgrave terminus, the Cameo Cinema and the Belgrave village strip on Burwood Highway",
    housingStock:
      "hills homes on bush blocks — a lot of 70s-80s cedar and mudbrick, plus older weatherboard cottages tucked below the ridge on steep driveways where getting equipment to site takes proper planning",
    commonInstall:
      "cold-climate Mitsubishi MSZ-FH Hyper Heating splits (they hold rated output down to -15 °C, which non-Hyper units simply don't), Reclaim R290 heat pumps for the cold-morning tank draw, and Braemar gas ducted where mains gas is on the street",
    localHooks: [
      "Puffing Billy Belgrave Station",
      "Cameo Cinemas",
      "Mater Christi College",
      "Belgrave Heights Christian School",
      "the Belgrave village strip",
    ],
    testimonial: {
      who: "Ange P., Belgrave",
      what: "Mitsubishi Hyper Heating install — cold-climate spec",
      quote:
        "First installer in three quotes who actually said 'that's not the right unit for up here.' Spec'd the FH not the AP, and the difference on frosty mornings is night and day.",
    },
    nearby: ["tecoma", "upwey", "selby", "kallista", "sherbrooke"],
    whyLocal:
      "The hills postcodes are a specialty — cold-climate heat load and steep driveways mean the wrong install just doesn't hold up. We keep FH stock on the van every winter because we're up here weekly.",
    commonProblems: [
      "Standard-spec splits (MSZ-AP, cheaper Fujitsu) icing up on winter mornings — the customer just needs the Hyper Heating variant, but nobody explained the difference at quote time",
      "Undersized heat pump tanks running cold by the second shower — hills households often need the 315L version rather than the entry 250L",
      "Steep driveways adding a labour uplift most quotes forget to include — we quote it in up front",
      "Older Braemar / Brivis ducted units without frost-protection cycling drawing full gas load 24/7 through winter",
    ],
  },
  {
    slug: "selby",
    name: "Selby",
    postcode: "3159",
    distanceKm: 19,
    driveMin: [25, 35],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the Selby General Store on Wellington Road and the Selby Community House",
    housingStock:
      "hills bush blocks with mostly older weatherboards and 80s brick veneers on 1000-3000 m² lots — many on LPG bottles or all-electric because mains gas is spotty",
    commonInstall:
      "Reclaim R290 heat pumps sized to the household draw, LPG continuous-flow changeovers where the household is heavy-use, and Mitsubishi Hyper Heating splits for the winter mornings",
    localHooks: [
      "Selby Primary",
      "Selby Community House",
      "Selby General Store",
      "the Wellington Road bush corridor",
    ],
    nearby: ["belgrave", "menzies-creek", "the-patch", "kallista", "emerald"],
  },
  {
    slug: "menzies-creek",
    name: "Menzies Creek",
    postcode: "3159",
    distanceKm: 18,
    driveMin: [22, 32],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the Puffing Billy Menzies Creek Station and the Menzies Creek township",
    housingStock:
      "semi-rural hills acreage, low-density — most homes on tank water and LPG bottles, older Federation weatherboards and 90s pole-frame builds mixed together",
    commonInstall:
      "LPG continuous-flow gas hot water changeovers, Reclaim R290 heat pumps for households cutting the LPG bill, and cold-climate splits for the frosty side of the hill",
    localHooks: [
      "Puffing Billy Menzies Creek Station",
      "Emerald Museum",
      "Menzies Creek Primary",
      "the Selby-Emerald cross-corridor",
    ],
    nearby: ["selby", "emerald", "belgrave", "the-patch", "cockatoo"],
  },
  {
    slug: "kallista",
    name: "Kallista",
    postcode: "3791",
    distanceKm: 23,
    driveMin: [30, 42],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "Grants Picnic Ground and the Kallista village shops on Monbulk Road",
    housingStock:
      "cool-temperate rainforest blocks with a lot of older cedar and mudbrick cottages plus a few larger contemporary hills builds — every install has to plan around ferngullies and access",
    commonInstall:
      "Mitsubishi MSZ-FH Hyper Heating splits, Reclaim R290 heat pumps (silent enough not to disturb the neighbours across the gully), and split-system relocations when the old outdoor unit is corroded from constant damp",
    localHooks: [
      "Grants Picnic Ground",
      "Kallista Primary",
      "the Kallista village shops",
      "the Sherbrooke Forest edge",
    ],
    nearby: ["sherbrooke", "sassafras", "the-patch", "monbulk", "belgrave"],
  },
  {
    slug: "sassafras",
    name: "Sassafras",
    postcode: "3787",
    distanceKm: 26,
    driveMin: [32, 45],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the Sassafras village strip along Mount Dandenong Tourist Road and Miss Marple's Tea Room",
    housingStock:
      "cool-climate hills homes — a mix of restored heritage cottages in the village core and larger contemporary builds on bush blocks either side",
    commonInstall:
      "cold-climate Mitsubishi MSZ-FH Hyper Heating splits (the go-to for anywhere north of Belgrave), Reclaim R290 heat pumps for reliable morning hot water, and refrigeration servicing on the cafe strip",
    localHooks: [
      "Sassafras village strip",
      "Miss Marple's Tea Room",
      "Sherbrooke Forest",
      "Perrin's Creek Reserve",
    ],
    nearby: ["olinda", "sherbrooke", "kallista", "mount-dandenong", "the-patch"],
  },
  {
    slug: "sherbrooke",
    name: "Sherbrooke",
    postcode: "3789",
    distanceKm: 23,
    driveMin: [30, 42],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "Sherbrooke Forest and the lyrebird walk off Sherbrooke Lodge Road",
    housingStock:
      "bush blocks tucked deep in the forest — driveways can be 100 m of gravel, most homes are cedar-clad or mudbrick with wood heaters as the primary and splits as the secondary",
    commonInstall:
      "Mitsubishi Hyper Heating splits sized as the secondary heat source alongside a wood heater, and Reclaim R290 heat pumps for households moving off LPG bottles",
    localHooks: [
      "Sherbrooke Forest",
      "the lyrebird walk trailhead",
      "Kallista village (short drive)",
      "Belgrave Heights Christian School catchment",
    ],
    nearby: ["kallista", "sassafras", "belgrave", "the-patch", "monbulk"],
  },
  {
    slug: "olinda",
    name: "Olinda",
    postcode: "3788",
    distanceKm: 28,
    driveMin: [35, 48],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the National Rhododendron Gardens, Olinda Falls and the Olinda village shops",
    housingStock:
      "heritage weatherboards and 60s-70s hills chalets on ridge blocks — cold-temperate climate, snow on the ridge occasionally, mains gas patchy so LPG or all-electric common",
    commonInstall:
      "Mitsubishi MSZ-FH Hyper Heating splits (they're the only splits that hold capacity in a proper hills winter), Reclaim R290 heat pumps, and Braemar gas ducted replacements where mains gas reaches",
    localHooks: [
      "National Rhododendron Gardens",
      "Olinda Falls",
      "Olinda Primary",
      "the Olinda village shopping strip",
    ],
    nearby: ["mount-dandenong", "sassafras", "silvan", "monbulk"],
  },
  {
    slug: "mount-dandenong",
    name: "Mount Dandenong",
    postcode: "3767",
    distanceKm: 30,
    driveMin: [38, 50],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the SkyHigh lookout at the summit and the Mount Dandenong village",
    housingStock:
      "the highest residential postcode we service — cold-climate ridge homes, several heritage guest houses and larger architectural builds on blocks with commanding views but brutal winter exposure",
    commonInstall:
      "Mitsubishi MSZ-FH Hyper Heating splits are mandatory (rated to -15 °C, holds output where other brands drop 40%), Reclaim R290 for the tank draw, and full ducted retrofits with proper cold-climate outdoor units",
    localHooks: [
      "SkyHigh Mount Dandenong",
      "Mount Dandenong village",
      "Cloudehill Gardens",
      "William Ricketts Sanctuary (short drive)",
    ],
    nearby: ["olinda", "sassafras", "silvan"],
    whyLocal:
      "Mount Dandenong homes have three problems most suburbs don't: cold-climate heat load, exposure to horizontal rain, and driveways that need a proper 4WD. Every install we quote up here includes the correct spec for all three — we don't try to sell a coastal-spec split to a ridge house.",
    commonProblems: [
      "Standard-spec splits under-performing at 0-5 °C — needs a proper Hyper Heating unit, not a Northern-slope compromise",
      "Outdoor units mounted on the exposed side of the house, taking horizontal rain — we relocate to a sheltered aspect and add a wind-shield hood",
      "Heat pump tanks sized on standard tables — hills households often need the next size up because of cold inlet water",
    ],
  },
  {
    slug: "monbulk",
    name: "Monbulk",
    postcode: "3793",
    distanceKm: 23,
    driveMin: [30, 42],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the Monbulk township along Main Road and Silvan Reservoir Park",
    housingStock:
      "hills town core plus surrounding acreage — brick veneer and weatherboard in town, larger acreage properties on the outskirts, nursery country so a lot of homes have commercial-scale water use",
    commonInstall:
      "Reclaim R290 heat pumps sized for the higher household draw, Mitsubishi Hyper Heating splits for winter, and gas ducted replacements where mains gas is on the street",
    localHooks: [
      "Monbulk Secondary College",
      "Monbulk Primary",
      "Silvan Reservoir Park",
      "the Emerald Lake edge",
    ],
    nearby: ["silvan", "the-patch", "kallista", "olinda", "emerald"],
  },
  {
    slug: "silvan",
    name: "Silvan",
    postcode: "3795",
    distanceKm: 26,
    driveMin: [32, 45],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "Silvan Reservoir and the Tesselaar Tulip Farm off Monbulk Road",
    housingStock:
      "rural hills — mostly acreage, nurseries and orchards, tank water standard, LPG common because mains gas doesn't extend this far",
    commonInstall:
      "LPG continuous-flow hot water swaps and Reclaim R290 heat pumps sized to acreage-household draw, plus Mitsubishi Hyper Heating splits into the residential homes",
    localHooks: [
      "Silvan Reservoir",
      "Tesselaar Tulip Farm",
      "Silvan Primary",
      "the Monbulk Road orchard corridor",
    ],
    nearby: ["monbulk", "olinda", "the-patch", "mount-dandenong"],
  },
  {
    slug: "the-patch",
    name: "The Patch",
    postcode: "3792",
    distanceKm: 23,
    driveMin: [30, 42],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "The Patch Primary School and Old Emerald Road",
    housingStock:
      "hills residential on 1000-4000 m² blocks — a mix of cedar hills-style builds and 90s brick veneers, most on tank water, LPG or all-electric",
    commonInstall:
      "Reclaim R290 heat pumps, Mitsubishi Hyper Heating splits, and heat-pump-to-electric retrofit work as households phase out LPG bottles",
    localHooks: [
      "The Patch Primary",
      "the Old Emerald Road corridor",
      "Silvan Reservoir edge",
      "Kallista village (short drive)",
    ],
    nearby: ["monbulk", "kallista", "selby", "silvan", "emerald"],
  },
  {
    slug: "upwey",
    name: "Upwey",
    postcode: "3158",
    distanceKm: 24,
    driveMin: [28, 40],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "the Upwey village shopping strip and Upwey railway station on the Belgrave line",
    housingStock:
      "hills village stock — weatherboards through the village core and 70s-80s brick veneer on the ridges above, mains gas on most streets, retrofit-heavy",
    commonInstall:
      "gas ducted retrofits (Braemar and Brivis rip-and-replace), Mitsubishi MSZ-FH Hyper Heating splits, and Reclaim R290 heat pumps where the household is ready to move off gas",
    localHooks: [
      "Upwey Station",
      "Upwey High School",
      "Upwey Primary",
      "the Upwey village shopping strip",
    ],
    nearby: ["tecoma", "belgrave", "ferntree-gully", "upper-ferntree-gully"],
  },
  {
    slug: "tecoma",
    name: "Tecoma",
    postcode: "3160",
    distanceKm: 23,
    driveMin: [28, 40],
    published: true,
    council: "Yarra Ranges Shire Council",
    landmark: "Tecoma railway station on the Belgrave line and the Burwood Highway village strip",
    housingStock:
      "hills residential village — weatherboards along the highway, brick veneer on the ridges either side, mains gas throughout most of the postcode",
    commonInstall:
      "Mitsubishi Hyper Heating splits, gas ducted rip-and-replace on end-of-life Brivis units, and iStore or Reclaim heat pump swaps replacing original electric tanks",
    localHooks: [
      "Tecoma Station",
      "Burwood Highway village strip",
      "Tecoma Primary",
      "the Belgrave-Fern Tree Gully commuter corridor",
    ],
    nearby: ["upwey", "belgrave", "upper-ferntree-gully", "ferntree-gully"],
  },
  {
    slug: "upper-ferntree-gully",
    name: "Upper Ferntree Gully",
    postcode: "3156",
    distanceKm: 26,
    driveMin: [30, 42],
    published: true,
    council: "Knox City Council",
    landmark: "Upper Ferntree Gully Station and the Ferntree Gully NP entry at the base of the 1000 Steps",
    housingStock:
      "hillside residential — a lot of 70s-80s brick veneer on sloping blocks, mains gas standard, some newer infill on the ridge closer to the national park",
    commonInstall:
      "gas ducted retrofits, Mitsubishi wall splits sized for the sloping-block heat load, and VEU heat pump swaps as original electric tanks age out",
    localHooks: [
      "Upper Ferntree Gully Station",
      "1000 Steps trailhead",
      "Ferntree Gully National Park",
      "Upper Ferntree Gully Primary",
    ],
    nearby: ["ferntree-gully", "upwey", "tecoma", "boronia"],
  },
  {
    slug: "ferntree-gully",
    name: "Ferntree Gully",
    postcode: "3156",
    distanceKm: 27,
    driveMin: [32, 45],
    published: true,
    council: "Knox City Council",
    landmark: "Westfield Knox at the edge of the postcode, Ferntree Gully Station and the FTG Village shops on Station Street",
    housingStock:
      "a real spread — post-war brick veneer through the older streets north of the highway, 80s-90s family homes in the estates south, plus new townhouse infill near the station",
    commonInstall:
      "full ducted retrofits into the family homes, Mitsubishi multi-head splits for the townhouses, and heat pump hot water swaps replacing original electric tanks — a strong VEU rebate postcode",
    localHooks: [
      "Westfield Knox",
      "Ferntree Gully Station",
      "Ferntree Gully NP",
      "St Joseph's College",
      "Knox Grammar",
    ],
    testimonial: {
      who: "Marcus L., Ferntree Gully",
      what: "Ducted retrofit — full spec, no upsell",
      quote:
        "Third quote and the only one that didn't try to push us onto their 'preferred' brand. Spec'd the Mitsubishi we asked for, priced it fairly, done in a day.",
    },
    nearby: ["upper-ferntree-gully", "boronia", "lysterfield", "rowville"],
  },
  {
    slug: "boronia",
    name: "Boronia",
    postcode: "3155",
    distanceKm: 30,
    driveMin: [35, 48],
    published: true,
    council: "Knox City Council",
    landmark: "the Boronia Mall shopping centre, Boronia Station and the Dorset Square precinct",
    housingStock:
      "post-war brick and weatherboard through the older streets, 90s brick veneer south toward Wantirna, some newer townhouse infill near the station",
    commonInstall:
      "gas ducted heater replacements, iStore or Thermann heat pump swaps replacing original electric tanks (max VEU rebate territory), and Mitsubishi MSZ wall splits in the older stock",
    localHooks: [
      "Boronia Mall",
      "Boronia Station",
      "Boronia West Primary",
      "the Dorset Square precinct",
    ],
    nearby: ["ferntree-gully", "upper-ferntree-gully", "lysterfield"],
  },
  {
    slug: "lysterfield",
    name: "Lysterfield",
    postcode: "3156",
    distanceKm: 22,
    driveMin: [26, 38],
    published: true,
    council: "Knox City Council",
    landmark: "Lysterfield Park, Lysterfield Lake and the Belgrave-Hallam Road ridge",
    housingStock:
      "large-block hills residential — most homes on 1000-2000 m² blocks with room for outdoor unit siting, mostly late-80s and 90s brick veneer, mains gas on most streets",
    commonInstall:
      "full ducted retrofits on double-storey brick veneers, Mitsubishi MXZ multi-heads adding bedroom cooling to living-zone-only originals, and Reclaim R290 heat pumps for the households ready to phase out gas",
    localHooks: [
      "Lysterfield Park",
      "Lysterfield Lake",
      "Lysterfield Primary",
      "the Wellington Road corridor",
    ],
    nearby: ["rowville", "ferntree-gully", "boronia", "belgrave"],
  },
  {
    slug: "rowville",
    name: "Rowville",
    postcode: "3178",
    distanceKm: 27,
    driveMin: [30, 42],
    published: true,
    council: "Knox City Council",
    landmark: "Stud Park Shopping Centre, Rowville Community Kindergarten and the Rowville Secondary Sports Academy",
    housingStock:
      "predominantly late-80s and 90s brick veneer family homes on standard 600-800 m² blocks — a lot of ducted heating from build, most on their original hot water",
    commonInstall:
      "gas ducted heating tune-ups and replacements, iStore or Thermann heat pump swaps replacing original electric tanks, and Mitsubishi MXZ multi-head splits for zoning older homes",
    localHooks: [
      "Stud Park Shopping Centre",
      "Rowville Secondary College",
      "Karoo Primary",
      "the Wellington Road commuter belt",
      "Lysterfield Park",
    ],
    nearby: ["lysterfield", "ferntree-gully", "boronia"],
  },

  {
    slug: "gembrook",
    name: "Gembrook",
    postcode: "3783",
    distanceKm: 26,
    published: true,
    council: "Cardinia Shire Council",
    landmark: "the Gembrook township, the Puffing Billy Gembrook terminus, and the edge of Bunyip State Park",
    housingStock:
      "hills, larger bush blocks — most homes on LPG or all-electric, cold-climate heat load through winter, some older bushfire-rebuild stock",
    commonInstall:
      "Reclaim R290 heat pumps and Mitsubishi Hyper Heating splits, plus LPG continuous-flow gas hot water changeovers where mains gas doesn't reach",
    localHooks: [
      "Puffing Billy Gembrook Station",
      "Bunyip State Park",
      "Gembrook Primary",
      "the Gembrook township shops",
    ],
    nearby: ["emerald", "cockatoo", "bunyip"],
  },
];

export const publishedSuburbs: Suburb[] = suburbs.filter((s) => s.published);

export type SuburbSlug = (typeof suburbs)[number]["slug"];

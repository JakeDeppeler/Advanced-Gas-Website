// Blog post data, one source of truth for /blog and /blog/[slug].
// Content is written in plain paragraphs and simple headings.

export type BlogPost = {
  slug: string;
  cat: string;
  date: string;
  read: string;
  /** The editorial headline. Used as the on-page H1, where length is
   *  fine. */
  title: string;
  /** ISO 8601 publication date, for Article schema and dateModified
   *  discipline. WEB-013: the visible label was a human string ("August
   *  2026", "Updated this week") with no machine date behind it. */
  publishedISO: string;
  /** ISO 8601, only where the post has genuinely been revised. */
  updatedISO?: string;
  /** Key into AUTHORS. WEB-012: every post read "By the team"; a named,
   *  credentialed author is both an E-E-A-T signal and the honest byline. */
  author: string;
  /**
   * The `<title>` tag, authored to Google's ~60-character budget.
   * WEB-005: the editorial titles run 53–72 characters, so clamping
   * them for the site suffix produced "…Melbourne: the | Advanced Gas"
   * — a title ending on a dangling article. Falls back to `title` when
   * a post's headline is already short enough.
   */
  seoTitle?: string;
  blurb: string;
  photo: string;
  photoAlt: string;
  featured?: boolean;
  alt?: boolean;
  content: Section[];
};

export type Section =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

/**
 * The people who actually write and sign off these posts. A named
 * author with a licence number is the strongest authorship signal Google
 * reads, and it's the truthful byline — "the team" is nobody.
 */
export type Author = {
  name: string;
  role: string;
  credential: string;
  photo: string;
  bio: string;
  /** For Person schema sameAs — points at the About page. */
  url: string;
};

export const AUTHORS: Record<string, Author> = {
  dean: {
    name: "Dean Winbanks",
    role: "Director & Licensed Plumber",
    credential: "Plumbing Licence 46828",
    photo: "/dean.webp",
    bio: "Dean has run gas, hot water and hydronic jobs across Melbourne's south-east for over twenty years. He signs off every compliance certificate we issue.",
    url: "/about",
  },
  jake: {
    name: "Jake Deppeler",
    role: "Installer & Estimator",
    credential: "ARC AU59557",
    photo: "/jake.webp",
    bio: "Jake quotes and installs the aircon and heat pump work, and sizes every system off a real heat load rather than a guess. If we quoted it, he's seen the roof.",
    url: "/about",
  },
};

export const posts: BlogPost[] = [
  {
    slug: "veu-rebate-2026-pakenham-guide",
    publishedISO: "2026-08-06",
    updatedISO: "2026-08-24",
    author: "dean",
    seoTitle: "VEU Rebate 2026: The Pakenham Guide",
    cat: "VEU rebates",
    date: "Updated this week",
    read: "14 min read",
    title: "The complete Pakenham guide to the VEU rebate in 2026",
    blurb: "What it is, what's actually changed in 2026, the real maximum you can claim on a heat pump or aircon, and the 3 mistakes most homeowners make on the application.",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump install with VEU rebate applied",
    featured: true,
    content: [
      { type: "p", text: "The Victorian Energy Upgrades (VEU) program is the biggest chunk of free money most Pakenham households will ever leave on the table. It's the state government's way of getting old, inefficient gas and electric appliances out of homes and replacing them with efficient heat pumps and reverse-cycle aircon, and it's the reason a heat pump costs a fraction of its sticker price once the paperwork is done." },
      { type: "h2", text: "What actually changed in 2026" },
      { type: "p", text: "The certificate values shifted at the start of the year. VEEC (Victorian Energy Efficiency Certificates) and STC (Small-scale Technology Certificates) are the two rebates that stack on every heat pump job. In 2026, a typical Pakenham heat pump install now pulls VEEC ~$576 and STC ~$629, totalling $1,205 in base rebates before you factor in the $400 Australian Made bonus and the $1,000 Solar Homes hot water rebate for eligible households." },
      { type: "p", text: "That's up from about $1,050 in base rebates for most of last year. So if you had a quote in 2025 that felt just out of reach, the same job might be $150-$200 cheaper today." },
      { type: "h2", text: "The real maximum you can claim" },
      { type: "p", text: "For a heat pump hot water install in Pakenham, the fully-stacked rebate looks like this:" },
      { type: "ul", items: [
        "VEEC: ~$576",
        "STC: ~$629",
        "Australian Made bonus (Reclaim, Thermann, Dux): $400",
        "Solar Homes hot water rebate (eligible households): $1,000",
        "Total: up to $2,605 off",
      ] },
      { type: "p", text: "A Reclaim R290 285 L all-in-one that lists at around $3,500 ex GST becomes $2,610 fully installed for an owner-occupier that qualifies for Solar Homes. That's a 25-year payback compressed into 6-7 years." },
      { type: "h2", text: "The 3 mistakes we see homeowners make" },
      { type: "p", text: "First, chasing installers who don't apply the rebate at quote. If someone quotes you $5,000 and says \"you claim the rebate back\", walk away. VEU is designed to be applied at the point of sale, accredited installers do it inside the quote. If they're making you chase the certificates, they're pocketing the difference or they haven't done the paperwork." },
      { type: "p", text: "Second, not checking Solar Homes eligibility. The $1,000 hot water rebate has strict criteria, owner-occupier, combined household income under $150k, property value under $3M, no prior HW/battery Solar Homes rebate at the address, existing hot water system at least 3 years old, but if you tick all five boxes, that $1,000 is yours. Roughly half the Pakenham households we quote qualify and don't know it." },
      { type: "p", text: "Third, comparing sticker prices without the $400 Australian Made bonus in the sum. Reclaim, Thermann and Dux all qualify for it. iStore is designed here and built in China, so it doesn't. That can turn a unit that looks $200 ahead on the shelf into one that lands $200 behind on the invoice, and it can just as easily go the other way once the VEU number is applied. The only figure worth comparing is the one at the bottom of the quote." },
      { type: "h2", text: "What to do next" },
      { type: "p", text: "Get us out for a 20-minute site check. We'll size the unit properly for your household, work out your Solar Homes eligibility on the spot, and email you a fixed-price quote within 12 hours with all the rebates already applied. No chase, no surprise invoice on the day." },
    ],
  },
  {
    slug: "reclaim-vs-istore-vs-thermann",
    publishedISO: "2026-05-04",
    author: "dean",
    seoTitle: "Reclaim vs iStore vs Thermann Heat Pumps",
    cat: "Heat pumps",
    date: "4 May 2026",
    read: "10 min read",
    title: "Reclaim vs iStore vs Thermann: which heat pump is right for your house?",
    blurb: "Honest comparison of the three brands we actually install, with sizing advice for 2 / 3 / 5-person households.",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Thermann heat pump install",
    content: [
      { type: "p", text: "We install about 400 heat pumps a year across Pakenham, Berwick, Cranbourne and Officer. Three brands dominate that mix: Reclaim, iStore and Thermann. Here's the honest comparison, pros, cons, price and who each one suits." },
      { type: "h2", text: "Reclaim (Australian made)" },
      { type: "p", text: "Reclaim is the one to pick when you're staying in the house. Made in Australia, in two ranges: the R290 all-in-one, tank and compressor in one shell with a plug-in install, at 200 L and 285 L; and the CO₂ split, where the compressor sits outside and the tank goes wherever it fits." },
      { type: "p", text: "The split is where Reclaim earns its money. CO₂ runs at 37 dB, which is about a whisper, holds above 60 °C on a cold Pakenham morning, and the stainless tank option carries a 15-year warranty. The R290 all-in-one answers a different question: it's the one for a site with nowhere to put an outdoor unit, and it plugs straight in if there's a power point within 75 cm of the current tank." },
      { type: "p", text: "Fully installed: R290 285 L from $2,610 inc GST after all VEU rebates. CO₂ split 315L glass-lined Wi-Fi from $5,340. CO₂ split 400L stainless steel Wi-Fi $6,745." },
      { type: "h2", text: "Thermann (Australian made)" },
      { type: "p", text: "Thermann is the one to pick when the parts pipeline is what matters. 285 L all-in-one R290, near enough the same footprint and the same performance as the Reclaim R290, built by Dux in Moss Vale so it takes the $400 Australian Made rebate. It's Reece's own brand, which means every Reece store in Victoria stocks the spares, and a fault gets fixed the same day rather than next week. On a rental or an investment property that's usually the whole argument." },
      { type: "p", text: "Fully installed: $2,610 inc GST after all VEU rebates." },
      { type: "h2", text: "iStore (Chinese-made, Australian designed)" },
      { type: "p", text: "iStore is designed here and built in China, so it doesn't take the $400 Australian Made rebate. What it does do is take the VEU further than anything else we fit. Smart Wi-Fi control is built in rather than an accessory, the tank warranty runs 6 years, and solar households like it because the app makes scheduling the daytime charge straightforward." },
      { type: "p", text: "Fully installed: $2,910 inc GST after VEU rebates (the missing Aus-made bonus is why it's $300 more than Reclaim/Thermann)." },
      { type: "h2", text: "Which one for your house?" },
      { type: "p", text: "Two people, one bathroom: Thermann 200 L or Reclaim R290 200 L. Same price, both plug in, both Australian made. Pick on which one your local Reece stocks." },
      { type: "p", text: "Three or four people, showers split morning and night: Reclaim R290 285 L or Thermann 285 L, $2,610 fully installed. This is the size most Pakenham families land on." },
      { type: "p", text: "Five or more people, or the whole house showers inside an hour: Reclaim CO₂ split 315 L or 400 L. It costs more on the day, and the split layout, the stainless tank and the CO₂ recovery rate are what keep up with that pattern of draw." },
      { type: "p", text: "Solar on the roof and you want to time the charge: iStore 270 L. The Wi-Fi is built in rather than bolted on, and if you actually use it to run the compressor on your own daytime export it pays for the difference the Australian Made bonus makes." },
      { type: "p", text: "Not sure? Book a free site check, we'll size it properly and quote you all three so you can pick." },
    ],
  },
  {
    slug: "heat-pump-real-cost-2026",
    publishedISO: "2026-04-28",
    author: "dean",
    seoTitle: "Heat Pump Cost After the VEU Rebate, 2026",
    cat: "Costs",
    date: "28 Apr 2026",
    read: "7 min read",
    title: "What does a heat pump actually cost after the VEU rebate in 2026?",
    blurb: "Real numbers, not \"from $XXX\" marketing, for a 270L Reclaim install in Pakenham, with the VEU rebate applied.",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump install",
    alt: true,
    content: [
      { type: "p", text: "Every heat pump ad on the internet says \"from $X\" without ever telling you what the actual final number is. Here's the real maths on a typical Pakenham install, line by line." },
      { type: "h2", text: "The Reclaim R290 300 L all-in-one" },
      { type: "p", text: "This is our best-selling unit for 3-4 person households. Australian made, plug-in install, R290 refrigerant. Reclaim's 2026 RRP is $3,545 ex GST. Our ex-GST price to the customer is RRP minus $100, so $3,445. Plus GST, that's $3,789.50." },
      { type: "h2", text: "Then the install costs" },
      { type: "p", text: "For an all-in-one plug-in install where there's a power point within 75 cm of the current tank, the installation pack is:" },
      { type: "ul", items: [
        "Labour: $700 ex GST ($770 inc)",
        "Sundry materials: $350 ex GST ($385 inc)",
        "VBA compliance certificate: $50 ex GST ($55 inc)",
        "Install pack total: $1,210 inc GST",
      ] },
      { type: "p", text: "Combined with the unit, subtotal is $4,999.50 inc GST before any rebates." },
      { type: "h2", text: "Rebates applied (Solar Homes eligible)" },
      { type: "ul", items: [
        "VEEC rebate: -$576",
        "STC rebate: -$629",
        "Australian Made bonus (Reclaim qualifies): -$400",
        "Solar Homes hot water rebate: -$1,000",
        "Total rebates: -$2,605",
      ] },
      { type: "h2", text: "Final price: $2,610 inc GST" },
      { type: "p", text: "That's it. Fully installed, old unit gone, compliance certificate emailed, warranty pack in your inbox within 24 hours. No hidden charges, no \"actually the electrical is extra\" surprise on the day." },
      { type: "p", text: "If you don't have a power point within 75 cm of the current hot water, add about $450 for a licensed sparky to run one, so $3,060 all up." },
      { type: "p", text: "If you're not Solar Homes eligible (rental, income over $150k, prior rebate at the address), drop the -$1,000 from the rebate stack. Final price becomes $3,610 inc GST." },
      { type: "p", text: "Compared with a like-for-like gas tank replacement at around $2,200, the heat pump is about $410 more up front, and cuts your hot water running cost by ~73%. Payback is usually 2-3 years, depending on how much hot water you use." },
    ],
  },
  {
    slug: "size-split-system-bedroom",
    publishedISO: "2026-04-19",
    author: "jake",
    seoTitle: "How to Size a Split System, No Upsell",
    cat: "Aircon",
    date: "19 Apr 2026",
    read: "9 min read",
    title: "How to size a split system for your bedroom (and not get oversold)",
    blurb: "The 2.5kW vs 3.5kW vs 5kW question, demystified. Includes a quick room-size table for SE Melbourne homes.",
    photo: "/kaden-indoor.webp",
    photoAlt: "Kaden split system indoor head",
    content: [
      { type: "p", text: "Every second aircon quote we see for a Pakenham bedroom pitches a 5 kW unit. Almost none of them actually need it. Here's how to size it right." },
      { type: "h2", text: "The rough rule of thumb" },
      { type: "p", text: "For a well-insulated Pakenham home (built after ~2005), a split system in kW = your room's floor area in m² divided by 10-12. So a standard 12 m² bedroom needs about 1.0-1.2 kW of cooling, but the smallest split you can buy is 2.5 kW. So a 2.5 kW is more than enough for anything from a 12 to 20 m² room." },
      { type: "h2", text: "Quick sizing table for SE Melbourne homes" },
      { type: "ul", items: [
        "Small bedroom (10-15 m²): 2.5 kW split",
        "Large bedroom or small living (16-25 m²): 3.5 kW split",
        "Standard living / open plan (26-40 m²): 5.0 kW split",
        "Large open-plan (41-55 m²): 7.1 kW split",
        "Big open living + kitchen (56-75 m²): 9.0 kW split or step up to multi-head",
      ] },
      { type: "h2", text: "Why oversizing costs you money" },
      { type: "p", text: "Bigger isn't better. An oversized split short-cycles, it hits the setpoint fast, kicks off, then kicks on again 3 minutes later. That's rough on the compressor, chews power, and leaves the room feeling humid because it never runs long enough to dehumidify properly." },
      { type: "p", text: "The right-sized unit runs steadier, dehumidifies properly, uses less power, and lasts longer. So don't let anyone talk you into a 5 kW for a bedroom." },
      { type: "h2", text: "Brand notes" },
      { type: "p", text: "For bedrooms, Mitsubishi Electric's MSZ-AP series runs 19 dB indoor, that's about as quiet as a library. Perfect for kids' rooms and light sleepers. Costs a bit more than Kaden but you notice at 3 am." },
      { type: "p", text: "For living areas, Kaden gives you the best bang for buck, the KS series has a 5-year warranty and R32 inverter tech at Mitsubishi-lite pricing." },
      { type: "p", text: "Get us to quote you a size we'd actually install ourselves. We'll pick the smaller of two options if it does the job, reputation is worth more than an extra kW in someone's kid's bedroom." },
    ],
  },
  {
    slug: "carbon-monoxide-testing-ducted-heaters",
    publishedISO: "2026-04-11",
    author: "dean",
    seoTitle: "Carbon Monoxide Testing, Ducted Heaters",
    cat: "Gas safety",
    date: "11 Apr 2026",
    read: "6 min read",
    title: "Carbon monoxide testing on ducted heaters: why every 2 years matters",
    blurb: "What CO is, how it builds up in old units, what we test for on a service, and why this isn't a corner you can cut.",
    photo: "/evap-cooler-service.webp",
    photoAlt: "Gas safety service technician testing",
    alt: true,
    content: [
      { type: "p", text: "Carbon monoxide is the colourless, odourless gas that kills a couple of Victorian families every winter. It comes from gas heaters that aren't burning cleanly, cracked heat exchangers, blocked flues, spider webs in the burner. You can't see it, smell it, or feel it building up. That's why we CO-test every gas heater we service." },
      { type: "h2", text: "What actually happens on a CO test" },
      { type: "p", text: "We run a two-stage test. First, an atmospheric test, the ducted unit runs on its normal cycle while we measure CO in the return air with a calibrated analyser. If we get any reading above 30 parts per million we're already investigating. Above 100 ppm and the unit is red-tagged on the spot." },
      { type: "p", text: "Second, a flue-gas test at the burner. We measure O₂, CO and combustion efficiency straight from the burn. A healthy ducted gas heater sits under 100 ppm CO air-free and above 78% combustion efficiency. Anything worse means the heat exchanger or burner needs attention." },
      { type: "h2", text: "Why every 2 years" },
      { type: "p", text: "Ducted gas heaters accumulate dust and lint in the burner over time, spider webs form in the flue draft diverter, and heat exchangers develop micro-cracks from thermal cycling. All three fail slowly, you don't notice degradation until it's dangerous." },
      { type: "p", text: "The Australian Gas Association recommends CO testing every 2 years. Insurance companies increasingly ask for the CO test report on rental properties. And the difference between a 25-year-old ducted heater that's safe and one that's leaking CO into the house is often just one skipped service." },
      { type: "h2", text: "What we charge" },
      { type: "p", text: "$280 + GST for a full gas heater service with CO test. Includes:" },
      { type: "ul", items: [
        "Visual inspection of the unit, ductwork and flue",
        "Burner clean, ignition check, gas pressure test",
        "Full atmospheric and flue-gas CO test",
        "Written report with all readings, for insurance or landlord records",
      ] },
      { type: "p", text: "If we find CO above the limits, we red-tag the unit and give you options: fix (heat exchanger swap, flue clear, burner replace) or replace. We don't upsell, if it's fixable we fix it." },
      { type: "p", text: "Book a service before the cold snap and we can usually get you in within a week." },
    ],
  },
  {
    slug: "heat-pumps-plus-solar",
    publishedISO: "2026-04-02",
    author: "dean",
    seoTitle: "Heat Pumps + Solar PV: The Daytime Trick",
    cat: "Solar pairing",
    date: "2 Apr 2026",
    read: "11 min read",
    title: "Heat pumps + solar PV: the daytime-charge trick that drops bills to zero",
    blurb: "How to schedule a Reclaim or iStore unit to run in the middle of the day on your own solar export, which is about as cheap as hot water gets.",
    photo: "/reclaim-mitsubishi.webp",
    photoAlt: "Reclaim heat pump and outdoor unit on a brick wall",
    content: [
      { type: "p", text: "If you've got solar PV and a modern heat pump, you can run your hot water for free. Literally free. Here's how the daytime-charge trick works." },
      { type: "h2", text: "The principle" },
      { type: "p", text: "Most solar households export more energy in the middle of the day than they use. The feed-in tariff is usually 4-8c/kWh, while the retail rate you're paying to buy back is 30-40c/kWh. That's a huge margin you're giving away." },
      { type: "p", text: "A modern heat pump uses 500-800 W to heat 250-300 L of water, about 3-5 hours of runtime a day for a family of four. If you schedule those 3-5 hours during peak solar production (roughly 10 am to 3 pm), you're running the heat pump off your own free electricity instead of exporting it." },
      { type: "h2", text: "How to schedule it" },
      { type: "p", text: "The Reclaim CO₂ split with Wi-Fi controller, Reclaim R290 (Wi-Fi is built in), and iStore all let you set a heating window in the app. Point them at 10 am to 3 pm. The tank fills to setpoint during solar hours and holds temperature through the evening on stored heat." },
      { type: "p", text: "Thermann doesn't currently ship a Wi-Fi controller, so you'd need a mechanical timer on the power point. Slightly clunkier but same result." },
      { type: "h2", text: "Real numbers from a Pakenham install" },
      { type: "p", text: "One of our recent installs, 4-person household, 6.6 kW solar, Reclaim R290 300 L. Their hot water usage was averaging 260 L/day. Before the swap: gas storage tank running them ~$680/year in gas. After the swap and scheduling: heat pump running off solar during the day, essentially $0/year in incremental power cost. The heat pump's 500-800 W draw sits entirely within their solar export headroom." },
      { type: "p", text: "That's a $680/year saving on top of the ~$1,000 they saved on the install through Solar Homes and the Aus-made rebate. Payback under 4 years." },
      { type: "h2", text: "Gotchas" },
      { type: "p", text: "Cloudy days you're not covered, the heat pump will still run but it'll pull from grid. Over a year the average is 85-90% solar coverage in Pakenham." },
      { type: "p", text: "Winter mornings are the pinch point, solar is weak and heat pump COP drops slightly in cold air. Some households add a small booster window at 3 am on off-peak power to top up. Adds maybe $30-$50/year." },
      { type: "p", text: "If you've got solar and you're on gas hot water, we're happy to talk through the numbers on your specific setup, free 20-minute chat, no pressure." },
    ],
  },
  {
    slug: "hot-water-tank-failed-replace-or-upgrade",
    publishedISO: "2026-03-25",
    author: "dean",
    seoTitle: "Tank Failed? Replace or Go Heat Pump",
    cat: "Hot water",
    date: "25 Mar 2026",
    read: "5 min read",
    title: "Hot water tank failed? Replace like-for-like, or upgrade to heat pump?",
    blurb: "When the gas tank goes you've got 48 hours to decide. Here's the maths, including the heat pump rebate question.",
    photo: "/gas-hot-water-changeover.webp",
    photoAlt: "Gas hot water changeover install",
    alt: true,
    content: [
      { type: "p", text: "Your gas storage tank just failed. You've got 48 hours before the cold showers become a real problem. Two options: swap like-for-like for another gas tank, or upgrade to a heat pump. Here's the actual maths for a Pakenham household." },
      { type: "h2", text: "Option A: Like-for-like gas tank swap" },
      { type: "p", text: "A 170 L gas storage tank (Rinnai or similar) installed same-day: about $2,200 inc GST. Fast, simple, no VEU eligibility questions. Running cost: about $680/year in gas for a 3-4 person household." },
      { type: "p", text: "Life expectancy: 8-10 years. Then you're doing this again." },
      { type: "h2", text: "Option B: Reclaim R290 300 L heat pump upgrade" },
      { type: "p", text: "Fully installed after all VEU + Aus-Made + Solar Homes rebates (if you qualify): $2,610 inc GST. Running cost: about $180/year in electricity, or effectively $0 if you've got solar and schedule the heating for daytime." },
      { type: "p", text: "Life expectancy: 12-15 years. Longer if you've got the stainless tank option." },
      { type: "h2", text: "5-year total cost of ownership" },
      { type: "ul", items: [
        "Gas tank: $2,200 install + 5 × $680 running = $5,600",
        "Heat pump (Solar Homes eligible): $2,610 install + 5 × $180 running = $3,510",
        "Heat pump on solar: $2,610 install + $0 running = $2,610",
        "Heat pump saves you $2,090 - $2,990 over 5 years",
      ] },
      { type: "h2", text: "When we'd still say go gas" },
      { type: "p", text: "You're renting and the landlord won't upgrade. You have no power point within 75 cm of the tank AND don't want to pay $450 for a sparky. You genuinely need hot water in the next 4 hours and can't wait for a heat pump lead time (though we usually stock the R290 and can install within 48 hours)." },
      { type: "p", text: "Everyone else: upgrade. The rebates are basically paying you to swap." },
      { type: "p", text: "Give us a ring, we'll usually get you sorted the same day if it's Monday to Friday." },
    ],
  },
  {
    slug: "replacing-ducted-gas-with-reverse-cycle",
    publishedISO: "2026-03-18",
    author: "dean",
    seoTitle: "Ducted Gas to Reverse-Cycle: The Numbers",
    cat: "Aircon",
    date: "18 Mar 2026",
    read: "12 min read",
    title: "Replacing ducted gas heating with reverse-cycle: the honest cost-benefit",
    blurb: "Most homes save $1,400+ a year. But not all of them. Here's how to work out if your house is one of the winners.",
    photo: "/duct-work.webp",
    photoAlt: "Ducted reverse-cycle install replacing gas",
    content: [
      { type: "p", text: "Ducted gas is heading the way of open fireplaces. Gas prices in Victoria are up 30% over five years and heading further. Reverse-cycle ducted (aka \"ducted heat pump\") is the modern replacement, same ductwork, better efficiency, cooling in summer too. But it doesn't make sense for every house. Here's the honest maths." },
      { type: "h2", text: "How reverse-cycle saves you money" },
      { type: "p", text: "A ducted gas heater runs at about 70-85% efficiency, for every $1 of gas you burn, 70-85 cents ends up as heat in the house. A modern inverter reverse-cycle system runs at a coefficient of performance (COP) of 3-4, for every $1 of electricity, you get $3-4 of heat out. That's a 4-5x efficiency gain." },
      { type: "p", text: "Combined with dropping electricity prices as solar kicks in and rising gas prices, the running-cost gap is now huge. A typical Pakenham 4-bedroom home uses about 25,000 MJ of gas a winter for heating, that's around $1,650 at 6.6 c/MJ. The same house running an 18 kW reverse-cycle would use about 3,500 kWh of electricity, about $700-900 at current rates, or $200-300 if you've got solar." },
      { type: "p", text: "So you're saving $750-$1,450 a year on running cost. Plus you get cooling for summer as part of the deal." },
      { type: "h2", text: "When it doesn't stack up" },
      { type: "p", text: "You've got single-phase power in a big house. Anything over 18 kW ducted needs 3-phase, if you're stuck on single-phase you're capped at ~18 kW capacity, which handles a 4-bedroom home comfortably but might not stretch to 5-6 bedroom homes." },
      { type: "p", text: "Your ductwork is unusable. If the existing ducts are galvanised (30+ years old), flexible ducting with tears, or wildly wrong-sized for reverse-cycle airflow, we need to replace them. Adds $2,000-4,000 to the job." },
      { type: "p", text: "You have no gas bill above ~$1,800/year for heating. Below that, the payback stretches to 8-10 years and you might be better waiting for the next generation of ducted heat pumps." },
      { type: "h2", text: "Real numbers" },
      { type: "p", text: "An 18 kW Mitsubishi Electric ducted with Milieu Lab controller and up to 12 zones: from $11,000 fully installed after VEU rebates. Big number, but the running-cost savings mean it pays back in 6-8 years and you get 15-20 years out of the equipment." },
      { type: "p", text: "Kaden and Rinnai do the same capacity for less, on the same ductwork and the same zoning. Worth pricing both if getting the whole house done in one go is what matters." },
      { type: "p", text: "We do a full roof-cavity survey before quoting, no surprises on the day. Book a site check and we'll price it properly." },
    ],
  },
  {
    slug: "veu-rentals-landlord-checklist",
    publishedISO: "2026-03-10",
    author: "dean",
    seoTitle: "VEU for Rentals: A Landlord Checklist",
    cat: "VEU rebates",
    date: "10 Mar 2026",
    read: "8 min read",
    title: "VEU eligibility for rentals: a checklist landlords can hand to their PM",
    blurb: "Landlords ask us this every week. Here's a one-page checklist your property manager can use to confirm eligibility in 5 minutes.",
    photo: "/team-photo.webp",
    photoAlt: "Advanced Gas team on a rental property install",
    alt: true,
    content: [
      { type: "p", text: "Rental properties are absolutely eligible for VEU rebates. In fact, we do about a third of our heat pump installs on rentals. Here's the checklist landlords and property managers need to know." },
      { type: "h2", text: "The 5-second answer" },
      { type: "p", text: "VEU rebates (VEEC + STC + Australian Made) all apply to rentals with no reduction. The rental just doesn't qualify for the extra $1,000 Solar Homes hot water rebate, that one's owner-occupier only. So a rental gets up to $1,605 off ($576 + $629 + $400 for Australian-made) instead of the $2,605 an owner-occupier would get." },
      { type: "h2", text: "The 5-minute checklist" },
      { type: "p", text: "Property manager runs this in a phone call to the tenant:" },
      { type: "ul", items: [
        "What's the existing hot water system, gas storage, electric storage, or heat pump? (Anything gas or electric qualifies; existing heat pump doesn't.)",
        "How old is it, under 3 years or over? (No age minimum for VEU on rentals.)",
        "Is there a power point within 75 cm of the current tank? (If yes, all-in-one heat pumps plug in straight. If no, add $450 for a sparky.)",
        "Can we access the tank for the swap? (Some townhouses have tanks in tight cupboards, worth checking.)",
        "Any solar PV on the roof? (Doesn't affect eligibility, but affects running cost sizing.)",
      ] },
      { type: "h2", text: "What the landlord pays" },
      { type: "p", text: "For a Reclaim R290 285 L on a rental: $3,610 inc GST fully installed. That's $1,000 more than an owner-occupier install (missing Solar Homes rebate) but it still adds value to the property, cuts the tenant's power bill (bigger tenant appeal, longer stays), and future-proofs against Victoria's inevitable gas phase-out." },
      { type: "p", text: "The Residential Tenancies Act now requires \"Minimum Standards\" including working hot water, replacing a failing gas tank with a heat pump satisfies the requirement AND banks a $1,000+ VEU rebate. Better to do it planned than in a 3 am emergency." },
      { type: "h2", text: "The paperwork side" },
      { type: "p", text: "We handle all the VEU paperwork ourselves. Landlord signs the standard consent form (takes 60 seconds), we invoice the landlord, we email the compliance certificate for insurance / regulatory records. Tenant gets hot water back, landlord gets VEU rebate applied at quote." },
      { type: "p", text: "Give us the property address and we'll come out for a free site check, usually within 48 hours." },
    ],
  },
  {
    slug: "clean-split-system-every-quarter",
    publishedISO: "2026-03-02",
    author: "jake",
    seoTitle: "5 Things to Clean on Your Split System",
    cat: "Maintenance",
    date: "2 Mar 2026",
    read: "4 min read",
    title: "5 things you should clean on your split system every quarter",
    blurb: "The DIY maintenance that doubles the life of your aircon and keeps your warranty intact. Five minutes of work.",
    photo: "/ducted-condenser.webp",
    photoAlt: "Split system condenser clean",
    content: [
      { type: "p", text: "Manufacturer warranties on split systems require the owner to keep the unit clean. Most people don't. That's why splits die at 8-10 years when they should last 15+. Five minutes of quarterly maintenance doubles the life of your unit. Here's the drill." },
      { type: "h2", text: "1. Wash the indoor filter" },
      { type: "p", text: "Lift the front cover of the indoor unit, slide out the plastic filter mesh. Vacuum it, then wash it in warm soapy water. Air-dry, slide back in. This alone saves 15-20% on running cost." },
      { type: "h2", text: "2. Wipe the indoor face and louvres" },
      { type: "p", text: "Damp cloth, mild detergent. The louvres collect dust and grease from cooking. If they're gummy the unit runs harder to push air past. Two minute job." },
      { type: "h2", text: "3. Clear the outdoor unit" },
      { type: "p", text: "Weeds, leaves, dust, spider webs, clear anything within 30 cm of the outdoor unit. It needs airflow to shed heat. Vacuum the fins with a brush attachment (careful, they bend easily). No pressure washer." },
      { type: "h2", text: "4. Check the condensate drain" },
      { type: "p", text: "The little pipe that drips water when the unit runs. Should drip freely. If it's blocked, water backs up into the indoor unit and eventually stains your ceiling. Poke a wire down the outlet, run the unit for 5 minutes, confirm water flows." },
      { type: "h2", text: "5. Run it in heat for 10 minutes at the start of every season" },
      { type: "p", text: "Even in summer, kicks the reversing valve, keeps the compressor oil circulating. Same in winter for cool. Prevents seals drying out from disuse." },
      { type: "h2", text: "What we do that you can't" },
      { type: "p", text: "Every 2-3 years we recommend a professional service, deep clean of the evaporator coil, gas pressure check, thermistor calibration, drain flush. $280 + GST. Extends life another 3-5 years and keeps efficiency at spec." },
      { type: "p", text: "Book a service any time, we bundle multiple units at the same address if you've got splits in bedrooms plus a living-room unit." },
    ],
  },

  // ============ Cluster hubs (SEO Wave 5) ============

  {
    slug: "heat-pump-hot-water-melbourne-complete-guide",
    publishedISO: "2026-08-04",
    author: "dean",
    seoTitle: "Heat Pump Hot Water Melbourne, 2026 Guide",
    cat: "Heat pumps",
    date: "August 2026",
    read: "16 min read",
    title: "Heat pump hot water Melbourne: the complete 2026 guide",
    blurb: "How heat pumps work, what they actually cost in Melbourne after the VEU rebate, which brand suits which household, and the mistakes we see people make every week.",
    photo: "/reclaim-spit-close-up.webp",
    photoAlt: "Reclaim CO2 heat pump installed in a Melbourne home",
    content: [
      { type: "p", text: "Heat pump hot water is the biggest single upgrade a Melbourne household can make to their energy bill. Done right, with the VEU rebate applied at the quote. It drops your hot-water running cost by 60-75% versus gas or electric storage, and the payback period sits around 4-6 years instead of the 12-15 years people assume." },
      { type: "p", text: "This is the article we wish every Melbourne homeowner read before ringing us. If you're on the fence, this walks you through what you actually need to know." },

      { type: "h2", text: "How a heat pump hot water system actually works" },
      { type: "p", text: "A heat pump is basically a reverse-cycle aircon in a tank. Instead of burning gas or heating an element, it uses electricity to compress a refrigerant, and that refrigerant grabs heat from the outside air and dumps it into the water tank. Because it's moving heat rather than making heat, it gets 3-5 kWh of hot water out of every 1 kWh of electricity, a COP (Coefficient of Performance) of 3 to 5. An electric element gets you 1-for-1. Gas gets you about 0.85-for-1 once you account for combustion losses and the tank standing loss." },
      { type: "p", text: "In Melbourne winters (down to 3-5°C most mornings, occasionally below zero), the COP drops but still sits at 2.5-3.5 depending on the brand. Cold-climate variants like the Reclaim CO2 (R744 refrigerant) hold capacity down to -10°C, worth the premium if you're in Emerald, Gembrook, Cockatoo, or the hills-country postcodes." },

      { type: "h2", text: "What it actually costs, installed, after VEU rebate" },
      { type: "p", text: "Melbourne installed prices for the units we install most often, after the full VEU rebate stack and Solar Homes bonus where eligible:" },
      { type: "ul", items: [
        "iStore all-in-one: $2,150 inc GST installed \u2014 the strongest rebate outcome for VEU-eligible households",
        "Reclaim ECO R290 all-in-one: $2,538 inc GST installed, with 8 years on the tank",
        "Thermann ECO R290 all-in-one: $2,538 inc GST installed \u2014 same platform as the Reclaim ECO",
        "Reclaim CO2 315L stainless: around $3,190 installed",
        "Reclaim CO2 400L stainless: around $3,690 installed (for larger families)",
      ] },
      { type: "p", text: "These are real fully-installed prices inc GST \u2014 labour, disposal of the old tank, permit and the compliance certificate all included. One thing that can add to them: if there's no power point within two metres of the existing system, the new unit needs a circuit run to it, and that's $350. We check on the site visit so it lands on the quote rather than the invoice. If a quote you're comparing has 'rebate handled separately' in the fine print, you're being upsold." },

      { type: "h2", text: "Sizing, the 200/270/315/400 L question" },
      { type: "p", text: "Heat pump tanks recover slower than gas continuous flow, so tank size matters more than it does for storage gas. Our rules of thumb for Melbourne households:" },
      { type: "ul", items: [
        "1-2 people, one bathroom: 180L (iStore) or 250L (Reclaim)",
        "3-4 people, one to two bathrooms: 270L or 315L",
        "5+ people or acreage with heavy draw: 400L",
      ] },
      { type: "p", text: "If in doubt, size up. A 315L tank with a heavier draw uses maybe 5% more energy over a year than a 270L; a 270L tank that runs out mid-second-shower is a daily annoyance." },

      { type: "h2", text: "Reclaim vs Thermann vs iStore, the honest take" },
      { type: "p", text: "We install all three. The gap between them is real but not enormous:" },
      { type: "ul", items: [
        "Reclaim (CO2): natural refrigerant, stainless tank option, 37 dB, and it still makes its heat at -10 °C. The one for a house you're staying in, or a cold one.",
        "Thermann (R290): Reece-exclusive and built by Dux, so parts sit in every store in Victoria. The one for a rental, an investment property, or anywhere a fault has to be fixed today.",
        "iStore (R290): designed here, built in China, and it takes the VEU rebate further than anything else we fit. The one when the rebate is what decides it.",
      ] },
      { type: "p", text: "We wrote a separate long-form comparison on this, see 'Reclaim vs iStore vs Thermann', but the short version is: hills postcode or staying ten years, Reclaim. Rebate is what decides it, iStore. Rental, or you want the widest parts network behind you, Thermann." },

      { type: "h2", text: "Common mistakes we see" },
      { type: "p", text: "First, trying to put a heat pump where the old gas storage tank was without checking outdoor space. Heat pumps need airflow. If your old tank was in a tight cupboard or under a stairwell, we might need to move the plumbing outdoors or repurpose a bit of the yard. Not a deal-breaker but affects the quote." },
      { type: "p", text: "Second, choosing on sticker price without factoring in the Australian Made $400 bonus. Reclaim, Thermann and Dux qualify. iStore doesn't. So the $400 gap looks smaller once the bonus is applied." },
      { type: "p", text: "Third, ignoring Solar Homes eligibility. If you're an owner-occupier under $150k combined income with the property under $3M, there's another $1,000 rebate available on top of VEU. Half the Melbourne households we quote qualify and don't know it. See our VEU rebate guide for the full checklist." },

      { type: "h2", text: "What happens on quote day" },
      { type: "p", text: "We come out for a 20-minute site check: measure the tank space, check the outdoor position for the compressor, look at the switchboard, confirm your Solar Homes eligibility on the spot. You get a fixed-price quote emailed within 12 hours with all rebates already applied. If you accept, we book you in, usually within the week." },
      { type: "p", text: "No obligation to accept. If our number's higher than a competitor, we'll show you where the difference is." },
    ],
  },

  {
    slug: "split-system-installation-melbourne-2026",
    publishedISO: "2026-08-11",
    author: "jake",
    seoTitle: "Split System Installation Melbourne 2026",
    cat: "Aircon",
    date: "August 2026",
    read: "12 min read",
    title: "Split system installation Melbourne: the 2026 buyer's guide",
    blurb: "Sizing, brand pick, install day, and the parts of a proper install that never show up on a quote.",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Mitsubishi split system installed in a Melbourne living room",
    content: [
      { type: "p", text: "Split system aircon is Melbourne's default cooling and heating for anything smaller than a full ducted retrofit. If you get the sizing right and the install done properly, one 5 kW unit runs the main living zone of an average Berwick-sized brick veneer for a decade with almost zero maintenance. Get it wrong and you're either replacing the unit at year 5 or running it flat-out on the hottest day and it still can't keep up." },

      { type: "h2", text: "How to actually size a split for a Melbourne room" },
      { type: "p", text: "The rule of thumb everyone quotes is 100W of cooling per square metre, a 4m × 5m bedroom is 20 m² × 100 = 2 kW so buy a 2.5 kW unit. That's a starting point but Melbourne throws in some wrinkles:" },
      { type: "ul", items: [
        "West-facing glass at afternoon sun: add 30% to the load",
        "Cathedral ceiling or double-height: add 20-40%",
        "Poor insulation (older Berwick/Officer weatherboards): add 25%",
        "Ceiling fan already in the room: subtract 10%",
      ] },
      { type: "p", text: "So a 4×5 west-facing bedroom in an older weatherboard: 20 × 100 × 1.3 × 1.25 = 3.25 kW → we'd spec a 3.5 kW unit, not a 2.5. Undersizing is the single biggest reason customers ring us to replace a unit at year 3." },

      { type: "h2", text: "Common Melbourne room sizings" },
      { type: "ul", items: [
        "Small bedroom, well-insulated: 2.5 kW (e.g. Mitsubishi MSZ-AP25)",
        "Master bedroom or study: 3.5 kW (MSZ-AP35)",
        "Open-plan living / dining, average glass: 5.0 kW (MSZ-AP50)",
        "Large living or great-room: 6.0 kW or 7.1 kW (MSZ-AP60/71)",
        "Cathedral-ceiling great-room: 8.0 kW+ or move to multi-head",
      ] },

      { type: "h2", text: "Brand pick, Mitsubishi vs Kaden vs everything else" },
      { type: "p", text: "We install two split-system brands as our defaults: Mitsubishi Electric and Kaden. Two, not twelve, because we'd rather know two ranges properly than carry a catalogue we can't stand behind. We dropped several others over the last few years because the failure rates weren't worth the warranty admin. Full range and our take is on the /brands section, the short version:" },
      { type: "ul", items: [
        "Mitsubishi Electric MSZ-AP: our default. Quieter on low fan, under 1% failure rate across the range, and the parts pipeline is still open on units we put in a decade ago.",
        "Mitsubishi Electric MSZ-FH (Hyper Heating): the one for the Dandenong Ranges. It holds rated heating output down to -15 °C where a standard split has already given up about 30% of it.",
        "Kaden KSI-v3: the one when a family wants three bedrooms done in one visit rather than one a year. Reece-exclusive, so parts are in every store in Victoria, 5-year warranty.",
        "Everything else: we'll install what you specify, but these are the two ranges we know inside out.",
      ] },

      { type: "h2", text: "What a proper install day looks like" },
      { type: "p", text: "A standard split system install is a half-day for one unit. Here's what should happen, and what the $99-a-day mobs skip:" },
      { type: "ul", items: [
        "Vacuum-purge the refrigerant lines to at least -500 microHg (removes moisture that would eventually degrade the compressor)",
        "Nitrogen pressure test the lines to confirm no leaks BEFORE releasing the factory refrigerant charge",
        "Mount the outdoor unit on wall brackets or a purpose-made stand, never straight on the ground",
        "Wrap and duct-tape the line-set weather cover neatly (visible from the yard, not the neighbour's problem)",
        "Test the unit in cool AND heat for 20 minutes minimum, confirm temperatures at the vent, sign the compliance certificate",
      ] },
      { type: "p", text: "If the installer doesn't have a vacuum pump on the truck, they're not vacuum-purging. If they don't have a nitrogen bottle, they're not pressure testing. These are the two easy-to-check signals of a proper job." },

      { type: "h2", text: "What Melbourne installs actually cost" },
      { type: "p", text: "Fully installed prices we quote regularly, includes the unit, standard 3m back-to-back install, wall bracket, and compliance certificate:" },
      { type: "ul", items: [
        "2.5 kW MSZ-AP25 installed: $2,190",
        "3.5 kW MSZ-AP35 installed: $2,390",
        "5.0 kW MSZ-AP50 installed: $2,690",
        "7.1 kW MSZ-AP71 installed: $3,290",
        "Kaden Bold equivalents: $500-700 less than Mitsubishi at each size",
      ] },
      { type: "p", text: "Add ~$300 for extended pipe runs (>5m), ~$500 for a first-floor install with roof access, ~$200 for salt-tolerant coil coating (Tooradin, Lang Lang coastal edge)." },

      { type: "h2", text: "What to ask the installer" },
      { type: "p", text: "Three questions that tell you everything:" },
      { type: "ul", items: [
        "Do you vacuum-purge and nitrogen-pressure-test? (Should be yes, no hesitation)",
        "What's the workmanship warranty on top of the manufacturer warranty? (We do 6 years, bare minimum should be 5)",
        "Will the person who quoted me be on the tools? (Small-business red flag if the answer is 'no, we send a sub-contractor')",
      ] },
    ],
  },

  {
    slug: "ducted-aircon-melbourne-cost-install",
    publishedISO: "2026-08-18",
    author: "jake",
    seoTitle: "Ducted Aircon Melbourne: Cost & Install",
    cat: "Ducted aircon",
    date: "August 2026",
    read: "14 min read",
    title: "Ducted aircon Melbourne, cost, install, and what to spec in 2026",
    blurb: "Sizing a ducted system for a Melbourne family home, retrofit vs new-build install, zoning with Zonemate, and what a $9,000 quote should actually get you.",
    photo: "/duct-work.webp",
    photoAlt: "Ducted aircon installation in a Melbourne home ceiling void",
    content: [
      { type: "p", text: "Ducted air conditioning is the highest-value upgrade for a Melbourne family home that's outgrown single-room splits. Done right, one system cools and heats the entire house from a single controller with per-zone setpoints. Done wrong, undersized, badly ducted, no zoning. It costs more to run than four separate splits and never quite gets cold enough on a 38°C day." },
      { type: "p", text: "This is what we tell every Berwick, Officer, Cranbourne and Clyde-North family that rings us for a ducted quote." },

      { type: "h2", text: "Retrofit or new-build, the pricing gap is big" },
      { type: "p", text: "If your house was built with ducted rough-ins from day one (most Clyde North, Officer South, Selandra Rise new builds after 2018), install is straightforward, indoor and outdoor unit plus connection, usually $6,500-$9,000. If we're pulling ducts through an existing weatherboard or 90s brick veneer where nothing was pre-run, add $2,000-$4,000 in duct + ceiling access labour." },
      { type: "p", text: "We check the ceiling void on the quote visit. Standard 300mm void with truss access = straightforward. 200mm void or hip-roof with no truss access = harder, and we spec the slim-line SEZ-KD indoor rather than a normal PEAD-M. Not a deal-breaker but affects the price." },

      { type: "h2", text: "Sizing, the load calc that matters" },
      { type: "p", text: "For a typical Melbourne double-storey brick veneer of ~200m² living area with average glass:" },
      { type: "ul", items: [
        "Small 3-bed single-storey (~120m²): 10-12.5 kW",
        "Standard 4-bed single-storey (~160-180m²): 14 kW",
        "4-bed double-storey (~200m²): 16 kW",
        "Larger great-room double-storey with high glass (>250m²): 18-22 kW",
      ] },
      { type: "p", text: "We do a proper heat-load calc on any job over 14 kW, measures the glass area, insulation R-value, and orientation. Skip this and either you get an oversized system that cycles constantly (expensive to run, hard on the compressor) or an undersized one that can't hold setpoint on 35°C+ days." },

      { type: "h2", text: "Zoning, the single biggest efficiency win" },
      { type: "p", text: "Never install a ducted system without zoning. Non-negotiable. A 4-zone Zonemate controller lets you shut off unused rooms, kids' bedrooms during the day, living zones at night, and cuts running cost by 30-40% over an always-on ducted setup." },
      { type: "p", text: "Our default recommendations by house size:" },
      { type: "ul", items: [
        "3-bed single-storey: Zonemate 4-zone (living, master, kids, study/bathroom)",
        "4-5 bed single-storey: Zonemate 6-zone",
        "Double-storey: Zonemate 8-zone (per bedroom + living zones, upstairs/downstairs split)",
      ] },
      { type: "p", text: "Variable-speed dampers (VSD) are worth the extra ~$60 per zone if you want proportional airflow rather than just on/off. Nicer comfort in less-used zones, 30% airflow to the study, 100% to living, all controlled from your phone." },

      { type: "h2", text: "Brand pick for the ducted head unit" },
      { type: "p", text: "Mitsubishi Electric PEAD-M is our default mid-static indoor unit. Long duct runs or 6-plus zones want the PEA-RP high-static instead, because static pressure rather than capacity is what starves the far bedroom. Shallow ceiling voids get the SEZ-KD slim-line. Kaden Ducted is the other route, on the same ductwork and the same zoning, and it's what makes a whole-house job happen in one visit rather than in stages." },

      { type: "h2", text: "What a Melbourne ducted install actually costs" },
      { type: "p", text: "Fully installed, includes indoor + outdoor unit, all ducting to 4-6 zones, Zonemate controller and dampers, compliance certificate, warranty registration:" },
      { type: "ul", items: [
        "10 kW Kaden Ducted, 4-zone: $6,890",
        "12.5 kW Kaden Ducted, 6-zone: $7,990",
        "14 kW Kaden Ducted, 6-zone: $8,590",
        "14 kW Mitsubishi PEAD-M, 6-zone: $10,490",
        "18 kW Mitsubishi PEA-RP, 8-zone: $14,490",
      ] },
      { type: "p", text: "Retrofit adds $2,000-$4,000 to any of these numbers. Ceiling access work, patch and paint, and roof-cavity duct pulling isn't quick." },

      { type: "h2", text: "What separates a $9k quote from a $12k quote" },
      { type: "p", text: "Same-brand indoor unit, similar kW rating, but a $3,000 gap. That gap is almost always:" },
      { type: "ul", items: [
        "Zone count (4 vs 8) and damper type (constant-speed vs variable-speed)",
        "Duct diameter and insulation grade (R1.0 flexi vs R1.5 rigid)",
        "Return-air grille size (undersized returns choke airflow)",
        "Length of copper line run and refrigerant top-up",
        "Extras: Wi-Fi module, roof-access hatches, external condenser stand",
      ] },
      { type: "p", text: "Ask any competing quote to itemise these. A quote that's dearer because the ducts are R1.5 and the returns are sized properly is a different thing from a quote that's dearer for no stated reason, and you can only tell the two apart once it's itemised." },
    ],
  },

  {
    slug: "gas-heating-hot-water-melbourne-guide",
    publishedISO: "2026-08-25",
    author: "dean",
    seoTitle: "Gas Heating & Hot Water Melbourne",
    cat: "Gas plumbing",
    date: "August 2026",
    read: "11 min read",
    title: "Gas heating & hot water Melbourne, repair, replace, or switch?",
    blurb: "Brivis, Braemar, Rinnai and Rheem, what still makes sense on gas in Melbourne in 2026, and when it's time to move to heat pump or reverse-cycle.",
    photo: "/gas-hot-water-changeover.webp",
    photoAlt: "Gas hot water system replacement in a Melbourne home",
    content: [
      { type: "p", text: "The Victorian government wants gas out of homes by 2035. That's the direction of travel. But the reality for a Melbourne homeowner in 2026 is more nuanced, some gas appliances still make sense to repair or replace like-for-like, others don't. This guide walks through when each choice is right." },

      { type: "h2", text: "The three gas appliances in a typical Melbourne home" },
      { type: "p", text: "Most Melbourne family homes still have three gas appliances:" },
      { type: "ul", items: [
        "Ducted gas heater (Brivis, Braemar, Bonaire), 10-20 years old, sitting in the roof or under the house",
        "Gas hot water (Rinnai continuous flow or a gas storage tank), 8-15 years old, mounted outside",
        "Gas cooktop, usually indefinite lifespan, low running cost",
      ] },
      { type: "p", text: "The first two are the ones that trigger the repair-vs-replace-vs-switch decision every few years. We'll take them in turn." },

      { type: "h2", text: "Ducted gas heater, repair, replace, or switch to reverse cycle?" },
      { type: "p", text: "If your ducted gas heater is under 10 years old and just needs a service or a burner replacement, repair it. Straightforward, and done in a morning. Typical service $220, ignition unit swap ~$580." },
      { type: "p", text: "If it's 10-15 years old and the heat exchanger has cracked (we test for this, carbon monoxide leaks kill people every winter), that's a like-for-like replacement or a switch to reverse-cycle. Like-for-like Brivis-to-Brivis replacement runs $4,500-$6,500 depending on system size. Switching to reverse-cycle ducted uses your existing ducts if they're sound, $9,000-$12,000 but the running cost is roughly 60% lower and you get cooling in summer as a bonus." },
      { type: "p", text: "If it's 15+ years old, even if it's still running, the payback on switching to reverse-cycle is usually 6-8 years even without a rebate. If you're planning to stay in the house that long, switch." },

      { type: "h2", text: "Gas hot water, the fastest-changing decision" },
      { type: "p", text: "This is the one that's shifted hardest in the last two years. In 2023 a like-for-like gas continuous flow swap was the obvious call. In 2026, with the VEU rebate + Solar Homes bonus, a heat pump often ends up cheaper installed AND cheaper to run." },
      { type: "p", text: "Real numbers for a Cranbourne family we quoted last month:" },
      { type: "ul", items: [
        "Rinnai continuous flow like-for-like replacement: $1,890 installed",
        "iStore 270 L heat pump after VEU + Solar Homes: the rebate covers most of it, and the balance is on the quote",
        "Reclaim 315L stainless heat pump after VEU rebate: $3,190 installed",
      ] },
      { type: "p", text: "Once the rebates were applied the iStore landed under the like-for-like Rinnai on the day, and it saves them about $400 a year to run on top of that. Rebate values move with VEEC prices and eligibility, so the number that matters is the one on your own quote, not this one." },
      { type: "p", text: "The one exception: if your existing gas line, meter and location can accommodate continuous flow and there's no outdoor space for a heat pump condenser, gas continuous flow is still the pragmatic choice." },

      { type: "h2", text: "Emergency gas repairs, when to call today" },
      { type: "p", text: "Ring us on the main number any time of day or night for:" },
      { type: "ul", items: [
        "Smell of gas anywhere in or around the house",
        "Pilot light won't stay lit",
        "Continuous flow throws error codes and shuts down",
        "Yellow flame in a burner (should be blue, yellow means incomplete combustion, CO risk)",
        "Carbon monoxide detector alarm",
      ] },
      { type: "p", text: "After-hours calls go to a real on-call tradie, not an overseas call centre. Response inside 90 minutes in the Pakenham-Cranbourne-Berwick belt, longer for the outer postcodes." },

      { type: "h2", text: "Carbon monoxide testing, the every-two-years rule" },
      { type: "p", text: "Any gas appliance older than 8 years should have a CO test every two years. Cracked heat exchangers in Brivis and Braemar ducted heaters are a known killer, five deaths a year in Australia from cracked units. We do the test as part of every gas heater service. $220 including the CO reading, tuning, filter clean, gas pressure check." },
    ],
  },

  {
    slug: "emergency-hot-water-gas-melbourne",
    publishedISO: "2026-08-13",
    author: "dean",
    seoTitle: "Emergency Hot Water & Gas Repair Melbourne",
    cat: "Emergency",
    date: "August 2026",
    read: "6 min read",
    title: "Emergency hot water & gas repair Melbourne, what to do first",
    blurb: "No hot water on a Sunday morning? Gas smell in the laundry? Here's the two-minute checklist before you ring us at 3am.",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Emergency hot water replacement in a Melbourne home",
    content: [
      { type: "p", text: "This is the short version, save this article for the day you actually need it, which is usually a Sunday morning with three kids and a shower queue." },

      { type: "h2", text: "No hot water, the 60-second diagnosis" },
      { type: "p", text: "Before ringing us, check three things:" },
      { type: "ul", items: [
        "Is any hot water coming out? Even lukewarm? (Points to element or thermostat failure vs total unit failure)",
        "Is there an error code on the display? (Rinnai and iStore both have code lookups, snap a photo and text it to us)",
        "Has the electrical breaker or gas isolation tap tripped? (Reset once, if it trips again, don't reset again, ring us)",
      ] },
      { type: "p", text: "Text the answers to our main number and we can usually tell you inside 5 minutes whether it's a same-day fix or a same-day replacement." },

      { type: "h2", text: "Gas smell, do this in this order" },
      { type: "p", text: "If you can smell gas anywhere in or around the house:" },
      { type: "ul", items: [
        "Do not turn any electrical switches on or off, sparks ignite gas",
        "Open every window and external door",
        "Turn off the gas meter (isolation valve, quarter-turn) if you can reach it safely",
        "Get everyone outside",
        "Ring us and, if the smell is strong, ring 000",
      ] },
      { type: "p", text: "We respond to gas smell calls day or night inside the Pakenham + 75km radius. On-call tradie, not overseas call centre." },

      { type: "h2", text: "Carbon monoxide alarm, take it seriously" },
      { type: "p", text: "CO is colourless, odourless, and kills. If your CO detector alarms:" },
      { type: "ul", items: [
        "Get everyone outside immediately",
        "Do not turn any gas appliance on or off",
        "Ring 000 if anyone has headache, dizziness, or nausea",
        "Ring us for a same-day CO test and appliance shutdown",
      ] },
      { type: "p", text: "Ducted gas heaters are the usual culprit, cracked heat exchanger dumping CO into the return-air path. We can test on site with a proper analyser." },

      { type: "h2", text: "What we do same-day (and what we don't)" },
      { type: "p", text: "Same-day (usually within 4 hours in the Pakenham-Berwick-Cranbourne belt):" },
      { type: "ul", items: [
        "Hot water leak repair or unit shutdown",
        "Gas leak isolation and repair",
        "Ducted gas heater CO test and shutdown",
        "Emergency plumbing (burst pipe, blocked drain if it's causing flooding)",
      ] },
      { type: "p", text: "Not same-day (need parts or council permits):" },
      { type: "ul", items: [
        "Complete heat pump replacement, usually 1-3 days for a fixed-price quote then 5-7 days for install",
        "Complete ducted heater replacement, 3-7 days",
        "New gas connection or meter upgrade",
      ] },
      { type: "p", text: "Loaner units: if you're without hot water for more than 24 hours we usually have a temporary electric loaner we can run until the new unit's in. Ask." },
    ],
  },

];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

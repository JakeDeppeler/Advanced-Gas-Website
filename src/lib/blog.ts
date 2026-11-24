// Blog post data, one source of truth for /blog and /blog/[slug].
// Content is written in plain paragraphs and simple headings.

import { readingMinutes } from "@/lib/portal/prose";

export type BlogPost = {
  slug: string;
  cat: string;
  read: string;
  /** The editorial headline. Used as the on-page H1, where length is
   *  fine. */
  title: string;
  /** ISO 8601 publication date. The only date a post carries: /blog and
   *  /blog/[slug] both format the visible label from this (and from
   *  updatedISO), and Article schema reads the same field, so what a reader
   *  sees and what Google is told cannot drift apart. WEB-013 replaced the
   *  hand-written label; the dead `date` field it left behind, which had gone
   *  on saying "Updated this week" long after the update, is gone with it. */
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
  /**
   * Pinned to the home page's three. Set from the portal; a post without it
   * competes on date for whatever places are left.
   */
  onHome?: boolean;
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
    bio: "Dean has run gas and hot water jobs across Melbourne's south-east for over twenty years. He signs off every compliance certificate we issue.",
    url: "/about",
  },
  jake: {
    name: "Jake Deppeler",
    role: "Director, Estimating & Quotes",
    // AU59557 is the business's ARC refrigerant trading authorisation, not a
    // personal licence, so it doesn't belong on Jake's byline.
    credential: "",
    photo: "/jake.webp",
    bio: "Jake is a director and quotes the aircon and heat pump work, sizing every system off a real heat load rather than a guess. Our own crew installs it. If we quoted it, he's seen the roof.",
    url: "/about",
  },
};

const written: Omit<BlogPost, "read">[] = [
  {
    slug: "veu-rebate-2026-pakenham-guide",
    publishedISO: "2026-08-06",
    updatedISO: "2026-08-24",
    author: "dean",
    seoTitle: "VEU Rebate 2026: The Pakenham Guide",
    cat: "VEU rebates",
    title: "The complete Pakenham guide to the VEU rebate in 2026",
    blurb: "What it is, what's actually changed in 2026, the real maximum you can claim on a heat pump or aircon, and the 3 mistakes most homeowners make on the application.",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump install with VEU rebate applied",
    featured: true,
    content: [
      { type: "p", text: "The Victorian Energy Upgrades (VEU) program is the biggest chunk of free money most Pakenham households will ever leave on the table. It's the state government's way of getting old, inefficient gas and electric appliances out of homes and replacing them with efficient heat pumps and reverse-cycle aircon, and it's the reason a heat pump costs a fraction of its sticker price once the paperwork is done." },
      { type: "h2", text: "What actually changed in 2026" },
      { type: "p", text: "The certificate values shifted at the start of the year. Most heat pump jobs attract two certificates: VEECs (Victorian Energy Efficiency Certificates) under the state VEU program, and STCs (Small-scale Technology Certificates) under the federal small-scale scheme. In 2026 a typical Pakenham heat pump install pulls VEECs worth ~$576 and STCs worth ~$629, $1,205 in certificates, before Solar Victoria's hot water rebate for eligible owner-occupiers: $1,000, or $1,400 on a locally made unit." },
      { type: "p", text: "In 2025 the same certificates were worth about $1,050, so a job quoted then that felt just out of reach may now be $150-$200 cheaper." },
      { type: "h2", text: "The real maximum you can claim" },
      { type: "p", text: "All together, the rebates on a heat pump come to up to $2,700 (VEU, STCs and Solar Victoria for eligible owner-occupiers). Here's how they stacked on a typical Pakenham install for an owner-occupier who qualified for everything:" },
      { type: "ul", items: [
        "VEEC: ~$576",
        "STC: ~$629",
        "Solar Victoria hot water rebate (eligible owner-occupiers): $1,000",
        "Solar Victoria locally made top-up (Reclaim, Thermann): $400",
        "Total in this example: $2,605 off",
      ] },
      { type: "p", text: "On a Reclaim R290 300 L all-in-one, that stack takes the biggest share of the installed price off for an owner-occupier who qualifies for Solar Victoria's rebate. A rental gets the VEEC and STC part, about $1,205." },
      { type: "h2", text: "The 3 mistakes we see homeowners make" },
      { type: "p", text: "First, chasing installers who don't apply the rebate at quote. If someone quotes you the full price and says \"you claim the rebate back\", walk away. VEU is designed to be applied at the point of sale, accredited installers do it inside the quote. If they're making you chase the certificates, they're pocketing the difference or they haven't done the paperwork." },
      { type: "p", text: "Second, not checking Solar Homes eligibility. The $1,000 hot water rebate has strict criteria (as at November 2026): owner-occupier, combined household income under $150k, property value under $3M, no prior HW/battery Solar Homes rebate at the address, existing hot water system at least 3 years old. Tick all five boxes and that $1,000 is yours. Plenty of the households we quote qualify without realising." },
      { type: "p", text: "Third, comparing sticker prices without the rebates in the sum. An owner-occupier who qualifies for Solar Victoria gets an extra $400 on a locally made unit like Reclaim or Thermann. iStore is designed here and built in China, so it doesn't take that top-up, and it's still the cheapest heat pump we fit once the rebates come off. The only figure worth comparing is the one at the bottom of the quote." },
      { type: "h2", text: "What to do next" },
      { type: "p", text: "Get us out for a 20-minute site check. We'll size the unit properly for your household, work out your Solar Homes eligibility on the spot, and email you a written quote with all the rebates already applied. No chase, no surprise invoice on the day." },
    ],
  },
  {
    slug: "reclaim-vs-istore-vs-thermann",
    publishedISO: "2026-05-04",
    author: "dean",
    seoTitle: "Reclaim vs iStore vs Thermann Heat Pumps",
    cat: "Heat pumps",
    title: "Reclaim vs iStore vs Thermann: which heat pump is right for your house?",
    blurb: "Honest comparison of the three brands we actually install, with sizing advice for 2 / 3 / 5-person households.",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Thermann heat pump install",
    content: [
      { type: "p", text: "We install heat pumps across Pakenham, Berwick, Cranbourne and Officer, and three brands make up almost all of it: Reclaim, iStore and Thermann. Here's the honest comparison, pros, cons and who each one suits." },
      { type: "h2", text: "Reclaim (Australian made)" },
      { type: "p", text: "Reclaim is the one to pick when you're staying in the house. Made in Australia, in two ranges: the R290 all-in-one, tank and compressor in one shell with a plug-in install, at 200 L and 300 L; and the CO₂ split, where the compressor sits outside and the tank goes wherever it fits." },
      { type: "p", text: "The split is where Reclaim earns its money. CO₂ runs at 37 dB, which is about a whisper, holds above 60 °C on a cold Pakenham morning, and the stainless tank option carries a 15-year warranty. The R290 all-in-one answers a different question: it's the one for a site with nowhere to put an outdoor unit, and it plugs straight in if there's a power point within 2 metres of the current tank." },
      { type: "p", text: "Price: the R290 all-in-one is the cheaper of the two once the rebates and the locally made top-up come off. The CO₂ split costs more, and more again with the stainless tank. Your written quote has the exact figure with the rebates already taken off, and it's fixed." },
      { type: "h2", text: "Thermann (Australian made)" },
      { type: "p", text: "Thermann is the one to pick when the parts pipeline is what matters. A 200 L or 285 L all-in-one R290, near enough the same footprint and the same performance as the Reclaim R290, built by Dux in Moss Vale so it takes Solar Victoria's $400 locally made top-up for eligible owner-occupiers. It's Reece's own brand, which means spares are usually on the shelf locally, so faults get fixed faster. On a rental or an investment property that's usually the whole argument." },
      { type: "p", text: "Price: lands level with the Reclaim R290 once the rebates are applied, because both take the locally made top-up." },
      { type: "h2", text: "iStore (Chinese-made, Australian designed)" },
      { type: "p", text: "iStore is designed here and built in China, so it doesn't take the $400 locally made top-up. It's still the cheapest heat pump we fit. Smart Wi-Fi control is built in rather than an accessory, the warranty covers the whole unit for 5 years, and solar households like it because the app makes scheduling the daytime charge straightforward." },
      { type: "p", text: "Price: the cheapest of the three once the rebates come off, even without the locally made top-up. The quote shows all three side by side." },
      { type: "h2", text: "Which one for your house?" },
      { type: "p", text: "Two people, one bathroom: Thermann 200 L or Reclaim R290 200 L. Same price, both plug in, both Australian made. We'll recommend whichever suits your site." },
      { type: "p", text: "Three or four people, showers split morning and night: Reclaim R290 300 L or Thermann 285 L. This is the size most Pakenham families land on." },
      { type: "p", text: "Five or more people, or the whole house showers inside an hour: Reclaim CO₂ split 315 L or 400 L. It costs more on the day, and the split layout, the stainless tank and the CO₂ recovery rate are what keep up with that pattern of draw." },
      { type: "p", text: "Solar on the roof and you want to time the charge: iStore 270 L. The Wi-Fi is built in rather than bolted on, which makes it easy to run the compressor on your own daytime export." },
      { type: "p", text: "Not sure? Book a free site check, we'll size it properly and quote you all three so you can pick." },
    ],
  },
  {
    slug: "heat-pump-real-cost-2026",
    publishedISO: "2026-04-28",
    author: "dean",
    seoTitle: "Heat Pump Cost After the VEU Rebate, 2026",
    cat: "Costs",
    title: "What does a heat pump actually cost after the VEU rebate in 2026?",
    blurb: "What goes into the price of a Reclaim install in Pakenham, line by line, and how the VEU rebate comes off it.",
    photo: "/reclaim-split-back.webp",
    photoAlt: "Reclaim heat pump install",
    alt: true,
    content: [
      { type: "p", text: "Every heat pump ad on the internet says \"from\" a number without ever telling you what the final figure is made of. Here's what goes into a typical Pakenham install, line by line, and what comes off it. The figure itself is on your written quote, fixed, after a free site check." },
      { type: "h2", text: "The Reclaim R290 300 L all-in-one" },
      { type: "p", text: "This is our best-selling unit for 3-4 person households. Australian made, plug-in install, R290 refrigerant. The unit itself is the biggest line on the quote, and we price it under Reclaim's published RRP, not over it." },
      { type: "h2", text: "Then the install costs" },
      { type: "p", text: "For an all-in-one plug-in install where there's a power point within 2 metres of the current tank, the installation pack covers:" },
      { type: "ul", items: [
        "Labour: taking out the old tank, setting the new one, plumbing and commissioning",
        "Sundry materials: valves, fittings, pipe and the base",
        "VBA compliance certificate, lodged by us",
        "Taking the old tank away",
      ] },
      { type: "p", text: "Unit plus install pack is the price before rebates. Both are on the quote as separate lines, inc GST." },
      { type: "h2", text: "Rebates applied (Solar Homes eligible)" },
      { type: "ul", items: [
        "VEEC rebate: -$576",
        "STC rebate: -$629",
        "Solar Victoria locally made top-up (Reclaim qualifies): -$400",
        "Solar Homes hot water rebate: -$1,000",
        "Total rebates: -$2,605",
      ] },
      { type: "h2", text: "The final price" },
      { type: "p", text: "Price before rebates, minus the rebate stack, is the figure you pay, and it's the one written on the quote. Fully installed, old unit gone, compliance certificate emailed, warranty pack in your inbox within 24 hours. No hidden charges, no \"actually the electrical is extra\" surprise on the day." },
      { type: "p", text: "If you don't have a power point within 2 metres of the current hot water, an electrician has to run a circuit. We check for it on the site visit, so it's a line on the quote rather than a surprise on the day." },
      { type: "p", text: "If you're not Solar Homes eligible (rental, income over $150k, prior rebate at the address), drop the -$1,000 and the -$400 locally made top-up from the rebate stack, and the price goes up by $1,400." },
      { type: "p", text: "Against a like-for-like gas tank replacement, a fully rebated heat pump is usually only a little dearer up front, sometimes not at all, and it cuts your hot water running cost by ~73%. How fast that pays back depends on how much hot water you use and the gap between the two quotes. Ask us to quote both and you can see the gap in writing." },
    ],
  },
  {
    slug: "size-split-system-bedroom",
    publishedISO: "2026-04-19",
    author: "jake",
    seoTitle: "How to Size a Split System, No Upsell",
    cat: "Aircon",
    title: "How to size a split system for your bedroom (and not get oversold)",
    blurb: "The 2.5kW vs 3.5kW vs 5kW question, demystified. Includes a quick room-size table for SE Melbourne homes.",
    photo: "/kaden-indoor.webp",
    photoAlt: "Kaden split system indoor head",
    content: [
      { type: "p", text: "Every second aircon quote we see for a Pakenham bedroom pitches a 5 kW unit. Almost none of them actually need it. Here's how to size it right." },
      { type: "h2", text: "The rough rule of thumb" },
      { type: "p", text: "For a well-insulated Pakenham home (built after ~2005), a split system in kW = your room's floor area in m² divided by 10-12. So a standard 12 m² bedroom needs about 1.0-1.2 kW of cooling, but the smallest split you can buy is 2.5 kW. So a 2.5 kW is more than enough for a well-insulated room of 12 to 20 m²." },
      { type: "h2", text: "Quick sizing table for SE Melbourne homes" },
      { type: "ul", items: [
        "Bedroom (10-20 m²): 2.5 kW split",
        "Large bedroom or small living (21-25 m²): 3.5 kW split",
        "Standard living / open plan (26-40 m²): 5.0 kW split",
        "Large open-plan (41-55 m²): 7.1 kW split",
        "Big open living + kitchen (56-75 m²): 9.0 kW split or step up to multi-head",
      ] },
      { type: "h2", text: "Why oversizing costs you money" },
      { type: "p", text: "Bigger isn't better. An oversized split short-cycles, it hits the setpoint fast, kicks off, then kicks on again 3 minutes later. That's rough on the compressor, chews power, and leaves the room feeling humid because it never runs long enough to dehumidify properly." },
      { type: "p", text: "The right-sized unit runs steadier, dehumidifies properly, uses less power, and lasts longer. So don't let anyone talk you into a 5 kW for a bedroom." },
      { type: "h2", text: "Brand notes" },
      { type: "p", text: "For bedrooms, Mitsubishi Electric's MSZ-AP series runs 19 dB indoor, quieter than a whisper. Perfect for kids' rooms and light sleepers. Costs a bit more than Kaden but you notice at 3 am." },
      { type: "p", text: "For living areas, Kaden gives you the best bang for buck, the KSI series has a 7-year manufacturer warranty and R32 inverter tech at Mitsubishi-lite pricing." },
      { type: "p", text: "Get us to quote you a size we'd actually install ourselves. We'll pick the smaller of two options if it does the job, reputation is worth more than an extra kW in someone's kid's bedroom." },
    ],
  },
  {
    slug: "carbon-monoxide-testing-ducted-heaters",
    publishedISO: "2026-04-11",
    author: "dean",
    seoTitle: "Carbon Monoxide Testing, Ducted Heaters",
    cat: "Gas safety",
    title: "Carbon monoxide testing on ducted heaters: why every 2 years matters",
    blurb: "What CO is, how it builds up in old units, what we test for on a service, and why this isn't a corner you can cut.",
    photo: "/evap-cooler-service.webp",
    photoAlt: "Gas safety service technician testing",
    alt: true,
    content: [
      { type: "p", text: "Carbon monoxide is a colourless, odourless gas, and it can kill. It comes from gas heaters that aren't burning cleanly, cracked heat exchangers, blocked flues, spider webs in the burner. You can't see it, smell it, or feel it building up. That's why we CO-test every gas heater we service." },
      { type: "h2", text: "What actually happens on a CO test" },
      { type: "p", text: "We run a two-stage test. First, an atmospheric test, the ducted unit runs on its normal cycle while we measure CO in the return air with a calibrated analyser. If we get any reading above 30 parts per million we're already investigating. Above 100 ppm and the unit is red-tagged on the spot." },
      { type: "p", text: "Second, a flue-gas test at the burner. We measure O₂, CO and combustion efficiency straight from the burn. A healthy ducted gas heater sits under 100 ppm CO air-free and above 78% combustion efficiency. Anything worse means the heat exchanger or burner needs attention." },
      { type: "h2", text: "Why every 2 years" },
      { type: "p", text: "Ducted gas heaters accumulate dust and lint in the burner over time, spider webs form in the flue draft diverter, and heat exchangers develop micro-cracks from thermal cycling. All three fail slowly, you don't notice degradation until it's dangerous." },
      { type: "p", text: "Energy Safe Victoria recommends gas heaters are serviced at least every two years, and rental properties must have a gas safety check every two years. Insurance companies increasingly ask for the CO test report on rental properties. And the difference between a 25-year-old ducted heater that's safe and one that's leaking CO into the house is often just one skipped service." },
      { type: "h2", text: "What we charge" },
      { type: "p", text: "$250 + GST for a full gas heater service with CO test. Includes:" },
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
    title: "Heat pumps + solar PV: the daytime-charge trick that can take hot water costs close to zero",
    blurb: "How to schedule a Reclaim or iStore unit to run in the middle of the day on your own solar export, which is about as cheap as hot water gets.",
    photo: "/reclaim-mitsubishi.webp",
    photoAlt: "Reclaim heat pump and outdoor unit on a brick wall",
    content: [
      { type: "p", text: "If you've got solar PV and a modern heat pump, you can run most of your hot water off your own solar, for close to nothing. Here's how the daytime-charge trick works." },
      { type: "h2", text: "The principle" },
      { type: "p", text: "Most solar households export more energy in the middle of the day than they use. The feed-in tariff you get for that export is a few cents a kWh at best, while buying power back from the grid costs around 32c/kWh. That's a huge margin you're giving away." },
      { type: "p", text: "A modern heat pump uses 500-800 W to heat 250-300 L of water, about 3-5 hours of runtime a day for a family of four. If you schedule those 3-5 hours during peak solar production (roughly 10 am to 3 pm), you're running the heat pump off your own free electricity instead of exporting it." },
      { type: "h2", text: "How to schedule it" },
      { type: "p", text: "The Reclaim CO₂ split with Wi-Fi controller, Reclaim R290 (Wi-Fi is built in), and iStore all let you set a heating window in the app. Point them at 10 am to 3 pm. The tank fills to setpoint during solar hours and holds temperature through the evening on stored heat." },
      { type: "p", text: "No Wi-Fi controller on your unit? A mechanical timer on the power point does the same job. Slightly clunkier but same result." },
      { type: "h2", text: "Real numbers from a Pakenham install" },
      { type: "p", text: "One of our recent installs, 4-person household, 6.6 kW solar, Reclaim R290 300 L. Their hot water usage was averaging 260 L/day. Before the swap: gas storage tank running them ~$680/year in gas. After the swap and scheduling: heat pump running off solar during the day, essentially $0/year in incremental power cost. The heat pump's 500-800 W draw sits entirely within their solar export headroom." },
      { type: "p", text: "That's a $680/year saving, on top of the $1,400 that came off their install through Solar Victoria's rebate and the locally made top-up, plus the VEU and STC certificates." },
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
    title: "Hot water tank failed? Replace like-for-like, or upgrade to heat pump?",
    blurb: "When the gas tank goes you need hot water back fast. Here's the maths, including the heat pump rebate question.",
    photo: "/gas-hot-water-changeover.webp",
    photoAlt: "Gas hot water changeover install",
    alt: true,
    content: [
      { type: "p", text: "Your gas storage tank just failed. You need hot water back fast, so here's the decision in plain numbers. Two options: swap like-for-like for another gas tank, or upgrade to a heat pump. Here's the actual maths for a Pakenham household." },
      { type: "h2", text: "Option A: Like-for-like gas tank swap" },
      { type: "p", text: "A 170 L gas storage tank, often installed the same day. Fast, simple, no VEU eligibility questions. Running cost: about $680/year in gas for a 3-4 person household." },
      { type: "p", text: "Life expectancy: 8-10 years. Then you're doing this again." },
      { type: "h2", text: "Option B: Reclaim R290 300 L heat pump upgrade" },
      { type: "p", text: "Fully installed, with the VEU and STC certificates and Solar Victoria's rebate (if you qualify) taken off at the quote, it often lands close to the gas tank, and up to $2,700 of the price can come off in rebates. Running cost: about $180/year in electricity, or effectively $0 if you've got solar and schedule the heating for daytime." },
      { type: "p", text: "Life expectancy: 12-15 years. Longer if you've got the stainless tank option." },
      { type: "h2", text: "5 years of running costs" },
      { type: "ul", items: [
        "Gas tank: 5 × $680 running = $3,400",
        "Heat pump on grid power: 5 × $180 running = $900",
        "Heat pump on solar: close to $0 running",
        "Heat pump saves you $2,500 - $3,400 in running costs over 5 years",
      ] },
      { type: "p", text: "Add the install price from each written quote to those figures and you have the real five-year comparison. Ask us to quote both options and we will." },
      { type: "h2", text: "When we'd still say go gas" },
      { type: "p", text: "You're renting and the landlord won't upgrade. You have no power point within 2 metres of the tank AND don't want to pay for a circuit to be run. You genuinely need hot water in the next 4 hours and can't wait for a heat pump lead time (though we often have the R290 in stock)." },
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
    title: "Replacing ducted gas heating with reverse-cycle: the honest cost-benefit",
    blurb: "A typical Pakenham 4-bedroom saves around $1,000 a year. But not every house does. Here's how to work out if yours is one of the winners.",
    photo: "/duct-work.webp",
    photoAlt: "Ducted reverse-cycle install replacing gas",
    content: [
      { type: "p", text: "Ducted gas is heading the way of open fireplaces. Reverse-cycle ducted (aka \"ducted heat pump\") is the modern replacement, same ductwork, better efficiency, cooling in summer too. But it doesn't make sense for every house. Here's the honest maths." },
      { type: "h2", text: "How reverse-cycle saves you money" },
      { type: "p", text: "A ducted gas heater runs at about 70-85% efficiency: of the energy in the gas you burn, 70-85% ends up as heat in the house. A modern inverter reverse-cycle system runs at a coefficient of performance (COP) of 3-4: for every 1 kWh of electricity, you get 3-4 kWh of heat out. Electricity costs more per unit than gas, so the bill doesn't drop fourfold, but it drops a long way." },
      { type: "p", text: "A typical Pakenham 4-bedroom home uses about 25,000 MJ of gas a winter for heating, that's around $1,650 at 6.6 c/MJ. At 70-85% efficiency that gas puts about 4,900-5,900 kWh of heat into the house. Reverse-cycle at a COP of 3-4 makes the same heat from about 1,200-2,000 kWh of electricity, roughly $400-$650 at 32 c/kWh. Solar helps on daytime heating, but most heating runs in the evening, so don't count on it for much." },
      { type: "p", text: "So you're saving roughly $1,000-$1,250 a year on running cost. Plus you get cooling for summer as part of the deal." },
      { type: "h2", text: "When it doesn't stack up" },
      { type: "p", text: "You've got single-phase power in a big house. Anything over 18 kW ducted needs 3-phase, if you're stuck on single-phase you're capped at ~18 kW capacity, which handles a 4-bedroom home comfortably but might not stretch to 5-6 bedroom homes." },
      { type: "p", text: "Your ductwork is unusable. If the existing ducts are galvanised (30+ years old), flexible ducting with tears, or wildly wrong-sized for reverse-cycle airflow, we need to replace them. That's a real addition to the job, and it's itemised on the quote." },
      { type: "p", text: "Your heating gas bill is small. If you barely run the heater, the running-cost saving is small too, the payback stretches out, and you might be better waiting for the next generation of ducted heat pumps." },
      { type: "h2", text: "Real numbers" },
      { type: "p", text: "An 18 kW Mitsubishi Electric ducted with a zone controller is a big job and a big number, even after the VEU rebate. The running-cost saving chips away at it every winter, you get cooling as well, and you get 15-20 years out of the equipment." },
      { type: "p", text: "Kaden does the same capacity for less, on the same ductwork and the same zoning, so it's worth pricing both." },
      { type: "p", text: "We do a full roof-cavity survey before quoting, no surprises on the day. Book a site check and we'll price it properly." },
    ],
  },
  {
    slug: "veu-rentals-landlord-checklist",
    publishedISO: "2026-03-10",
    author: "dean",
    seoTitle: "VEU for Rentals: A Landlord Checklist",
    cat: "VEU rebates",
    title: "VEU eligibility for rentals: a checklist landlords can hand to their PM",
    blurb: "Landlords ask us this every week. Here's a one-page checklist your property manager can use to confirm eligibility in 5 minutes.",
    photo: "/team-photo.webp",
    photoAlt: "Advanced Gas team on a rental property install",
    alt: true,
    content: [
      { type: "p", text: "Rental properties are absolutely eligible for VEU rebates. In fact, we do about a third of our heat pump installs on rentals. Here's the checklist landlords and property managers need to know." },
      { type: "h2", text: "The 5-second answer" },
      { type: "p", text: "The VEU certificates (VEECs) and the federal STCs both apply to rentals with no reduction. What a rental doesn't get is Solar Victoria's hot water rebate, the $1,000 (or $1,400 on a locally made unit), which is owner-occupier only. So on our worked example a rental gets about $1,205 off ($576 + $629) instead of the $2,605 an owner-occupier would get." },
      { type: "h2", text: "The 5-minute checklist" },
      { type: "p", text: "Property manager runs this in a phone call to the tenant:" },
      { type: "ul", items: [
        "What's the existing hot water system, gas storage, electric storage, or heat pump? (Anything gas or electric qualifies; existing heat pump doesn't.)",
        "Is there a power point within 2 metres of the current tank? (If yes, all-in-one heat pumps plug in straight. If no, a circuit has to be run, and it goes on the quote.)",
        "Can we access the tank for the swap? (Some townhouses have tanks in tight cupboards, worth checking.)",
        "Any solar PV on the roof? (Doesn't affect eligibility, but affects running cost sizing.)",
      ] },
      { type: "h2", text: "What the landlord pays" },
      { type: "p", text: "A Reclaim R290 300 L on a rental costs $1,400 more than the same install for an owner-occupier, because the rental misses Solar Victoria's rebate and its locally made top-up. The quote is fixed and in writing either way, and the upgrade still adds value to the property, cuts the tenant's power bill (bigger tenant appeal, longer stays), and future-proofs against Victoria's inevitable gas phase-out." },
      { type: "p", text: "The Residential Tenancies Act now requires \"Minimum Standards\" including working hot water, replacing a failing gas tank with a heat pump satisfies the requirement AND attracts $1,200+ in VEU and STC certificates. Better to do it planned than in a 3 am emergency." },
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
    title: "5 things you should clean on your split system every quarter",
    blurb: "The DIY maintenance that helps your aircon last longer and keeps your warranty conditions met. A few minutes of work.",
    photo: "/ducted-condenser.webp",
    photoAlt: "Split system condenser clean",
    content: [
      { type: "p", text: "Manufacturer warranties on split systems require the owner to keep the unit clean. Most people don't. That's why splits die at 8-10 years when they should last 15+. A few minutes of quarterly maintenance helps your unit last longer and keeps your warranty conditions met. Here's the drill." },
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
      { type: "p", text: "We recommend a professional service every 12 months. A standard split service is $250 + GST, and a deep clean of the evaporator coil, with a refrigerant pressure check, sensor check and drain flush, is $350 + GST. It keeps efficiency at spec and catches small faults before they get expensive." },
      { type: "p", text: "Book a service any time, we bundle multiple units at the same address if you've got splits in bedrooms plus a living-room unit: two or more are $180 + GST each for a standard service." },
    ],
  },

  // ============ Cluster hubs (SEO Wave 5) ============

  {
    slug: "heat-pump-hot-water-melbourne-complete-guide",
    publishedISO: "2026-08-04",
    author: "dean",
    seoTitle: "Heat Pump Hot Water Melbourne, 2026 Guide",
    cat: "Heat pumps",
    title: "Heat pump hot water Melbourne: the complete 2026 guide",
    blurb: "How heat pumps work, what drives the price in Melbourne after the VEU rebate, which brand suits which household, and the mistakes we see people make every week.",
    photo: "/reclaim-spit-close-up.webp",
    photoAlt: "Reclaim CO2 heat pump installed in a Melbourne home",
    content: [
      { type: "p", text: "Heat pump hot water is the biggest single upgrade a Melbourne household can make to their energy bill. Done right, with the rebates applied at the quote, it drops your hot-water running cost by 60-75% versus gas or electric storage." },
      { type: "p", text: "This is the article we wish every Melbourne homeowner read before ringing us. If you're on the fence, this walks you through what you actually need to know." },

      { type: "h2", text: "How a heat pump hot water system actually works" },
      { type: "p", text: "A heat pump is basically a reverse-cycle aircon in a tank. Instead of burning gas or heating an element, it uses electricity to compress a refrigerant, and that refrigerant grabs heat from the outside air and dumps it into the water tank. Because it's moving heat rather than making heat, it gets 3-5 kWh of hot water out of every 1 kWh of electricity, a COP (Coefficient of Performance) of 3 to 5. An electric element gets you 1-for-1. Gas gets you about 0.85-for-1 once you account for combustion losses and the tank standing loss." },
      { type: "p", text: "In Melbourne winters (down to 3-5°C most mornings, occasionally below zero), the COP drops but still sits at 2.5-3.5 depending on the brand. Cold-climate variants like the Reclaim CO2 (R744 refrigerant) hold capacity down to -10°C, worth the premium if you're in Emerald, Gembrook, Cockatoo, or the hills-country postcodes." },

      { type: "h2", text: "What it costs, installed, after VEU rebate" },
      { type: "p", text: "The units we install most often, cheapest to dearest once the full rebate stack comes off where eligible:" },
      { type: "ul", items: [
        "iStore all-in-one: the cheapest heat pump we fit",
        "Reclaim ECO R290 all-in-one: Australian made, and it plugs straight in",
        "Thermann ECO R290 all-in-one: same platform and same price as the Reclaim ECO",
        "Reclaim CO2 315L stainless: a step up, for cold mornings and long life",
        "Reclaim CO2 400L stainless: the dearest, for larger families",
      ] },
      { type: "p", text: "Every quote we send is a fixed, fully-installed price inc GST: labour, disposal of the old tank, permit and the compliance certificate all included, with the rebate already taken off. One thing that can add to it: if there's no power point within two metres of the existing system, the new unit needs a circuit run to it. We check on the site visit so it lands on the quote rather than the invoice. If a quote you're comparing has 'rebate handled separately' in the fine print, you're being asked to chase the rebate yourself." },

      { type: "h2", text: "Sizing, the 180 to 400 L question" },
      { type: "p", text: "Heat pump tanks recover slower than gas continuous flow, so tank size matters more than it does for storage gas. Our rules of thumb for Melbourne households:" },
      { type: "ul", items: [
        "1-2 people, one bathroom: 180L iStore, or a 200L Reclaim or Thermann R290",
        "3-4 people, one to two bathrooms: 270L iStore, 285L Thermann, 300L Reclaim R290 or 315L Reclaim CO2",
        "5+ people or acreage with heavy draw: 400L Reclaim CO2",
      ] },
      { type: "p", text: "If in doubt, size up. A 315L tank with a heavier draw uses maybe 5% more energy over a year than a 270L; a 270L tank that runs out mid-second-shower is a daily annoyance." },

      { type: "h2", text: "Reclaim vs Thermann vs iStore, the honest take" },
      { type: "p", text: "We install all three. The gap between them is real but not enormous:" },
      { type: "ul", items: [
        "Reclaim (CO2): natural refrigerant, stainless tank option, 37 dB, and it still makes its heat at -10 °C. The one for a house you're staying in, or a cold one.",
        "Thermann (R290): Reece-exclusive and built by Dux, so spares are usually on the shelf locally. The one for a rental, an investment property, or anywhere a fault needs fixing fast.",
        "iStore (R290): designed here, built in China, and the cheapest heat pump we fit. The one when price is what decides it.",
      ] },
      { type: "p", text: "We wrote a separate long-form comparison on this, see 'Reclaim vs iStore vs Thermann', but the short version is: hills postcode or staying ten years, Reclaim. Price is what decides it, iStore. Rental, or you want the widest parts network behind you, Thermann." },

      { type: "h2", text: "Common mistakes we see" },
      { type: "p", text: "First, trying to put a heat pump where the old gas storage tank was without checking outdoor space. Heat pumps need airflow. If your old tank was in a tight cupboard or under a stairwell, we might need to move the plumbing outdoors or repurpose a bit of the yard. Not a deal-breaker but affects the quote." },
      { type: "p", text: "Second, choosing on sticker price without factoring in the rebates. An owner-occupier who qualifies for Solar Victoria gets an extra $400 on a locally made unit (Reclaim, Thermann); iStore doesn't take it. So the shelf-price gap looks different once the rebates are applied." },
      { type: "p", text: "Third, ignoring Solar Homes eligibility. If you're an owner-occupier under $150k combined income with the property under $3M, there's another $1,000 (or $1,400 on a locally made unit) on top of the VEU and STC certificates. Plenty of the households we quote qualify without realising. See our VEU rebate guide for the full checklist." },

      { type: "h2", text: "What happens on quote day" },
      { type: "p", text: "We come out for a 20-minute site check: measure the tank space, check the outdoor position for the compressor, look at the switchboard, confirm your Solar Homes eligibility on the spot. You get a written quote by email with all rebates already applied. If you accept, we book you in, usually within the week." },
      { type: "p", text: "No obligation to accept. If our number's higher than a competitor, we'll show you where the difference is." },
    ],
  },

  {
    slug: "split-system-installation-melbourne-2026",
    publishedISO: "2026-08-11",
    author: "jake",
    seoTitle: "Split System Installation Melbourne 2026",
    cat: "Aircon",
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
        "Mitsubishi Electric MSZ-AP: our default. Quieter on low fan, and the parts pipeline is still open on units we put in a decade ago.",
        "Mitsubishi Electric MSZ-FH (Hyper Heating): the one for the Dandenong Ranges, built to keep heating hard on frosty mornings when a standard split has lost a good part of its output.",
        "Kaden KSI-v3: the one when a family wants three bedrooms done in one visit rather than one a year. Reece-exclusive, so parts are in every store in Victoria, 7-year manufacturer warranty.",
        "Everything else: we'll install what you specify, but these are the two ranges we know inside out.",
      ] },

      { type: "h2", text: "What a proper install day looks like" },
      { type: "p", text: "A standard split system install is a half-day for one unit. Here's what should happen, and what the cut-price mobs skip:" },
      { type: "ul", items: [
        "Evacuate the refrigerant lines to 500 microns or below (removes moisture that would eventually degrade the compressor)",
        "Nitrogen pressure test the lines to confirm no leaks BEFORE releasing the factory refrigerant charge",
        "Mount the outdoor unit on wall brackets or a purpose-made stand, never straight on the ground",
        "Wrap and duct-tape the line-set weather cover neatly (visible from the yard, not the neighbour's problem)",
        "Test the unit in cool AND heat for 20 minutes minimum, confirm temperatures at the vent, sign the compliance certificate",
      ] },
      { type: "p", text: "If the installer doesn't have a vacuum pump on the truck, they're not vacuum-purging. If they don't have a nitrogen bottle, they're not pressure testing. These are the two easy-to-check signals of a proper job." },

      { type: "h2", text: "What drives the price of a split install" },
      { type: "p", text: "A standard install covers the unit, a 3m back-to-back run, the wall bracket and the compliance certificate. The price then moves with:" },
      { type: "ul", items: [
        "Size: each step from 2.5 to 3.5, 5.0 and 7.1 kW costs more",
        "Brand: Kaden KSI comes in under Mitsubishi Electric at each size",
        "Pipe run: anything past the included 3m adds copper and labour",
        "Access: a first-floor install with roof access takes longer",
        "Coastal homes (Tooradin, the Lang Lang edge): salt-tolerant coil coating",
      ] },
      { type: "p", text: "We see all of that on the free site check, so it's on the written quote, and the quote is the price. It only changes if the job does, and we tell you before it does." },

      { type: "h2", text: "What to ask the installer" },
      { type: "p", text: "Three questions that tell you everything:" },
      { type: "ul", items: [
        "Do you vacuum-purge and nitrogen-pressure-test? (Should be yes, no hesitation)",
        "What's the workmanship warranty on top of the manufacturer warranty? (We do 6 years, bare minimum should be 5)",
        "Will your own crew do the install, or a subcontractor? (Small-business red flag if the answer is 'we send a sub-contractor')",
      ] },
    ],
  },

  {
    slug: "ducted-aircon-melbourne-cost-install",
    publishedISO: "2026-08-18",
    author: "jake",
    seoTitle: "Ducted Aircon Melbourne: Cost & Install",
    cat: "Ducted aircon",
    title: "Ducted aircon Melbourne, cost, install, and what to spec in 2026",
    blurb: "Sizing a ducted system for a Melbourne family home, retrofit vs new-build install, zoning, and what a ducted quote should actually get you.",
    photo: "/duct-work.webp",
    photoAlt: "Ducted aircon installation in a Melbourne home ceiling void",
    content: [
      { type: "p", text: "Ducted air conditioning is the highest-value upgrade for a Melbourne family home that's outgrown single-room splits. Done right, one system cools and heats the entire house from a single controller with per-zone setpoints. Done wrong (undersized, badly ducted, no zoning), it costs more to run than four separate splits and never quite gets cold enough on a 38°C day." },
      { type: "p", text: "This is what we tell every Berwick, Officer, Cranbourne and Clyde North family that rings us for a ducted quote." },

      { type: "h2", text: "Retrofit or new-build, the pricing gap is big" },
      { type: "p", text: "If your house was built with ducted rough-ins from day one (most Clyde North, Officer South, Selandra Rise new builds after 2018), install is straightforward, indoor and outdoor unit plus connection. If we're pulling ducts through an existing weatherboard or 90s brick veneer where nothing was pre-run, the duct and ceiling-access labour adds a fair bit to the job." },
      { type: "p", text: "We check the ceiling void on the quote visit. Standard 300mm void with truss access = straightforward. 200mm void or hip-roof with no truss access = harder, and we spec the slim-line SEZ-KD indoor rather than a normal PEA-M. Not a deal-breaker but affects the price." },

      { type: "h2", text: "Sizing, the load calc that matters" },
      { type: "p", text: "Typical sizes for Melbourne homes with average glass:" },
      { type: "ul", items: [
        "Small 3-bed single-storey (~120m²): 10-12.5 kW",
        "Standard 4-bed single-storey (~160-180m²): 14 kW",
        "4-bed double-storey (~200m²): 16 kW",
        "Larger great-room double-storey with high glass (>250m²): 18-22 kW",
      ] },
      { type: "p", text: "We do a proper heat-load calc on any job over 14 kW, measures the glass area, insulation R-value, and orientation. Skip this and either you get an oversized system that cycles constantly (expensive to run, hard on the compressor) or an undersized one that can't hold setpoint on 35°C+ days." },

      { type: "h2", text: "Zoning, the single biggest efficiency win" },
      { type: "p", text: "Never install a ducted system without zoning. Non-negotiable. A 4-zone controller lets you shut off unused rooms, kids' bedrooms during the day, living zones at night, and cuts running cost by 30-40% over an always-on ducted setup." },
      { type: "p", text: "Our default recommendations by house size:" },
      { type: "ul", items: [
        "3-bed single-storey: 4 zones (living, master, kids, study/bathroom)",
        "4-5 bed single-storey: 6 zones",
        "Double-storey: 8 zones (per bedroom + living zones, upstairs/downstairs split)",
      ] },
      { type: "p", text: "Variable-speed dampers (VSD) are worth the small extra per zone if you want proportional airflow rather than just on/off. Nicer comfort in less-used zones, 30% airflow to the study, 100% to living, all controlled from your phone." },

      { type: "h2", text: "Brand pick for the ducted head unit" },
      { type: "p", text: "Mitsubishi Electric PEA-M is our default mid-static indoor unit. Long duct runs or 6-plus zones want the PEA-RP high-static instead, because static pressure rather than capacity is what starves the far bedroom. Shallow ceiling voids get the SEZ-KD slim-line. Kaden Ducted (the KDI series) is the lower-cost route, on the same ductwork and the same zoning." },

      { type: "h2", text: "What a Melbourne ducted install costs" },
      { type: "p", text: "Our ducted quotes are fully installed: indoor + outdoor unit, all ducting to the zones, zone controller and dampers, compliance certificate, warranty registration. What moves the figure:" },
      { type: "ul", items: [
        "Capacity: from about 10 kW for a smaller home to 18 kW and up for a big one",
        "Brand: Kaden Ducted comes in under Mitsubishi Electric at the same size",
        "Zones: 4 zones costs less than 6 or 8",
        "Indoor unit: a high-static PEA-RP for long runs costs more than a PEA-M",
        "Retrofit: ceiling access, patch and paint, and pulling duct through the roof cavity",
      ] },
      { type: "p", text: "We measure all of it on the free site check, so the written quote is the fixed price. It only changes if the job does, and you hear about it first." },

      { type: "h2", text: "What separates a cheap ducted quote from a dear one" },
      { type: "p", text: "Same-brand indoor unit, similar kW rating, but thousands apart. That gap is almost always:" },
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
    title: "Gas heating & hot water Melbourne, repair, replace, or switch?",
    blurb: "Brivis, Braemar and gas hot water: what still makes sense on gas in Melbourne, and when it's time to move to heat pump or reverse-cycle.",
    photo: "/gas-hot-water-changeover.webp",
    photoAlt: "Gas hot water system replacement in a Melbourne home",
    content: [
      { type: "p", text: "Victoria's direction of travel is away from gas in homes. But the reality for a Melbourne homeowner is more nuanced, some gas appliances still make sense to repair or replace like-for-like, others don't. This guide walks through when each choice is right." },

      { type: "h2", text: "The three gas appliances in a typical Melbourne home" },
      { type: "p", text: "Most Melbourne family homes still have three gas appliances:" },
      { type: "ul", items: [
        "Ducted gas heater (Brivis, Braemar, Bonaire), 10-20 years old, sitting in the roof or under the house",
        "Gas hot water (Rinnai continuous flow or a gas storage tank), 8-15 years old, mounted outside",
        "Gas cooktop, usually indefinite lifespan, low running cost",
      ] },
      { type: "p", text: "The first two are the ones that trigger the repair-vs-replace-vs-switch decision every few years. We'll take them in turn." },

      { type: "h2", text: "Ducted gas heater, repair, replace, or switch to reverse cycle?" },
      { type: "p", text: "If your ducted gas heater is under 10 years old and just needs a service or a burner replacement, repair it. Straightforward, and done in a morning. Typical service $250 + GST, ignition unit swap ~$580." },
      { type: "p", text: "If it's 10-15 years old and the heat exchanger has cracked (we test for this, carbon monoxide leaks kill people every winter), that's a like-for-like replacement or a switch to reverse-cycle. Like-for-like Brivis-to-Brivis replacement runs $4,500-$6,500 depending on system size. Switching to reverse-cycle ducted uses your existing ducts if they're sound, $9,000-$12,000 but the running cost is roughly 60% lower and you get cooling in summer as a bonus." },
      { type: "p", text: "If it's 15+ years old, even if it's still running, price the switch to reverse-cycle now rather than waiting for it to fail mid-winter. If you're planning to stay in the house, switch." },

      { type: "h2", text: "Gas hot water, the fastest-changing decision" },
      { type: "p", text: "This is the one that's shifted hardest. A few years ago a like-for-like gas continuous flow swap was the obvious call. Now, with the VEU and STC certificates and Solar Victoria's rebate, a heat pump often ends up cheaper installed AND cheaper to run." },
      { type: "p", text: "A Cranbourne family we quoted recently had three options on one quote:" },
      { type: "ul", items: [
        "Gas continuous flow, like-for-like replacement",
        "iStore 270 L heat pump after the rebates: they cover most of it, and the balance is on the quote",
        "Reclaim 315L stainless heat pump after the rebates: the dearest of the three, for the longest tank life",
      ] },
      { type: "p", text: "Once the rebates were applied the iStore landed under the like-for-like gas unit on the day, and it saves them about $400 a year to run on top of that. Rebate values move with VEEC prices and eligibility, so the number that matters is the one on your own quote, not this one." },
      { type: "p", text: "The one exception: if your existing gas line, meter and location can accommodate continuous flow and there's no outdoor space for a heat pump condenser, gas continuous flow is still the pragmatic choice." },

      { type: "h2", text: "Emergency gas repairs, when to call today" },
      { type: "p", text: "Ring us on the main number for:" },
      { type: "ul", items: [
        "Smell of gas anywhere in or around the house (get outside first, then ring the gas emergency line on 132 771)",
        "Pilot light won't stay lit",
        "Continuous flow throws error codes and shuts down",
        "Yellow flame in a burner (should be blue, yellow means incomplete combustion, CO risk)",
        "Carbon monoxide detector alarm (get everyone outside first and, if it's safe, turn the appliance off)",
      ] },
      { type: "p", text: "After hours: gas leaks and no hot water, call and we'll answer if we can. The after-hours call-out is $450 + GST, which covers the first hour on site. For a gas leak, ring the gas emergency line on 132 771 as well." },

      { type: "h2", text: "Carbon monoxide testing, the every-two-years rule" },
      { type: "p", text: "Any gas appliance older than 8 years should have a CO test every two years. Cracked heat exchangers in older ducted heaters are a known cause of carbon monoxide poisoning. We do the test as part of every gas heater service, along with tuning, a filter clean and a gas pressure check." },
    ],
  },

  {
    slug: "emergency-hot-water-gas-melbourne",
    publishedISO: "2026-08-13",
    author: "dean",
    seoTitle: "Emergency Hot Water & Gas Repair Melbourne",
    cat: "Emergency",
    title: "Emergency hot water & gas repair Melbourne, what to do first",
    blurb: "No hot water on a Sunday morning? Gas smell in the laundry? Here's the two-minute checklist to run before you ring anyone.",
    photo: "/thermann-heat-pump.webp",
    photoAlt: "Emergency hot water replacement in a Melbourne home",
    content: [
      { type: "p", text: "This is the short version, save this article for the day you actually need it, which is usually a Sunday morning with three kids and a shower queue." },

      { type: "h2", text: "No hot water, the 60-second diagnosis" },
      { type: "p", text: "Before ringing us, check three things:" },
      { type: "ul", items: [
        "Is any hot water coming out? Even lukewarm? (Points to element or thermostat failure vs total unit failure)",
        "Is there an error code on the display? (Look it up in our fault code tool, then snap a photo and email it to admin@advancedgas.com.au)",
        "Has the electrical breaker tripped? (Reset it once; if it trips again, ring us.) Is the gas isolation valve on?",
      ] },
      { type: "p", text: "Ring us with the answers, or email them with the photo, and we can usually tell you quickly whether it's a fix or a replacement." },

      { type: "h2", text: "Gas smell, do this in this order" },
      { type: "p", text: "If you can smell gas anywhere in or around the house:" },
      { type: "ul", items: [
        "Do not turn any electrical switches on or off, sparks ignite gas",
        "Open every window and external door",
        "Turn off the gas meter (isolation valve, quarter-turn) if you can reach it safely",
        "Get everyone outside",
        "Once outside, ring the gas emergency line on 132 771 (or 000 if there's a fire or the smell is strong), then ring us",
      ] },
      { type: "p", text: "After hours: gas leaks and no hot water, call and we'll answer if we can. The after-hours call-out is $450 + GST, which covers the first hour on site. For a gas leak, 132 771 is the first call." },

      { type: "h2", text: "Carbon monoxide alarm, take it seriously" },
      { type: "p", text: "CO is colourless, odourless, and kills. If your CO detector alarms:" },
      { type: "ul", items: [
        "Get everyone outside immediately",
        "If you can do it safely, turn off the gas appliance you suspect",
        "Ring 000 if anyone has headache, dizziness, or nausea",
        "Ring us for a CO test before that appliance is used again",
      ] },
      { type: "p", text: "Ducted gas heaters are the usual culprit, cracked heat exchanger dumping CO into the return-air path. We can test on site with a proper analyser." },

      { type: "h2", text: "What we do same-day (and what we don't)" },
      { type: "p", text: "Same-day during business hours, Monday to Friday:" },
      { type: "ul", items: [
        "Hot water leak repair or unit shutdown",
        "Gas leak isolation and repair",
        "Ducted gas heater CO test and shutdown",
      ] },
      { type: "p", text: "Not same-day (need parts or council permits):" },
      { type: "ul", items: [
        "Complete heat pump replacement: a written quote after the site visit, then usually about a week to install",
        "Complete ducted heater replacement, 3-7 days",
        "New gas connection or meter upgrade",
      ] },
      { type: "p", text: "Temporary hot water: if you're going to be without hot water for a while, we can connect a temporary unit, hired by the day, until the new one's in. Ask." },
    ],
  },

];

/**
 * The read time, counted rather than written by hand. The hand-written ones
 * ran three to five times long (an 11-minute label on a 470-word post). Same
 * 200 words a minute the portal uses for the posts written there.
 */
function readTime(content: Section[]): string {
  const text = content.map((s) => (s.type === "ul" ? s.items.join(" ") : s.text)).join(" ");
  return `${readingMinutes(text)} min read`;
}

export const posts: BlogPost[] = written.map((p) => ({ ...p, read: readTime(p.content) }));

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

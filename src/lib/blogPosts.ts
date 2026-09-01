// Blog post content store.
// Each post renders through src/app/blog/[slug]/page.tsx.
// `html` fields are author-trusted; we render them with dangerouslySetInnerHTML.

export type BlogPostBlock =
  | { kind: "p"; html: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "callout"; title: string; html: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription: string;
  category: string;
  categoryShort: string;
  date: string;
  iso: string;
  readingMinutes: number;
  excerpt: string;
  photo: string;
  photoAlt: string;
  body: BlogPostBlock[];
  faqs?: { q: string; a: string }[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "reclaim-vs-istore-vs-thermann",
    title: "Reclaim vs iStore vs Thermann: which heat pump is right for your house?",
    metaTitle: "Reclaim vs iStore vs Thermann Heat Pumps Compared (2026)",
    metaDescription:
      "Honest 2026 comparison of Reclaim, iStore and Thermann heat pump hot water — sizing, warranty, noise, real-world running cost in SE Melbourne households.",
    category: "Heat pumps",
    categoryShort: "Heat pumps",
    date: "4 May 2026",
    iso: "2026-05-04",
    readingMinutes: 10,
    excerpt:
      "Honest comparison of the three brands we actually install, with sizing advice for 2 / 3 / 5-person households.",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Heat pump hot water unit installed against an exterior wall",
    body: [
      {
        kind: "p",
        html:
          "Every week someone in Pakenham asks us the same question: <strong>Reclaim, iStore or Thermann?</strong> All three are listed under the Victorian Energy Upgrades (VEU) program, all three pull the same federal STCs, and all three save roughly the same energy. The difference is in the build, the warranty, the noise and the price-after-rebate. Here's the version we'd give a mate at the pub.",
      },
      { kind: "h2", text: "The short answer" },
      {
        kind: "ul",
        items: [
          "<strong>Smaller household, rental or a tight budget?</strong> Thermann 270L. Cheapest after rebate, stainless tank, simple controls.",
          "<strong>Got solar PV and want app control?</strong> iStore 270L. Smart scheduling drops your daytime hot water cost to almost zero.",
          "<strong>Want the quietest, longest-lasting unit money can buy?</strong> Reclaim CO₂. Premium price, premium build, 10-year tank.",
        ],
      },
      { kind: "h2", text: "What you actually get" },
      {
        kind: "table",
        headers: ["", "Thermann 270L", "iStore 270L", "Reclaim CO₂ 270L"],
        rows: [
          ["After-VEU price*", "~$1,780", "~$2,400", "~$3,500"],
          ["Refrigerant", "R134a", "R513A", "CO₂ (R744)"],
          ["Tank warranty", "5 years", "6 years", "10 years"],
          ["Noise (dB at 1m)", "48", "44", "37"],
          ["Smart controls", "Basic timer", "Wi-Fi + app", "Wi-Fi + app"],
          ["Best for", "2–4 people", "3–5 people, solar homes", "3–6 people, premium"],
        ],
      },
      {
        kind: "p",
        html:
          "*Approximate cost after VEU rebate has been applied at quote. Final figure depends on your existing unit, household size and certificate price at the time of install.",
      },
      { kind: "h2", text: "Sizing: don't overspend" },
      {
        kind: "p",
        html:
          "Tank size matters more than brand. A 270L unit handles 3–5 people comfortably. Two people? You can usually drop to a 200L and save another $300. Six-plus? Step up to 285L or 300L for back-to-back showers.",
      },
      {
        kind: "p",
        html:
          "Heat pumps recover heat slower than gas instantaneous units, so the rule of thumb is roughly <strong>70 litres per person per day</strong> for hot showers, dishwashing and the odd bath. Undersize it and you'll run out before the last kid is bathed; oversize it and you've paid for capacity you'll never use.",
      },
      { kind: "h2", text: "Noise — the dealbreaker most people miss" },
      {
        kind: "p",
        html:
          "Heat pumps run a compressor outside, like an aircon condenser. <strong>Thermann sits at around 48 dB at 1 metre</strong> — about as loud as a quiet conversation. <strong>Reclaim is 37 dB</strong>, which is whisper territory. If your unit will live near a bedroom window or close to the neighbour's fence, the extra grand on a Reclaim buys you a lot of peace.",
      },
      { kind: "h2", text: "Solar pairing: where iStore quietly wins" },
      {
        kind: "p",
        html:
          "If you've got solar PV, your hot water can effectively run on free energy. iStore's app lets you schedule the unit to only run between 10am and 3pm — the daytime hours your roof is generating. Reclaim can do the same with a basic timer, but iStore's interface is friendlier.",
      },
      {
        kind: "p",
        html:
          "We've had Pakenham customers on solar drop their hot water cost to literally zero this way. Worth doing properly the first time.",
      },
      { kind: "h2", text: "Our recommendation, by household" },
      {
        kind: "ol",
        items: [
          "<strong>Couple, no solar:</strong> Thermann 200L or 270L. Cheap, reliable, gets the rebate.",
          "<strong>Family of 4, average usage, has solar:</strong> iStore 270L on a daytime schedule. Best dollars-per-comfort.",
          "<strong>Family of 5+, premium build, near a bedroom:</strong> Reclaim CO₂ 270L. Quiet, 10-year tank, sleep easy.",
          "<strong>Investment property:</strong> Thermann 270L. Tenant gets a working unit, you bank most of the rebate.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the Reclaim worth the extra money?",
        a: "If you'll keep the house 8+ years and the unit lives near a bedroom or shared fence, yes. The 10-year tank warranty and 37 dB noise floor justify the premium. For rentals or short-term holds, a Thermann's the smarter spend.",
      },
      {
        q: "Will any of these work down to 0 °C overnight?",
        a: "All three operate fine at Pakenham's typical winter lows (-2 to +4 °C). Reclaim's CO₂ refrigerant holds efficiency better below zero — meaningful in Warragul or up at Olinda, marginal in central Pakenham.",
      },
      {
        q: "Can I switch brands mid-quote?",
        a: "Absolutely. We'll quote two side-by-side and lay out the cost difference after rebate. No pressure, no swapped-in upsells.",
      },
    ],
  },
  {
    slug: "heat-pump-cost-veu-rebate-2026",
    title: "What does a heat pump actually cost after the VEU rebate in 2026?",
    metaTitle: "Heat Pump Cost After VEU Rebate 2026 — Real Pakenham Numbers",
    metaDescription:
      "Real, indicative 2026 pricing for a 270L Thermann, iStore and Reclaim heat pump installed in Pakenham, with the Victorian Energy Upgrades (VEU) rebate already applied.",
    category: "Costs & savings",
    categoryShort: "Costs",
    date: "28 Apr 2026",
    iso: "2026-04-28",
    readingMinutes: 7,
    excerpt:
      "Real numbers — not \"from $XXX\" marketing — for a 270L Thermann install in Pakenham, with the rebate applied.",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Heat pump hot water unit installed against an exterior wall",
    body: [
      {
        kind: "p",
        html:
          "Heat pump pricing is the most-asked, most-misunderstood number in the trade. Every installer's website says <em>\"from $XXX\"</em> — but the asterisk hides whether that's after rebate, before rebate, eligible household, or just plain marketing fiction. Here's the unvarnished version for a typical Pakenham install in 2026.",
      },
      { kind: "h2", text: "A real 270L Thermann quote — line by line" },
      {
        kind: "table",
        headers: ["Item", "Price"],
        rows: [
          ["Thermann 270L heat pump", "$2,200"],
          ["Installation & commissioning", "$700"],
          ["Electrical", "$350"],
          ["Parts & fittings", "$350"],
          ["Compliance certificate & VEU paperwork", "incl."],
          ["Sub-total", "$3,600"],
          ["VEU rebate (applied at quote)", "−$1,820"],
          ["<strong>You pay (ex GST)</strong>", "<strong>$1,780</strong>"],
        ],
      },
      {
        kind: "p",
        html:
          "That's the number for an eligible household — typically an existing gas or electric storage tank being swapped for a Thermann 270L heat pump in Pakenham 3810. Take that as a reference; your number moves based on the existing system, how far the new unit lives from the cylinder pad, and the price of certificates the week we lodge.",
      },
      { kind: "h2", text: "Why \"from $33\" claims are dodgy" },
      {
        kind: "p",
        html:
          "You'll see a lot of <em>from $33</em> ads. That figure exists only at the absolute edge of eligibility — usually electric storage swap, concession card holder, maximum certificate count, and a backyard installer cutting their margin to win the lead. <strong>It's not the typical number.</strong> The Pakenham median sits between $1,500 and $3,500 after rebate, depending on brand.",
      },
      { kind: "h2", text: "Brand-by-brand after-rebate range" },
      {
        kind: "ul",
        items: [
          "<strong>Thermann 270L:</strong> ~$1,780. Best value, 5-year tank.",
          "<strong>iStore 270L:</strong> ~$2,400. Smart Wi-Fi, 6-year tank.",
          "<strong>Reclaim CO₂ 270L:</strong> ~$3,500. Premium, 37 dB, 10-year tank.",
        ],
      },
      { kind: "h2", text: "What the rebate actually covers" },
      {
        kind: "p",
        html:
          "VEU certificates compensate for the energy efficiency improvement of swapping an inefficient system (gas storage, electric storage, continuous flow gas) for a high-COP heat pump. The amount varies by:",
      },
      {
        kind: "ul",
        items: [
          "Existing system (electric storage = highest rebate, gas storage = strong, continuous flow gas = moderate)",
          "Climate zone (Pakenham sits in the favourable zone)",
          "Certificate market price (fluctuates 5–10% within a year)",
          "Whether the property is owner-occupied or rental (rental rebates run slightly lower)",
        ],
      },
      {
        kind: "callout",
        title: "Important",
        html:
          "We lock the rebate value into your written quote. If certificate prices drop between quote and install, that's our problem — not yours.",
      },
      { kind: "h2", text: "Payback in real numbers" },
      {
        kind: "p",
        html:
          "Swap an old electric storage tank for a 270L heat pump and a typical Pakenham household saves <strong>$600–$900 a year</strong> on power. Add solar daytime charging and that pushes to <strong>$900–$1,400</strong>. After a $1,780 out-of-pocket Thermann install, you're net positive inside <strong>2 years</strong>. After that, it's free hot water for the life of the tank.",
      },
    ],
    faqs: [
      {
        q: "Does the rebate cover the whole install?",
        a: "Almost — for an electric storage swap with concession the rebate can cover 90% of the install. For the typical gas storage swap it's about 50–60%. We confirm the exact figure in your written quote before you sign anything.",
      },
      {
        q: "Are STCs separate from VEU?",
        a: "Yes. STCs are the federal solar/hot-water certificate scheme; VEU is the Victorian state scheme. Eligible installs pull both. We bundle them into your quote so you see one net price.",
      },
      {
        q: "Can I claim the rebate myself?",
        a: "Technically yes, but only if you're a VEU-accredited provider. We are — that's why we do the paperwork and just deduct the rebate at quote. Saves you the chase.",
      },
    ],
  },
  {
    slug: "split-system-sizing-bedroom",
    title: "How to size a split system for your bedroom (and not get oversold)",
    metaTitle: "Split System Sizing Guide — Bedrooms, SE Melbourne",
    metaDescription:
      "The 2.5 kW vs 3.5 kW vs 5 kW question, demystified. Real sizing table for SE Melbourne bedrooms, plus the upsell traps to watch.",
    category: "Aircon",
    categoryShort: "Aircon",
    date: "19 Apr 2026",
    iso: "2026-04-19",
    readingMinutes: 9,
    excerpt:
      "The 2.5kW vs 3.5kW vs 5kW question, demystified. Includes a quick room-size table for SE Melbourne homes.",
    photo: "/kaden-indoor.jpg",
    photoAlt: "Kaden split-system indoor head mounted on a bedroom wall",
    body: [
      {
        kind: "p",
        html:
          "If you've ever rung three aircon installers and got back three different kW recommendations for the same bedroom, you're not imagining things. Sizing is part science, part \"depends what we have in the warehouse this week\". Here's how to size honestly, and how to spot the upsell.",
      },
      { kind: "h2", text: "The honest sizing rule" },
      {
        kind: "p",
        html:
          "For a standard south-east Melbourne home (single storey, R3 ceiling insulation, average windows), allow roughly <strong>125–150 watts of cooling per square metre</strong>. Insulated double-storey or west-facing rooms push that up; north-facing bedrooms with curtains drawn drop it down.",
      },
      {
        kind: "table",
        headers: ["Room size", "Best kW", "Typical model"],
        rows: [
          ["Up to 14 m² (small bedroom)", "2.5 kW", "Kaden KS25 / Mitsubishi MSZ-AP25"],
          ["14–22 m² (master, study)", "3.5 kW", "Kaden KS35 / Mitsubishi MSZ-AP35"],
          ["22–34 m² (open-plan + bedroom)", "5.0 kW", "Kaden KS50 / Mitsubishi MSZ-AP50"],
          ["34–50 m² (lounge / living)", "7.0 kW", "Mitsubishi MSZ-AP71"],
          ["50 m²+ or whole-floor", "Multi-head / ducted", "Quote individually"],
        ],
      },
      { kind: "h2", text: "Three common upsells to watch" },
      { kind: "h3", text: "1. \"You need 5kW for that bedroom\"" },
      {
        kind: "p",
        html:
          "For a 12 m² bedroom, a 5 kW unit is roughly <strong>twice the capacity needed</strong>. Oversized units short-cycle (fast on/off), don't dehumidify properly, and cost 30–40% more upfront. Stick to the table above.",
      },
      { kind: "h3", text: "2. \"You need the premium brand or it won't last\"" },
      {
        kind: "p",
        html:
          "Mitsubishi Electric is the gold standard, but <strong>Kaden punches well above its price</strong> for everyday Australian conditions. We've installed 800+ Kadens in SE Melbourne; failure rate is comparable to mid-range Daikin. Pay the premium if you want whisper-quiet operation or app control — not because you've been told the cheaper unit will die.",
      },
      { kind: "h3", text: "3. \"Quote includes a 10-year warranty\"" },
      {
        kind: "p",
        html:
          "Most split systems carry a <strong>5-year manufacturer warranty</strong>. \"10 years\" usually means 5 years on the compressor and 5 on parts — the marketing reads as one number. Always ask for the written warranty terms.",
      },
      { kind: "h2", text: "Position matters more than capacity" },
      {
        kind: "p",
        html:
          "A 3.5 kW unit pointed the wrong way will struggle in a 16 m² room. Indoor heads need:",
      },
      {
        kind: "ul",
        items: [
          "Clear airflow — not blocked by wardrobe doors or curtain pelmets",
          "300+ mm clearance from the ceiling for return air",
          "A position that throws air <strong>across</strong> the room, not into a corner",
          "Outdoor condenser within ~10 m pipe run for full efficiency",
        ],
      },
      { kind: "h2", text: "What we actually install in bedrooms" },
      {
        kind: "p",
        html:
          "For Pakenham, Officer and Berwick bedrooms our default recommendation is the <strong>3.5 kW Kaden KS35</strong> or <strong>Mitsubishi MSZ-AP35</strong>. Quiet on low fan, R32 inverter, ARC-licensed install, $1,899–$2,499 supplied and fitted depending on pipe run.",
      },
      {
        kind: "p",
        html:
          "If the room shares a wall with the kid's room and noise matters, step up to Mitsubishi (19 dB on low fan). If the budget's tight, the Kaden gets you there cleanly.",
      },
    ],
    faqs: [
      {
        q: "Can a single split system cool two bedrooms?",
        a: "Through a closed wall — no. Air won't redistribute without ducts. A multi-head system splits one outdoor unit between 2–4 indoor heads (one per room). Usually cheaper than two separate splits if both rooms need cooling.",
      },
      {
        q: "What about heating with the same unit?",
        a: "Reverse-cycle splits heat and cool. In SE Melbourne winters a 3.5 kW unit heats a bedroom to 22 °C from 5 °C in about 15 minutes. Cheaper per kWh than a gas heater after the first year.",
      },
      {
        q: "Do I need a permit?",
        a: "Not for a standard split system install in a freehold home. Strata properties usually need owners' corporation sign-off — we provide the install drawings if needed.",
      },
    ],
  },
  {
    slug: "co-testing-ducted-heaters",
    title: "Carbon monoxide testing on ducted heaters: why every 2 years matters",
    metaTitle: "Carbon Monoxide Testing on Ducted Gas Heaters — Why & How Often",
    metaDescription:
      "What CO is, how it builds up in older ducted gas heaters, what licensed plumbers test for on a service, and why this isn't a corner you can cut.",
    category: "Gas safety",
    categoryShort: "Gas",
    date: "11 Apr 2026",
    iso: "2026-04-11",
    readingMinutes: 6,
    excerpt:
      "What CO is, how it builds up in old units, what we test for on a service, and why this isn't a corner you can cut.",
    photo: "/gas-ducted-install.jpg",
    photoAlt: "Gas ducted heater install",
    body: [
      {
        kind: "p",
        html:
          "Carbon monoxide is the gas-safety risk that doesn't announce itself. It's colourless, odourless, slightly lighter than air — and at concentrations as low as 70 parts per million it can put a healthy adult to sleep. Most CO incidents in Victorian homes trace back to one source: an <strong>ageing ducted gas heater with a cracked or blocked heat exchanger</strong>.",
      },
      { kind: "h2", text: "Why CO testing matters" },
      {
        kind: "p",
        html:
          "Modern ducted gas heaters route combustion gases through a flue to the outside. The heat exchanger separates those flue gases from the air flowing into your house. When the exchanger develops a hairline crack (corrosion, thermal stress, age) or when the flue blocks (bird nest, debris), combustion gases bleed back into the supply air. That's how CO ends up in your living room.",
      },
      {
        kind: "p",
        html:
          "Energy Safe Victoria recommends a <strong>full CO test every two years</strong> on any ducted gas heater older than 5 years. We test on every annual service, regardless of age.",
      },
      { kind: "h2", text: "What we test for" },
      {
        kind: "ol",
        items: [
          "<strong>Atmospheric CO</strong> in the supply-air stream (measured with a calibrated meter near the diffusers)",
          "<strong>Flue CO</strong> at the appliance flue outlet to verify combustion is clean",
          "<strong>Flue draft</strong> — pulling air outwards, not stalling",
          "<strong>Heat exchanger integrity</strong> via a smoke test or visual inspection",
          "<strong>Gas pressure</strong> at the appliance against manufacturer spec",
          "<strong>Return-air dampers and seals</strong> for negative pressure leaks",
        ],
      },
      { kind: "h2", text: "Red flags before you call us" },
      {
        kind: "ul",
        items: [
          "Yellow or wavy burner flame instead of crisp blue",
          "Soot marks above the heater outlet or on diffusers",
          "Persistent unexplained drowsiness or headache when the heater is running",
          "Pilot light that won't stay lit",
          "Heater starts and stops more than usual",
        ],
      },
      {
        kind: "p",
        html:
          "Any of those? Stop using the heater and ring us — or any licensed gas fitter. Same-day callout if the symptoms are active.",
      },
      { kind: "h2", text: "Our service rate" },
      {
        kind: "p",
        html:
          "Flat <strong>$280 + GST</strong> for an annual gas heater service across SE Melbourne (or <strong>$250 + GST</strong> for members). Includes the full CO test, written report with photos, gas pressure check and combustion analysis — everything an insurance assessor or property manager will ask for.",
      },
    ],
    faqs: [
      {
        q: "Does my landlord need to organise this?",
        a: "Yes. Under Victorian rental law, gas appliances must be safety-checked every 2 years by a licensed gas fitter. We provide a written compliance record for the rental file.",
      },
      {
        q: "What if you find a CO leak?",
        a: "We isolate the appliance immediately, write up the fault, and quote either repair or replacement. We'll never sign off a working heater that's leaking CO.",
      },
      {
        q: "Do CO alarms make this unnecessary?",
        a: "No. CO alarms warn you when concentrations are already dangerous. Annual servicing prevents leaks in the first place. Both layers, please — alarms cost $40 at Bunnings.",
      },
    ],
  },
  {
    slug: "heat-pump-solar-pv-daytime-charge",
    title: "Heat pumps + solar PV: the daytime-charge trick that drops bills to zero",
    metaTitle: "Heat Pump + Solar Daytime Schedule — Free Hot Water Hack",
    metaDescription:
      "How to schedule a Reclaim or iStore heat pump to run during solar production hours — the cheapest hot water setup in the country.",
    category: "Heat pumps",
    categoryShort: "Heat pumps",
    date: "2 Apr 2026",
    iso: "2026-04-02",
    readingMinutes: 11,
    excerpt:
      "How to schedule a Reclaim or iStore unit to run during the day on excess solar — the cheapest hot water in the country.",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Heat pump hot water unit installed near a residential solar setup",
    body: [
      {
        kind: "p",
        html:
          "Here's a number that surprises people: a household with rooftop solar PV and a properly scheduled heat pump pays <strong>roughly $0–$15 a year</strong> for hot water. Not a typo. The trick is timing — and it's one we set up free on every install if we know you have solar.",
      },
      { kind: "h2", text: "Why daytime matters" },
      {
        kind: "p",
        html:
          "A heat pump uses electricity to compress refrigerant, which then transfers heat into your hot water tank. It runs for about 4–6 hours per day in total to keep a 270L tank warm. If those hours land during peak time (5–9pm) on grid power, you pay 35–45 c/kWh. If they land during solar production (10am–3pm), you pay <strong>0 c/kWh</strong> — your panels are making more than the unit pulls.",
      },
      {
        kind: "p",
        html:
          "Average heat pump draw is ~600 W when running. A 6 kW solar array generates ~4–5 kW between 10am and 3pm. The maths is obvious.",
      },
      { kind: "h2", text: "How to set it up" },
      { kind: "h3", text: "iStore" },
      {
        kind: "p",
        html:
          "Open the iStore app → Schedule → set a daily window of 10:00 to 15:00. The unit only heats during those hours. If you run low on hot water (rare with a 270L tank), tap \"Boost\" for a manual top-up.",
      },
      { kind: "h3", text: "Reclaim CO₂" },
      {
        kind: "p",
        html:
          "Reclaim has a hardware timer on the controller — set the run window 10am–4pm. The CO₂ refrigerant is slightly more efficient on cold mornings, but for solar timing the same logic applies.",
      },
      { kind: "h3", text: "Thermann" },
      {
        kind: "p",
        html:
          "Thermann's basic controller doesn't have a clock timer built in. The cheap workaround: a <strong>Sonoff smart switch</strong> on the dedicated heat pump circuit (your electrician needs to add it). $40 in parts. We do this on request as an add-on.",
      },
      { kind: "h2", text: "Real Pakenham numbers" },
      {
        kind: "p",
        html:
          "A Pakenham family of four, 6.6 kW solar, iStore 270L on a 10am–3pm schedule:",
      },
      {
        kind: "table",
        headers: ["", "Annual cost"],
        rows: [
          ["Old electric storage tank", "~$950"],
          ["Heat pump on grid time-of-use", "~$240"],
          ["Heat pump on solar daytime schedule", "~$15"],
          ["<strong>Annual saving vs old tank</strong>", "<strong>$935</strong>"],
        ],
      },
      {
        kind: "p",
        html:
          "After a $1,780 Thermann or $2,400 iStore install, the payback is roughly 2 years. After that the savings are pure gravy. <strong>Twenty-year lifetime saving:</strong> $17,000+.",
      },
      { kind: "h2", text: "Common questions" },
      { kind: "h3", text: "What about cold winter days when solar is weak?" },
      {
        kind: "p",
        html:
          "On overcast Pakenham days the heat pump still runs in the scheduled window, just pulling more grid power. Even at full grid rate it costs less than a gas tank — you'll still come out ahead.",
      },
      { kind: "h3", text: "Should I export solar instead and pay grid for hot water?" },
      {
        kind: "p",
        html:
          "Almost never. Feed-in tariff in Victoria has been hovering at 3–5 c/kWh. Heating water with that same solar saves you the 35–45 c/kWh you'd otherwise pay. Self-consumption wins by 8–10x.",
      },
    ],
    faqs: [
      {
        q: "Can I do this with a gas instantaneous heater instead?",
        a: "No — gas instantaneous heaters don't store hot water. The daytime-charge trick only works with heat pumps (or electric storage tanks).",
      },
      {
        q: "Does it shorten the heat pump's life?",
        a: "Slight wear from more starts per day, but modern inverter heat pumps are designed for cycling. We've not seen a Reclaim or iStore fail early from daytime scheduling.",
      },
      {
        q: "Do I need a battery?",
        a: "No. The daytime-charge trick works without batteries — that's the elegance of it. If you have a battery, even better, but it's not required.",
      },
    ],
  },
  {
    slug: "hot-water-tank-replace-or-upgrade",
    title: "Hot water tank failed? Replace like-for-like, or upgrade to heat pump?",
    metaTitle: "Failed Hot Water Tank — Replace Gas or Upgrade to Heat Pump?",
    metaDescription:
      "When your gas storage tank fails you've got 48 hours to decide. Here's the maths — including the $2,600 VEU rebate question.",
    category: "Hot water",
    categoryShort: "Hot water",
    date: "25 Mar 2026",
    iso: "2026-03-25",
    readingMinutes: 5,
    excerpt:
      "When the gas tank goes you've got 48 hours to decide. Here's the maths — including the $2,600 rebate question.",
    photo: "/gas-hot-water-change-over.png",
    photoAlt: "Same-day hot water swap in progress",
    body: [
      {
        kind: "p",
        html:
          "Tank's leaking, ceiling's stained, the house is cold. You've got maybe 48 hours before this becomes an insurance claim and a mould problem. The installer on the phone is asking: <em>like-for-like gas swap, or upgrade to a heat pump?</em> Here's how we'd answer.",
      },
      { kind: "h2", text: "The 5-minute decision matrix" },
      {
        kind: "table",
        headers: ["Scenario", "Recommendation"],
        rows: [
          ["Rental property, owner pays bills", "Heat pump (rebate + lower bills)"],
          ["Rental, tenant pays bills", "Like-for-like gas (no benefit to owner)"],
          ["Owner-occupied, no solar, gas connected", "Heat pump"],
          ["Owner-occupied, solar PV installed", "Heat pump (daytime schedule)"],
          ["Holiday house, used <30 days/year", "Like-for-like gas"],
          ["Townhouse with shared gas line, no roof access", "Heat pump"],
        ],
      },
      { kind: "h2", text: "The maths" },
      {
        kind: "p",
        html:
          "Like-for-like 135L or 175L gas tank replacement: roughly <strong>$1,800–$2,300</strong> installed. No rebate, no STCs. You're back to the same annual gas + standby loss costs as before.",
      },
      {
        kind: "p",
        html:
          "Heat pump 270L upgrade with VEU applied: roughly <strong>$1,780–$3,500</strong> installed (Thermann–Reclaim range). Plus you save $400–$900/year on energy. Payback is 2–4 years.",
      },
      {
        kind: "p",
        html:
          "<strong>For most owner-occupiers, the heat pump is cheaper in 24 months.</strong> The gas swap only wins if you're stuck with no roof space, no eligibility, or a holiday rental.",
      },
      { kind: "h2", text: "Same-day swap reality" },
      {
        kind: "p",
        html:
          "We carry the common gas tank sizes (135L and 175L) on the truck for emergency same-day replacements. Heat pumps need ordering and certifying, so expect 3–5 days for a heat pump swap — but we'll fit a temporary hot water solution while you wait.",
      },
      {
        kind: "p",
        html:
          "If it's Friday afternoon and you want to be off the gas grid by Monday, the heat pump path is faster than people think.",
      },
    ],
    faqs: [
      {
        q: "Do I lose my rebate if I do the gas swap first?",
        a: "No — VEU eligibility applies whenever you eventually upgrade. But you'll have spent ~$2k on a gas tank you're then replacing in a few years.",
      },
      {
        q: "How long does a temporary hot water setup last?",
        a: "We can fit a small electric storage unit or rent a portable instantaneous for 5–7 days while heat pump stock arrives. About $150–$250 extra. Removes the pressure.",
      },
      {
        q: "Will my gas bill drop if I switch?",
        a: "If hot water is your only gas appliance, your gas account can usually be disconnected — saving the supply charge (~$300/year). We can advise on whether to keep gas connected for heating/cooking.",
      },
    ],
  },
  {
    slug: "ducted-gas-to-reverse-cycle",
    title: "Replacing ducted gas heating with reverse-cycle: the honest cost-benefit",
    metaTitle: "Ducted Gas to Reverse-Cycle — Real SE Melbourne Cost-Benefit",
    metaDescription:
      "Most SE Melbourne homes save $1,400+ a year switching from ducted gas heating to reverse-cycle. But not all — here's how to work out if your house is one of the winners.",
    category: "Aircon",
    categoryShort: "Aircon",
    date: "18 Mar 2026",
    iso: "2026-03-18",
    readingMinutes: 12,
    excerpt:
      "Most homes save $1,400+ a year. But not all of them. Here's how to work out if your house is one of the winners.",
    photo: "/ducted-split.png",
    photoAlt: "Ducted reverse-cycle install in progress",
    body: [
      {
        kind: "p",
        html:
          "Across south-east Melbourne, gas heating is on the way out. New gas connections are banned in new builds. Existing units are pushing 15–25 years old. And reverse-cycle is now cheaper per kWh of heat delivered — even before the VEU rebate.",
      },
      {
        kind: "p",
        html:
          "But the answer to <em>\"should I rip out the gas heater?\"</em> isn't always yes. Here's the honest version.",
      },
      { kind: "h2", text: "Where reverse-cycle wins" },
      {
        kind: "ul",
        items: [
          "<strong>Older gas unit (10+ years)</strong> with 60–70% efficiency",
          "<strong>Insulated home</strong> with R3+ ceiling and reasonable double-glazing",
          "<strong>Open-plan living</strong> that doesn't need every zone heated equally",
          "<strong>You also want cooling</strong> — one system, both seasons",
          "<strong>You have or will get solar</strong> — daytime heating becomes near-free",
          "<strong>VEU rebate applies</strong> — up to $5,000 off the install",
        ],
      },
      { kind: "h2", text: "Where ducted gas still makes sense" },
      {
        kind: "ul",
        items: [
          "<strong>Very large home (300m²+)</strong> with high ceilings — gas heats fast cheaply on cold snaps",
          "<strong>No roof space</strong> for the outdoor condenser",
          "<strong>Recently replaced gas unit (under 5 years old, 90%+ efficiency)</strong> — payback period is too long",
          "<strong>Holiday house</strong> with low use — fixed costs swing in favour of gas",
        ],
      },
      { kind: "h2", text: "The numbers for a typical Pakenham home" },
      {
        kind: "p",
        html:
          "A 4-bedroom Pakenham home (180m² living), single storey, R3 ceiling:",
      },
      {
        kind: "table",
        headers: ["", "Annual heating cost"],
        rows: [
          ["Old ducted gas (75% efficiency)", "~$2,100"],
          ["Modern ducted reverse-cycle (COP 4.0)", "~$680"],
          ["Modern reverse-cycle on daytime solar", "~$220"],
          ["<strong>Annual saving vs old gas</strong>", "<strong>$1,420–$1,880</strong>"],
        ],
      },
      {
        kind: "p",
        html:
          "Install cost: typically <strong>$10,500–$14,000</strong> for a 12–16 kW ducted system installed, before rebate. After up to $5,000 VEU, you're looking at <strong>$5,500–$9,000 net</strong>. Payback: <strong>4–6 years</strong>, depending on solar.",
      },
      { kind: "h2", text: "Things people forget to ask" },
      { kind: "h3", text: "Can I keep the existing ductwork?" },
      {
        kind: "p",
        html:
          "Usually yes — most existing ducts are oversized for gas and work fine with reverse-cycle. We test airflow during the survey. If ducts are damaged or undersized, you'll get the rough cost up front.",
      },
      { kind: "h3", text: "Do I need to zone it?" },
      {
        kind: "p",
        html:
          "Zoning (3–8 zones) gives you up to 30% additional efficiency and avoids heating empty bedrooms. Reverse-cycle benefits from zoning more than gas because the unit modulates capacity. Worth it on any system 14 kW or larger.",
      },
      { kind: "h3", text: "What about cold snaps below 0°C?" },
      {
        kind: "p",
        html:
          "Modern inverter reverse-cycle units run efficiently down to -10°C. In Pakenham's coldest mornings (-2 to +2°C) you might see capacity drop 15% — still adequate for a properly sized system. Coastal Mornington Peninsula and Brighton: no issue at all.",
      },
      { kind: "h2", text: "Our recommendation" },
      {
        kind: "p",
        html:
          "If your gas heater is 12+ years old and you're considering its replacement: <strong>upgrade to reverse-cycle now</strong>. The maths is decisive after rebate, you remove a CO risk, you gain cooling, and you future-proof against gas disconnection.",
      },
      {
        kind: "p",
        html:
          "If your gas is under 8 years old and working well, ride it out 3–5 more years. The rebate's likely to still be there, and electricity prices are stable enough that the maths only improves.",
      },
    ],
    faqs: [
      {
        q: "Will my house feel different to heat?",
        a: "Reverse-cycle heats slower than gas — about 20 minutes to reach setpoint instead of 5. But the air feels gentler (less drying), and once at temperature, modulation keeps it more consistent.",
      },
      {
        q: "Can I keep gas for cooktop only?",
        a: "Yes. Many of our customers retain gas for cooktop while removing the heater. Reduces but doesn't eliminate the gas supply charge.",
      },
      {
        q: "How long does a ducted retrofit take?",
        a: "2–3 days on site for a single-storey. Day 1: old unit out, condenser placement, duct survey. Day 2: indoor unit, controller, electrical. Day 3: commissioning, balancing, customer walkthrough.",
      },
    ],
  },
  {
    slug: "veu-rentals-landlord-checklist",
    title: "VEU eligibility for rentals: a checklist landlords can hand to their PM",
    metaTitle: "VEU Rebate for Rental Properties — Landlord & PM Checklist",
    metaDescription:
      "Landlords ask us this every week. One-page checklist your property manager can use to confirm VEU rebate eligibility for a rental in 5 minutes.",
    category: "VEU rebates",
    categoryShort: "Rebates",
    date: "10 Mar 2026",
    iso: "2026-03-10",
    readingMinutes: 8,
    excerpt:
      "Landlords ask us this every week. Here's a one-page checklist your property manager can use to confirm eligibility in 5 minutes.",
    photo: "/thermann-heat-pump.jpg",
    photoAlt: "Heat pump hot water installed at a rental property",
    body: [
      {
        kind: "p",
        html:
          "Most landlords assume the VEU rebate is owner-occupier only. <strong>It's not.</strong> Investment and rental properties are eligible too — and for a self-managing landlord with a portfolio of three or four properties, that's $7,000–$10,000 of rebate value sitting on the table.",
      },
      {
        kind: "p",
        html:
          "Here's the checklist your property manager can run in 5 minutes per address.",
      },
      { kind: "h2", text: "5-minute eligibility checklist" },
      {
        kind: "ol",
        items: [
          "<strong>Existing hot water unit?</strong> Gas storage, electric storage or continuous flow gas all qualify. Mains-pressure HW only — not header tanks.",
          "<strong>Property in Victoria?</strong> VEU is state-wide. Postcodes 3000–3999.",
          "<strong>Power supply adequate?</strong> Single-phase 15A circuit available, or upgradeable.",
          "<strong>Outdoor space for heat pump?</strong> ~700 × 700 mm of clearance, not against a bedroom window.",
          "<strong>Tenant consent?</strong> Required for the install date. Most tenants happily agree — hot water improves for them too.",
          "<strong>Sub-metered electricity?</strong> The energy efficiency gain accrues to whoever pays the power bill — confirm before you decide who benefits.",
        ],
      },
      {
        kind: "p",
        html:
          "All six tick? Eligible. We confirm in writing in your quote.",
      },
      { kind: "h2", text: "Common landlord questions" },
      { kind: "h3", text: "Does the tenant need to be the one applying?" },
      {
        kind: "p",
        html:
          "No. You (the owner) sign the install agreement and we lodge the rebate on the property. The tenant signs the access agreement separately.",
      },
      { kind: "h3", text: "Can I claim more than one rebate per property?" },
      {
        kind: "p",
        html:
          "One hot-water-system rebate per dwelling. If the property has separate aircon eligibility (gas heater swap → reverse cycle), that's a separate rebate up to $5,000.",
      },
      { kind: "h3", text: "What's the tax treatment?" },
      {
        kind: "p",
        html:
          "Speak to your accountant — but typically: the rebate reduces the deductible cost base of the new unit (you can't depreciate the rebated amount), and the rest is depreciable as a capital item over its effective life. Most landlords are still net positive after depreciation.",
      },
      { kind: "h3", text: "Will it add to property value?" },
      {
        kind: "p",
        html:
          "Yes — modestly. \"Energy efficient hot water\" appears on most rental ads now. The bigger value is in <strong>reduced tenant complaints</strong> from old units breaking down.",
      },
      { kind: "h2", text: "For property managers: paperwork we provide" },
      {
        kind: "ul",
        items: [
          "Pre-install eligibility confirmation letter",
          "Tenant access agreement (template)",
          "Photo evidence of old + new unit (for rental ad refresh)",
          "VEU certificate confirmation (proof of rebate)",
          "Compliance certificate (insurance / smoke alarm style document)",
          "Annual service reminder added to your maintenance schedule",
        ],
      },
      {
        kind: "p",
        html:
          "We work with several PM agencies across SE Melbourne and have the rental paperwork sorted — just tell us you're a PM when you call and we'll route accordingly.",
      },
    ],
    faqs: [
      {
        q: "Can I do this on a Section 32 sale prep?",
        a: "Yes — the rebate is timed to install date, not ownership. Some vendors install before settlement to boost the property's energy rating disclosure.",
      },
      {
        q: "What if the tenant refuses access?",
        a: "Under Victorian rental law you have 7 days' notice rights for hot water replacement. If still refused, you can defer the upgrade — the rebate doesn't expire on a per-property basis.",
      },
      {
        q: "Do I need to be VEU-registered as a landlord?",
        a: "No. We're the registered VEU provider; you're the property owner. Two separate things.",
      },
    ],
  },
  {
    slug: "split-system-quarterly-maintenance",
    title: "5 things you should clean on your split system every quarter",
    metaTitle: "Split System DIY Maintenance — 5 Quarterly Tasks",
    metaDescription:
      "The DIY maintenance that doubles the life of your aircon and keeps the manufacturer warranty intact. Five minutes of work every three months.",
    category: "Aircon",
    categoryShort: "Maintenance",
    date: "2 Mar 2026",
    iso: "2026-03-02",
    readingMinutes: 4,
    excerpt:
      "The DIY maintenance that doubles the life of your aircon and keeps your warranty intact. Five minutes of work.",
    photo: "/kaden-indoor.jpg",
    photoAlt: "Split system indoor head with filter access panel open",
    body: [
      {
        kind: "p",
        html:
          "Your split system has a service life of 12–15 years. Or 6 years if you ignore it. Five minutes of basic maintenance every three months is the difference between those two numbers — and it keeps your manufacturer warranty intact. Here's the checklist.",
      },
      { kind: "h2", text: "1. Vacuum the indoor filters (2 minutes)" },
      {
        kind: "p",
        html:
          "Open the front panel of the indoor head. Lift out the two mesh filters. Vacuum the dust off (or rinse under warm water, dry completely, reseat). <strong>Do this every 3 months</strong> in summer, less in winter. Dirty filters kill efficiency more than anything else.",
      },
      { kind: "h2", text: "2. Wipe the indoor coil fins (1 minute)" },
      {
        kind: "p",
        html:
          "Behind the filters you'll see thin aluminium fins. Run a soft brush or a microfibre cloth gently across them to clear dust. Don't bend them — straighten any bent fins with a fin comb if you've got one.",
      },
      { kind: "h2", text: "3. Check the condensate drain (30 seconds)" },
      {
        kind: "p",
        html:
          "Find where the small white pipe exits the wall outside. In cooling mode, water should drip steadily from this when the unit is running. <strong>If nothing comes out</strong> on a humid day, the drain is blocked — call us before the indoor unit floods.",
      },
      { kind: "h2", text: "4. Clear the outdoor condenser (1 minute)" },
      {
        kind: "p",
        html:
          "Walk around the outdoor unit. Pull leaves, spider webs, and grass clippings away from the back grille. Maintain ~300 mm of clearance on all sides. A blocked condenser can't dump heat properly and the indoor unit will start cooling poorly.",
      },
      { kind: "h2", text: "5. Test the remote and modes (30 seconds)" },
      {
        kind: "p",
        html:
          "Cycle through cool / heat / dry / fan-only on the remote. Watch for the unit to respond within 30 seconds. If something doesn't respond, swap the remote batteries (the biggest reason units \"don't work\"). Still nothing? Note it and call us at the next annual service.",
      },
      { kind: "h2", text: "When to call us instead" },
      {
        kind: "ul",
        items: [
          "Coil fins look black or oily (mould — needs chemical clean)",
          "Outdoor unit makes a new grinding or rattling noise",
          "Cooling capacity has dropped noticeably — usually refrigerant loss (leak — needs licensed repair, not just a top-up)",
          "Water dripping from the indoor head into the room",
          "Anything you're not sure about — better to ask",
        ],
      },
      {
        kind: "p",
        html:
          "An annual professional service ($189 for a single split, $329 for ducted) catches the things you can't reach: gas pressure, electrical connections, deep coil clean. We do it every year on most customer systems alongside the quarterly DIY you can do yourself.",
      },
    ],
    faqs: [
      {
        q: "Do I need to wash the filters or just vacuum?",
        a: "Vacuum is fine for most quarterly cleans. Wash once a year with warm water and a mild detergent — dry fully before reseating. Don't use solvents or scrub abrasively.",
      },
      {
        q: "How often should I do a deep clean?",
        a: "Once a year, by a licensed service tech. Smell, mould or asthma flares from running the unit? Bring that forward — chemical coil clean takes care of biofilm.",
      },
      {
        q: "Does running the fan-only mode help?",
        a: "Yes — at the end of a cooling session, run fan-only for 10 minutes. Dries out the coil and slows mould growth on the indoor unit.",
      },
    ],
  },
];

export type BlogCategory = string;
export const blogCategories: BlogCategory[] = [
  "All",
  "VEU rebates",
  "Heat pumps",
  "Aircon",
  "Gas safety",
  "Hot water",
  "Costs & savings",
];

// Long-form copy for each service page. SEO-optimised, H1 + intro contain
// primary keyword + region, FAQs feed FAQPage schema, internal links flow
// to /quote and suburb pages.

export type ServiceContent = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  benefits: { t: string; d: string }[];
  brands: string[];
  pricing: { tier: string; price: string; includes: string }[];
  faqs: { q: string; a: string }[];
};

export const serviceContent: Record<string, ServiceContent> = {
  "air-conditioning-installation": {
    metaTitle: "Air Conditioning Installation Pakenham, Warragul & Gippsland | Advanced Gas & Aircon",
    metaDescription:
      "Licensed split system, multi-head and ducted aircon installation across South-East Vic and Gippsland. Fixed-price quotes, same-week installs, 6-year warranty.",
    h1: "Air Conditioning Installation across South-East Vic & Gippsland",
    intro:
      "Licensed refrigeration technicians installing split-system, multi-head and ducted air conditioning across South-East Victoria and Gippsland. Fixed-price quotes, same-week installs, and a 6-year workmanship warranty on every job. Whether you're cooling a single bedroom or zoning a whole home, we'll match the right system to your space and budget.",
    benefits: [
      { t: "ARCtick-licensed refrigeration", d: "All refrigerant work performed by ARC-certified technicians, required by Australian law." },
      { t: "All major brands supplied", d: "Daikin, Mitsubishi Electric, Fujitsu, Panasonic, Samsung, Hisense, we source the right unit for the room." },
      { t: "Honest sizing advice", d: "Properly sized kW capacity for your room. Undersized units cost more to run and wear out fast." },
      { t: "Energy-rebate eligible", d: "VEU rebates available on eligible high-efficiency reverse-cycle systems." },
      { t: "Tidy install, every time", d: "Drop sheets, dust extraction and a full clean-up before we leave. Conduit colour-matched to your home." },
      { t: "Compliance certificate provided", d: "Electrical and refrigeration compliance docs handed over on completion." },
    ],
    brands: ["Daikin", "Mitsubishi Electric", "Fujitsu", "Panasonic", "Samsung", "Hisense"],
    pricing: [
      { tier: "Single split system (2.5kW)", price: "from $1,899", includes: "Supply, install, up to 3m pipe run, compliance cert" },
      { tier: "Single split system (7.0kW)", price: "from $2,899", includes: "Supply, install, up to 5m pipe run, compliance cert" },
      { tier: "Multi-head (2 indoor)", price: "from $4,500", includes: "Supply, install, up to 10m total pipe, compliance cert" },
      { tier: "Ducted reverse cycle", price: "from $7,500", includes: "Supply, install, up to 4 zones, controller, compliance cert" },
    ],
    faqs: [
      { q: "How long does aircon installation take?", a: "A standard back-to-back split system install takes 3-5 hours. Longer pipe runs or multi-head systems take a full day. Ducted installs are typically 1-2 days." },
      { q: "Do I need an electrician on top?", a: "No, we include all electrical work in our quote. Our team is licensed across plumbing, gas and electrical for HVAC work." },
      { q: "What size aircon do I need?", a: "As a rough rule, allow 125-150 watts per square metre of room space (more for west-facing or high-ceiling rooms). We'll do a proper room-by-room assessment in your quote." },
      { q: "Is reverse cycle better than evaporative?", a: "For Victoria's climate, yes. Reverse cycle cools in summer, heats efficiently in winter, and works regardless of humidity. Evaporative struggles on humid days." },
      { q: "Can you install on a rental property?", a: "Yes, we provide a written quote you can share with your landlord or property manager. Compliance certificates included." },
    ],
  },

  "heat-pump-installation": {
    metaTitle: "Heat Pump Hot Water Installation South-East Vic & Gippsland | From $33 with VEU",
    metaDescription:
      "Heat pump hot water systems installed across South-East Vic and Gippsland from $33 with VEU rebates. Cut your hot water bill by up to 75%. Licensed install + 6-year warranty.",
    h1: "Heat Pump Hot Water Installation across South-East Vic & Gippsland",
    intro:
      "Cut your hot water energy use by up to 75% with a heat pump hot water system, installed across South-East Vic and Gippsland by licensed plumbers from as little as $33 after Victorian Energy Upgrades (VEU) rebates. We handle the rebate paperwork, supply the unit, install it and lodge it with the regulator. You get a more efficient system and a lower power bill, with no fuss.",
    benefits: [
      { t: "VEU rebate from $33", d: "Eligible Victorian homes qualify for VEU rebates that cover most of the install cost. We do all the paperwork." },
      { t: "Up to 75% less energy use", d: "Heat pump systems extract heat from the air, they use a quarter of the energy of an old electric storage tank." },
      { t: "Federal STC rebate too", d: "On top of VEU, eligible installs receive Small-scale Technology Certificates (STCs). We factor these into your price upfront." },
      { t: "Tier-1 brands only", d: "Reclaim Energy, iStore, Sanden, Rheem Ambiheat, Stiebel Eltron, proven units, long warranty, parts available in Australia." },
      { t: "Licensed plumbing install", d: "Drainage, tempering valve, isolation valves, electrical connection, all done to AS/NZS 3500 by a licensed plumber." },
      { t: "Old tank removed", d: "We take your old electric or gas storage tank away and dispose of it responsibly. No mess left behind." },
    ],
    brands: ["Reclaim Energy", "iStore", "Sanden", "Rheem Ambiheat", "Stiebel Eltron"],
    pricing: [
      { tier: "270L heat pump (VEU eligible)", price: "from $33*", includes: "Supply, install, old tank removal, VEU paperwork" },
      { tier: "315L heat pump (VEU eligible)", price: "from $299*", includes: "Supply, install, old tank removal, VEU paperwork" },
      { tier: "Premium 250L (Reclaim/Sanden)", price: "from $2,499", includes: "Supply, install, old tank removal, 6yr workmanship" },
    ],
    faqs: [
      { q: "Am I eligible for the VEU $33 deal?", a: "Most Victorian owner-occupied and rental properties with an existing electric storage hot water system are eligible. We confirm eligibility in your free quote, takes 60 seconds." },
      { q: "How much will I save on my power bill?", a: "Typical Victorian homes save $400-$900 per year switching from an electric storage tank to a heat pump. Payback after rebate is usually under 2 years." },
      { q: "Will it work in cold weather?", a: "Yes. Modern heat pumps operate efficiently down to -5°C and below. Premium units like Reclaim CO2 maintain efficiency in sub-zero temperatures." },
      { q: "How loud is a heat pump?", a: "About as loud as an outdoor fridge, typically 37-48 dB at 1m. Quieter than a split-system condenser. We can position it away from bedrooms." },
      { q: "How long does install take?", a: "Most replacements are done same-day, in 3-5 hours. New installs with relocation can take a full day." },
      { q: "What's the warranty?", a: "6-year workmanship warranty from us, plus manufacturer warranty (typically 6-10 years on the tank and 5-7 years on the heat pump unit)." },
    ],
  },

  "aircon-servicing-repairs": {
    metaTitle: "Air Conditioning Service & Repairs South-East Vic & Gippsland | All Brands",
    metaDescription:
      "Annual aircon servicing and repairs across South-East Vic and Gippsland for all major brands. Same-day call-outs, fixed pricing, licensed refrigeration technicians.",
    h1: "Air Conditioning Service & Repairs across South-East Vic & Gippsland",
    intro:
      "Keep your aircon running efficiently and your warranty valid with annual servicing from licensed refrigeration technicians. We service all major brands across South-East Vic and Gippsland, split systems, multi-heads and ducted, with same-day repairs when something breaks.",
    benefits: [
      { t: "All major brands serviced", d: "Daikin, Mitsubishi, Fujitsu, Panasonic, Samsung, Hisense, LG and more." },
      { t: "Keeps warranty valid", d: "Most manufacturer warranties require annual service. We provide a service record." },
      { t: "Same-day breakdown calls", d: "Aircon down? We aim to be on-site same-day across our service area." },
      { t: "Fixed pricing", d: "Quoted before work starts. No hourly creep, no surprises." },
    ],
    brands: ["Daikin", "Mitsubishi Electric", "Fujitsu", "Panasonic", "Samsung", "Hisense", "LG"],
    pricing: [
      { tier: "Annual service (split system)", price: "from $189", includes: "Clean filters & coils, refrigerant check, electrical check, service report" },
      { tier: "Annual service (ducted)", price: "from $329", includes: "Filter clean, coil clean, refrigerant check, zone check, service report" },
      { tier: "Breakdown call-out", price: "from $149", includes: "Diagnostic, quote for repair. Fee waived if repair is approved." },
    ],
    faqs: [
      { q: "How often should I service my aircon?", a: "Once a year is the manufacturer recommendation and what's needed to keep your warranty valid. Heavy-use commercial systems may need 2-4 services per year." },
      { q: "My aircon isn't cooling, what is it?", a: "Most common causes: dirty filters, low refrigerant (a leak, needs repair, not just a 'top-up'), faulty capacitor, or blocked outdoor coil. We diagnose in under 30 minutes." },
      { q: "Do you fix all brands?", a: "Yes, we hold spare parts accounts with all major manufacturers and can source non-stock parts within 24-48 hours." },
    ],
  },

  "gas-plumbing": {
    metaTitle: "Gas Plumbing South-East Vic & Gippsland | Hot Water, Gas Fitting & Leak Detection",
    metaDescription:
      "Licensed gas plumbers serving South-East Vic and Gippsland, hot water replacement, gas appliance installation, leak detection, emergency repairs. Same-day call-outs available.",
    h1: "Gas & Plumbing Services across South-East Vic & Gippsland",
    intro:
      "From emergency hot water replacement to gas appliance installation, our licensed gas fitters and plumbers handle the lot across South-East Vic and Gippsland. Same-day emergency call-outs, fixed pricing, and full compliance certificates on every job.",
    benefits: [
      { t: "Licensed gas fitting", d: "Victorian Plumbing Licence, all work compliant with AS/NZS 5601 gas standards." },
      { t: "Hot water specialists", d: "Continuous flow, storage, gas, electric or heat pump, we install and replace them all." },
      { t: "Leak detection", d: "Electronic gas leak detection and pressure testing. Safe-to-stay verification provided." },
      { t: "Emergency call-outs", d: "Same-day across our service area for no hot water, leaks and gas emergencies." },
    ],
    brands: ["Rinnai", "Rheem", "Bosch", "Dux", "Vulcan", "Reclaim Energy"],
    pricing: [
      { tier: "Continuous flow hot water (gas)", price: "from $2,299", includes: "Supply, install, compliance cert, old unit removal" },
      { tier: "Gas appliance installation", price: "from $349", includes: "Connection, pressure test, compliance cert" },
      { tier: "Gas leak detection", price: "from $189", includes: "Electronic leak test, written report, safe-to-stay confirmation" },
    ],
    faqs: [
      { q: "Do I need a gas-safe certificate?", a: "Yes, any new gas appliance install or replacement in Victoria requires a compliance certificate from a licensed gas fitter. We provide this on every job." },
      { q: "Can you do emergency call-outs?", a: "Yes. Same-day across our service area for gas leaks, burst pipes and no-hot-water situations." },
      { q: "Should I replace my gas hot water with a heat pump?", a: "If your gas unit is over 10 years old, a heat pump can pay for itself in 2-4 years through energy savings + VEU rebates. Happy to compare both options in your quote." },
    ],
  },
};

/**
 * Puretec water filtration — its own section rather than a system buried
 * under gas plumbing.
 *
 * It got moved out because it isn't really the same kind of product. The
 * gas and hot water services are "your thing broke, here's the
 * replacement". Filtration is a considered purchase: nothing is broken,
 * the customer noticed a taste or a smell or read something about
 * chlorine, and they're deciding whether it's worth doing at all. That
 * needs a page that explains what's actually in the water before it
 * tries to sell anything, which is a different page shape.
 *
 * Pricing is deliberately absent everywhere in this file. Jake asked for
 * it left blank until the Puretec pricing is settled, so there is no
 * priceFrom field to fill in by accident.
 *
 * Facts discipline: no model codes. Puretec's range changes and we spec
 * the unit on site from your water and your pressure, so naming a
 * cartridge here would be a guess dressed up as a spec. Everything below
 * is either a category fact (what a sediment stage does) or a Melbourne
 * water fact, both of which hold regardless of which housing we fit.
 */

export type FiltrationTier = {
  slug: string;
  label: string;
  /** One line, used on cards and in the nav. */
  tagline: string;
  /** Card button text. Written per tier because "Hot water protection
   *  filtration" is not a phrase anybody says. */
  cta: string;
  /** Where it goes, in plain words. The single most useful thing to say. */
  fitsWhere: string;
  /**
   * Manufacturer product shot. Where the file isn't on disk yet the card
   * falls back to `diagram`, which is our own drawing of where the
   * fitting goes — see components/SafeImg.tsx for the same pattern used
   * across the brand catalogue.
   */
  productPhoto: string;
  productPhotoAlt: string;
  diagram: string;
  /** Photo behind the hero, like the home page. Falls back to the flat
   *  gradient until the file exists. */
  heroPhoto?: string;
  /**
   * Real install photography. Replaces the single diagram in the "where
   * it goes" slot — Jake's note was that a lone drawing there isn't
   * enough, it wants several photos. Add rows as they're shot.
   */
  gallery?: { src: string; alt: string; caption?: string }[];
  /**
   * Why somebody installs one. Four reasons, straight off Puretec's own
   * product material — Jake supplied the copy, so these are the
   * manufacturer's claims stated as the manufacturer states them.
   */
  whyInstall?: { t: string; points: string[] }[];
  /** Finish options, because on this product the way it looks is part of
   *  the pitch rather than an afterthought. */
  finish?: { note: string; swatches: { name: string; hex: string }[] };
  /**
   * This category against the obvious alternative, the way Puretec put
   * undersink against wholehouse. Rows are [label, thisOne, other].
   */
  versus?: {
    heading: string;
    thisLabel: string;
    otherLabel: string;
    otherHref?: string;
    rows: { label: string; mine: string; theirs: string }[];
  };
  /**
   * The models in this category, so a reader can see the versions side
   * by side the way Puretec lay theirs out. Pricing deliberately absent.
   */
  models?: {
    name: string;
    suits: string;
    handles: string;
    flow: string;
    cartridge: string;
    /** Set on the one we'd fit most often. */
    common?: boolean;
  }[];
  /** Two-sentence version for the hub cards. */
  blurb: string;
  /** Opening paragraph on its own page. */
  intro: string;
  /** What it treats. */
  treats: string[];
  /** What it does not — the half that makes the rest believable. */
  doesNotTreat: string[];
  bestFor: string[];
  watchOut: string[];
  /** Cartridge / service rhythm. */
  servicing: string;
  faqs: { q: string; a: string }[];
  /** SEO. */
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
};

/** What's actually in Melbourne water, and what a filter does about it. */
export const IN_YOUR_WATER = [
  {
    what: "Chlorine",
    why: "Melbourne's mains water is disinfected before it reaches you, which is a good thing and not something to be frightened of. It's also the reason the water tastes and smells the way it does, and the reason some people find it drying on skin and hair.",
    fix: "An activated carbon stage. This is the one people notice immediately, because taste and smell change the day it goes in.",
  },
  {
    what: "Sediment, rust and silt",
    why: "Mains work in the street, an ageing service line, or a property on tank or bore water. It shows up as grit in the toilet cistern, marks in the washing, or water that runs cloudy for a day after works nearby.",
    fix: "A sediment stage, which is a physical filter. It's also the stage that protects everything downstream, including your hot water system.",
  },
  {
    what: "Taste and odour",
    why: "Usually chlorine, sometimes organics from a tank, occasionally the pipework itself. Almost always the reason someone starts looking into this in the first place.",
    fix: "Carbon, and a finer carbon block on an under-sink unit than a whole-home housing can practically use.",
  },
  {
    what: "Biological, on tank and rainwater",
    why: "Rainwater collects off a roof, and a roof has birds, leaves and dust on it. This is a real consideration on tank-fed properties through the hills and the smaller townships, and not one on mains water.",
    fix: "UV sterilisation after filtration. The filter has to come first, because UV can't work through cloudy water.",
  },
  {
    what: "Hardness and scale",
    why: "Here's the honest one. Melbourne's mains water is soft — among the softest of any major Australian city — so scale is not the problem here that it is in Adelaide or Perth. Bore water is a different story.",
    fix: "Usually nothing, and we'll tell you that. If you're on bore water it's a separate conversation and a different bit of equipment.",
  },
] as const;

/** How a whole-home unit is put together. Used for the stage diagram. */
export const STAGES = [
  {
    n: "01",
    t: "Sediment",
    d: "A physical filter that catches rust, silt, grit and dirt. First in line, because it protects the stages behind it and stops them clogging early.",
  },
  {
    n: "02",
    t: "Carbon",
    d: "Activated carbon that takes out chlorine, taste and odour. This is the stage you can taste the difference from.",
  },
  {
    n: "03",
    t: "UV, where it's needed",
    d: "Tank and rainwater properties only. Ultraviolet light handles the biological side, and it goes last because it needs clear water to work through.",
  },
] as const;

export const TIERS: FiltrationTier[] = [
  {
    slug: "whole-home",
    label: "Whole home",
    tagline: "Every tap, shower and appliance in the house",
    cta: "Whole home filtration",
    fitsWhere: "On the incoming water main, before it splits off to anything else",
    productPhoto: "/puretec-filterwall-whole-house.webp",
    productPhotoAlt: "Puretec Filterwall whole-house filtration enclosure mounted on a fence",
    diagram: "/water-filtration-whole-home-diagram.webp",
    heroPhoto: "/puretec-filterwall-whole-house.webp",
    gallery: [
      { src: "/puretec-filterwall-install-1.webp", alt: "Puretec FilterWall mounted on a weatherboard wall beside a path", caption: "Mounted flat on the wall, pipework in copper" },
      { src: "/puretec-filterwall-install-2.webp", alt: "FilterWall installed on a rendered wall next to the meter", caption: "Beside the meter, where the main comes in" },
      { src: "/puretec-filterwall-install-3.webp", alt: "FilterWall in a garden bed against a fence", caption: "Along the fence line, out of the way" },
      { src: "/puretec-filterwall-install-4.webp", alt: "FilterWall on a brick wall in a side passage", caption: "Side passage, still accessible for cartridges" },
    ],
    whyInstall: [
      {
        t: "Filtered water from every tap",
        points: [
          "Reduces sediment, chlorine, heavy metals and other common contaminants",
          "Filtered water in the kitchen, the bathroom, the laundry and the garden",
        ],
      },
      {
        t: "Healthier skin and hair",
        points: [
          "Helps reduce chlorine in shower water",
          "Supports calmer skin and softer, healthier-looking hair",
        ],
      },
      {
        t: "Longer life out of your appliances",
        points: [
          "ScaleProtect™ technology in the F4 and F6 models",
          "Helps reduce scale and sediment build-up in pipes and appliances",
        ],
      },
      {
        t: "Functionality meets style",
        points: [
          "Durable aluminium cover for long-lasting protection",
          "Available in ten finishes",
          "Backed by a 10-year warranty",
        ],
      },
    ],
    finish: {
      note:
        "This is the part most filtration gets wrong. A whole-house unit lives on an outside wall where you and the neighbours look at it for the next decade, so the FilterWall is a flat aluminium cover rather than a rack of exposed housings — and it comes in ten finishes so it can disappear against a fence, a render or a weatherboard. Five neutrals and five custom colours. Worth knowing before you choose: the custom five carry a 2-year finish warranty rather than the full term, and Buttercup Cream is F5 and F6 only.",
      swatches: [
        { name: "Buttercup Cream", hex: "#EFD9B0" },
        { name: "Stone White", hex: "#E7E4DA" },
        { name: "Mineral Grey", hex: "#8A9694" },
        { name: "Charcoal", hex: "#3C4243" },
        { name: "Midnight Black", hex: "#1B1B1D" },
        { name: "Open Skies", hex: "#A9D4E4" },
        { name: "Lime Sherbet", hex: "#B8DBC4" },
        { name: "Sweet Apricot", hex: "#F0C48C" },
        { name: "Cherry Blossom", hex: "#EFC3C6" },
        { name: "Wisteria", hex: "#C6BBD9" },
      ],
    },
    versus: {
      heading: "Whole house or under sink?",
      thisLabel: "Whole house",
      otherLabel: "Under sink",
      otherHref: "/water-filtration/under-sink",
      rows: [
        { label: "Reduces chlorine, sediment, dirt", mine: "yes", theirs: "yes" },
        { label: "Filtered water at every tap, including the shower", mine: "yes", theirs: "no" },
        { label: "Protects your appliances and hot water system", mine: "yes", theirs: "no" },
        { label: "Filtered water in the garden", mine: "yes", theirs: "no" },
        { label: "Finer filtration for drinking water", mine: "no", theirs: "yes" },
        { label: "Reaches lead and cysts", mine: "no", theirs: "yes" },
        { label: "Fits indoors", mine: "no", theirs: "yes" },
        { label: "Fits outdoors on the main", mine: "yes", theirs: "no" },
        { label: "Typical flow rate", mine: "30–55 L/min", theirs: "Up to ~9.5 L/min" },
        { label: "Cartridge life", mine: "Around 12 months", theirs: "Around 12 months" },
      ],
    },
    models: [
      { name: "FilterWall F3", suits: "Small to medium house", handles: "Sediment, chlorine, taste & odour", flow: "30 L/min", cartridge: '10"' },
      { name: "FilterWall F4", suits: "Small to medium house", handles: "Sediment, chlorine, taste & odour + ScaleProtect", flow: "30 L/min", cartridge: '10"' },
      { name: "FilterWall F5", suits: "Large house, 2+ bathrooms", handles: "Sediment, chlorine, taste & odour", flow: "55 L/min", cartridge: '20"', common: true },
      { name: "FilterWall F6", suits: "Large house, 2+ bathrooms", handles: "Sediment, chlorine, taste & odour + ScaleProtect", flow: "55 L/min", cartridge: '20"' },
    ],
    blurb:
      "One unit on the water main, filtering everything that enters the house. The shower, the washing machine, the dishwasher and the hot water system all run on filtered water rather than just the kitchen tap.",
    intro:
      "Whole-home filtration goes on the water main where it enters the house, before it splits off to anything else. That is the whole difference between it and a jug or an under-sink unit: the shower runs on filtered water, the washing machine does, the dishwasher does, the hot water system does. If your complaint is that the water smells like a swimming pool in the shower, or that whites are coming out of the wash looking tired, this is the fitting that fixes it, and it fixes it once for the whole house instead of one tap at a time.",
    treats: [
      "Chlorine taste and smell, everywhere in the house rather than at one tap",
      "Sediment, rust, silt and grit, including the burst of it that follows mains work in the street",
      "Discolouration and cloudiness",
      "Biological contamination on tank and rainwater properties, with a UV stage added",
      "The sediment load that would otherwise end up inside your hot water system",
    ],
    doesNotTreat: [
      "Hardness. This is not a water softener and we won't sell it as one — Melbourne mains water is already soft",
      "Dissolved salts. That's reverse osmosis, which is a different machine and almost never warranted here",
      "Anything at the same fineness an under-sink unit manages, because a whole-house housing has to pass the flow rate for a whole house",
    ],
    bestFor: [
      "Chlorine taste and smell you notice in the shower as well as at the tap",
      "Sediment, grit or discolouration, which is common after mains work nearby",
      "Properties on tank or rainwater, where filtration and UV are doing a real job rather than a cosmetic one",
      "Skin or scalp irritation that gets better on holiday and worse at home",
      "Protecting a new hot water system, dishwasher and washing machine at one fitting",
    ],
    watchOut: [
      "Every filter costs you a little pressure. On a house with marginal pressure we size the housing up rather than pretend that isn't true",
      "Cartridges are a running cost. Budget roughly annually, sooner on tank water or after street works",
      "It needs somewhere accessible near the main and out of the sun. If the only spot is buried behind a garden bed, we'll tell you at the quote rather than after",
      "If what you actually want is better drinking water and nothing else, an under-sink unit does that better and costs less",
    ],
    servicing:
      "Cartridges roughly every twelve months on mains water, sooner on tank. Once it's installed the change is a ten-minute job you can do yourself, and we show you how on handover rather than making it a service call.",
    faqs: [
      {
        q: "What does a whole-home water filter actually remove?",
        a: "Sediment, rust, silt and dirt on the first stage, then chlorine taste and odour on the carbon stage. On tank and rainwater setups we add UV, which handles the biological side. It is not a desalinator and it is not a softener, and anyone telling you a single cartridge does everything is selling rather than explaining.",
      },
      {
        q: "How often do the cartridges need changing?",
        a: "Roughly every twelve months on Melbourne mains water for a normal household. Tank water, bore water, or a house that has just had mains work in the street will chew through the sediment stage faster. Once the unit is in, the change is a ten-minute job you can do yourself, and we show you how on handover.",
      },
      {
        q: "Will it drop my water pressure?",
        a: "A little, and any plumber who says otherwise is guessing. The way to deal with it is sizing: on a house with good pressure you will not notice, and on a house with marginal pressure we fit a larger housing so the filter is not the bottleneck. We check the pressure at the quote, not after.",
      },
      {
        q: "Do you install Puretec on tank water?",
        a: "Yes, and it is where whole-home filtration earns its keep most obviously. Tank water carries sediment and organics that mains water does not, and a filtration plus UV setup is the standard answer through the hills and the smaller townships east of us. We spec it on what your tank actually delivers rather than off a catalogue page.",
      },
      {
        q: "Can I have whole-home and under-sink?",
        a: "Plenty of people do. The whole-home unit handles sediment and chlorine everywhere, and the under-sink unit gives you a dedicated drinking tap with a finer filter on it. If budget only stretches to one, tell us what is actually bothering you and we'll point you at the one that fixes it.",
      },
      {
        q: "Where does the unit physically go?",
        a: "On the incoming main, which is usually near the water meter or where the main enters the house. It needs to be accessible enough to change a cartridge and out of direct sun, because UV degrades the housings. We find the spot at the quote and show you before anything is committed.",
      },
    ],
    metaTitle: "Whole Home Water Filtration, Puretec",
    metaDescription:
      "Puretec whole-house water filtration installed by licensed plumbers across Melbourne's south-east. Chlorine, sediment and taste gone from every tap. Tank and rainwater setups with UV.",
    keywords: [
      "whole house water filter melbourne",
      "whole home filtration pakenham",
      "puretec whole house filter installer",
      "rainwater tank filtration uv melbourne",
      "chlorine filter whole house",
    ],
  },
  {
    slug: "hot-water",
    label: "Hot water protection",
    tagline: "Keeps sediment out of the most expensive appliance in the house",
    cta: "Protect my hot water system",
    fitsWhere: "On the cold water line feeding your hot water system",
    productPhoto: "/puretec-inline-filter-hot-water.webp",
    productPhotoAlt: "Puretec inline filter plumbed into a wall with brass isolation valves",
    diagram: "/water-filtration-hot-water-diagram.webp",
    blurb:
      "A filter on the cold feed into your hot water system, so sediment stops at the cartridge instead of settling in the tank or blocking a continuous-flow heat exchanger.",
    intro:
      "This is the least glamorous filter we fit and probably the best value one. It goes on the cold water line feeding your hot water system, which means anything it catches never reaches the tank, the anode or the heat exchanger. On a storage tank, sediment settles in the bottom and sits there insulating the element from the water it is meant to be heating. On a continuous-flow unit it builds up in a heat exchanger with very narrow passages. Either way you are shortening the life of a four thousand dollar appliance to save a hundred dollar fitting.",
    treats: [
      "Sediment, rust and silt before it reaches the tank",
      "The grit that follows mains work in the street, which otherwise goes straight into your hot water",
      "The build-up that insulates a storage element from the water around it",
      "The narrow-passage blockage that shortens a continuous-flow heat exchanger's life",
    ],
    doesNotTreat: [
      "Taste and smell at the tap. This filter is upstream of the hot water only — if taste is the problem you want whole-home or under-sink",
      "Anything on the cold side. Cold taps are completely untouched by it",
      "A rotten-egg smell on the hot taps, which is almost always the sacrificial anode reacting in the tank and needs an anode change, not a filter",
    ],
    bestFor: [
      "Fitting at the same time as a new heat pump, tank or continuous flow, while the pipework is already apart",
      "Properties on tank or bore water, where the sediment load is genuinely high",
      "Anyone who has already had one hot water system fail early and doesn't want a repeat",
      "Streets that get regular mains work, which pushes rust and silt through everyone's plumbing for a week afterwards",
      "Continuous flow units, which have the least tolerance for sediment of anything we fit",
    ],
    watchOut: [
      "It protects the system, it does not improve what comes out of the tap",
      "Fitted retrofit it's a short job. Fitted on install day it's close to free labour, so if you're replacing your hot water anyway, decide now rather than later",
      "A neglected filter is worse than no filter, so we roll the cartridge change into your service rather than leaving you to remember it",
      "It is not a substitute for replacing a tank that has already gone. If the cylinder is weeping, no filter helps",
    ],
    servicing:
      "One cartridge, changed at the same visit as your annual hot water or gas service so it doesn't become its own call-out. That's the whole maintenance story.",
    faqs: [
      {
        q: "Does a hot water filter actually extend the life of the system?",
        a: "It removes the sediment that would otherwise end up in the bottom of the tank or in the heat exchanger, and sediment is one of the things that shortens their lives. It is not a warranty extension and we won't dress it up as one. It is a small, cheap thing that removes one of the ways these systems die early.",
      },
      {
        q: "Should I fit one when I get a new heat pump?",
        a: "That is the sensible time to do it. The cold line is already disconnected, so the labour is minimal, and you get the protection from day one rather than after the first few years of sediment have already gone through. Ask us to include it in the quote and you'll see exactly what it adds.",
      },
      {
        q: "Will it help with the smell from my hot taps?",
        a: "Sometimes, but usually not, and it is worth knowing why. A rotten-egg smell on the hot side only is normally the sacrificial anode reacting in the tank, and the answer is an anode change, not a filter. We'd rather diagnose that properly than sell you a filter that doesn't fix it.",
      },
      {
        q: "Does it work on a continuous flow unit?",
        a: "Yes, and continuous flow is arguably where it matters most. The passages in a continuous-flow heat exchanger are narrow, so sediment and scale have a much smaller margin before they cause a problem. The filter goes on the cold inlet the same way.",
      },
      {
        q: "Do I need this if I already have whole-home filtration?",
        a: "No. If the whole house is already filtered on the main, the hot water system is downstream of that and already protected. This one is for houses that aren't doing whole-home, or where the hot water system sits on a separate run.",
      },
    ],
    metaTitle: "Hot Water System Filter, Cold Inlet",
    metaDescription:
      "A Puretec filter on the cold inlet to your hot water system keeps sediment out of the tank and the heat exchanger. Fitted with a new system or retrofitted, by licensed plumbers.",
    keywords: [
      "water filter for hot water system",
      "hot water system sediment filter",
      "heat pump inlet water filter",
      "continuous flow hot water filter",
      "puretec hot water protection",
    ],
  },
  {
    slug: "under-sink",
    label: "Under sink",
    tagline: "Filtered drinking water at the kitchen tap",
    cta: "Under sink filtration",
    fitsWhere: "In the cupboard under the kitchen sink, feeding a dedicated tap or a three-way mixer",
    productPhoto: "/puretec-twin-undersink-filter.webp",
    productPhotoAlt: "Puretec twin undersink filter system with a dedicated filtered tap",
    diagram: "/water-filtration-under-sink-diagram.webp",
    blurb:
      "A filter under the kitchen sink feeding either a small dedicated tap or a three-way mixer. Filtered drinking water without a jug in the fridge or a case of bottles in the boot.",
    intro:
      "An under-sink filter does one job properly: the water you drink and cook with. Because it only has to treat a few litres a day it can use a finer cartridge than a whole-home unit, so it takes taste and odour further. You either get a separate small tap next to the mixer, or a three-way mixer that gives you hot, cold and filtered from the one spout — the neater option, and the one most people choose once they've seen both. It will also feed a fridge and ice maker if the fridge is close enough, which quietly ends the cartridge subscription the fridge manufacturer would rather you kept paying.",
    treats: [
      "Chlorine taste and odour, at a finer level than a whole-home housing can practically manage",
      "Sediment and particulates in drinking water",
      "The reason you're currently buying bottled water or refilling a jug",
      "Water and ice from the fridge, if it's close enough to run a line to",
    ],
    doesNotTreat: [
      "Anything outside the tap it feeds. The shower, the washing machine and the hot water system are all still on unfiltered water",
      "Hardness or scale, same as the rest of the range",
      "Whole-house sediment problems. If the toilet cistern has grit in it, this is the wrong filter",
    ],
    bestFor: [
      "Households buying bottled water, which this pays back faster than anything else we fit",
      "Anyone keeping a filter jug in the fridge and tired of refilling it",
      "Kitchen renovations, where a three-way mixer can go in as part of the job",
      "Feeding a fridge and ice maker off proper filtration",
      "Apartments and rentals where a whole-home unit isn't possible, since this is self-contained under one sink",
    ],
    watchOut: [
      "It takes up room in the cupboard under the sink. Not much, but if that cupboard is already full we'll show you where it lands before we commit",
      "A three-way mixer means changing the tap, so factor that in if you like the one you have",
      "Cartridges are a running cost, once a year or so. Still far cheaper than bottled water",
      "It won't fix a shower that smells of chlorine. That's a whole-home job",
    ],
    servicing:
      "One cartridge a year for a typical household, less if the fridge is running off it too. Ten-minute change and we show you how, because paying a plumber annually for a ten-minute job is a waste of your money.",
    faqs: [
      {
        q: "Do I need a separate tap for an under-sink filter?",
        a: "Not necessarily. You can have a small dedicated filtered tap beside the existing mixer, which is the cheaper option and keeps your current tap. Or you can go to a three-way mixer that delivers hot, cold and filtered from the one spout, which looks better and is what most people pick once they've seen both.",
      },
      {
        q: "How long does the cartridge last?",
        a: "About twelve months for a normal household, sometimes less if you drink a lot of water or the fridge is running off it too. Changing it takes about ten minutes and we show you how, because paying a plumber to do a ten-minute job every year is a waste of your money.",
      },
      {
        q: "Can it feed the fridge and ice maker?",
        a: "Yes, if the fridge is close enough to run a line to, which in most kitchens it is. It means the ice and the chilled water come off proper filtration, and you stop buying the fridge manufacturer's own cartridges.",
      },
      {
        q: "Under-sink or whole-home, which one should I get?",
        a: "If the problem is the taste of your drinking water, under-sink, and you'll spend a lot less. If the problem is chlorine smell in the shower, sediment in the toilet cistern, or you're on tank water, whole-home. Tell us what you've actually noticed and we'll tell you which one addresses it, including when the answer is neither.",
      },
      {
        q: "Can you fit one in an apartment?",
        a: "Usually yes, because it's self-contained under the one sink and doesn't touch the building's shared plumbing. Worth a quick check of your body corporate rules first, but it's rarely an issue where a whole-home unit would be.",
      },
    ],
    metaTitle: "Under Sink Water Filter, Kitchen Tap",
    metaDescription:
      "Puretec under-sink drinking water filtration with a dedicated tap or three-way mixer, installed by licensed plumbers across Melbourne's south-east. Can feed the fridge and ice maker.",
    keywords: [
      "under sink water filter melbourne",
      "under sink filter installer pakenham",
      "three way mixer filtered tap",
      "puretec under sink filter",
      "filtered drinking water tap berwick",
    ],
  },
  {
    slug: "water-softeners",
    label: "Water softeners",
    tagline: "For hard water — which, on Melbourne mains, you probably haven't got",
    cta: "Do I need a softener?",
    productPhoto: "/bwt-bewamat-water-softener.webp",
    productPhotoAlt: "BWT Bewamat automatic water softener",
    diagram: "/water-filtration-water-softeners-diagram.webp",
    fitsWhere: "On the incoming main, with a brine tank beside it and a drain for the regeneration flush",
    blurb:
      "An ion-exchange softener swaps the calcium and magnesium that cause scale for sodium. It is the right answer on bore water and the wrong answer on most Melbourne mains connections, and we will tell you which one you are.",
    intro:
      "Here is the page that costs us sales, and we would rather have it than not. A water softener does one thing: it removes hardness, the dissolved calcium and magnesium that leave scale in kettles, on shower screens and inside hot water systems. Melbourne's mains water is among the softest of any major Australian city. If you are on mains here, a softener is usually solving a problem you do not have, and the advertising you have read for one was almost certainly written for a country with much harder water. Where it genuinely earns its place is bore water, some rural supplies, and the occasional property where the water is doing visible damage. So the first thing we do is test your hardness, and a good proportion of the time that test ends with us telling you to save your money.",
    treats: [
      "Hardness — the dissolved calcium and magnesium that form scale",
      "Scale build-up in kettles, shower screens, taps and tiles",
      "Scale inside hot water systems and dishwashers, which is where it costs real money",
      "Soap and detergent that will not lather properly in hard water",
    ],
    doesNotTreat: [
      "Chlorine, taste or odour. A softener is not a filter and it will not change how your water tastes — if anything it adds a little sodium",
      "Sediment, rust or silt. That is a separate filter, and it goes ahead of the softener to protect the resin",
      "Bacteria or anything biological. That is UV, on tank water",
      "The problem you probably have on Melbourne mains, which is chlorine rather than hardness",
    ],
    bestFor: [
      "Bore water, where hardness is genuinely high and measured rather than assumed",
      "Properties where scale is visibly building up on fittings and inside appliances despite regular cleaning",
      "Homes that have already lost a hot water system or a dishwasher to scale",
      "Rural supplies outside the Melbourne mains network, which is a real slice of our eastern coverage",
    ],
    watchOut: [
      "On Melbourne mains water you almost certainly do not need one, and we will say so before we quote it",
      "It uses salt and it uses water. Every regeneration cycle consumes both, and it needs a drain connection to send the flush to",
      "It adds sodium to your water. Usually a small amount, but worth knowing if anyone in the house is on a sodium-restricted diet",
      "It needs power, and it needs somewhere to sit near the main with room for a brine tank beside it",
    ],
    servicing:
      "Salt topped up as it is used — how often depends entirely on your hardness and how much water the house gets through. The unit regenerates itself automatically on a time and volume schedule. Beyond salt, an annual look at the resin and the valve is all it wants.",
    faqs: [
      {
        q: "Is Melbourne water hard?",
        a: "No. Melbourne mains water is soft — among the softest supplied to any major Australian city, because most of it comes from protected forest catchments rather than groundwater. That is why we will usually talk you out of a softener if you are on mains. If you are on bore water the answer is completely different and worth testing.",
      },
      {
        q: "How do I know if I actually need one?",
        a: "We test the hardness. It takes a couple of minutes and it turns the question from an argument into a number. If the number is low, you do not need a softener and we will not quote you one. If it is high, you will see it in the same test and the decision makes itself.",
      },
      {
        q: "What is the difference between a softener and a filter?",
        a: "Completely different jobs. A filter physically catches sediment and adsorbs chlorine, taste and odour. A softener chemically swaps hardness minerals for sodium using a resin bed, and it does nothing at all for taste, smell or dirt. Plenty of houses that want a filter get sold a softener, which is one of the reasons this page exists.",
      },
      {
        q: "How much salt does it use?",
        a: "It depends on your hardness and your water use, because the unit regenerates on volume as well as time. On a residential unit you are topping up a bag of salt periodically rather than constantly. We will give you a realistic figure for your water at the quote, not a brochure number.",
      },
      {
        q: "Does a softener waste water?",
        a: "It uses some, yes. Every regeneration flushes the resin bed and that flush goes to drain. On a properly sized unit set for your actual hardness it is a modest amount, but it is not nothing, and it is one more reason not to fit one where it is not needed.",
      },
      {
        q: "Can I put a softener on tank water?",
        a: "You can, but it is rarely the right first move. Rainwater is naturally soft, so hardness is not usually the tank-water problem — sediment, organics and the biological side are, which means filtration and UV. If someone is pitching you a softener for a rainwater tank, ask them what hardness reading they measured.",
      },
    ],
    metaTitle: "Water Softeners, and Whether You Need One",
    metaDescription:
      "Melbourne mains water is soft, so a softener is usually solving a problem you haven't got. Where it genuinely helps is bore water. We test the hardness first and tell you straight.",
    keywords: [
      "water softener melbourne",
      "do i need a water softener melbourne",
      "is melbourne water hard",
      "bore water softener victoria",
      "water softener installation pakenham",
      "hard water treatment melbourne",
    ],
  },
  {
    slug: "rainwater-uv",
    label: "Rainwater & tank",
    tagline: "Filtration plus UV, for the properties on tank water",
    cta: "Tank water filtration",
    productPhoto: "/puretec-rainwater-uv-system.webp",
    productPhotoAlt: "Rainwater filtration and UV system",
    diagram: "/water-filtration-rainwater-uv-diagram.webp",
    fitsWhere: "Between the tank pump and the house, filters first and the UV lamp last",
    blurb:
      "Rainwater collects off a roof, and a roof has birds, leaves and dust on it. Filtration handles the sediment and organics, UV handles the biological side, and the order they go in is not negotiable.",
    intro:
      "Plenty of properties through the hills and the smaller townships east of us are on tank water, either entirely or for part of the house. It is good water and it is free, and it also arrives having run off a roof that birds sit on. That makes tank water the one place in our coverage where filtration is doing a genuinely protective job rather than an improving one. The setup is sediment first, carbon second, ultraviolet last, and that order matters more than anything else on this page: UV kills what is in the water by shining through it, so it cannot do its job through water that is still cloudy.",
    treats: [
      "Sediment, grit, leaf matter and roof debris carried in from the tank",
      "Organics that give tank water its taste and colour",
      "The biological side — bacteria, protozoa and cysts — through the UV stage",
      "Cloudiness, which has to go before UV can work at all",
    ],
    doesNotTreat: [
      "Hardness, and it does not need to. Rainwater is naturally soft, which is why a softener on a tank is almost always the wrong sale",
      "Dissolved chemicals or heavy metals, which need reverse osmosis rather than filtration",
      "Anything at all if the lamp has failed. A UV system with a dead lamp still passes water through and tells you nothing unless it has an alarm",
      "What is going on in the tank itself. Filtration is not a substitute for first-flush diverters, gutter guards and cleaning the tank out",
    ],
    bestFor: [
      "Properties on tank water for drinking, through Emerald, Cockatoo, Gembrook, Bunyip, Tynong and the hills",
      "Houses running partly on tank and partly on mains, where the tank side needs treating and the mains side does not",
      "Anyone whose tank water has started tasting or smelling different, which usually means something has changed on the roof",
      "New tank installs, where doing it properly on day one costs a fraction of retrofitting later",
    ],
    watchOut: [
      "The UV lamp is a consumable. It needs replacing roughly annually even if it still lights, because output drops long before it dies",
      "UV needs power and it needs to stay powered. No electricity, no disinfection",
      "It only treats water on its way past. It does nothing for what is sitting in the tank, so tank maintenance still matters",
      "Sediment loads on tank water are far higher than mains, so cartridges get changed more often and that is a running cost worth planning for",
    ],
    servicing:
      "Cartridges more often than a mains-fed system — how often depends on your roof and your tank, and we will give you a realistic interval after we have seen it. UV lamp annually. We will roll both into one visit if you would rather not track them.",
    faqs: [
      {
        q: "Is tank water safe to drink without treatment?",
        a: "Plenty of people drink it untreated and always have. What treatment does is remove the variable: a roof is an open collection surface, and what lands on it changes with the season, the birds and the weather. Filtration plus UV takes that variability out, which matters most in households with young kids, elderly residents or anyone immune-compromised.",
      },
      {
        q: "Why does the UV go last?",
        a: "Because ultraviolet works by shining through the water, and it cannot shine through cloudiness. Sediment and organics shade the very things the lamp is meant to be killing. A UV lamp fitted ahead of the filters is a lamp doing very little, and it is a mistake we have been called out to correct.",
      },
      {
        q: "How often does the UV lamp need changing?",
        a: "Roughly annually. The important part is that a UV lamp keeps lighting up long after its output has dropped below the level that actually disinfects, so you cannot judge it by looking at it. Change it on a schedule, not on whether it is glowing.",
      },
      {
        q: "Do I need this if the tank is only for the garden and the toilet?",
        a: "No, and we will tell you that. If the tank does not feed anything anybody drinks or showers in, the case for UV largely disappears. A sediment filter to protect the pump and the cistern valves is usually as far as it is worth going.",
      },
      {
        q: "What about first flush and gutter guards?",
        a: "Do those first. Keeping leaf litter and the first dirty run-off out of the tank is cheaper and more effective than filtering it out afterwards, and it makes your cartridges last a lot longer. Any filtration quote we give on tank water will mention what we saw at the tank and the gutters.",
      },
    ],
    metaTitle: "Rainwater & Tank Filtration With UV",
    metaDescription:
      "Tank water filtration and UV for properties through the Dandenong Ranges and the townships east of Pakenham. Sediment, carbon, then UV — in that order, for a reason.",
    keywords: [
      "rainwater filtration melbourne",
      "tank water filter and uv",
      "rainwater uv steriliser victoria",
      "tank water filtration emerald cockatoo",
      "rainwater filter system pakenham",
    ],
  },
];

export function tierBySlug(slug: string): FiltrationTier | undefined {
  return TIERS.find((t) => t.slug === slug);
}

/** How the job actually runs. Shared across the section. */
export const PROCESS = [
  {
    t: "Tell us what you've noticed",
    d: "Taste, smell, grit, cloudy water, dry skin, or just a general feeling that you'd rather not drink it straight. What you've noticed is the most useful diagnostic there is, and it usually points straight at which of the three is right.",
  },
  {
    t: "We look at the water and the plumbing",
    d: "Mains or tank, what the pressure is doing, where the main comes in, and whether the cupboard under the sink has any room in it. On tank water we want to know about the roof and the tank as well, because that changes whether UV is warranted.",
  },
  {
    t: "A quote with the honest recommendation in it",
    d: "Including when the answer is a cheaper unit than you asked about, or nothing at all. If your complaint is drinking water and you were about to buy whole-home filtration, we'd rather tell you that than take the bigger job.",
  },
  {
    t: "Installed by a licensed plumber",
    d: "Not a handyman with a spanner. Filtration ties into your potable water supply, which means backflow protection and doing it to the standard. Same six-year workmanship warranty as anything else we fit.",
  },
  {
    t: "Shown how to change the cartridge",
    d: "On handover, on your unit, with you holding it. It's a ten-minute job once a year and there is no reason you should be paying anyone to come out and do it.",
  },
];

/* ====================================================================
 * THE FULL RANGE
 *
 * Straight off the BWT filtration cheat sheet and the 2025 brochure
 * Jake sent through — real product descriptions, real Reece TRS codes,
 * real warranty terms. Nothing here is inferred: if the cheat sheet
 * doesn't tick a column, we don't tick it either.
 *
 * BWT and Puretec both come through Reece, which is where we get almost
 * everything else. We lead with Puretec on the category pages because
 * that's the range we've standardised on; BWT is here because it's the
 * range with a published capability matrix, and because on softeners and
 * backwash filters it's the stronger product.
 *
 * The point of this page isn't to list stock. It's that "which filter do
 * I need" is genuinely hard to answer from marketing copy, and a matrix
 * of what each type actually removes answers it in one screen.
 * ================================================================== */

/** The columns on the matrix, in the order the cheat sheet uses them. */
export const CAPABILITIES = [
  { key: "sediment", label: "Sediment", group: "Asset protection" },
  { key: "hardness", label: "Hardness", group: "Asset protection" },
  { key: "tds", label: "TDS", group: "Asset protection" },
  { key: "taste", label: "Taste & odour", group: "Health" },
  { key: "chlorine", label: "Chlorine", group: "Health" },
  { key: "pharma", label: "Pharma & pesticides", group: "Health" },
  { key: "pfas", label: "PFAS & PFOA", group: "Health" },
  { key: "lead", label: "Lead", group: "Health" },
  { key: "cyst", label: "Cyst", group: "Health" },
  { key: "bacteria", label: "Bacteria", group: "Health" },
] as const;

export type CapabilityKey = (typeof CAPABILITIES)[number]["key"];

export type RangeProduct = {
  /** Reece TRS code, so Jake can order straight off the page. */
  code: string;
  name: string;
};

export type RangeCategory = {
  slug: string;
  name: string;
  /** What this family of products is for, in one honest sentence. */
  blurb: string;
  /** Which capability columns it ticks. */
  treats: CapabilityKey[];
  /** Point of entry (whole house) and/or point of use (under sink). */
  location: ("whole-house" | "under-sink")[];
  source: ("mains" | "rain")[];
  /** Warranty as published in the 2025 brochure. */
  warranty: string;
  products: RangeProduct[];
  /** Which of our category pages this family belongs to. */
  tier?: string;
  /** The honest note — where this family is and isn't the right answer. */
  note?: string;
};

export const RANGE: RangeCategory[] = [
  {
    slug: "backwash-filters",
    name: "Backwash filters",
    blurb:
      "A sediment filter that cleans itself. Instead of a cartridge you replace, the mesh is flushed backwards to waste, either by hand or automatically. Sediment only — it does nothing for taste, chlorine or hardness.",
    treats: ["sediment"],
    location: ["whole-house"],
    source: ["mains", "rain"],
    warranty: "1 year parts and labour, 3 years parts",
    tier: "whole-home",
    note:
      "The right answer where sediment load is high enough that cartridges would be a nuisance — bore water, tank water, or a property on the end of an old main. On clean Melbourne mains a cartridge system is usually cheaper and does more.",
    products: [
      { code: "1909268", name: "Avanti Manual Backwash Filter 25 mm" },
      { code: "1909269", name: "Avanti Manual Backwash Filter 50 mm" },
      { code: "1910793", name: "Avanti 30 Micron Backwash Filter 25 mm" },
      { code: "1910795", name: "Infinity Auto Backwash Filter Kit 20 mm" },
      { code: "3340001", name: "Infinity Auto Backwash Filter Kit 25 mm" },
      { code: "1910798", name: "Infinity Auto Backwash Filter Kit 32 mm" },
      { code: "1910797", name: "Infinity Auto Backwash Filter Kit 40 mm" },
      { code: "3400000", name: "Infinity Auto Backwash Filter Kit 50 mm" },
      { code: "1911285", name: "Multipur Manual Backwash Filter 65 mm" },
      { code: "1911286", name: "Multipur Manual Backwash Filter 80 mm" },
      { code: "1909282", name: "Multipur Auto Backwash Filter 65 mm" },
      { code: "1909283", name: "Multipur Auto Backwash Filter 80 mm" },
      { code: "1910438", name: "Multipur Auto Backwash Filter 100 mm" },
      { code: "1910439", name: "Multipur Auto Backwash Filter 125 mm" },
      { code: "1910440", name: "Multipur Auto Backwash Filter 150 mm" },
    ],
  },
  {
    slug: "twin-systems",
    name: "Twin cartridge systems (whole house)",
    blurb:
      "Two cartridges in series on the incoming main — sediment first, carbon second. This is the standard whole-house setup and the one most Melbourne homes actually want, because chlorine taste and smell is the thing people notice.",
    treats: ["sediment", "taste", "chlorine"],
    location: ["whole-house"],
    source: ["mains", "rain"],
    warranty: "1 year parts and labour, 3 years parts",
    tier: "whole-home",
    note:
      "House and Rain versions use different cartridges for different water. Jumbo 20\" flows better and lasts longer between changes than 10\" — worth the difference on a family home.",
    products: [
      { code: "1911268", name: '10" Jumbo Twin House System, with cartridges (mains)' },
      { code: "1911267", name: '20" Jumbo Twin House System, with cartridges (mains)' },
      { code: "1911297", name: '10" Jumbo Twin Rain System, with cartridges (tank)' },
      { code: "1911298", name: '20" Jumbo Twin Rain System, with cartridges (tank)' },
      { code: "1911262", name: '10" Jumbo Single Housing, no cartridge' },
      { code: "1911263", name: '20" Jumbo Single Housing, no cartridge' },
      { code: "1911270", name: '10" Jumbo Twin Housing, no cartridge' },
      { code: "1911264", name: '20" Jumbo Twin Housing, no cartridge' },
    ],
  },
  {
    slug: "softeners",
    name: "Water softeners",
    blurb:
      "Ion exchange, swapping the calcium and magnesium that cause scale for sodium. Hardness only — it will not change taste, smell or clarity, and on Melbourne mains you probably do not need one.",
    treats: ["hardness"],
    location: ["whole-house"],
    source: ["mains"],
    warranty: "1 year parts and labour, 5 years parts",
    tier: "water-softeners",
    note:
      "Bewamat runs a hygiene disinfection of the resin on every regeneration, has an adjustable blending valve so you can dial in how soft you actually want it, and is rated IP44 so it can live outside. 25A holds 8 L of resin, 75A holds 21 L.",
    products: [
      { code: "1909270", name: "Bewamat 25A Water Softener — 640 mm high, 8 L resin, 18 kg salt" },
      { code: "1909271", name: "Bewamat 75A Water Softener — 1090 mm high, 21 L resin, 50 kg salt" },
    ],
  },
  {
    slug: "inline-kits",
    name: "Undersink inline filter kits",
    blurb:
      "A single cartridge under the sink feeding a dedicated tap. Finer than anything a whole-house housing can practically run, which is why it reaches lead and cysts that the bigger systems do not.",
    treats: ["sediment", "taste", "chlorine", "lead", "cyst"],
    location: ["under-sink"],
    source: ["mains", "rain"],
    warranty: "1 year parts and labour, 3 years parts",
    tier: "under-sink",
    note:
      "Kits come complete — cartridge, filter head, bracket, stainless braided hose, dual check valve and the bush. 0.5 micron is the finest and 5 micron the longest-lasting; most kitchens are best on 1.0.",
    products: [
      { code: "1910992", name: "Inline Water Filter Kit, 0.5 micron" },
      { code: "1910993", name: "Inline Water Filter Kit, 1.0 micron" },
      { code: "1910998", name: "Inline Water Filter Kit, 5 micron" },
    ],
  },
  {
    slug: "reverse-osmosis",
    name: "Reverse osmosis",
    blurb:
      "The only thing on this page that removes dissolved salts, PFAS and pharmaceuticals. A membrane fine enough to reject almost everything, which also makes it slow, wasteful of water, and overkill for most Melbourne households.",
    treats: ["sediment", "hardness", "tds", "taste", "chlorine", "pharma", "pfas", "lead", "cyst", "bacteria"],
    location: ["under-sink"],
    source: ["mains"],
    warranty: "See brochure — check with us at quote",
    tier: "under-sink",
    note:
      "Genuinely warranted where there is a measured contaminant a cartridge cannot reach. Not warranted because a website frightened you about tap water. It sends several litres to drain for every litre it makes, and it strips minerals as well as contaminants.",
    products: [{ code: "1911093", name: "RO300 Reverse Osmosis System" }],
  },
  {
    slug: "fridge-and-ice",
    name: "Fridge & ice filters",
    blurb:
      "A filter on the line feeding the fridge, so the ice and the chilled water come off proper filtration instead of the manufacturer's own subscription cartridge.",
    treats: ["sediment"],
    location: ["under-sink"],
    source: ["mains"],
    warranty: "1 year parts and labour, 3 years parts",
    tier: "under-sink",
    products: [
      { code: "1910767", name: "Triple Action Fridge & Ice Filter" },
      { code: "1911069", name: "Multi-C 1000" },
      { code: "1911070", name: "Multi-C 2000" },
      { code: "1911071", name: "Multi-C 3000" },
      { code: "1911068", name: "Multi-C 7000" },
    ],
  },
];

export function rangeForTier(tier: string): RangeCategory[] {
  return RANGE.filter((r) => r.tier === tier);
}

/**
 * The five categories reduced to a single comparison row each.
 *
 * Jake's note after looking at Puretec: the thing that actually helps a
 * reader is a table showing the versions side by side. The full matrix
 * on /range is the deep version, six families against ten contaminants.
 * This is the shallow one that belongs on the hub — which of OUR five
 * categories, on one screen, without a click.
 *
 * Every value here is already stated on the category page it links to.
 * If they disagree, the category page is right and this is stale.
 */
export const COMPARE_ROWS = [
  {
    tier: "whole-home",
    label: "Whole house",
    fits: "Incoming main",
    covers: "Every tap, shower and appliance",
    handles: "Sediment · chlorine · taste",
    service: "Cartridges ~12 months",
    pick: "Chlorine smell in the shower, grit anywhere, or tank water",
    lead: true,
  },
  {
    tier: "hot-water",
    label: "Hot water protection",
    fits: "Cold inlet to the hot water unit",
    covers: "The hot water system only",
    handles: "Sediment",
    service: "One cartridge, at your annual service",
    pick: "Protecting a new heat pump, tank or continuous flow",
  },
  {
    tier: "under-sink",
    label: "Under sink",
    fits: "Cupboard under the kitchen sink",
    covers: "One tap, plus the fridge if it's close",
    handles: "Sediment · chlorine · taste · lead · cyst",
    service: "Cartridge ~12 months",
    pick: "It's the drinking water you don't like",
  },
  {
    tier: "water-softeners",
    label: "Water softener",
    fits: "Incoming main, with a brine tank",
    covers: "Every tap and appliance",
    handles: "Hardness only",
    service: "Salt as it's used",
    pick: "Bore water. On Melbourne mains you almost certainly don't need one",
  },
  {
    tier: "rainwater-uv",
    label: "Rainwater & tank",
    fits: "Between the tank pump and the house",
    covers: "Whatever the tank feeds",
    handles: "Sediment · organics · bacteria (UV)",
    service: "Cartridges more often · UV lamp yearly",
    pick: "You're on tank water and somebody drinks it",
  },
] as const;

/* ====================================================================
 * WHOLE-HOUSE PAGE FLOW
 *
 * Jake's running order, taken off the Puretec category page he kept
 * pointing at: header → everyday benefits → choose your system →
 * compare systems. Their layout, our colours.
 *
 * Product facts below come from the FilterWall F5/F6 spec sheet and the
 * Puretec compare table Jake sent, plus the BWT cheat sheet. Nothing is
 * inferred — where a spec isn't on the source it isn't here either.
 * ================================================================== */

/** Where filtered water actually turns up. Their five tiles, our palette. */
export const EVERYDAY_BENEFITS = [
  {
    area: "Kitchen",
    tint: "#0B1450",
    line: "Drinking and cooking water without the chlorine taste",
    detail:
      "The tap you fill the kettle from and the one the kids drink out of. Chlorine taste and smell go, and so does the jug in the fridge and the case of bottled water in the boot.",
  },
  {
    area: "Shower",
    tint: "#00699A",
    line: "Less chlorine on skin and hair",
    detail:
      "A reduction in chlorine in shower water helps with dryness and irritation. It's the benefit people notice second and mention first, usually about a fortnight in.",
  },
  {
    area: "Bathroom",
    tint: "#2E7D6B",
    line: "Cleaner basins, and less to scrub",
    detail:
      "Sediment is what leaves the marks around a basin and a toilet cistern. Take it out at the main and there's simply less of it arriving.",
  },
  {
    area: "Laundry",
    tint: "#C2540F",
    line: "Whites that stay white, and a washing machine that lasts",
    detail:
      "Sediment and chlorine both work on fabric and on the machine. Filtering at the point of entry means the washing machine, the dishwasher and the hot water system all run on treated water.",
  },
  {
    area: "Garden tap",
    tint: "#5A5F7A",
    line: "Filtered water outside too",
    detail:
      "Point-of-entry means every outlet, including the garden taps. Not the headline reason anybody installs one, but it's part of what you're paying for.",
  },
] as const;

/**
 * The system styles we can put in, across both ranges. This is the
 * "choose your system" step — the shape of the thing on your wall,
 * before anybody talks model numbers.
 */
export type SystemStyle = {
  brand: string;
  name: string;
  tier: string;
  style: string;
  blurb: string;
  facts: readonly string[];
  photo: string;
  /** The one we'd put in most often. */
  lead?: boolean;
};

export const SYSTEM_STYLES: readonly SystemStyle[] = [
  {
    brand: "Puretec",
    name: "FilterWall F Series",
    tier: "Premium",
    style: "Freestanding or wall mounted",
    blurb:
      "Three-stage filtration behind a flat aluminium cover, in ten finishes. The one to pick when the unit is going somewhere you'll look at it.",
    facts: ["3-stage with bypass", "55 L/min", '20" × 4.5" cartridges', "ScaleProtect on F4 and F6", "10-year warranty"],
    photo: "/puretec-filterwall-whole-house.webp",
    lead: true,
  },
  {
    brand: "Puretec",
    name: "FilterWall IM2",
    tier: "Enhanced",
    style: "Semi-recessed, in-wall",
    blurb:
      "Sits into the wall rather than on it, so it disappears almost entirely. Four finishes. Really a new-build or a renovation decision, because the cavity has to be there.",
    facts: ["Semi-recessed", "Four finishes", "Filtered water to every tap", "Chlorine, chemicals, sediment, PFAS"],
    photo: "/puretec-filterwall-im2.webp",
  },
  {
    brand: "Puretec",
    name: "WH2-55 AMC",
    tier: "Practical",
    style: "Wall mounted, covered",
    blurb:
      "The WH2 twin with a protective aluminium weather cover over it. Most of the tidiness for a good deal less than a FilterWall.",
    facts: ["Aluminium weather cover", '20" cartridges', "55 L/min", '1" connection', "10-year warranty"],
    photo: "/puretec-wh2-55-amc.webp",
  },
  {
    brand: "Puretec",
    name: "WH2 Series",
    tier: "Essential",
    style: "Wall mounted, uncovered",
    blurb:
      "Dual-stage filtration in heavy-duty housings, no cover. Does the same filtration job as the covered units and looks like plumbing, which on a side passage nobody sees is the right trade.",
    facts: ["WH2-30 · 10\" · 30 L/min", "WH2-55 · 20\" · 55 L/min", "WH2-60 · 20\" · 60 L/min · 1.5\"", "Sediment, chlorine, chemicals, PFAS"],
    photo: "/puretec-wh2-series.webp",
  },
  {
    brand: "BWT",
    name: "Jumbo Twin",
    tier: "Alternative",
    style: "Wall mounted, uncovered",
    blurb:
      "BWT's twin cartridge system, in 10\" and 20\" and in house or rain versions. The rain version runs different cartridges, which matters if you're on tank water.",
    facts: ['10" and 20" jumbo', "House and Rain versions", "Sediment, taste and odour, chlorine", "1 yr parts & labour, 3 yr parts"],
    photo: "/bwt-jumbo-twin.webp",
  },
  {
    brand: "BWT",
    name: "Backwash filter",
    tier: "High sediment",
    style: "Wall mounted, self-cleaning",
    blurb:
      "Flushes its own mesh to waste instead of using a cartridge you replace. Sediment only — but where the sediment load is high it saves you a cartridge every few months.",
    facts: ["Manual or automatic", "20 mm to 150 mm", "Sediment only", "Mains or tank"],
    photo: "/bwt-backwash.webp",
  },
] as const;

/** The compare table, straight off Puretec's own, with BWT added. */
export const SYSTEM_COMPARE = [
  { system: "Puretec FilterWall F Series", style: "Freestanding or wall mounted", cover: true, colours: "10", price: "$$$$", bestFor: "Premium design and performance", scale: true },
  { system: "Puretec FilterWall IM2", style: "Semi-recessed", cover: true, colours: "4", price: "$$$", bestFor: "New builds", scale: false },
  { system: "Puretec WH2-55 AMC", style: "Wall mounted", cover: true, colours: "1", price: "$$", bestFor: "Practical covered installation", scale: false },
  { system: "Puretec WH2 Series (30/55/60)", style: "Wall mounted", cover: false, colours: "—", price: "$", bestFor: "Essential whole house filtration", scale: false },
  { system: "BWT Jumbo Twin (10\"/20\")", style: "Wall mounted", cover: false, colours: "—", price: "$", bestFor: "Mains or tank, on a budget", scale: false },
  { system: "BWT Backwash filter", style: "Wall mounted", cover: false, colours: "—", price: "$$", bestFor: "High sediment, no cartridges to change", scale: false },
] as const;

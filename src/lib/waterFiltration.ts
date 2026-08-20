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
  /** Where it goes, in plain words. The single most useful thing to say. */
  fitsWhere: string;
  photo: { src: string; alt: string };
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
    fitsWhere: "On the incoming water main, before it splits off to anything else",
    photo: { src: "/photoshoot-with-reece-4.webp", alt: "Advanced Gas plumber on site" },
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
    fitsWhere: "On the cold water line feeding your hot water system",
    photo: { src: "/gas-hot-water-changeover.webp", alt: "Hot water changeover, where the cold inlet filter is fitted" },
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
    fitsWhere: "In the cupboard under the kitchen sink, feeding a dedicated tap or a three-way mixer",
    photo: { src: "/Photoshoot with reece 6.jpg", alt: "Advanced Gas plumbers at the Reece branch" },
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

/**
 * What the quote follow-up emails say, by what was quoted.
 *
 * Jake, 8 Nov, in order:
 *  - "more informational: how heat pumps save money, why we choose Reclaim,
 *    the different options"
 *  - "need to look like we are checking in and giving information they are
 *    looking for, not like an ad"
 *  - "the first email should be the common questions we get and then call if
 *    you have any questions, the 2nd about the quality of our brands and
 *    work, the 3rd about cost and saving, but with the heat pump that should
 *    be the first one, and then a really strong closer to get them to call,
 *    maybe if they need more options"
 *  - he likes the photos.
 *
 * So each is written as the person who quoted would type it, with one real
 * photo of our own work in it, and each ends asking them to call or reply:
 *
 *   heat pump    day 2 savings · day 5 common questions · day 9 brands & work · day 14 closer
 *   split        day 2 common questions · day 5 brands & work · day 9 savings · day 14 closer
 *   anything else  day 2 did it come through · day 6 how we work · day 14 closer
 *
 * Every claim is one the website already makes (the service pages' FAQs, the
 * brand pages, reviews.ts for the quotes), so the email and the site can't
 * disagree. No prices: the quote has the real one. Pure, for the check script.
 */

import type { LetterBlock } from "@/lib/email/premium";

export type QuoteKind = "heat-pump" | "split" | "general";

export type FollowUpInput = {
  first: string;
  /** Who quoted it, first name. */
  quoter: string;
  /** True when the person signing is the one who quoted: "thanks for having me out". */
  quoterSigns: boolean;
  /** The option names on the quote, as ServiceTitan has them ("Reclaim 300L - Plug"). */
  options: string[];
  phone: string;
};

export type FollowUpEmail = { subject: string; preheader: string; blocks: LetterBlock[] };

/** Days after the quote each email goes, by kind. Its length is how many emails there are. */
export const SERIES_DAYS: Record<QuoteKind, number[]> = { "heat-pump": [2, 5, 9, 14], split: [2, 5, 9, 14], general: [2, 6, 14] };

export function quoteKind(options: string[]): QuoteKind {
  const t = options.join(" ").toLowerCase();
  if (/heat ?pump|hot water|reclaim|istore|thermann|panasonic split|\b\d{3} ?l\b/.test(t)) return "heat-pump";
  if (/split system|multi ?head|back to back|wall split|cassette|floor console/.test(t)) return "split";
  return "general";
}

const p = (text: string): LetterBlock => ({ kind: "p", text });
const qa = (q: string, a: string): LetterBlock => p(`**${q}**\n${a}`);
const hi = (i: FollowUpInput) => p(`Hi ${i.first},`);
const visit = (i: FollowUpInput) => (i.quoterSigns ? "having me out" : `having ${i.quoter} out`);
const thanks = (i: FollowUpInput) => p(`Thanks for ${visit(i)}. Just checking the quote came through okay.`);
const callMe = (i: FollowUpInput, lead: string) => p(`${lead} ${lead.endsWith(",") ? "give" : "Give"} me a call on **${i.phone}**, or just reply here.`);

/** How we do the job: the same everywhere, from the About page and the FAQs. */
const HOW_WE_WORK = [
  "Everyone who comes to your place works for us. No subcontractors, and the person who quotes is part of the team that installs.",
  "We hold the plumbing, gas, refrigeration and electrical licences between us, so nothing gets handed off to someone else halfway through.",
  "A compliance certificate on every job, and we lodge the rebate paperwork for you.",
  "Six years' workmanship warranty from us, on top of the manufacturer's warranty.",
];

/* ------------------------------------------------------------ hot water */

function heatPump(step: number, i: FollowUpInput): FollowUpEmail {
  if (step === 1) {
    return {
      subject: "Your hot water quote, and what it'll save",
      preheader: "The honest version of what a heat pump saves.",
      blocks: [
        hi(i), thanks(i),
        p("The question I get asked most is what a heat pump will actually save, so here's the honest version."),
        p("A heat pump doesn't heat the water by burning gas or running an element. It works like a fridge in reverse: it pulls warmth out of the outside air and moves it into the tank. That takes far less energy, so it costs about a quarter as much to run as a gas or electric tank."),
        { kind: "list", items: [
          "**Swapping from gas storage**, a heat pump typically saves $400 to $900 a year.",
          "**Swapping from an electric tank**, typically $700 to $1,400 a year.",
          "**If you've got solar**, set it to heat in the middle of the day and most of the running cost comes off your own panels.",
        ] },
        { kind: "photo", src: "/email/hero-heat-pump.jpg", alt: "A Reclaim CO₂ heat pump and tank we installed against a brick wall", caption: "A Reclaim CO₂ split we installed: the tank against the wall, the heat pump beside it." },
        p("Then there's the rebate. The Victorian Energy Upgrades program takes up to $2,700 off, depending on your address, what you've got now and the size of your household. Yours is already worked out and taken off the prices on the quote, and we do the paperwork. With the rebate off, the saving usually pays the system back in around two years."),
        callMe(i, "If you'd like me to go through the numbers for your place, I'm happy to."),
      ],
    };
  }
  if (step === 2) {
    return {
      subject: "A few questions people ask about heat pumps",
      preheader: "Install time, cold mornings, noise, size and solar.",
      blocks: [
        hi(i),
        p("A few questions come up with nearly every heat pump quote, so I thought I'd answer them in case they're on your mind too."),
        qa("How long does the install take?", "A straight swap into the same spot is 3 to 5 hours, and usually done the same day. If it's moving position or needs a new circuit, that's already on the quote. The old tank goes with us on the day."),
        qa("Will it keep up on a cold morning?", "Yes. A CO₂ heat pump like the Reclaim keeps its full output down to minus 10°. The R290 units slow down a bit below zero, which mostly matters up in the hills."),
        qa("Is it noisy, and where does it go?", "The Reclaim is 37 dB at a metre, quieter than a fridge. We put it on the shady side of the house, away from bedrooms and the neighbour's fence wherever we can."),
        qa("What size do I need?", "Roughly 180 to 200 litres for one or two people, 270 to 315 for three or four, and a split with a bigger tank for five or more. Your quote is sized for your household."),
        qa("Does it work with solar?", "Yes. You can time it to heat in the middle of the day, and the Reclaim split can take a diverter kit so it runs on the solar you'd otherwise send back to the grid for a few cents."),
        { kind: "photo", src: "/email/hp-close.jpg", alt: "The base of a heat pump tank we installed, pipework insulated", caption: "Pipework insulated and the tank on a level slab, on one of our installs." },
        callMe(i, "If there's anything else you're wondering about, ask away."),
      ],
    };
  }
  if (step === 3) {
    return {
      subject: "Why we fit Reclaim, and how we do the job",
      preheader: "The brands we fit, and how we look after the install.",
      blocks: [
        hi(i),
        p("Who puts it in matters as much as what goes in, so here's a bit about the brands we fit and how we do the work."),
        { kind: "list", items: [
          "**Reclaim**: we're an accredited Reclaim installer. Their CO₂ heat pump keeps heating on the coldest mornings, the stainless tank has no anode to replace and nothing to rust, and it's Australian made. The stainless CO₂ system carries a 15-year tank and 10-year heat pump warranty.",
          "**iStore**: we're an accredited iStore installer too. Good value, with an app that makes it easy to run off solar.",
          "**Thermann**: an approved installer. A solid all-in-one at the lowest price after the rebate.",
        ] },
        { kind: "thumbs", items: [
          { src: "/email/opt-reclaim.jpg", alt: "Reclaim CO₂ heat pump with its tank", caption: "Reclaim CO₂" },
          { src: "/email/opt-istore.jpg", alt: "iStore all-in-one heat pump", caption: "iStore" },
          { src: "/email/opt-thermann.jpg", alt: "Thermann all-in-one heat pump", caption: "Thermann" },
        ] },
        p("And how we do the job:"),
        { kind: "list", items: HOW_WE_WORK },
        p("One customer in Pakenham put it this way on Google: “Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so it came straight off the price. Bloke on the phone is the bloke on the tools.”"),
        callMe(i, "If you'd like to talk through which one suits your place,"),
      ],
    };
  }
  return closer(i, "hot water quote", [
    "**If it's the price**, there's usually another way to do it. An all-in-one instead of a split, a glass-lined tank instead of stainless, or a different brand can bring it down a fair bit, and the rebate still comes off. I'm happy to put another option together for you.",
  ]);
}

/* ------------------------------------------------------------ split systems */

function split(step: number, i: FollowUpInput): FollowUpEmail {
  const t = i.options.join(" ").toLowerCase();
  if (step === 1) {
    return {
      subject: "Your split system quote, and a few common questions",
      preheader: "Install time, winter heating, where it goes and more.",
      blocks: [
        hi(i), thanks(i),
        p("Here are the questions people usually ask, in case they're on your mind too:"),
        qa("How long does the install take?", "Back to back, with the indoor and outdoor units either side of the same wall, is 3 to 4 hours. A longer pipe run or an upstairs install can make it half a day."),
        qa("Does it really heat in winter?", "Yes. Modern reverse-cycle systems keep their full heating output down to around 2° and keep working well below that, and it costs less to run than gas."),
        qa("Where does the outdoor unit go?", "As close to the indoor unit as we can get it, somewhere it can breathe, and away from bedroom windows, yours and the neighbour's. We walk it with you before anything's drilled."),
        qa("Do I need an electrician as well?", "No. We do the electrical in the same visit."),
        qa("Can I run it from my phone?", "Yes, with a Wi-Fi module. We set it up and show you before we leave."),
        qa("What happens to the old unit?", "We take it off the wall, de-gas it properly and take it to a metal recycler the same day."),
        { kind: "photo", src: "/email/hero-split.jpg", alt: "A wall split system we installed in a bedroom", caption: "A split we put in a bedroom: unit centred, pipework hidden." },
        callMe(i, "If you've got any other questions, I'm happy to help."),
      ],
    };
  }
  if (step === 2) {
    const mit = "**Mitsubishi Electric**: the brand we quote first, because of its reliability record across the systems we've put in. Its failure rate is under 1% across the range, and parts are still easy to get for units ten years old.";
    const kad = "**Kaden**: sold only through Reece, so parts are on the shelf in every store in Victoria, with a five-year compressor warranty. Good value when you're doing a few rooms at once.";
    const brands = /mitsubishi/.test(t) && !/kaden/.test(t) ? [mit] : /kaden/.test(t) && !/mitsubishi/.test(t) ? [kad] : [mit, kad];
    return {
      subject: "The brands we fit, and how we do the job",
      preheader: "Why we quote the brands we do.",
      blocks: [
        hi(i),
        p("Who puts it in matters as much as what goes in, so here's a bit about the brands we fit and how we do the work."),
        { kind: "list", items: brands },
        { kind: "photo", src: "/email/split-roof.jpg", alt: "A Kaden outdoor unit we mounted on a roof bracket", caption: "An outdoor unit we mounted on a roof bracket: level, secure and neat." },
        p("And how we do the job:"),
        { kind: "list", items: [...HOW_WE_WORK.slice(0, 2), "We size it room by room, not off a guess, then put dust sheets down, seal the holes and run the pipe neatly outside.", ...HOW_WE_WORK.slice(2)] },
        p("A customer in Cranbourne wrote on Google: “Bedroom Mitsubishi went in before lunch. Neat pipework, brackets straight, temp checked before they left.”"),
        callMe(i, "If you'd like to talk through the options,"),
      ],
    };
  }
  if (step === 3) {
    return {
      subject: "What a split system costs to run",
      preheader: "Why reverse-cycle is the cheap way to heat a room.",
      blocks: [
        hi(i),
        p("What it'll cost to run is the other thing people ask about, so here's how it works out."),
        p("A reverse-cycle split doesn't burn anything to make heat. It moves warmth from outside to inside, roughly three units of heat for every unit of electricity it uses, which is why it costs about a third as much as gas heating for the same warmth. In summer it runs the other way and cools."),
        { kind: "list", items: [
          "**You heat the room you're in**, not the whole house, which is where most of the saving is.",
          "**If you've got solar**, warming the house up in the afternoon costs very little.",
          "**One unit does both seasons**, so there's no separate heater and cooler to service and replace.",
        ] },
        { kind: "photo", src: "/email/split-indoor.jpg", alt: "A wall split system we installed, up close", caption: "One of ours on the wall: it heats the room you're in, and cools it in summer." },
        p("If you're replacing a gas or electric heater there's often a Victorian Energy Upgrades discount as well. Where your house qualifies, it's already off the quote, and we do the paperwork."),
        callMe(i, "If you'd like me to go through the running costs for your place, I'm happy to."),
      ],
    };
  }
  return closer(i, "split system quote", [
    `**If it's the price**, there's usually another way to do it: a different brand, a different size where it still suits the room${/multi ?head/.test(t) ? ", or separate splits instead of a multi-head" : ""}, or doing the rooms in stages. I'm happy to put another option together for you.`,
  ]);
}

/* ------------------------------------------------------------ everything else */

function general(step: number, i: FollowUpInput): FollowUpEmail {
  if (step === 1) {
    return {
      subject: "Your quote",
      preheader: "Just checking it came through.",
      blocks: [hi(i), thanks(i), p("If anything in it isn't clear, or you'd like to talk through the options, I'm happy to go through it."), callMe(i, "Any questions at all,")],
    };
  }
  if (step === 2) {
    return {
      subject: "A bit about how we do the job",
      preheader: "Who comes out, and how we look after it.",
      blocks: [
        hi(i),
        p("Who does the work matters as much as the price, so here's a bit about us in case it helps."),
        { kind: "list", items: HOW_WE_WORK },
        { kind: "photo", src: "/email/hero-team.jpg", alt: "The Advanced Gas team with the vans outside our Pakenham workshop", caption: "The team, outside our workshop in Pakenham." },
        callMe(i, "If you've got any questions about the quote,"),
      ],
    };
  }
  return closer(i, "quote", ["**If it's the price**, there's often another way to do it, or to stage it. I'm happy to put another option together for you."]);
}

/* ------------------------------------------------------------ the closer */

/**
 * The last one: find out what's in the way and get them on the phone. Every
 * reason someone goes quiet gets a way forward, and the phone number is the
 * strongest thing in it. Ends without pressure, because that's what makes
 * people reply.
 */
function closer(i: FollowUpInput, what: string, price: string[]): FollowUpEmail {
  return {
    subject: `Before I close off your ${what}`,
    preheader: "If something's not quite right, I can probably sort it.",
    blocks: [
      hi(i),
      p(`I haven't heard back about your ${what}, so before I close it off I wanted to check it isn't something I can sort out for you.`),
      ...price.map(p),
      p("**If you've had another quote**, send it through or give me a call and I'll go through it with you honestly. Often the difference is in what's included: the brand, the size, the electrical, the rebate paperwork."),
      p("**If you're not sure which option is right**, five minutes on the phone usually sorts it."),
      p("**If it's the timing**, tell me when suits and I'll check back then."),
      p(`Give me a call on **${i.phone}**, or reply with a good time and I'll ring you.`),
      p("And if you've gone with someone else, no hard feelings at all. If you've got a second to reply and let me know why, it really helps us."),
    ],
  };
}

export function followUpEmail(kind: QuoteKind, step: number, i: FollowUpInput): FollowUpEmail {
  return kind === "heat-pump" ? heatPump(step, i) : kind === "split" ? split(step, i) : general(step, i);
}

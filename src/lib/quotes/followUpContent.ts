/**
 * What the quote follow-up emails say, by what was quoted.
 *
 * Jake, 8 Nov, over a few rounds:
 *  - informative, not "did you get our quote?": how heat pumps save money,
 *    why Reclaim, the options
 *  - "need to look like we are checking in and giving information they are
 *    looking for, not like an ad", and "like a real email, not an automation"
 *  - day one is a check-in: how are you going, any questions
 *  - then the quality of our brands and work, and cost and savings (as a
 *    chart), savings before brands for hot water
 *  - "a really strong closer to get them to call, maybe if they need more options"
 *  - hot water: push the Reclaim R290 300 L first, the CO₂ split second, iStore
 *    as the budget option, and not Thermann
 *  - "super clean and simple" buttons at the bottom to go ahead or decline
 *
 *   heat pump      day 2 check-in · day 5 savings · day 9 brands & work · day 14 closer
 *   split          day 2 check-in · day 5 brands & work · day 9 running costs · day 14 closer
 *   anything else  day 2 check-in · day 6 how we work · day 14 closer
 *
 * Every claim is one the website already makes (the service pages' FAQs, the
 * brand pages, heatPumpUnits.ts, reviews.ts for the quotes), so the email and
 * the site can't disagree. No prices: the quote has the real one. Pure, for
 * the check script.
 */

import type { LetterBlock } from "@/lib/email/premium";

export type QuoteKind = "heat-pump" | "split" | "general";

export type FollowUpInput = {
  first: string;
  /** Who quoted it, first name. */
  quoter: string;
  /** True when the person signing is the one who quoted: "since I was out". */
  quoterSigns: boolean;
  /** The option names on the quote, as ServiceTitan has them ("Reclaim 300L - Plug"). */
  options: string[];
  phone: string;
  /** The one-tap answer links (answers.ts), signed for this quote. */
  answers: { yes: string; question: string; no: string };
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
const since = (i: FollowUpInput) => (i.quoterSigns ? "since I was out" : `since ${i.quoter} was out`);
const callMe = (i: FollowUpInput, lead: string) => p(`${lead} ${lead.endsWith(",") ? "give" : "Give"} me a call on **${i.phone}**, or just reply here.`);

/** The buttons at the bottom of every follow-up. */
const choices = (i: FollowUpInput): LetterBlock[] => [
  p("Or if it's easier, just tap one:"),
  { kind: "choices", items: [
    { label: "Let's go ahead", href: i.answers.yes, primary: true },
    { label: "I've got a question", href: i.answers.question },
    { label: "Not this time", href: i.answers.no },
  ] },
];

/** How we do the job: the same everywhere, from the About page and the FAQs. */
const HOW_WE_WORK = [
  "Everyone who comes to your place works for us. No subcontractors, and the person who quotes is part of the team that installs.",
  "We hold the plumbing, gas, refrigeration and electrical licences between us, so nothing gets handed off to someone else halfway through.",
  "A compliance certificate on every job, and we lodge the rebate paperwork for you.",
  "Six years' workmanship warranty from us, on top of the manufacturer's warranty.",
];

/* ------------------------------------------------------------ hot water */

/** In the order we recommend them. Thermann is deliberately not here: we don't push it. */
const HP_OPTIONS = [
  {
    key: "r290",
    line: "**Reclaim ECO R290, 300 litre**: what we recommend for most homes. It's an all-in-one, so it goes where your old tank is, it runs on R290 (a natural refrigerant), has Wi-Fi built in, and it's Australian made. Right for a household of three or four.",
    thumb: { src: "/email/opt-reclaim-aio.jpg", alt: "A Reclaim all-in-one heat pump we installed", caption: "Reclaim R290 300 L" },
  },
  {
    key: "co2",
    line: "**Reclaim CO₂ split**: the premium option. It keeps its full output down to minus 10°, it's whisper quiet at 37 dB, and the stainless tank has no anode to replace. The stainless system carries a 15-year tank and 10-year heat pump warranty.",
    thumb: { src: "/email/opt-reclaim.jpg", alt: "A Reclaim CO₂ split we installed, tank and heat pump", caption: "Reclaim CO₂ split" },
  },
  {
    key: "istore",
    line: "**iStore**: the budget option. It's a simpler unit, and the rebate takes it further than anything else we fit, so it's the lowest price on the day.",
    thumb: { src: "/email/opt-istore.jpg", alt: "iStore all-in-one heat pump", caption: "iStore" },
  },
];

function heatPump(step: number, i: FollowUpInput): FollowUpEmail {
  if (step === 1) {
    return {
      subject: "Checking in on your hot water quote",
      preheader: "Any questions come up?",
      blocks: [
        hi(i),
        p(`Just checking in to see how you're going with the hot water quote, and whether any questions have come up ${since(i)}.`),
        p("A few that people usually ask:"),
        qa("How long does it take?", "A swap into the same spot is a few hours and usually done the same day. We take the old tank with us."),
        qa("Will it keep up in winter?", "Yes, they all handle a normal winter here. If you're up in the hills where it gets properly cold, the Reclaim CO₂ keeps its full output down to minus 10°."),
        qa("Is it noisy?", "Not really: between 37 and 48 dB at a metre depending on the model, about a quiet conversation at most. We put it on the side of the house away from bedrooms where we can."),
        qa("Does it work with solar?", "Yes. Set it to heat in the middle of the day and it runs on your own panels."),
        { kind: "photo", src: "/email/hp-aio.jpg", alt: "A Reclaim all-in-one heat pump we installed on a slab beside the house", width: 300 },
        callMe(i, "If anything else is on your mind,"),
        ...choices(i),
      ],
    };
  }
  if (step === 2) {
    return {
      subject: "What a heat pump will save you",
      preheader: "Running costs, the rebate, and how long it takes to pay back.",
      blocks: [
        hi(i),
        p("The question I get asked most is what a heat pump will actually save, so here's the honest version."),
        p("A heat pump doesn't heat the water by burning gas or running an element. It works like a fridge in reverse: it pulls warmth out of the outside air and moves it into the tank. That takes far less energy, so it costs about a quarter as much to run as a gas or electric tank."),
        {
          kind: "chart",
          title: "Typical yearly saving with a heat pump",
          max: 1500,
          ticks: ["$0", "$750", "$1,500 a year"],
          rows: [
            { label: "Swapping from an electric tank", low: 700, high: 1400, value: "$700 to $1,400 a year" },
            { label: "Swapping from gas storage", low: 400, high: 900, value: "$400 to $900 a year" },
          ],
          note: "Typical figures. Yours depends on how much hot water the house uses.",
        },
        p("**If you've got solar**, set it to heat in the middle of the day and most of the running cost comes off your own panels."),
        p("**The rebate:** the Victorian Energy Upgrades program takes up to $2,700 off, depending on your address, what you've got now and the size of your household. Yours is already worked out and taken off the prices on the quote, and we do the paperwork. With the rebate off, the saving usually pays the system back in around two years."),
        callMe(i, "If you'd like me to go through the numbers for your place,"),
        ...choices(i),
      ],
    };
  }
  if (step === 3) {
    // All three, always in this order, whatever was on the quote: the R290 is the one we want them to see first.
    const opts = HP_OPTIONS;
    return {
      subject: "Why we recommend Reclaim, and how we do the job",
      preheader: "The options we recommend, and how we look after the install.",
      blocks: [
        hi(i),
        p("Who puts it in matters as much as what goes in, so here's a bit about the options we recommend and how we do the work."),
        { kind: "list", items: opts.map((o) => o.line) },
        ...(opts.length > 1 ? [{ kind: "thumbs" as const, items: opts.map((o) => o.thumb) }] : []),
        p("We're accredited installers for both Reclaim and iStore. And how we do the job:"),
        { kind: "list", items: HOW_WE_WORK },
        p("One customer in Pakenham put it this way on Google: “Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so it came straight off the price. Bloke on the phone is the bloke on the tools.”"),
        callMe(i, "If you'd like to talk through which one suits your place,"),
        ...choices(i),
      ],
    };
  }
  return closer(i, "hot water quote", "**If it's the price**, there's usually another way to do it. The Reclaim R290 all-in-one costs less than a split, the iStore less again, and the rebate comes off either way. I'm happy to put another option together for you.");
}

/* ------------------------------------------------------------ split systems */

function split(step: number, i: FollowUpInput): FollowUpEmail {
  const t = i.options.join(" ").toLowerCase();
  if (step === 1) {
    return {
      subject: "Checking in on your split system quote",
      preheader: "Any questions come up?",
      blocks: [
        hi(i),
        p(`Just checking in to see how you're going with the split system quote, and whether any questions have come up ${since(i)}.`),
        p("A few that people usually ask:"),
        qa("How long does the install take?", "Back to back, with the indoor and outdoor units either side of the same wall, is 3 to 4 hours. A longer pipe run or an upstairs install can make it half a day."),
        qa("Does it really heat in winter?", "Yes. Modern reverse-cycle systems keep their full heating output down to around 2° and keep working well below that, and it costs less to run than gas."),
        qa("Where does the outdoor unit go?", "As close to the indoor unit as we can get it, somewhere it can breathe, and away from bedroom windows, yours and the neighbour's. We walk it with you before anything's drilled."),
        qa("Do I need an electrician as well?", "No. We do the electrical in the same visit, and take the old unit away."),
        { kind: "photo", src: "/email/hero-split.jpg", alt: "A wall split system we installed in a bedroom" },
        callMe(i, "If anything else is on your mind,"),
        ...choices(i),
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
        { kind: "photo", src: "/email/split-roof.jpg", alt: "An outdoor unit we mounted on a roof bracket" },
        p("And how we do the job:"),
        { kind: "list", items: [...HOW_WE_WORK.slice(0, 2), "We size it room by room, not off a guess, then put dust sheets down, seal the holes and run the pipe neatly outside.", ...HOW_WE_WORK.slice(2)] },
        p("A customer in Cranbourne wrote on Google: “Bedroom Mitsubishi went in before lunch. Neat pipework, brackets straight, temp checked before they left.”"),
        callMe(i, "If you'd like to talk through the options,"),
        ...choices(i),
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
        p("A reverse-cycle split doesn't burn anything to make heat. It moves warmth from outside to inside, roughly three units of heat for every unit of electricity it uses. In summer it runs the other way and cools."),
        {
          kind: "chart",
          title: "Running cost for the same warmth",
          max: 100,
          rows: [
            { label: "Gas heating", low: 0, high: 100, value: "what you'd pay with gas" },
            { label: "Reverse-cycle", low: 0, high: 33, value: "about a third of that" },
          ],
        },
        { kind: "list", items: [
          "**You heat the room you're in**, not the whole house, which is where most of the saving is.",
          "**If you've got solar**, warming the house up in the afternoon costs very little.",
          "**One unit does both seasons**, so there's no separate heater and cooler to service and replace.",
        ] },
        p("If you're replacing a gas or electric heater there's often a Victorian Energy Upgrades discount as well. Where your house qualifies, it's already off the quote, and we do the paperwork."),
        callMe(i, "If you'd like me to go through the running costs for your place,"),
        ...choices(i),
      ],
    };
  }
  return closer(i, "split system quote", `**If it's the price**, there's usually another way to do it: a different brand, a different size where it still suits the room${/multi ?head/.test(t) ? ", separate splits instead of a multi-head" : ""}, or doing the rooms in stages. I'm happy to put another option together for you.`);
}

/* ------------------------------------------------------------ everything else */

function general(step: number, i: FollowUpInput): FollowUpEmail {
  if (step === 1) {
    return {
      subject: "Checking in on your quote",
      preheader: "Any questions come up?",
      blocks: [
        hi(i),
        p(`Just checking in to see how you're going with the quote, and whether any questions have come up ${since(i)}. If anything in it isn't clear, I'm happy to go through it.`),
        callMe(i, "Any questions at all,"),
        ...choices(i),
      ],
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
        { kind: "photo", src: "/email/hero-team.jpg", alt: "The Advanced Gas team with the vans outside our Pakenham workshop" },
        callMe(i, "If you've got any questions about the quote,"),
        ...choices(i),
      ],
    };
  }
  return closer(i, "quote", "**If it's the price**, there's often another way to do it, or to stage it. I'm happy to put another option together for you.");
}

/* ------------------------------------------------------------ the closer */

/**
 * The last one: find out what's in the way and get them on the phone. Every
 * reason someone goes quiet gets a way forward, and the phone number is the
 * strongest thing in it. Ends without pressure, because that's what makes
 * people reply.
 */
function closer(i: FollowUpInput, what: string, price: string): FollowUpEmail {
  return {
    subject: `Before I close off your ${what}`,
    preheader: "If something's not quite right, I can probably sort it.",
    blocks: [
      hi(i),
      p(`I haven't heard back about your ${what}, so before I close it off I wanted to check it isn't something I can sort out for you.`),
      p(price),
      p("**If you've had another quote**, send it through or give me a call and I'll go through it with you honestly. Often the difference is in what's included: the brand, the size, the electrical, the rebate paperwork."),
      p("**If you're not sure which option is right**, five minutes on the phone usually sorts it."),
      p("**If it's the timing**, tell me when suits and I'll check back then."),
      p(`Give me a call on **${i.phone}**, or reply with a good time and I'll ring you.`),
      ...choices(i),
      p("And if you've gone with someone else, no hard feelings at all. If you've got a second to tap “Not this time” and tell me why, it really helps us."),
    ],
  };
}

export function followUpEmail(kind: QuoteKind, step: number, i: FollowUpInput): FollowUpEmail {
  return kind === "heat-pump" ? heatPump(step, i) : kind === "split" ? split(step, i) : general(step, i);
}

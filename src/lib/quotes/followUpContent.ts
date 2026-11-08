/**
 * What the quote follow-up emails say, by what was quoted. Jake, 8 Nov: "more
 * informational, like if we send a heat pump, talking about how heat pumps
 * save money, why we choose Reclaim, the different options".
 *
 * So each email teaches one thing the customer is weighing, rather than
 * asking "did you get our quote?" three times:
 *   day 2   the options in their quote, side by side, and which we'd pick
 *   day 6   the money: running cost, the rebate, solar
 *   day 13  what happens if they say yes, and one click to tell us either way
 *
 * Every claim here is one the website already makes (heat pump page, brand
 * pages, the Reclaim/iStore/Thermann post, reviews.ts for the quote), so the
 * email and the site can't disagree. No prices: the quote has the real one.
 *
 * Written so far: hot water heat pumps and split systems, which are most of
 * what's quoted. Ducted and gas heating fall back to the general wording
 * until they're written. Pure, for the check script.
 */

import type { PremiumBlock } from "@/lib/email/premium";

export type QuoteKind = "heat-pump" | "split" | "general";

export type FollowUpInput = {
  first: string;
  /** Who quoted it: their name goes in the words. */
  quoter: string;
  suburb: string | null;
  /** The option names on the quote, as ServiceTitan has them ("Reclaim 300L - Plug"). */
  options: string[];
  phone: string;
  phoneHref: string;
  /** One-click answers on day 13; links into the portal once that's built. */
  answer: { yes: string; notNow: string; question: string };
  base: string;
};

export type FollowUpEmail = { subject: string; preheader: string; hero: { src: string; alt: string }; blocks: PremiumBlock[] };

export function quoteKind(options: string[]): QuoteKind {
  const t = options.join(" ").toLowerCase();
  if (/heat ?pump|hot water|reclaim|istore|thermann|panasonic split|\b\d{3} ?l\b/.test(t)) return "heat-pump";
  if (/split system|multi ?head|back to back|wall split|cassette|floor console/.test(t)) return "split";
  return "general";
}

/* ------------------------------------------------------------ hot water */

const HP_CARDS: Record<string, { match: RegExp; card: { src: string; alt: string; title: string; tag: string; text: string } }> = {
  reclaim: {
    match: /reclaim/i,
    card: {
      src: "/email/opt-reclaim.jpg", alt: "Reclaim CO₂ heat pump with its tank against a brick wall", title: "Reclaim CO₂", tag: "Our pick",
      text: "Natural CO₂ gas that keeps heating on a frosty morning. 37 dB, quiet enough for a bedroom wall. Australian made.",
    },
  },
  istore: {
    match: /istore/i,
    card: {
      src: "/email/opt-istore.jpg", alt: "iStore all-in-one heat pump", title: "iStore", tag: "Great with solar",
      text: "An app lets you heat in the middle of the day, off your own panels, so the hot water runs on sunshine.",
    },
  },
  thermann: {
    match: /thermann/i,
    card: {
      src: "/email/opt-thermann.jpg", alt: "Thermann all-in-one heat pump on a slab", title: "Thermann", tag: "Best on a budget",
      text: "A solid all-in-one at the lowest price after the rebate. Suits smaller households and rentals.",
    },
  },
};

/** The brands on their quote, Reclaim first; all three when the names don't say. */
function hpCards(options: string[]) {
  const on = Object.values(HP_CARDS).filter((c) => options.some((o) => c.match.test(o)));
  return (on.length >= 2 ? on : Object.values(HP_CARDS)).map((c) => c.card);
}

function heatPump(step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  if (step === 1) {
    const cards = hpCards(i.options);
    return {
      subject: "Your hot water options, side by side",
      preheader: "The short version of each, and the one we'd put in our own house.",
      hero: { src: "/email/hero-heat-pump.jpg", alt: "A Reclaim CO₂ heat pump we installed against a brick wall" },
      blocks: [
        { kind: "h", text: `Your hot water options, ${i.first}.` },
        { kind: "p", text: `Thanks for having ${i.quoter} out. Your quote has ${cards.length === 3 ? "three" : "a few"} options in it, and they're all good heat pumps. Where they differ is how long they'll last, how quiet they are and what they cost on the day. Here's the short version.` },
        { kind: "cards", items: cards },
        { kind: "rule" },
        { kind: "eyebrow", text: "Why we lean Reclaim" },
        { kind: "h", text: "Built to still be there in fifteen years." },
        {
          kind: "list",
          items: [
            "**CO₂ refrigerant.** Most heat pumps slow down in the cold. CO₂ still makes its rated heat at minus 10°, which is exactly when you want a hot shower.",
            "**Stainless tank.** No anode to replace at year five and nothing to rust. That's most of the difference between a ten-year system and a twenty-year one.",
            "**Whisper quiet.** 37 dB, so it can go under a bedroom window or near the neighbour's fence.",
            "**Australian made**, with the parts and the support here.",
          ],
        },
        { kind: "p", text: "It costs more on the day. If you're staying in the house, it's the one we'd choose. If you're not, the others will do you proud, and we'll happily put any of them in." },
        { kind: "p", text: `Questions about any of it? Just reply, or ring us on ${i.phone}.` },
      ],
    };
  }
  if (step === 2) {
    return {
      subject: "How a heat pump pays for itself",
      preheader: "About a quarter of the running cost, and the rebate is already off your quote.",
      hero: { src: "/email/hp-close.jpg", alt: "Close up of a heat pump's pipework where it meets the tank" },
      blocks: [
        { kind: "eyebrow", text: "The money" },
        { kind: "h", text: "Why a heat pump costs about a quarter as much to run." },
        { kind: "p", text: "A gas or electric tank makes heat by burning gas or running an element. A heat pump works like a fridge in reverse: it pulls warmth out of the air outside and moves it into the water. Moving heat takes far less energy than making it, so the same hot shower costs you about a quarter as much." },
        { kind: "facts", items: [{ value: "~¼", label: "the running cost of a gas or electric tank" }, { value: "Up to $2,700", label: "VEU rebate, already off your quote" }, { value: "1 day", label: "to install, 3 to 7 hours on site" }] },
        { kind: "eyebrow", text: "Got solar?" },
        { kind: "p", text: "Set it to heat in the middle of the day and it runs on your own panels. Customers of ours on solar have got their hot water cost down to next to nothing that way." },
        { kind: "eyebrow", text: "The rebate" },
        { kind: "p", text: "Victorian Energy Upgrades pays a big part of the cost when you swap gas or electric hot water for a heat pump. We do the paperwork and the discount is already taken off the price on your quote, so there's nothing to claim later." },
        { kind: "quote", text: "The VEU paperwork looked scary online. They filled it all in, I signed once at the quote and once on the day. Rebate was already in the price. Painless.", who: "Lauren M., Pakenham, on Google" },
        { kind: "p", text: `Happy to run through the numbers for your house. Just reply, or ring ${i.phone}.` },
      ],
    };
  }
  return lastStep(i, "hot water", "/email/hero-team.jpg", [
    "We order your unit. It's usually here within a few days.",
    "Install day: 3 to 7 hours, and the old system is taken away.",
    "We lodge the rebate and the compliance certificate. Nothing for you to fill in.",
    "Six years' workmanship warranty from us, on top of the manufacturer's.",
  ]);
}

/* ------------------------------------------------------------ split systems */

function split(step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  const t = i.options.join(" ").toLowerCase();
  if (step === 1) {
    const cards = [
      { src: "/email/opt-mitsubishi.jpg", alt: "Mitsubishi Electric wall split system", title: "Mitsubishi Electric", tag: "The one we quote first", text: "The best reliability record across our own installs. A ten-year-old unit still runs to spec, and parts are still easy to get." },
      { src: "/email/opt-kaden.jpg", alt: "A Kaden outdoor unit we mounted on a tiled roof", title: "Kaden", tag: "Whole house in one go", text: "Sold only through Reece, so parts are on a shelf in every store in Victoria. Five-year compressor warranty." },
    ];
    return {
      subject: "Picking the right split system for the room",
      preheader: "The brands on your quote, and why the size matters more than the badge.",
      hero: { src: "/email/hero-split.jpg", alt: "A split system we installed in a bedroom" },
      blocks: [
        { kind: "h", text: `Your split system options, ${i.first}.` },
        { kind: "p", text: `Thanks for having ${i.quoter} out. The quote is sized for the rooms ${i.quoter} measured, which matters more than the brand: too small and it runs flat out all winter, too big and it switches on and off and never quite settles.` },
        { kind: "cards", items: /kaden/.test(t) && !/mitsubishi/.test(t) ? [cards[1], cards[0]] : cards },
        { kind: "rule" },
        { kind: "eyebrow", text: "Where it goes" },
        { kind: "p", text: "Back to back (the outdoor unit straight through the wall from the indoor one) is the neatest and cheapest. Where that isn't possible we run the pipe through the roof or put the outdoor unit on a roof bracket. Your quote says which, and why." },
        { kind: "p", text: `Questions about any of it? Just reply, or ring us on ${i.phone}.` },
      ],
    };
  }
  if (step === 2) {
    return {
      subject: "Why reverse-cycle is the cheap way to heat a room",
      preheader: "It moves heat instead of making it, and it cools in summer too.",
      hero: { src: "/email/split-roof.jpg", alt: "A Kaden outdoor unit we mounted on a tiled roof" },
      blocks: [
        { kind: "eyebrow", text: "The money" },
        { kind: "h", text: "A split system is a heat pump for the room." },
        { kind: "p", text: "A reverse-cycle split doesn't burn anything to make heat. It moves warmth from outside to inside, the same way a heat pump hot water system does, which is why the running cost is a fraction of a gas heater's for the same room. In summer it runs the other way and cools." },
        {
          kind: "list",
          items: [
            "**Heat the room you're in**, not the whole house. That's where most of the saving is.",
            "**Run it off solar** during the day and the afternoon warm-up costs you very little.",
            "**One unit, both seasons.** No separate heater and cooler to buy, service and replace.",
          ],
        },
        { kind: "p", text: "If you're swapping off gas heating, there may be a Victorian Energy Upgrades discount as well. Where your house qualifies, it's already taken off the quote." },
        { kind: "p", text: `Happy to talk it through. Just reply, or ring ${i.phone}.` },
      ],
    };
  }
  return lastStep(i, "split system", "/email/hero-team.jpg", [
    "We book a day that suits you. Most installs are done in a day.",
    "Dust sheets down, holes sealed, the pipe covered neatly outside.",
    "We show you the remote and the app before we leave.",
    "Six years' workmanship warranty from us, on top of the manufacturer's.",
  ]);
}

/* ------------------------------------------------------------ everything else, and day 13 */

function lastStep(i: FollowUpInput, what: string, hero: string, next: string[]): FollowUpEmail {
  return {
    subject: "Should we keep your quote open?",
    preheader: "One click to let us know, either way.",
    hero: { src: hero, alt: "The Advanced Gas team with the vans outside our Pakenham workshop" },
    blocks: [
      { kind: "h", text: `Where are you at, ${i.first}?` },
      { kind: "p", text: `We haven't heard back about your ${what} quote, so we wanted to check in. If you'd like to go ahead, here's how it runs from here:` },
      { kind: "list", items: next },
      { kind: "p", text: "One click lets us know where you're at:" },
      { kind: "buttons", items: [{ label: "Yes, go ahead", href: i.answer.yes, solid: true }, { label: "Not right now", href: i.answer.notNow }, { label: "I have a question", href: i.answer.question }] },
      { kind: "p", text: "If it's not the right time, that's fine. We'll close it off and you won't hear from us about it again." },
    ],
  };
}

function general(step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  if (step === 3) return lastStep(i, "", "/email/hero-team.jpg", ["We book a day that suits you.", "The same crew start to finish, all employed by us.", "Six years' workmanship warranty, on top of the manufacturer's."]);
  return {
    subject: step === 1 ? "Your quote from Advanced Gas" : "Anything we can help with on your quote?",
    preheader: "Any questions, just reply.",
    hero: { src: "/email/hero-team.jpg", alt: "The Advanced Gas team with the vans outside our Pakenham workshop" },
    blocks: [
      { kind: "h", text: `Hi ${i.first}.` },
      { kind: "p", text: step === 1 ? `Just checking the quote ${i.quoter} put together came through okay. If anything in it isn't clear, or you'd like to talk through the options, just reply here or ring us on ${i.phone}.` : `If there's anything holding you back on the quote, a question, the timing, the price, just reply and tell us. We'd rather know.` },
    ],
  };
}

export function followUpEmail(kind: QuoteKind, step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  const e = kind === "heat-pump" ? heatPump(step, i) : kind === "split" ? split(step, i) : general(step, i);
  // The general day-13 email has no product word: tidy the double space it leaves.
  return { ...e, blocks: e.blocks.map((b) => (b.kind === "p" ? { ...b, text: b.text.replace(/your {2}quote/, "your quote") } : b)) };
}

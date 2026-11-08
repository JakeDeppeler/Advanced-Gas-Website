/**
 * What the quote follow-up emails say, by what was quoted.
 *
 * Jake, 8 Nov: "more informational, like if we send a heat pump, talking
 * about how heat pumps save money, why we choose Reclaim, the different
 * options", and then: "need to look like we are checking in and giving
 * information they are looking for, not like an ad".
 *
 * So they're written as the person who quoted would type them: first person,
 * plain sentences, no headlines or labels, and every one ends by asking them
 * to reply rather than click. Each answers the thing people ask at that point:
 *   day 2   did the quote come through, and what's the difference between the options
 *   day 6   what it costs to run, and how the rebate works
 *   day 13  a friendly check-in: no rush, here's what happens if you go ahead
 *
 * Every claim is one the website already makes (heat pump page, brand pages,
 * the Reclaim/iStore/Thermann post), so the email and the site can't
 * disagree. No prices: the quote has the real one.
 *
 * Written so far: hot water heat pumps and split systems, which are most of
 * what's quoted. Anything else gets the general wording. Pure, for the check
 * script.
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

export function quoteKind(options: string[]): QuoteKind {
  const t = options.join(" ").toLowerCase();
  if (/heat ?pump|hot water|reclaim|istore|thermann|panasonic split|\b\d{3} ?l\b/.test(t)) return "heat-pump";
  if (/split system|multi ?head|back to back|wall split|cassette|floor console/.test(t)) return "split";
  return "general";
}

const visit = (i: FollowUpInput) => (i.quoterSigns ? "having me out" : `having ${i.quoter} out`);
const reply = (i: FollowUpInput) => `just reply here, or give me a call on ${i.phone}.`;
const cap = (t: string) => t[0]!.toUpperCase() + t.slice(1);
const count = (n: number) => (["", "one", "two", "three", "four"][n] ?? String(n));

/* ------------------------------------------------------------ hot water */

const HP_BRANDS: { match: RegExp; line: string; thumb: { src: string; alt: string; caption: string } }[] = [
  {
    match: /reclaim/i,
    line: "**Reclaim CO₂**: the one we'd put in if you're staying in the house long term. It uses CO₂ as the refrigerant, so it keeps heating well on cold mornings, it's quiet (37 dB), and the stainless tank has no anode to replace down the track. It's the dearest of the three.",
    thumb: { src: "/email/opt-reclaim.jpg", alt: "Reclaim CO₂ heat pump with its tank", caption: "Reclaim CO₂" },
  },
  {
    match: /istore/i,
    line: "**iStore**: good value, and if you've got solar you can set it from the app to heat in the middle of the day, so it runs off your panels.",
    thumb: { src: "/email/opt-istore.jpg", alt: "iStore all-in-one heat pump", caption: "iStore" },
  },
  {
    match: /thermann/i,
    line: "**Thermann**: the lowest price after the rebate. A solid all-in-one for a smaller household or a rental.",
    thumb: { src: "/email/opt-thermann.jpg", alt: "Thermann all-in-one heat pump", caption: "Thermann" },
  },
];

function heatPump(step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  if (step === 1) {
    const on = HP_BRANDS.filter((b) => i.options.some((o) => b.match.test(o)));
    const brands = on.length >= 2 ? on : HP_BRANDS;
    const lines = brands.map((b) => (brands.length < 3 ? b.line.replace(" It's the dearest of the three.", " It's the dearer option.") : b.line));
    return {
      subject: "Your hot water quote",
      preheader: "The difference between the options, in plain English.",
      blocks: [
        { kind: "p", text: `Hi ${i.first},` },
        { kind: "p", text: `Thanks for ${visit(i)}. Just checking the quote came through okay.` },
        { kind: "p", text: `There are ${count(brands.length)} options on it, and people usually ask what the difference actually is, so here's the short version:` },
        { kind: "list", items: lines },
        { kind: "thumbs", items: brands.map((b) => b.thumb) },
        { kind: "p", text: "All of them get the VEU rebate, and it's already taken off the prices on the quote." },
        { kind: "p", text: `Happy to talk any of it through: ${reply(i)}` },
      ],
    };
  }
  if (step === 2) {
    return {
      subject: "Running costs on a heat pump",
      preheader: "How it saves, and how the rebate works.",
      blocks: [
        { kind: "p", text: `Hi ${i.first},` },
        { kind: "p", text: "Running costs come up a lot when people are deciding on hot water, so I thought this might help." },
        { kind: "p", text: "A heat pump doesn't heat the water by burning gas or running an element. It works like a fridge in reverse: it pulls warmth out of the outside air and moves it into the tank. That takes far less energy, so it costs about a quarter as much to run as a gas or electric tank." },
        { kind: "p", text: "If you've got solar, set it to heat in the middle of the day and most of that comes off your own panels." },
        { kind: "p", text: "On the rebate: the Victorian Energy Upgrades program pays a good part of the cost when you swap gas or electric hot water for a heat pump. We do the paperwork, and the discount is already off the price on your quote, so there's nothing to claim later." },
        { kind: "p", text: `If you've got any questions about it, ${reply(i)}` },
      ],
    };
  }
  return checkIn(i, "hot water quote", "It's usually a few days for the unit to arrive, the install is done in a day, and we take the old one away. We look after the rebate and the compliance paperwork, so there's nothing for you to fill in.");
}

/* ------------------------------------------------------------ split systems */

const MITSUBISHI = "**Mitsubishi Electric**: the brand we quote first. It has the best reliability record across the systems we've put in, and parts are still easy to get for units ten years old.";
const KADEN = "**Kaden**: sold only through Reece, so parts are on the shelf in every store in Victoria, with a five-year compressor warranty. Good value, especially when you're doing a few rooms at once.";

function split(step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  const t = i.options.join(" ").toLowerCase();
  if (step === 1) {
    const hasM = /mitsubishi/.test(t), hasK = /kaden/.test(t);
    const brands = hasM && !hasK ? [MITSUBISHI] : hasK && !hasM ? [KADEN] : [MITSUBISHI, KADEN];
    const brandBlocks: LetterBlock[] = brands.length > 1
      ? [{ kind: "p", text: "On the brands, the short version:" }, { kind: "list", items: brands }]
      : [{ kind: "p", text: brands[0]!.replace(/^\*\*(.+?)\*\*: (\w)/, (_, b: string, c: string) => `It's a **${b}**: ${c.toLowerCase()}`) }];
    return {
      subject: "Your split system quote",
      preheader: "A couple of things people usually ask.",
      blocks: [
        { kind: "p", text: `Hi ${i.first},` },
        { kind: "p", text: `Thanks for ${visit(i)}. Just checking the quote came through okay.` },
        { kind: "p", text: `It's sized for the room${/multi ?head/.test(t) ? "s" : ""} ${i.quoterSigns ? "I" : i.quoter} measured. That matters more than the brand: too small and it runs flat out all winter, too big and it keeps switching on and off.` },
        ...brandBlocks,
        { kind: "p", text: "Where it can, the outdoor unit goes straight through the wall from the indoor one (back to back), which is the neatest and cheapest. Where that isn't possible we run the pipe through the roof or put the outdoor unit on a roof bracket. The quote says which." },
        { kind: "p", text: `Happy to talk any of it through: ${reply(i)}` },
      ],
    };
  }
  if (step === 2) {
    return {
      subject: "Running costs on a split system",
      preheader: "Why reverse-cycle is the cheap way to heat a room.",
      blocks: [
        { kind: "p", text: `Hi ${i.first},` },
        { kind: "p", text: "A question we get a lot is what a split system costs to run, so I thought this might help." },
        { kind: "p", text: "A reverse-cycle split doesn't burn anything to make heat. It moves warmth from outside to inside, the same way a heat pump hot water system does, which is why it costs a fraction of a gas heater to run for the same room. In summer it runs the other way and cools." },
        { kind: "list", items: ["You're heating the room you're in, not the whole house, which is where most of the saving is.", "If you've got solar, warming the house up in the afternoon costs very little.", "One unit does both seasons, so there's no separate heater and cooler to service and replace."] },
        { kind: "p", text: "If you're replacing gas heating there may be a Victorian Energy Upgrades discount too. Where your house qualifies, it's already off the quote." },
        { kind: "p", text: `Any questions, ${reply(i)}` },
      ],
    };
  }
  return checkIn(i, "split system quote", "Most installs are done in a day. We put dust sheets down, seal up the holes, cover the pipe neatly outside, and show you the remote and the app before we leave.");
}

/* ------------------------------------------------------------ the check-in, and everything else */

function checkIn(i: FollowUpInput, what: string, how: string): FollowUpEmail {
  return {
    subject: `Just checking in on your ${what}`,
    preheader: "No rush at all.",
    blocks: [
      { kind: "p", text: `Hi ${i.first},` },
      { kind: "p", text: `Hope you're well. Just checking in on your ${what}. No rush at all, I know it's a decision.` },
      { kind: "p", text: `If you'd like to go ahead, just reply and I'll get it booked in. ${how}` },
      { kind: "p", text: "If you've got questions, or you'd like to change one of the options, I'm happy to help." },
      { kind: "p", text: "And if it's not the right time, no worries. Let me know and I'll put it on hold, so you won't hear from us about it again." },
    ],
  };
}

function general(step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  if (step === 3) return checkIn(i, "quote", "We'll book a day that suits you, and the same crew looks after it from start to finish.");
  return {
    subject: step === 1 ? "Your quote" : "Any questions about your quote?",
    preheader: "Happy to help with anything.",
    blocks: [
      { kind: "p", text: `Hi ${i.first},` },
      step === 1
        ? { kind: "p", text: `Thanks for ${visit(i)}. Just checking the quote came through okay, and that it all makes sense.` }
        : { kind: "p", text: "Just following up in case anything in the quote needs explaining. If something's holding you back, whether it's a question, the timing or the price, I'd rather know so I can help." },
      { kind: "p", text: cap(reply(i)) },
    ],
  };
}

export function followUpEmail(kind: QuoteKind, step: 1 | 2 | 3, i: FollowUpInput): FollowUpEmail {
  return kind === "heat-pump" ? heatPump(step, i) : kind === "split" ? split(step, i) : general(step, i);
}

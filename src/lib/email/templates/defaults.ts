import type { EmailTemplate, QuoteKind, TplBlock } from "./types";

/**
 * The standard wording of every customer email the page edits: what goes out
 * until someone changes it, and what "back to the standard wording" restores.
 *
 * The follow-ups, Jake, 8 Nov, over a few rounds:
 *  - informative, not "did you get our quote?": how heat pumps save money,
 *    why Reclaim, the options
 *  - "need to look like we are checking in and giving information they are
 *    looking for, not like an ad", and "like a real email, not an automation"
 *  - day one is a check-in: how are you going, any questions
 *  - then the quality of our brands and work, and cost and savings (as clean
 *    stats), savings before brands for hot water
 *  - "a really strong closer to get them to call, maybe if they need more options"
 *  - hot water: push the Reclaim R290 300 L first, the CO₂ split second, iStore
 *    as the budget option, and not Thermann
 *  - "super clean and simple" buttons at the bottom to go ahead or decline
 *
 *   hot water      day 2 check-in · day 5 savings · day 9 brands & work · day 14 closer
 *   split          day 2 check-in · day 5 brands & work · day 9 running costs · day 14 closer
 *   anything else  day 2 check-in · day 6 how we work · day 14 closer
 *
 * Every claim is one the website already makes (the service pages' FAQs, the
 * brand pages, heatPumpUnits.ts, reviews.ts for the quotes), so the email and
 * the site can't disagree. No prices: the quote has the real one.
 *
 * The split brands email names both Mitsubishi Electric and Kaden whatever
 * was quoted, as the hot water one names all three options: a template is
 * the same words for everyone, and both brands are ones we'd fit.
 */

const p = (text: string): TplBlock => ({ kind: "p", text });
const qa = (q: string, a: string): TplBlock => p(`**${q}**\n${a}`);
const HI = p("Hi {first},");
const callMe = (lead: string) => p(`${lead} give me a call on **{phone}**, or just reply here.`);
const ANSWERS: TplBlock[] = [p("Or if it's easier, just tap one:"), { kind: "answers" }];

/** How we do the job: the same everywhere, from the About page and the FAQs. */
const HOW_WE_WORK = [
  "Our installers and apprentices all work for us, and the person who quotes is part of the team that installs.",
  "We hold the plumbing, gas and refrigeration licences ourselves. Where a job needs new electrical work, a licensed electrician does that part.",
  "A compliance certificate on every job, and we lodge the rebate paperwork for you.",
  "Six years' workmanship warranty from us, on top of the manufacturer's warranty.",
];

const RATING_STAT = { value: "{rating} ★", label: "from {review_count} Google reviews" };

function closer(what: string, price: string): Pick<EmailTemplate, "subject" | "preheader" | "blocks"> {
  return {
    subject: `Before I close off your ${what}`,
    preheader: "If something's not quite right, I can probably sort it.",
    blocks: [
      HI,
      p(`I haven't heard back about your ${what}, so before I close it off I wanted to check it isn't something I can sort out for you.`),
      p(price),
      p("**If you've had another quote**, send it through or give me a call and I'll go through it with you honestly. Often the difference is in what's included: the brand, the size, the electrical, the rebate paperwork."),
      p("**If you're not sure which option is right**, five minutes on the phone usually sorts it."),
      p("**If it's the timing**, tell me when suits and I'll check back then."),
      p("Give me a call on **{phone}**, or reply with a good time and I'll ring you."),
      ...ANSWERS,
      p("And if you've gone with someone else, no hard feelings at all. If you've got a second to tap “Not this time” and tell me why, it really helps us."),
    ],
  };
}

type Step = Pick<EmailTemplate, "name" | "subject" | "preheader" | "blocks">;

const HEAT_PUMP: Step[] = [
  {
    name: "Checking in",
    subject: "Checking in on your hot water quote",
    preheader: "Any questions come up?",
    blocks: [
      HI,
      p("Just checking in to see how you're going with the hot water quote, and whether any questions have come up {since_visit}."),
      p("A few that people usually ask:"),
      qa("How long does it take?", "A swap into the same spot is a few hours and usually done the same day. We take the old tank with us."),
      qa("Will it keep up in winter?", "Yes, they all handle a normal winter here. If you're up in the hills where it gets properly cold, the Reclaim CO₂ keeps its full output down to minus 10°."),
      qa("Is it noisy?", "Not really: between 37 and 48 dB at a metre depending on the model, about a quiet conversation at most. We put it on the side of the house away from bedrooms where we can."),
      qa("Does it work with solar?", "Yes. Set it to heat in the middle of the day and it runs on your own panels."),
      { kind: "photo", src: "/email/hp-aio.jpg", alt: "A Reclaim all-in-one heat pump we installed on a slab beside the house", width: 300 },
      callMe("If anything else is on your mind,"),
      ...ANSWERS,
    ],
  },
  {
    name: "What it saves",
    subject: "What a heat pump will save you",
    preheader: "Running costs, the rebate, and how long it takes to pay back.",
    blocks: [
      HI,
      p("The question I get asked most is what a heat pump will actually save, so here's the honest version."),
      p("A heat pump doesn't heat the water by burning gas or running an element. It works like a fridge in reverse: it pulls warmth out of the outside air and moves it into the tank. That takes far less energy, so it costs about a quarter as much to run as a gas or electric tank."),
      {
        kind: "stats",
        items: [
          { value: "$400–$900", label: "saved a year, swapping from gas storage" },
          { value: "$700–$1,400", label: "saved a year, swapping from an electric tank" },
          { value: "Up to $2,700", label: "VEU rebate, already off your quote" },
          { value: "~2 years", label: "to pay it back, with the rebate off" },
        ],
        note: "Typical figures. Yours depends on how much hot water the house uses.",
      },
      p("**The rebate** depends on your address, what you've got now and the size of your household. Yours is already worked out and taken off the prices on the quote, and we do the paperwork."),
      p("**If you've got solar**, set it to heat in the middle of the day and most of the running cost comes off your own panels."),
      callMe("If you'd like me to go through the numbers for your place,"),
      ...ANSWERS,
    ],
  },
  {
    name: "Our brands and our work",
    subject: "Why we recommend Reclaim, and how we do the job",
    preheader: "The options we recommend, and how we look after the install.",
    blocks: [
      HI,
      p("Who puts it in matters as much as what goes in, so here's a bit about the options we recommend and how we do the work."),
      { kind: "list", items: [
        "**Reclaim ECO R290, 300 litre**: what we recommend for most homes. It's an all-in-one, so it goes where your old tank is, it runs on R290 (a natural refrigerant), has Wi-Fi built in, and it's Australian made. Right for a household of three or four.",
        "**Reclaim CO₂ split**: the premium option. It keeps its full output down to minus 10°, it's whisper quiet at 37 dB, and the stainless tank has no anode to replace. The stainless system carries a 15-year tank and 10-year heat pump warranty.",
        "**iStore**: the budget option. It's a simpler unit, and the rebate takes it further than anything else we fit, so it's the lowest price on the day.",
      ] },
      { kind: "thumbs", items: [
        { src: "/email/opt-reclaim-aio.jpg", alt: "A Reclaim all-in-one heat pump we installed", caption: "Reclaim R290 300 L" },
        { src: "/email/opt-reclaim.jpg", alt: "A Reclaim CO₂ split we installed, tank and heat pump", caption: "Reclaim CO₂ split" },
        { src: "/email/opt-istore.jpg", alt: "iStore all-in-one heat pump", caption: "iStore" },
      ] },
      p("We're accredited installers for both Reclaim and iStore. And how we do the job:"),
      { kind: "list", items: HOW_WE_WORK },
      { kind: "stats", items: [
        { value: "15 years", label: "tank warranty on the Reclaim CO₂ stainless" },
        { value: "6 years", label: "our workmanship warranty, on top" },
        RATING_STAT,
      ] },
      p("One customer in Pakenham put it this way on Google: “Took the old gas Rinnai out, dropped in a Reclaim heat pump, sorted the VEU rebate so it came straight off the price. Bloke on the phone is the bloke on the tools.”"),
      callMe("If you'd like to talk through which one suits your place,"),
      ...ANSWERS,
    ],
  },
  { name: "The closer", ...closer("hot water quote", "**If it's the price**, there's usually another way to do it. The Reclaim R290 all-in-one costs less than a split, the iStore less again, and the rebate comes off either way. I'm happy to put another option together for you.") },
];

const SPLIT: Step[] = [
  {
    name: "Checking in",
    subject: "Checking in on your split system quote",
    preheader: "Any questions come up?",
    blocks: [
      HI,
      p("Just checking in to see how you're going with the split system quote, and whether any questions have come up {since_visit}."),
      p("A few that people usually ask:"),
      qa("How long does the install take?", "Back to back, with the indoor and outdoor units either side of the same wall, is 3 to 4 hours. A longer pipe run or an upstairs install can make it half a day."),
      qa("Does it really heat in winter?", "Yes. Modern reverse-cycle systems keep their full heating output down to around 2° and keep working well below that, and it costs less to run than gas."),
      qa("Where does the outdoor unit go?", "As close to the indoor unit as we can get it, somewhere it can breathe, and away from bedroom windows, yours and the neighbour's. We walk it with you before anything's drilled."),
      qa("Do I need an electrician as well?", "No. We do the electrical in the same visit, and take the old unit away."),
      { kind: "photo", src: "/email/hero-split.jpg", alt: "A wall split system we installed in a bedroom" },
      callMe("If anything else is on your mind,"),
      ...ANSWERS,
    ],
  },
  {
    name: "Our brands and our work",
    subject: "The brands we fit, and how we do the job",
    preheader: "Why we quote the brands we do.",
    blocks: [
      HI,
      p("Who puts it in matters as much as what goes in, so here's a bit about the brands we fit and how we do the work."),
      { kind: "list", items: [
        "**Mitsubishi Electric**: the brand we quote first, because of its reliability record across the systems we've put in. Its failure rate is under 1% across the range, and parts are still easy to get for units ten years old.",
        "**Kaden**: sold only through Reece, so parts are on the shelf in every store in Victoria, with a seven-year manufacturer warranty. Good value when you're doing a few rooms at once.",
      ] },
      { kind: "photo", src: "/email/split-roof.jpg", alt: "An outdoor unit we mounted on a roof bracket" },
      p("And how we do the job:"),
      { kind: "list", items: [...HOW_WE_WORK.slice(0, 2), "We size it room by room, not off a guess, then put dust sheets down, seal the holes and run the pipe neatly outside.", ...HOW_WE_WORK.slice(2)] },
      { kind: "stats", items: [
        { value: "Under 1%", label: "failure rate across the Mitsubishi Electric range" },
        { value: "6 years", label: "our workmanship warranty, on top" },
        RATING_STAT,
      ] },
      p("A customer in Cranbourne wrote on Google: “Bedroom Mitsubishi went in before lunch. Neat pipework, brackets straight, temp checked before they left.”"),
      callMe("If you'd like to talk through the options,"),
      ...ANSWERS,
    ],
  },
  {
    name: "What it costs to run",
    subject: "What a split system costs to run",
    preheader: "Why reverse-cycle is the cheap way to heat a room.",
    blocks: [
      HI,
      p("What it'll cost to run is the other thing people ask about, so here's how it works out."),
      p("A reverse-cycle split doesn't burn anything to make heat. It moves warmth from outside to inside, roughly three units of heat for every unit of electricity it uses. In summer it runs the other way and cools."),
      { kind: "stats", items: [
        { value: "About ⅓", label: "the running cost of gas heating, for the same warmth" },
        { value: "3×", label: "the heat out, for every unit of electricity in" },
        { value: "1 unit", label: "heats in winter and cools in summer" },
      ] },
      { kind: "list", items: [
        "**You heat the room you're in**, not the whole house, which is where most of the saving is.",
        "**If you've got solar**, warming the house up in the afternoon costs very little.",
        "**One unit does both seasons**, so there's no separate heater and cooler to service and replace.",
      ] },
      p("If you're replacing a gas or electric heater there's often a Victorian Energy Upgrades discount as well. Where your house qualifies, it's already off the quote, and we do the paperwork."),
      callMe("If you'd like me to go through the running costs for your place,"),
      ...ANSWERS,
    ],
  },
  { name: "The closer", ...closer("split system quote", "**If it's the price**, there's usually another way to do it: a different brand, a different size where it still suits the room, or doing the rooms in stages. I'm happy to put another option together for you.") },
];

const GENERAL: Step[] = [
  {
    name: "Checking in",
    subject: "Checking in on your quote",
    preheader: "Any questions come up?",
    blocks: [
      HI,
      p("Just checking in to see how you're going with the quote, and whether any questions have come up {since_visit}. If anything in it isn't clear, I'm happy to go through it."),
      callMe("Any questions at all,"),
      ...ANSWERS,
    ],
  },
  {
    name: "How we do the job",
    subject: "A bit about how we do the job",
    preheader: "Who comes out, and how we look after it.",
    blocks: [
      HI,
      p("Who does the work matters as much as the price, so here's a bit about us in case it helps."),
      { kind: "list", items: HOW_WE_WORK },
      { kind: "photo", src: "/email/hero-team.jpg", alt: "The Advanced Gas team with the vans outside our Pakenham workshop" },
      callMe("If you've got any questions about the quote,"),
      ...ANSWERS,
    ],
  },
  { name: "The closer", ...closer("quote", "**If it's the price**, there's often another way to do it, or to stage it. I'm happy to put another option together for you.") },
];

/** Days after the quote each standard email goes. */
export const STANDARD_DAYS: Record<QuoteKind, number[]> = { "heat-pump": [2, 5, 9, 14], split: [2, 5, 9, 14], general: [2, 6, 14] };
const STEPS: Record<QuoteKind, Step[]> = { "heat-pump": HEAT_PUMP, split: SPLIT, general: GENERAL };

/* -------------------------------------------------- after they say yes */

/**
 * How it runs from "yes" to done (Jake, 8 Nov: "an everything-taken-care-of
 * process"). No "you're booked in" email from us: ServiceTitan sends its own
 * booking confirmation, so the first step says one is coming.
 */
const NEXT_STEPS = [
  "**We'll give you a call** on {mobile|the number we have} within the next business day to pick an install day that suits you. Once it's in, you'll get a confirmation with the day and arrival time.",
  "**We order your {option|system}** and line up anything else the job needs, like the electrician, so it's all ready for the day.",
  "**On the day**, our own team does the work: the old unit goes, the new one's in and running, and we show you how it works before we leave. Most installs are done in the one day; if yours is bigger, we'll say so when we book it.",
  "**Afterwards**, we lodge any rebate paperwork for you and send through your compliance certificate and warranty details.",
];

type Other = Pick<EmailTemplate, "key" | "group" | "name" | "subject" | "preheader" | "blocks">;

const OTHERS: Other[] = [
  {
    key: "reply.yes", group: "reply", name: "They tapped “Let's go ahead”",
    subject: "Great news, {first}: here's what happens next",
    preheader: "Thanks for going ahead. We'll call you to pick a day, and here's how it runs from there.",
    blocks: [
      HI,
      p("Thanks for letting me know, that's great news. Here's how it runs from here, so you know what to expect:"),
      { kind: "list", items: NEXT_STEPS },
      p("Nothing you need to do for now. If anything comes up before then, give me a call on **{phone}** or just reply here."),
    ],
  },
  {
    key: "reply.question", group: "reply", name: "They tapped “I've got a question”",
    subject: "Got your question, {first}",
    preheader: "I'll give you a call to go through it.",
    blocks: [
      HI,
      p("Thanks, I've got your question."),
      p("“{note}”"),
      p("I'll give you a call on {mobile|the number we have} to go through it, usually within the business day. If it's quicker, give me a call on **{phone}**, or reply here with anything else you'd like to ask."),
    ],
  },
  {
    key: "reply.no", group: "reply", name: "They tapped “Not this time”",
    subject: "No worries, {first}",
    preheader: "Your quote's closed off, and that's the last email about it.",
    blocks: [
      HI,
      p("Thanks for letting me know, and no hard feelings at all. I've closed off your quote, so that's the last email about it from us."),
      p("If anything changes down the track, just reply here or give me a call on **{phone}**, and we'll pick it up where we left off."),
    ],
  },
  {
    key: "done.thanks", group: "done", name: "All done",
    subject: "All done, {first}: your {job|new system} and what's next",
    preheader: "A photo of the finished job, your warranty, and who to call.",
    blocks: [
      HI,
      p("Thanks for having us. {tech|The team} finished your {job|job} today, and here's how it looks:"),
      { kind: "jobphoto", alt: "The finished install", fallback: "/email/hero-team.jpg" },
      p("**Your warranty.** Six years' workmanship from us, on top of the manufacturer's warranty. Keep this email: it's your record of the day it went in."),
      p("**Your paperwork.** We'll send through your compliance certificate, and we lodge any rebate paperwork for you."),
      p("**Using it.** If anything about how it runs isn't clear, or something doesn't seem right, reply here or call **{phone}** and we'll sort it."),
    ],
  },
  {
    key: "invoice.first", group: "invoice", name: "3 days past due",
    subject: "A quick reminder about invoice {number}",
    preheader: "{amount} was due on {due}.",
    blocks: [
      HI,
      p("Just a friendly reminder that invoice {number} for **{amount}** was due on {due}. If it's already on its way, thank you, and please ignore this."),
      p("You can pay using the details on the invoice. If anything on it doesn't look right, or you'd like to pay it in parts, reply here or call **{phone}** and we'll work it out."),
    ],
  },
  {
    key: "invoice.second", group: "invoice", name: "10 days past due",
    subject: "Invoice {number} is now overdue",
    preheader: "{amount}, due {due}. Can we help sort it?",
    blocks: [
      HI,
      p("Invoice {number} for **{amount}** was due on {due}, and we haven't seen a payment yet. If it's gone through in the last few days, thank you, and please ignore this."),
      p("If something's holding it up, a question about the work, the amount or the timing, reply here or call **{phone}**. We're happy to help."),
    ],
  },
  {
    key: "service.reminder", group: "service", name: "Time for a service",
    subject: "Time for a service, {first}?",
    preheader: "It's almost a year since we were out.",
    blocks: [
      HI,
      p("It's almost a year since we were out for your {job|last job} in {when|the past year}, so we wanted to check in before the busy season."),
      p("A yearly service keeps it running efficiently and catches small problems before they turn into a breakdown."),
      p("If you'd like one booked in, reply with a couple of days that suit or give us a call on **{phone}**."),
    ],
  },
  {
    key: "sold.thanks", group: "sold", name: "Thanks for going ahead",
    subject: "Thanks for going ahead, {first}: here's what happens next",
    preheader: "We'll call you to pick a day. Here's how it runs from there.",
    blocks: [
      HI,
      p("Thanks for going ahead with the {option|work}. Here's how it runs from here, so you know what to expect:"),
      { kind: "list", items: NEXT_STEPS },
      p("Nothing you need to do for now. If anything comes up before then, give me a call on **{phone}** or just reply here."),
    ],
  },
  {
    key: "sold.pickaday", group: "sold", name: "Sold, nothing booked after 5 days",
    subject: "Let's get your {option|job} booked in, {first}",
    preheader: "A couple of days that suit, and we'll lock it in.",
    blocks: [
      HI,
      p("Thanks again for going ahead with the {option|work}. I just wanted to get a day locked in for you."),
      p("If you reply with a couple of days that suit, or give me a call on **{phone}**, we'll book it in and order everything so it's ready to go."),
      p("If you'd rather wait for a particular week, that's fine too. Just let me know and I'll pencil it in."),
    ],
  },
];

/* ------------------------------------------------------------- the list */

export const followUpKey = (kind: QuoteKind, step: number) => `followup.${kind}.${step}`;

export const BUILT_IN: EmailTemplate[] = [
  ...(Object.keys(STEPS) as QuoteKind[]).flatMap((kind) => STEPS[kind].map((s, n): EmailTemplate => ({
    key: followUpKey(kind, n + 1), group: "followup", series: kind, day: STANDARD_DAYS[kind][n], active: true, signer: "quoter", builtIn: true, ...s,
  }))),
  // Money and service reminders come from the office, not a person: they aren't anyone's quote.
  ...OTHERS.map((o): EmailTemplate => ({ ...o, series: null, day: null, active: true, signer: o.group === "invoice" || o.group === "service" ? "team" : "quoter", builtIn: true })),
];

export const builtIn = (key: string): EmailTemplate | null => BUILT_IN.find((t) => t.key === key) ?? null;

/** A key the page may address: a standard one, or an email added to a series ("followup.split.x3f9a1c"). */
export const KEY = /^(followup\.(heat-pump|split|general)\.(\d|x[0-9a-f]{6})|reply\.(yes|question|no)|sold\.(thanks|pickaday)|done\.thanks|invoice\.(first|second)|service\.reminder)$/;

/** What a new email added to a series starts as. */
export function starter(kind: QuoteKind, key: string, day: number): EmailTemplate {
  return {
    key, group: "followup", series: kind, day, active: true, signer: "quoter", builtIn: false,
    name: `Day ${day}`,
    subject: "",
    preheader: "",
    blocks: [HI, p("Write the email here."), callMe("If you've got any questions,"), ...ANSWERS],
  };
}

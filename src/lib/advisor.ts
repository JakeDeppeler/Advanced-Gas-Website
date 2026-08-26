/**
 * "Which one should I actually get?" — the three-question box that sits
 * inside "Is it right for you" on every service.
 *
 * Data rather than code, because the questions are completely different
 * per service. Aircon is about rooms and roof space. Hot water is about
 * how many people shower and what's on the wall now. Gas is about what
 * has actually gone wrong. A single generic set of questions would be
 * useless on all four.
 *
 * Every answer points at a page we already have, and several of them
 * deliberately point away from the page being read — somebody on the
 * split page who wants the whole house done should end up at ducted.
 * The recommendation is allowed to be "ring us", and on the repair
 * questions it is allowed to be "replace it, not repair it".
 */

export type AdvisorOption = { id: string; label: string; sub?: string };
export type AdvisorQuestion = { id: string; ask: string; options: AdvisorOption[] };
export type AdvisorAnswer = {
  heading: string;
  body: string;
  href: string;
  cta: string;
  note?: string;
};

export type AdvisorConfig = {
  lede: string;
  questions: [AdvisorQuestion, AdvisorQuestion, AdvisorQuestion];
  /** Keyed "a|b|c" on the three option ids, or a prefix with * wildcards.
   *  First match wins, so put the specific rules above the general ones. */
  rules: { when: [string | null, string | null, string | null]; answer: AdvisorAnswer }[];
  fallback: AdvisorAnswer;
};

const AIRCON: AdvisorConfig = {
  lede: "How many rooms, what's above the ceiling, and what's there now.",
  questions: [
    {
      id: "rooms",
      ask: "How many rooms do you want done?",
      options: [
        { id: "one", label: "One room", sub: "A bedroom, the living room, a study" },
        { id: "few", label: "Two or three", sub: "A couple of bedrooms, or living plus one" },
        { id: "most", label: "Most of the house", sub: "Every bedroom and the living areas" },
      ],
    },
    {
      id: "roof",
      ask: "Is there roof space above the ceiling?",
      options: [
        { id: "yes", label: "Yes, there's room up there" },
        { id: "no", label: "No — flat roof, or it's too tight" },
        { id: "unsure", label: "Not sure" },
      ],
    },
    {
      id: "now",
      ask: "What's there now?",
      options: [
        { id: "nothing", label: "Nothing at all" },
        { id: "split", label: "An old split or two" },
        { id: "ducted", label: "Ducted that's failed" },
        { id: "gas", label: "Gas ducted, no cooling" },
      ],
    },
  ],
  rules: [
    {
      when: ["one", null, null],
      answer: {
        heading: "A split system.",
        body:
          "One room, one head, one outdoor unit. Cheapest to buy, cheapest to run, quickest to get in — most go in back-to-back in a single morning. Nothing else we fit beats it for a single room.",
        href: "/services/air-conditioning-installation/split",
        cta: "Split system installation",
      },
    },
    {
      when: ["few", "no", null],
      answer: {
        heading: "A multi-head.",
        body:
          "Two or three rooms with no roof space to run ducts through: one outdoor unit, a head in each room, each on its own control. Tidier outside than two or three separate splits, and it only takes one spot on the wall.",
        href: "/services/air-conditioning-installation/multi",
        cta: "Multi-head installation",
      },
    },
    {
      when: ["few", null, null],
      answer: {
        heading: "Multi-head, probably — but ask about ducted.",
        body:
          "For two or three rooms a multi-head is usually the answer. With roof space available though, the gap to a small ducted system is often smaller than people expect, and ducted disappears into the ceiling instead of putting a head on three walls.",
        href: "/services/air-conditioning-installation/multi",
        cta: "Multi-head installation",
        note: "We'll price both if you'd like to see the difference in writing.",
      },
    },
    {
      when: ["most", "no", null],
      answer: {
        heading: "A multi-head, in stages.",
        body:
          "Ducted needs somewhere to run the ducts and without roof space that's off the table. A five-port multi-head covers most homes, and it can go in a room at a time as the budget allows.",
        href: "/services/air-conditioning-installation/multi",
        cta: "Multi-head installation",
        note: "Flat roof or a concrete ceiling? Ring us — there are bulkhead options and they depend entirely on the house.",
      },
    },
    {
      when: ["most", null, "gas"],
      answer: {
        heading: "Ducted reverse-cycle.",
        body:
          "The ducts are already in the roof for the gas heater. Replacing the lot with ducted reverse-cycle reuses much of that run, does your cooling as well as your heating, and ends a gas bill. It's the most common upgrade we do in this corridor.",
        href: "/services/air-conditioning-installation/ducted",
        cta: "Ducted installation",
      },
    },
    {
      when: ["most", null, "ducted"],
      answer: {
        heading: "Ducted, like for like.",
        body:
          "A failed ducted unit is usually a straight swap that reuses the existing ductwork and drops, which keeps it well below the cost of a fresh install. Worth checking what actually failed first — sometimes it's the board, not the unit.",
        href: "/services/air-conditioning-installation/ducted",
        cta: "Ducted installation",
        note: "If it's under ten years old, get it looked at before you replace it.",
      },
    },
    {
      when: ["most", null, null],
      answer: {
        heading: "Ducted.",
        body:
          "Whole-house cooling and heating from one system, zoned so you only condition the rooms you're in. Nothing on a wall in any room, and one unit to service rather than five.",
        href: "/services/air-conditioning-installation/ducted",
        cta: "Ducted installation",
      },
    },
  ],
  fallback: {
    heading: "Ring us on this one.",
    body: "That combination depends on the house more than on the answers, and a two-minute conversation will get you further than another dropdown.",
    href: "/quote",
    cta: "Get a quote",
  },
};

const HOT_WATER: AdvisorConfig = {
  lede: "How many of you there are, what's there now, and where it lives.",
  questions: [
    {
      id: "people",
      ask: "How many people in the house?",
      options: [
        { id: "small", label: "One or two", sub: "A couple, or a single" },
        { id: "family", label: "Three or four", sub: "The usual family" },
        { id: "big", label: "Five or more", sub: "Or teenagers who shower forever" },
      ],
    },
    {
      id: "now",
      ask: "What's there now?",
      options: [
        { id: "gas", label: "Gas storage tank" },
        { id: "electric", label: "Electric storage tank" },
        { id: "flow", label: "Gas continuous flow" },
        { id: "dead", label: "It's dead right now" },
      ],
    },
    {
      id: "space",
      ask: "Where does it go?",
      options: [
        { id: "outside", label: "Outside wall, plenty of room" },
        { id: "tight", label: "Tight spot or a side passage" },
        { id: "solar", label: "Outside, and there's solar on the roof" },
      ],
    },
  ],
  rules: [
    {
      when: [null, "dead", null],
      answer: {
        heading: "Hire a unit first, then choose properly.",
        body:
          "A dead tank turns a four thousand dollar decision into an ultimatum with cold showers as the deadline, and that is how people end up with the wrong system. Thirty dollars a day buys the house hot water tonight and you the time to compare properly.",
        href: "/services/gas-plumbing/temporary-hot-water",
        cta: "Temporary hot water hire",
        note: "The $350 set-up is waived if we end up doing the replacement.",
      },
    },
    {
      when: [null, null, "solar"],
      answer: {
        heading: "A heat pump, with the PV diverter.",
        body:
          "Solar on the roof changes the maths completely: a heat pump timed to run in the middle of the day is heating your water on power you were exporting for a few cents. Reclaim's PV-diverter kit fires the compressor on surplus, which is as close to free hot water as this gets.",
        href: "/services/heat-pump-installation",
        cta: "Heat pump installation",
      },
    },
    {
      when: ["big", null, null],
      answer: {
        heading: "A heat pump, and size it up.",
        body:
          "Five or more people is where recovery rate starts to matter more than tank size — you want it making hot water again fast, not just holding a lot of it. Reclaim's CO₂ split holds its output on a cold morning, which is exactly when a big household runs the tank down.",
        href: "/services/heat-pump-installation",
        cta: "Heat pump installation",
        note: "Up to $2,700 off with the VEU rebate, applied at the quote.",
      },
    },
    {
      when: [null, "electric", null],
      answer: {
        heading: "A heat pump, easily.",
        body:
          "Swapping electric resistance for a heat pump is the biggest running-cost drop available on this site — roughly a third to a quarter of the power for the same hot water. It's also where the VEU rebate is worth the most, because the thing you're replacing is the worst.",
        href: "/services/heat-pump-installation",
        cta: "Heat pump installation",
        note: "Up to $2,700 off with the VEU rebate, applied at the quote.",
      },
    },
    {
      when: [null, null, "tight"],
      answer: {
        heading: "Continuous flow, or an all-in-one heat pump.",
        body:
          "A tight spot rules out a split heat pump, which needs a compressor outside with air around it. Gas continuous flow is the smallest thing on the wall; an all-in-one heat pump is bigger but has nothing separate to place.",
        href: "/services/gas-plumbing/continuous-flow",
        cta: "Gas continuous flow",
        note: "Send us a photo of the spot and we'll tell you what fits.",
      },
    },
  ],
  fallback: {
    heading: "A heat pump, most likely.",
    body:
      "For most households in this corridor a heat pump is the right answer on running cost, and the VEU rebate takes a serious bite out of the install. Where it isn't — a tight spot, or no rebate eligibility — we'll say so.",
    href: "/services/heat-pump-installation",
    cta: "Heat pump installation",
  },
};

const GAS: AdvisorConfig = {
  lede: "What's gone wrong, how old it is, and how urgent it is.",
  questions: [
    {
      id: "what",
      ask: "What's the job?",
      options: [
        { id: "heater", label: "Ducted heater trouble" },
        { id: "hotwater", label: "Hot water trouble" },
        { id: "leak", label: "I can smell gas" },
        { id: "appliance", label: "Connecting an appliance" },
      ],
    },
    {
      id: "age",
      ask: "How old is it?",
      options: [
        { id: "new", label: "Under 10 years" },
        { id: "old", label: "Over 10 years" },
        { id: "unknown", label: "No idea — it came with the house" },
      ],
    },
    {
      id: "when",
      ask: "How urgent?",
      options: [
        { id: "now", label: "Today — no heat or no hot water" },
        { id: "soon", label: "This week" },
        { id: "planning", label: "Just planning ahead" },
      ],
    },
  ],
  rules: [
    {
      when: ["leak", null, null],
      answer: {
        heading: "Stop reading and ring us.",
        body:
          "A gas smell is the one thing on this site that does not belong in a form. Turn the gas off at the meter if you can get to it safely, open the windows, and call. We're on for gas leaks around the clock.",
        href: "/contact#emergency",
        cta: "24/7 emergency call-out",
        note: "If anyone feels unwell, leave the house first and ring from outside.",
      },
    },
    {
      when: ["heater", "old", null],
      answer: {
        heading: "Get it CO tested, then price the replacement.",
        body:
          "Over ten years old, the honest sequence is a carbon monoxide test first — that's a safety question, not a sales one — and then a replacement price so you can decide with numbers in front of you rather than in a cold house in June.",
        href: "/services/gas-plumbing/gas-service",
        cta: "Gas heater service & CO test",
        note: "A ducted swap reuses the existing ducts and drops, which keeps it well under a fresh install.",
      },
    },
    {
      when: ["heater", null, null],
      answer: {
        heading: "A service and a CO test.",
        body:
          "Under ten years old, most ducted heater faults are a component rather than the heat exchanger, and a service usually finds it. Every gas heater we touch gets a carbon monoxide test whether you asked for one or not.",
        href: "/services/gas-plumbing/gas-service",
        cta: "Gas heater service & CO test",
      },
    },
    {
      when: ["hotwater", null, "now"],
      answer: {
        heading: "Hire a unit while you decide.",
        body:
          "No hot water today and a replacement that can't happen today is exactly what the hire is for. It plumbs into the existing line so the whole house works normally, and you get to choose the replacement at a normal pace.",
        href: "/services/gas-plumbing/temporary-hot-water",
        cta: "Temporary hot water hire",
      },
    },
    {
      when: ["hotwater", null, null],
      answer: {
        heading: "Look at a heat pump before you replace like for like.",
        body:
          "If the gas unit is on its way out, the VEU rebate makes a heat pump cheaper to install than most people expect and a lot cheaper to run. Worth a comparison before you put another gas one in out of habit.",
        href: "/services/heat-pump-installation",
        cta: "Heat pump installation",
      },
    },
    {
      when: ["appliance", null, null],
      answer: {
        heading: "A gas fitting job, from $349.",
        body:
          "Connection, pressure test and a compliance certificate. If the existing line won't carry the appliance we'll tell you at the quote rather than on the day, because a new main run is the thing that changes the number.",
        href: "/services/gas-plumbing",
        cta: "Gas fitting & leak detection",
      },
    },
  ],
  fallback: {
    heading: "Tell us what you've noticed.",
    body: "Gas work covers a lot of ground and the symptom is the useful part. Send it through and you'll get a straight answer about what it needs.",
    href: "/quote",
    cta: "Get a quote",
  },
};

const SERVICING: AdvisorConfig = {
  lede: "What it's doing, how old it is, and whether it's still under warranty.",
  questions: [
    {
      id: "symptom",
      ask: "What's it doing?",
      options: [
        { id: "nocool", label: "Not cooling or heating" },
        { id: "noise", label: "Noisy" },
        { id: "water", label: "Dripping water inside" },
        { id: "smell", label: "Smells musty" },
      ],
    },
    {
      id: "age",
      ask: "How old is it?",
      options: [
        { id: "new", label: "Under 5 years" },
        { id: "mid", label: "5 to 10 years" },
        { id: "old", label: "Over 10 years" },
      ],
    },
    {
      id: "serviced",
      ask: "When was it last serviced?",
      options: [
        { id: "recent", label: "Within the last year" },
        { id: "long", label: "Years ago" },
        { id: "never", label: "Never" },
      ],
    },
  ],
  rules: [
    {
      when: ["nocool", "old", null],
      answer: {
        heading: "Get it diagnosed before you spend anything.",
        body:
          "Over ten years old and not cooling, the question isn't what the repair costs — it's whether the repair is worth it. We diagnose for a fixed fee and tell you which side of that line you're on, including when the answer is replace it.",
        href: "/upgrade-or-repair",
        cta: "Repair or replace?",
        note: "A ten-year-old system on old refrigerant can cost more to re-gas than it's worth.",
      },
    },
    {
      when: ["nocool", null, null],
      answer: {
        heading: "A diagnosis, then a repair.",
        body:
          "Not cooling on a unit this age is usually a fixable fault — a capacitor, a board, a sensor, or a genuine refrigerant leak. We find the leak rather than topping it up and sending you an invoice every summer.",
        href: "/services/aircon-servicing-repairs",
        cta: "Aircon service & repair",
      },
    },
    {
      when: ["smell", null, null],
      answer: {
        heading: "A proper coil clean.",
        body:
          "Musty smell is biological growth on the indoor coil and in the drain tray. It needs the unit pulled apart and washed, not wiped over with a cloth — which is the difference between a real service and a quick look.",
        href: "/services/aircon-servicing-repairs",
        cta: "Aircon service & repair",
      },
    },
    {
      when: ["water", null, null],
      answer: {
        heading: "A blocked drain, most likely.",
        body:
          "Water dripping from an indoor head is almost always a blocked condensate drain, and it's a same-visit fix. Worth doing quickly — the water has to go somewhere and plasterboard is expensive.",
        href: "/services/aircon-servicing-repairs",
        cta: "Aircon service & repair",
        note: "Turn it off in the meantime so it stops making water.",
      },
    },
    {
      when: ["noise", "old", null],
      answer: {
        heading: "Worth a look, but know the odds.",
        body:
          "New noise on an old outdoor unit is often the fan bearing or the compressor itself. The first is a repair; the second usually isn't worth it. We'll tell you which before you commit to anything.",
        href: "/upgrade-or-repair",
        cta: "Repair or replace?",
      },
    },
  ],
  fallback: {
    heading: "A service will find it.",
    body:
      "Most of what people ring about turns up in a proper service — a clean, a pressure check and a look at the electricals. If it's something bigger you'll know the number before we touch it.",
    href: "/services/aircon-servicing-repairs",
    cta: "Aircon service & repair",
  },
};

export const ADVISORS: Record<string, AdvisorConfig> = {
  "air-conditioning-installation": AIRCON,
  "heat-pump-installation": HOT_WATER,
  "gas-plumbing": GAS,
  "aircon-servicing-repairs": SERVICING,
};

/** First rule whose non-null slots all match. */
export function resolveAdvice(cfg: AdvisorConfig, picked: (string | null)[]): AdvisorAnswer | null {
  if (picked.some((p) => !p)) return null;
  for (const r of cfg.rules) {
    if (r.when.every((w, i) => w === null || w === picked[i])) return r.answer;
  }
  return cfg.fallback;
}

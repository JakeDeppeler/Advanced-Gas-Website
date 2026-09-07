/**
 * Processes & Procedures — the working manual, as agreed at the team training
 * day. Version 1.0, FY26.
 *
 * Kept as data rather than prose so a procedure reads the same on a phone in a
 * driveway as it does on the factory wall, and so a change lands everywhere at
 * once. The document says it plainly: none of it is finished, and if a
 * procedure doesn't work on the job it changes — see C6.
 */

export type SopMeta = { k: string; v: string };

export type SopBlock =
  | { kind: "steps"; title?: string; items: string[] }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "table"; title?: string; head: string[]; rows: string[][] }
  | { kind: "note"; title?: string; body: string; tone?: "plain" | "warn" };

export type Sop = {
  code: string;
  slug: string;
  title: string;
  meta: SopMeta[];
  blocks: SopBlock[];
  /** Where in the portal this procedure is actually carried out. */
  doIt?: { href: string; label: string };
};

export type SopSection = {
  letter: string;
  slug: string;
  title: string;
  blurb: string;
  draft?: string;
  sops: Sop[];
};

export const SOP_INTRO = [
  "This is the working version of how we do things. Every procedure here was agreed at the team training day and applies to everyone, from the director to the first-year apprentice.",
  "None of it is finished. If a procedure does not work on the job, say so and bring the fix with it — see C6. When it changes, it changes for every van, and you will be told what changed and why.",
];

export const SOP_VERSION = "Version 1.1 · FY26";

/**
 * C6 says a change gets told to everyone, with what changed and why. This is
 * that record — newest first.
 */
export const SOP_CHANGES: { on: string; what: string }[] = [
  {
    on: "Version 1.1",
    what: "A1 moved from a daily 6:50am check to a weekly one on Monday morning, and the stock count in A4 moved with it. The monthly condition check in A3 is now admin's, done with photos, rather than the whole team together. All three are done in the portal on the van you are signed to.",
  },
];

export const SOPS: SopSection[] = [
  {
    letter: "A", slug: "daily-rhythm", title: "The daily rhythm",
    blurb: "The checks that start and end the day, and how a van stays stocked.",
    sops: [
      {
        code: "A1", slug: "weekly-van-check", title: "The weekly van check",
        doIt: { href: "/portal/vehicles", label: "Do this check" },
        meta: [
          { k: "Who", v: "Every tradesman and apprentice, on the van they are signed to" },
          { k: "When", v: "Monday morning, before leaving the factory" },
          { k: "Takes", v: "Ten minutes" },
          { k: "Record", v: "In the portal, on your van — Vehicles → your van → Weekly" },
        ],
        blocks: [
          { kind: "note", title: "Purpose", body: "A van that leaves short costs an hour and a customer. This check catches it on the Monday, while the factory is still open and there is a week to put it right." },
          { kind: "steps", title: "Steps", items: [
            "Count the stock against the van stock list. Do not go from memory.",
            "Anything at or under its minimum gets flagged to the office that morning.",
            "Review this week’s jobs. Know the scope, the gear and the access for each one.",
            "Load the materials for the week’s jobs.",
            "Check the tool bag is complete and back in the van.",
            "Check batteries are charged — drill, impact, test gear.",
            "Check gas bottles are chained, upright and in date.",
            "Check ladders and racking are secure.",
            "Confirm drop sheets, shoe covers and stickers are on board.",
            "Confirm the iPad is charged and logged in.",
          ] },
          { kind: "list", title: "What good looks like", items: [
            "You leave the factory knowing you will not need a supplier run this week.",
            "Anything short was flagged Monday morning, not discovered on site on Thursday.",
          ] },
          { kind: "note", title: "Escalation", body: "Anything missing, damaged or out of date goes to the office the same day. Do not work around it and do not fund it yourself." },
        ],
      },
      {
        code: "A2", slug: "before-you-leave", title: "Before you leave — the line-by-line check",
        meta: [
          { k: "Who", v: "Every tradesman and apprentice" },
          { k: "When", v: "Last ten minutes of every working day" },
          { k: "Takes", v: "Ten minutes" },
          { k: "Record", v: "Flagged shortages to Jake the same evening" },
        ],
        blocks: [
          { kind: "note", title: "Purpose", body: "Ten minutes tonight saves an hour tomorrow, and that hour comes out of your day." },
          { kind: "steps", title: "Steps", items: [
            "Open every one of tomorrow’s jobs. Scope, gear, access.",
            "Check the van against the list, item by item. Do not eyeball it.",
            "Pull anything short off the factory shelf tonight, while someone is still here.",
            "If the factory has not got it either, it goes to Jake tonight so it can be ordered.",
            "If you turned up short today, say so. It is not yours to hide.",
          ] },
          { kind: "note", title: "Then we look at why", body: "Every shortage gets a cause, not a culprit. Was it never on the list? Not reordered? Used and not flagged? We fix the cause." },
        ],
      },
      {
        code: "A3", slug: "monthly-condition-check", title: "The monthly van condition check",
        doIt: { href: "/portal/vehicles", label: "Do this check" },
        meta: [
          { k: "Who", v: "Admin, on each van" },
          { k: "When", v: "First week of the month" },
          { k: "Takes", v: "One hour" },
          { k: "Record", v: "In the portal — Vehicles → the van → Monthly, with photos" },
        ],
        blocks: [
          { kind: "note", title: "Purpose", body: "The weekly check covers stock and tools. This one covers the vehicle itself. Admin does it, with photos of the panels, the tyres and the km on the dash." },
          { kind: "steps", title: "Steps", items: [
            "Empty the van so the floor, shelves and every item can be seen.",
            "Clean anything dirty before it goes back in.",
            "Body and panels — dents, scratches, mirrors, lights.",
            "Tyres — tread, pressure including the spare, no sidewall damage.",
            "Fluids — oil, coolant, brake fluid, washer bottle.",
            "Service and rego — check the sticker and the logbook.",
            "Racking and shelving secure, gas bottle restraints sound.",
            "Fire extinguisher in date, first aid kit stocked, ladders undamaged.",
            "Harness and height gear in date and tagged. Test gear in calibration.",
            "Signage clean and undamaged. Van washed inside and out.",
          ] },
          { kind: "note", title: "Escalation", body: "Anything that fails goes on the sheet with an action and a name against it. Service and rego get flagged early, not the week they are due." },
        ],
      },
      {
        code: "A4", slug: "van-stock", title: "Van stock and restocking",
        doIt: { href: "/portal/vehicles", label: "Count the stock" },
        meta: [
          { k: "Who", v: "The tradesman who runs the van" },
          { k: "When", v: "Counted Monday with the weekly check, ordered as soon as it hits minimum" },
          { k: "Owner", v: "Jake — ordering and supplier runs" },
          { k: "Record", v: "Van stock list (factory wall and portal)" },
        ],
        blocks: [
          { kind: "list", title: "The rules", items: [
            "Every van carries the same list, so anyone can jump into any van and work.",
            "At or under the minimum, it gets ordered that day — not when it runs out mid-job.",
            "If you needed something that is not on the list, tell us. We will add it and keep it stocked.",
            "Never take stock from another van. That breaks someone else’s day. Ring Jake.",
            "Never buy stock out of your own pocket. The business buys it.",
            "The van is your responsibility — stock, tools, cleanliness and damage.",
          ] },
          { kind: "note", title: "Van setup", body: "Every van is fitted out to the same plan: same racking, same shelves, same spots. New vans are fitted to the plan and older vans are brought up to match. If the layout does not work on the job, say so and it changes in every van." },
        ],
      },
    ],
  },
  {
    letter: "B", slug: "on-the-job", title: "On the job",
    blurb: "From the knock on the door to the review before you leave.",
    sops: [
      {
        code: "B1", slug: "arriving", title: "Arriving at the customer’s door",
        meta: [{ k: "Who", v: "Whoever knocks — usually the tradesman" }, { k: "When", v: "Every job, every time" }],
        blocks: [
          { kind: "steps", title: "Steps", items: [
            "Be on site at the specified time. First job means exactly that time — not leaving the factory then.",
            "Park considerately. Do not block the driveway unless you need to.",
            "Phone away before you knock.",
            "Introduce yourself by name and by company.",
            "Protection down before anything else — drop sheets, shoe covers, a clear path in and out.",
            "Explain what you are about to do before you start doing it.",
          ] },
          { kind: "note", title: "What good looks like", body: "The customer knows who you are, what is happening and roughly how long it will take, before you pick up a tool." },
        ],
      },
      {
        code: "B2", slug: "job-conversation", title: "The job conversation",
        meta: [{ k: "Who", v: "The tradesman" }, { k: "When", v: "Every job where a decision or a price is involved" }],
        blocks: [
          { kind: "steps", title: "The four steps", items: [
            "Listen. Let them tell you the whole story before you answer.",
            "Diagnose. Find the real problem before you reach for a price.",
            "Explain. In plain words, no jargon — what it is, why it happened, what it means.",
            "Options. Give three, priced properly, and let them choose.",
          ] },
          { kind: "list", title: "Never", items: [
            "Never invent a price. If you do not know, find out.",
            "Never price a scope change on the spot without the office — it gets priced before it gets built.",
            "Apprentices do not discuss diagnosis, timing or price. Hand those questions to the tradesman.",
          ] },
        ],
      },
      {
        code: "B3", slug: "presenting-options", title: "Presenting options",
        doIt: { href: "/portal/job-calculator", label: "Price it up" },
        meta: [{ k: "Who", v: "The tradesman" }, { k: "When", v: "Every job — target is options presented on 95%+ of jobs" }],
        blocks: [
          { kind: "steps", title: "How it works", items: [
            "Build three options — good, better, best — on the iPad.",
            "Present from the bottom up, so the cheapest is heard first.",
            "Explain what changes between them, not just what costs more.",
            "Lead with Mitsubishi Electric and say why: better unit, backed properly, fewer callbacks.",
            "Stop talking. Let them choose.",
          ] },
          { kind: "note", title: "The line that matters", body: "We just give options. They decide. We never choose for them." },
        ],
      },
      {
        code: "B4", slug: "price-pushback", title: "Handling price pushback",
        meta: [{ k: "Who", v: "The tradesman" }, { k: "When", v: "Any time price becomes the objection" }],
        blocks: [
          { kind: "list", title: "Treat it as a question, not a no", items: [
            "“How long will it take?” — give a real answer, not an optimistic one.",
            "“Will it be messy?” — show the drop sheets before they ask.",
            "“Can you do it today?” — only promise what the schedule can do. Ring the office.",
            "“Do I need compliance?” — if it is gas or electrical, yes, and we handle it. Say it with confidence.",
            "“Why is it cheaper online?” — online is a box on a pallet. We are the install, the warranty and the callback.",
          ] },
          { kind: "list", title: "Two lines that win people over", items: [
            "“Even if you do not go with us, send your other quote through and I will make sure you are not being ripped off.”",
            "“If we were the same price, who would you pick?” Then the conversation is about value, not price.",
          ] },
          { kind: "note", body: "Never run the competition down. Explain what we do differently and let them draw their own conclusion." },
        ],
      },
      {
        code: "B5", slug: "checking-the-house", title: "Checking the rest of the house",
        meta: [{ k: "Who", v: "Everyone, on every visit" }, { k: "When", v: "Every job, whatever you were called out for" }],
        blocks: [
          { kind: "steps", title: "Steps", items: [
            "Take two minutes to look at the hot water unit, the meter, the switchboard and the outdoor unit.",
            "Photograph what you find — make, model, age, condition.",
            "Put our sticker on every unit you touch or inspect.",
            "Log it on the customer record in ServiceTitan, not in your head.",
            "Tell them what you saw, even if it is fine. No pressure, just the heads-up.",
          ] },
          { kind: "note", title: "The gas line test", body: "If they mention a high gas bill, offer a free gas line test. It finds leaks and sizing faults, and it leads to more work." },
          { kind: "list", title: "How to raise it naturally", items: [
            "“While I was in there I noticed the unit in the back is on its way out.”",
            "“Want me to throw a price on it while I am here?” Easy yes, no second trip.",
          ] },
        ],
      },
      {
        code: "B6", slug: "asking-for-the-review", title: "Asking for the review",
        meta: [
          { k: "Who", v: "Whoever did the job" },
          { k: "When", v: "Every completed job, on site, before you leave" },
          { k: "Reward", v: "$100 gift card each month to whoever brings in the most five-star reviews" },
        ],
        blocks: [
          { kind: "steps", title: "Steps", items: [
            "Ask while they are still happy and you are still standing there.",
            "“Rapt you are happy — would you mind leaving us a quick review?”",
            "Send the link then and there, or leave the card. Do not make them hunt for it.",
            "Ask on every happy job, not just the big ones.",
          ] },
          { kind: "note", title: "Why it matters", body: "More five-star reviews means more people call us, which means fuller vans, which means more reward for the team." },
        ],
      },
      {
        code: "B7", slug: "unhappy-customer", title: "When a customer is not happy",
        meta: [
          { k: "Who", v: "Whoever is on site" },
          { k: "When", v: "The moment it happens" },
          { k: "Owner", v: "Dean — owns the resolution" },
        ],
        blocks: [
          { kind: "steps", title: "Steps", items: [
            "Do not argue on the doorstep, even when you are right.",
            "Let them finish. Most of it is wanting to be listened to.",
            "Own our end of it. “That is not good enough and I am sorry.”",
            "Never blame the office, another tech or the supplier. To the customer it is all us.",
            "Ring Dean while you are still on site. Do not drive away and hope.",
            "Do not promise money, refunds or free work. That is Dean’s call.",
            "Log it the same day, in your words, while you remember the detail.",
          ] },
          { kind: "note", body: "Most unhappy customers stay if it is fixed fast and honestly. The ones we lose are the ones who felt brushed off." },
        ],
      },
    ],
  },
  {
    letter: "C", slug: "standards", title: "Standards and conduct",
    blurb: "The ten standards, who to ring, and how we speak to each other.",
    sops: [
      {
        code: "C1", slug: "ten-standards", title: "The ten standards",
        meta: [{ k: "Who", v: "Everyone — director to first-year apprentice" }, { k: "When", v: "Always" }],
        blocks: [
          { kind: "note", body: "These do not move for a busy week." },
          { kind: "steps", items: [
            "The phone gets answered.",
            "Every job gets three options.",
            "We never invent a price.",
            "Scope changes get priced before they get built.",
            "Nobody works outside their licence.",
            "If it is not in ServiceTitan, it did not happen.",
            "Photos and forms on every job.",
            "We ask for the review.",
            "We coach the input, never the outcome.",
            "Safety wins every argument.",
          ] },
        ],
      },
      {
        code: "C2", slug: "who-to-contact", title: "Who to contact, and when",
        meta: [{ k: "Who", v: "Everyone" }, { k: "Principle", v: "Early is cheap, late is expensive" }],
        blocks: [
          { kind: "table", head: ["Situation", "Who you call"], rows: [
            ["Everyday tech question", "Jye — first call for day-to-day work on the tools"],
            ["Hard technical call", "Dean — anything Jye is not sure on, or you have not seen before"],
            ["Pricing, spec or scope", "Jake — priced before it is built, no verbal side deals"],
            ["Booking, late, sick, admin", "Kellie — as early as you know"],
            ["Parts, stock, supplier run", "Jake — never out of pocket, never off another van"],
            ["Unsafe or outside your licence", "Stop. Say no. Ring Dean. You will never be in trouble for that call"],
          ] },
          { kind: "note", body: "Pick whoever is closest to it. If it is not theirs, they will walk you to whoever owns it. Nobody minds being asked — what we mind is finding out on Friday that you were stuck on Tuesday." },
        ],
      },
      {
        code: "C3", slug: "how-we-speak", title: "How we speak to each other",
        meta: [{ k: "Who", v: "Everyone, including management" }, { k: "Applies", v: "In the van, on the phone, on site and in the group chat" }],
        blocks: [
          { kind: "list", title: "The rules", items: [
            "Read the room. It is not always a joke — the same line that is funny on a good day lands differently on a bad one.",
            "Think it through first. Have a crack before you ring, and come with what you have already tried.",
            "Ask when you do not know, but have two possible solutions before you get your answer.",
            "Disagree away from the customer — in the office or in the van, never in front of the homeowner.",
            "Never blame the office on site. We sort that internally, every time.",
          ] },
          { kind: "note", title: "This is not a schoolyard", tone: "warn", body: "Respect management and each other. We do not want to change the culture here, but the blame game and shit talk will not be tolerated. It will result in disciplinary action, up to and including termination of employment." },
          { kind: "note", body: "You can disagree with anyone here. Just do it straight, and do it in the right place." },
        ],
      },
      {
        code: "C4", slug: "feedback", title: "How feedback is given",
        meta: [{ k: "Who", v: "Whoever is giving it — usually Dean or the tradesman" }, { k: "Principle", v: "We are here to grow people, not put them down" }],
        blocks: [
          { kind: "list", title: "The rules", items: [
            "Advise, do not accuse. “Here is where it went wrong and here is how to do it next time.”",
            "In private, close to the day. One on one, never in front of the team or in the group chat.",
            "Be specific about the fix — the job, the step, and what good looks like.",
            "It goes both ways. Tell us where we are getting it wrong.",
          ] },
          { kind: "note", body: "Nobody gets it rubbed in their face. If you ever feel you were shown up rather than helped, say so — that one is on us to fix." },
        ],
      },
      {
        code: "C5", slug: "when-something-goes-wrong", title: "When something goes wrong",
        meta: [{ k: "Who", v: "Jake surfaces it, Dean owns the conversation" }, { k: "Where", v: "In the office, never in front of the team" }],
        blocks: [
          { kind: "list", title: "First we look at us", items: [
            "Did we train it? If you were never properly shown, that is on us.",
            "Did we give you the gear? Wrong tool, missing part, not enough time — that is a system problem.",
            "Was the standard clear? If it was never written down or shown to you, we cannot hold you to it.",
            "Did we set the job up right? Bad quote, wrong scope, incomplete info from the office — help us rectify it using your on-site experience so we overcome it together.",
          ] },
          { kind: "note", body: "We coach the input, never the outcome. Most problems are system problems, and we say so out loud when it was ours." },
        ],
      },
      {
        code: "C6", slug: "changing-a-process", title: "Changing a process that does not work",
        meta: [
          { k: "Who", v: "Anyone" },
          { k: "When", v: "The moment you find it — not at a review six months later" },
          { k: "Closed out", v: "At the Monday huddle" },
        ],
        blocks: [
          { kind: "steps", title: "How it works", items: [
            "Everything here is version one. If the job proves it wrong, it changes.",
            "Say it when you see it. Do not work around a bad process for months.",
            "Bring the fix with it. “This does not work” is a start; “and here is what would” is better.",
            "It gets raised at the Monday huddle and a decision comes back to you.",
            "If the fix is right it goes into every van and every job, not just yours.",
          ] },
          { kind: "note", body: "If the process set you up to fail, that is ours to fix. You will not wear it." },
        ],
      },
    ],
  },
  {
    letter: "D", slug: "people", title: "People and progression",
    blurb: "What is expected of you, and how you move up.",
    sops: [
      {
        code: "D1", slug: "apprentice-expectations", title: "Apprentice expectations",
        meta: [{ k: "Applies to", v: "All apprentices, bands 1–2" }, { k: "Reviewed", v: "Every four months with Dean" }],
        blocks: [
          { kind: "list", title: "Non-negotiable", items: [
            "Always with a tradesman. You may be left at a job at times, but always with supervision — by phone or FaceTime.",
            "Never work outside your licence. No gas, refrigerant or live electrical unsupervised. Say no and ring Dean.",
            "Ask, never guess. Every single time.",
            "Never talk price, timing or diagnosis — hand those to the tradesman.",
          ] },
          { kind: "list", title: "Expected of you", items: [
            "Stay a step ahead. Tool ready before it is asked for. Set up and pack up without being told.",
            "Do the school work. Trade school is part of the job, not time off.",
            "Back at base, stock the vans, pre-fab and prep tomorrow’s jobs. It counts and we notice.",
          ] },
        ],
      },
      {
        code: "D2", slug: "tradesman-expectations", title: "Tradesman expectations",
        meta: [{ k: "Applies to", v: "All tradesmen, band 3" }],
        blocks: [
          { kind: "list", items: [
            "You own the job — quote it, sell it, install it to code, finish it clean.",
            "You own the customer. You are the only one they meet.",
            "You own the apprentice — their safety, supervision and learning while they are in your van.",
            "You own the van — stock, tools, condition and cleanliness.",
            "Three options on every job, priced properly.",
            "Photos, forms and notes complete on the day.",
          ] },
          { kind: "note", body: "Whatever standard you work to is the standard your apprentice will think is normal." },
        ],
      },
      {
        code: "D3", slug: "the-bands", title: "The bands and how you move up",
        meta: [{ k: "Applies to", v: "Everyone on the tools" }, { k: "Rule", v: "Two consecutive quarters at target and the band moves" }],
        blocks: [
          { kind: "table", head: ["Band", "What you are doing", "What it takes to move up"], rows: [
            ["1 · Apprentice yr 1–2", "Learning. Second pair of hands. Never unsupervised on gas.", "Training plan on schedule, 100% safety"],
            ["2 · Apprentice yr 3–4", "Running simple installs under supervision. Basic diagnostics.", "Productivity at 85% of standard hours, modules on plan"],
            ["3 · Tradesman", "Your own van, your own jobs and customers, and an apprentice you are developing.", "Licence and ARC authorisation, plus consistently at target"],
          ] },
          { kind: "note", body: "Senior tradesman and leading hand come later, as the crews grow." },
        ],
      },
      {
        code: "D4", slug: "training-deal", title: "The training deal",
        meta: [{ k: "Applies to", v: "Apprentices" }, { k: "Review", v: "Every four months with Dean" }],
        blocks: [
          { kind: "list", title: "What the business puts in", items: [
            "Tickets and licences as you are ready — gas, ARC refrigerant handling, electrical.",
            "A tradesman beside you whose job is to teach, not just get through the day.",
            "A sit-down with Dean every four months on your training plan and where you are up to.",
            "The gear and the time to do the job properly, so you are never set up to fail.",
          ] },
          { kind: "list", title: "What you put in", items: [
            "Turn up on time, every day, ready to work.",
            "Turn up to trade school and pass the work. That part is only yours.",
            "Ask when you do not know — with two possible solutions ready.",
            "Take the feedback and change what you actually do on the next job.",
            "Say no and ring Dean if you are asked to do something you are not licensed for.",
          ] },
        ],
      },
    ],
  },
  {
    letter: "E", slug: "how-you-earn", title: "How you earn",
    blurb: "Base pay, what you earn on top, and the service plans.",
    draft: "Not final. Rates and mechanics are still to be confirmed with the IR adviser and the accountant, and the scheme starts once the price book is set up in ServiceTitan — within the next six months. Do not present these figures as settled.",
    sops: [
      {
        code: "E1", slug: "what-you-earn", title: "What you earn",
        meta: [
          { k: "Applies to", v: "Tradesmen" },
          { k: "Starts", v: "Within six months, once the ServiceTitan price book is live" },
          { k: "Status", v: "Draft — pending IR and accountant sign-off" },
        ],
        blocks: [
          { kind: "note", title: "Base pay", body: "Your hourly rate for the hours you work, set by your band. It never moves with a good or bad week and is never at risk." },
          { kind: "list", title: "Sell it, earn on it", items: [
            "Jobs under $5,000 — $50 to you",
            "Jobs $5,000 to $10,000 — $100 to you",
            "Jobs over $10,000 — $150 to you",
          ] },
          { kind: "list", title: "Sign them up, earn on it", items: [
            "An incentive on every service plan you sign — Comfort, Plus or Total Care.",
            "A payment on every replacement you tag that converts to a job.",
            "A payment on every heat pump conversion you bring in.",
          ] },
          { kind: "note", body: "Installing it well is not a bonus — that is the standard, and it is what base pay is for." },
        ],
      },
      {
        code: "E2", slug: "service-plans", title: "Service plans",
        meta: [{ k: "Who", v: "Everyone on the tools" }, { k: "When", v: "Every job, after the fix is agreed and before the invoice" }],
        blocks: [
          { kind: "table", head: ["Plan", "Price", "What they get"], rows: [
            ["Comfort", "$245/yr", "Single split or gas heater — 1 annual service, priority booking, 10% off repairs, no call-out fee"],
            ["Comfort Plus", "$385/yr", "Ducted — 1 service per system, priority booking, 15% off repairs, no call-out fee"],
            ["Total Care", "$595/yr", "Heating and cooling — pre-summer and pre-winter service, 20% off repairs, no call-out fee, emergency response"],
          ] },
          { kind: "note", body: "Memberships are not a discount scheme. They turn a one-off customer into someone who rings us for the next decade, and they fill the quiet months." },
        ],
      },
      {
        code: "E3", slug: "reviews-incentive", title: "Reviews incentive",
        meta: [{ k: "Who", v: "Everyone on the tools" }, { k: "When", v: "Announced at the Monday huddle, paid that week" }],
        blocks: [
          { kind: "list", items: [
            "$100 gift card each month to whoever generates the most five-star reviews.",
            "Five-star only. The review names the tech, so there is nothing to claim and nothing to argue about.",
            "Ask on every happy job, on site, before you leave.",
          ] },
        ],
      },
    ],
  },
];

export const findSection = (slug: string) => SOPS.find((s) => s.slug === slug) ?? null;
export const allSops = () => SOPS.flatMap((s) => s.sops.map((sop) => ({ section: s, sop })));

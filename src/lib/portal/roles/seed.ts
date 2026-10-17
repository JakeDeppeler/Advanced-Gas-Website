import type { Role } from "./types";

/**
 * Where the roles start: "Team Expectations & The Job, Start to Finish", the
 * document issued with ServiceTitan go-live (owner Jake Deppeler, approved by
 * Dean Winbanks). Edited on the Roles page after that; this is only what a
 * business with nothing saved begins with.
 */

/** Ten things we do not bend on. They apply to every seat. */
export const STANDARDS: string[] = [
  "The phone gets answered: within three rings, every time.",
  "Every job gets three options: written, priced, on the tablet, before you leave the driveway.",
  "We never invent a price: if it isn't in the pricebook, it gets rung through.",
  "Scope changes get priced before they get built: a variation is agreed in writing before work starts.",
  "Nobody works outside their licence: gas is certified by the licence holder; refrigerant needs ARC authorisation.",
  "If it isn't in ServiceTitan, it didn't happen: one system, used properly, by everyone.",
  "Photos and forms on every job: before, during, after, plus the commissioning checklist.",
  "We ask for the review: every customer, every job, before we leave.",
  "We coach the input, never the outcome: do the right things and the numbers follow.",
  "Safety wins every argument: anyone can stop a job on safety or licensing grounds and will be backed."
];

/** We can teach the trade. We can't teach how you turn up. */
export const ATTITUDE: string[] = [
  "Show up ready: on time, keen, phone down, here to work.",
  "Own it: mistakes happen. Own them, fix them, learn from them. No hiding.",
  "Team first: help the crew, share what you know, nobody carries dead weight.",
  "Good with people: customers, each other, suppliers. Respect goes a long way."
];

/** Our deal with you. This goes both ways. */
export const DEAL: string[] = [
  "We bring the training, the tools, a clear path, and the time to get you there.",
  "You bring the effort, the questions, and the will to learn.",
  "We back anyone who's genuinely having a go: that's who we invest in.",
  "Attitude and effort are on you. Everything else, we've got you."
];

export const SEED_ROLES: Role[] = [
  {
    "id": "apprentice-not-in-a-van",
    "name": "Apprentice (not in a van)",
    "tagline": "Year 1. Learn the trade and make yourself useful.",
    "reportsTo": "the tradesman or leading hand you're placed with, then the Field Manager",
    "growsInto": "Apprentice in a van",
    "manages": "",
    "intro": "Your first year is about turning up, paying attention and becoming genuinely useful around the yard and on jobs. Nobody expects you to know the trade yet, that's the whole point of an apprenticeship. What we judge is whether you're reliable, safe, prepared, and keen to learn. Get those right and you earn your spot on a van.",
    "day": [
      "In early: help load and prep gear, tools and stock for the crews heading out.",
      "Through the day: wherever you're placed: assist, carry, fetch, watch closely, ask why.",
      "Keep the yard and workshop tidy as you go: if you walk past mess, deal with it.",
      "End of day: tools cleaned and accounted for, gear away, logbook updated, ready for tomorrow."
    ],
    "owns": [
      "Being on time and ready to work, every day",
      "Keeping the yard, workshop and stock tidy",
      "Prepping and loading gear so crews aren't waiting",
      "Cleaning tools and accounting for them",
      "Your logbook: started day one and kept current",
      "PPE on and working safely, every task",
      "Asking when you don't know: then asking why",
      "Keeping your TAFE on track and turning up to it"
    ],
    "notOwns": [
      "Any gas or refrigerant work unsupervised, ever",
      "Any ARC refrigerant handling",
      "Quoting, pricing or talking price with a customer",
      "Telling a customer what's wrong with their system",
      "Deciding a job is finished or closing it in the app",
      "Working alone on site: always with a tradesman"
    ],
    "measured": [
      "Punctuality and reliability: the first thing we look at",
      "Attitude and willingness to learn",
      "Preparation: is the crew ever waiting on you",
      "Logbook up to date and TAFE progressing",
      "Safety: PPE, asking before guessing"
    ],
    "requires": [
      "Enrolled and progressing in your apprenticeship",
      "White card / construction induction",
      "Reliable transport to the yard",
      "PPE kept and worn",
      "The right attitude: this matters more than any skill at this stage"
    ],
    "moveUp": "You're reliable and safe, you know the van kit, you can prep and help on standard jobs confidently, and your TAFE is on track. Then you go on a van."
  },
  {
    "id": "apprentice-in-a-van",
    "name": "Apprentice (in a van)",
    "tagline": "The offsider. Make the crew faster while you learn the customer side.",
    "reportsTo": "the tradesman or leading hand on your crew, then the Field Manager",
    "growsInto": "Tradesman or Installer, once licensed",
    "manages": "",
    "intro": "Now you're on a van as the offsider. Your job is to make your tradesman faster and to keep learning, not just the trade, but how we talk to customers and run a clean job. A good apprentice who stays a step ahead of the tradesman is worth their weight. You do more of the hands-on work now, but always under supervision and always within what you're signed off for.",
    "day": [
      "6:50am van check with your tradesman, stock, tools, load for the day. Check the jobs so you know what's coming.",
      "On arrival: set up protection first: drop sheets, boot covers, a clear path in and out.",
      "Through the day: stay a step ahead. If your tradesman asks twice, you were behind. Run materials, prep, do the hands-on you're signed off for.",
      "Watch the customer conversation: how the options are presented and the handover is done. In a few years that's you.",
      "Pack-up: site cleaner than you found it, tools accounted for, rubbish gone. Help close the job in the app."
    ],
    "owns": [
      "Van ready and stocked, your own gear prepped",
      "Staging the job so the tradesman never waits",
      "Running materials and the hands-on tasks you're signed off for",
      "Protecting the home: boot covers, drop sheets",
      "Site tidiness and rubbish out",
      "Helping with photos and forms",
      "Keeping your logbook and TAFE on track",
      "Asking before you guess: every time"
    ],
    "notOwns": [
      "Still no gas or refrigerant work unsupervised, no ARC",
      "Quoting, pricing or the options conversation",
      "Signing or issuing a compliance certificate",
      "Deciding a job is finished or closing it",
      "Working alone on site"
    ],
    "measured": [
      "Readiness and prep: is the crew faster with you on it",
      "Signed-off tasks progressing: you can do more each month",
      "Punctuality and safety",
      "Logbook and TAFE on track",
      "How you handle yourself in front of customers"
    ],
    "requires": [
      "Progressing through your apprenticeship on schedule",
      "White card, PPE",
      "Signed off on the tasks you're doing: nothing beyond that",
      "Working knowledge of the van kit and the common jobs"
    ],
    "moveUp": "You've got your licence (gas and/or ARC as it applies), your work is consistently clean, and you can run a standard job start to finish. Then you move to Tradesman or Installer."
  },
  {
    "id": "installer",
    "name": "Installer",
    "tagline": "Get the system in: clean, fast and right the first time.",
    "reportsTo": "Field Manager, and the leading hand on the crew",
    "growsInto": "Leading Hand",
    "manages": "",
    "intro": "The Installer is built for output: getting systems in to a high standard, quickly and neatly, so the job is right the first time and never comes back. You work from the job pack the estimator and Field Manager have set up, the selling and quoting are already done, so you can focus entirely on a clean install. The difference between you and a Tradesman is that you don't carry the sell; your craft is the install itself.",
    "day": [
      "Van and job pack check: right equipment and the right configuration for today's installs.",
      "On site: set up protection, then install to the plan: brackets, pipework, drainage, electrical coordination.",
      "Keep it neat as you go: the finish is what the customer sees and what a photo shows.",
      "Commission and test before you leave. Nothing left half-done.",
      "Photos and forms in the app, site and van clean, rubbish gone."
    ],
    "owns": [
      "Installing to spec and standard: splits, multi-heads, ducted, changeovers",
      "Working from the job pack and install plan",
      "Quality and neatness: brackets, pipework, drainage, make good",
      "Coordinating with the electrician (Geoff/GT) on site",
      "Protecting the home: boot covers, drop sheets",
      "Commissioning and testing before you leave",
      "Clean site and clean van, all rubbish removed",
      "Photos, forms and the commissioning checklist",
      "Flagging variations to the Field Manager: never unpriced work",
      "Helping develop the apprentice on your crew"
    ],
    "notOwns": [
      "Quoting or selling: that's the tradesman / estimator",
      "Pricing or approving variations: Field Manager",
      "Changing the agreed scope on your own",
      "Any work outside your licence"
    ],
    "measured": [
      "Installs completed per day and per week",
      "Install quality: low rework and callbacks",
      "On-time completion to scope",
      "Safety and compliance to licence",
      "Photos, forms and commissioning complete every job",
      "Neatness: the job looks the part"
    ],
    "requires": [
      "Trade qualification relevant to install work",
      "ARC refrigerant handling authorisation",
      "Gas licence where doing gas work (or works under the licence holder)",
      "Confident on brazing, vac, commissioning",
      "Drivers licence; your own van kept to standard"
    ],
    "moveUp": "You consistently deliver clean installs fast, you can plan and lead a job, and you're bringing the apprentice along. Then you step up to Leading Hand."
  },
  {
    "id": "tradesman",
    "name": "Tradesman",
    "tagline": "Run your own van and own the job, front door to paid invoice.",
    "reportsTo": "Field Manager",
    "growsInto": "Leading Hand",
    "manages": "",
    "intro": "You run a van, and as far as the customer is concerned you are the whole business, they meet you and decide about Advanced Gas based on you. You own the job end to end: diagnose it right, tell the customer the truth, give them a real choice, do the work properly, and bring your apprentice along. You also set the quality standard on your own jobs; nobody checks them for you, so your name is on every one.",
    "day": [
      "6:45-6:50am, van check and load. Look at the day: jobs, addresses, history, equipment on file.",
      "Before each job: hit 'on my way' so the customer gets the automatic message.",
      "On arrival: park respectfully, introduce yourself, boot covers on, walk the scope before touching anything.",
      "Diagnose, photograph, explain on the tablet, present three options, do the work.",
      "Invoice and get paid on the day, ask for the review, close it out in the app.",
      "End of day: everything logged, photos and forms done, van restocked."
    ],
    "owns": [
      "Your van, your diary, the jobs assigned to you: start to finish",
      "Diagnosing correctly first time, or getting the answer from the team",
      "Three options on every job (Good, Better, Best)",
      "Explaining in plain English and showing photos",
      "Quoting and selling the work, compliant to your licence",
      "The quality standard on your own jobs",
      "Supervising and teaching the apprentice riding with you",
      "Photos, forms and commissioning every job",
      "The customer handover: they understand their system before you leave",
      "Asking for the review, every happy job",
      "Checking the rest of the house and flagging extra work",
      "Your van condition, stock and tools"
    ],
    "notOwns": [
      "Setting or changing prices outside the book",
      "Approving a variation beyond what's agreed",
      "Discounting to win a job",
      "Big commercial or design calls (Field Manager)",
      "Deciding a job is done when the paperwork isn't",
      "Working outside your licence, whoever asks"
    ],
    "measured": [
      "Billable utilisation (target 70%)",
      "Close rate (45%+)",
      "Average ticket",
      "Gross profit on your jobs",
      "Options presented: 100% of jobs",
      "Reviews generated",
      "Rework and callbacks: kept low"
    ],
    "requires": [
      "Full trade qualification",
      "Gas licence and/or ARC authorisation as the work requires",
      "Drivers licence; van kept clean, stocked, roadworthy",
      "Confident diagnosing and quoting on the tablet",
      "Can carry a customer conversation and present options well"
    ],
    "moveUp": "Your numbers are steady, your rework is low, customers ask for you by name, and you're mentoring well. Then you move to Leading Hand."
  },
  {
    "id": "leading-hand",
    "name": "Leading Hand",
    "tagline": "Run a crew and carry the quality. Still on the tools.",
    "reportsTo": "Field Manager",
    "growsInto": "Field Manager",
    "manages": "",
    "intro": "You're still on the tools, but you now carry more than your own van, you run a crew and you set the quality standard across the jobs you oversee. You take the tricky diagnostics, you're the first call when a job goes sideways, and you bring the apprentices and newer trades along. This is the proving ground for management: you're learning to be responsible for other people's work, not just your own.",
    "day": [
      "Brief your crew: confirm the plan, the allowed hours and anything unusual on each job.",
      "Through the day: run your own work, keep an eye on quality across the crew, take the hard diagnostics.",
      "First call when something goes sideways: sort it or escalate to the Field Manager.",
      "Mentor: show the apprentice why, not just what.",
      "End of day: your crew's jobs closed out to standard, tomorrow clear."
    ],
    "owns": [
      "Running your crew day to day",
      "Quality control on installs: the work leaving site is right",
      "The tricky diagnostics and the jobs that go sideways",
      "The pre-job walk and planning the harder jobs",
      "Mentoring apprentices and newer trades",
      "Backing up the Field Manager on the board",
      "Everything a tradesman owns, for yourself and your crew"
    ],
    "notOwns": [
      "Setting pay, hiring or firing",
      "The P&L",
      "Pricing strategy and the pricebook",
      "Signing off on things above your authority: escalate"
    ],
    "measured": [
      "Your crew's utilisation and gross profit",
      "Install quality and low rework across the crew",
      "Apprentices progressing under you",
      "Jobs completed on time and to scope",
      "How well problems get solved before they reach the Field Manager"
    ],
    "requires": [
      "Full trade qualification, gas and/or ARC as required",
      "Strong diagnostics across the systems we fit",
      "Able to plan a job and lead a crew",
      "Trusted to hold the quality standard for others"
    ],
    "moveUp": "Your crew consistently hits its numbers, apprentices are visibly developing under you, and you're starting to think about the whole operation, not just your crew. Then you move to Field Manager."
  },
  {
    "id": "office-manager",
    "name": "Office Manager",
    "tagline": "Run the office and the people, so the business runs day to day without an owner in the chair.",
    "reportsTo": "GM / Operations, then Directors",
    "growsInto": "Operations Manager",
    "manages": "Bookings, Accounts, Admin",
    "intro": "This is the seat that replaces the owner in the day-to-day running of the business. You own the office team and the whole back-of-house: the phones get answered, jobs get booked and dispatched, quotes get chased, invoices go out, money comes in, and the numbers are ready every week. When this seat is strong, the business runs whether or not Dean, Kellie or Jake are in the building. Your job is as much about running people and holding the standard as it is about admin.",
    "day": [
      "Open up: check overnight enquiries and bookings, make sure the phones are covered.",
      "Confirm the day's dispatch with the Field Manager: right crews on the right jobs.",
      "Through the day: watch the numbers, keep quotes followed up, chase money owed, solve what the team brings you.",
      "Keep ServiceTitan clean as the day runs: nothing dropped, nothing sitting.",
      "Close the day: invoices out, tomorrow set up, anything outstanding noted.",
      "Weekly: produce the scorecard, accurate and on time; support the Monday huddle; debtor review and chase.",
      "Monthly: payroll run clean; licences, insurances and rego checked current; compliance paperwork in order."
    ],
    "owns": [
      "The office team: bookings, accounts, admin, and holding them accountable",
      "Scheduling and dispatch, with the Field Manager",
      "The daily numbers and the weekly scorecard",
      "ServiceTitan kept clean and used by everyone",
      "Quotes followed up, jobs flowing, nothing dropped",
      "Invoicing out and money chased; bills in (Reece entered when invoiced, not on payment)",
      "Payroll, licences, insurances, rego and compliance tracking",
      "First port of call for the team's day-to-day issues"
    ],
    "notOwns": [
      "Strategy, big capital, ownership calls (Directors)",
      "Field work quality and technical calls (Field Manager)",
      "Pricing strategy (GM)"
    ],
    "measured": [
      "Phone answered in three rings, low missed calls",
      "Quote follow-up rate and speed",
      "Debtor days: money in on time",
      "Scorecard produced and accurate every week",
      "The office running without the owners stepping in"
    ],
    "requires": [
      "Strong admin and systems discipline: ServiceTitan and Xero",
      "Can run people and hold a standard, not just do tasks",
      "Accurate with numbers and money",
      "Calm under a busy phone and a full board",
      "Trusted with payroll and sensitive information"
    ],
    "moveUp": "The office runs without the owners touching it, the numbers are reliable, and the team runs smoothly under you. Then you move toward Operations Manager."
  },
  {
    "id": "field-manager",
    "name": "Field Manager",
    "tagline": "Own everything in a van and on site. Take the field off Dean.",
    "reportsTo": "GM / Operations, then Directors",
    "growsInto": "a strong Leading Hand ready to come mostly off the tools",
    "manages": "Leading Hands, Tradesmen, Installers and field apprentices",
    "intro": "You own everything that happens in a van and on site. Today this runs on Dean's instinct and memory, who's capable of what, which jobs need watching, what to do when one goes sideways. Your job turns that into a defined role so the field runs to standard whether or not an owner is on site. It's a working-manager seat: part on the tools for the hard jobs, mostly running the crews, the quality and the compliance.",
    "day": [
      "Start of day: check the board: who's on what, gaps, jobs at risk. Confirm every van rolled out stocked and briefed. Clear overnight issues with the Office Manager.",
      "Through the day: first contact when a job hits trouble: access, extra scope, a part needed, a difficult customer. Make the field call. Price and approve variations before the work. Spot-check quality. Take the hard diagnostics.",
      "End of day: jobs closed out, photos and forms done. Tomorrow's installs pre-checked: equipment, access, electrician booked.",
      "Weekly: run the install planning meeting (pre-flight every upcoming install: equipment, access, zones, electrician booked with Geoff, special requirements); walk the bigger jobs; one-on-ones with the leading hands; review the field numbers with the GM.",
      "Monthly: van condition and damage checks; apprentice development reviews; a toolbox/safety session; look ahead at capacity for the pipeline."
    ],
    "owns": [
      "Daily allocation and dispatch of crews, with the Office Manager",
      "Quality of all work leaving site",
      "Pre-job planning for installs: the pre-flight",
      "Variations: spotted, priced and approved before the work",
      "Technical escalation and the jobs going sideways",
      "Compliance on the tools: licence, gas, ARC, certs lodged",
      "Safety on site: SWMS/JSA, incident response",
      "Apprentice development: logbooks, sign-offs, training plan",
      "The van and stock standard, monthly condition checks",
      "Supplier and warranty coordination for field issues",
      "Running the weekly install planning meeting"
    ],
    "notOwns": [
      "Pay, hiring and firing (Office Manager / Directors)",
      "Pricing strategy and the pricebook (GM)",
      "Big capital and new business lines (Directors)"
    ],
    "measured": [
      "Field gross profit",
      "Install quality: low rework and callbacks",
      "On time, to scope",
      "Crew utilisation (target 70%)",
      "Variations captured, not given away",
      "Apprentices progressing on plan",
      "Safety: incidents and near misses logged and closed"
    ],
    "requires": [
      "Full trade background and strong diagnostics",
      "Gas and ARC understanding to judge compliance",
      "Can run and develop people, not just do the work",
      "Organised enough to run the board and the planning meeting",
      "Authority genuinely delegated: Dean has to let the field go",
      "Authority: can approve variations up to a set limit (suggested $300-$500); above that goes to the GM or Directors."
    ],
    "moveUp": "The field runs without Dean on the tools, quality and GP are on target, and apprentices are developing. This is a destination seat, and the path toward GM / Operations."
  },
  {
    "id": "service-manager",
    "name": "Service Manager",
    "tagline": "Own the service, maintenance and membership book: the steady, high-margin money.",
    "reportsTo": "GM / Operations",
    "growsInto": "",
    "manages": "Service techs",
    "intro": "While the Field Manager owns installs, you own the recurring side: service, maintenance, memberships and warranty. This is the most predictable and highest-margin revenue the business has, but only if someone owns filling that calendar and keeping customers coming back. Left to fit around installs, service always loses. Your whole job is to make sure it doesn't, and to turn every service visit into a relationship and often more work.",
    "day": [
      "Start of day: check the service board, service techs dispatched, the calendar full.",
      "Through the day: handle membership sign-ups and renewals, keep the reminder cycle moving, chase the gaps in the calendar.",
      "Turn completed service visits into follow-up work found and quoted.",
      "End of day: service jobs closed out, tomorrow's run set."
    ],
    "owns": [
      "The service and maintenance schedule, and keeping the calendar full",
      "The membership base: sign-ups, retention, delivering the service",
      "Warranty jobs and follow-ups",
      "Turning service visits into more work (check the rest of the house)",
      "Service team scheduling, kept separate from installs",
      "Service pricing, and every service job being profitable",
      "The reminder system so customers come back on cycle"
    ],
    "notOwns": [
      "Install crews (Field Manager)",
      "The P&L",
      "Big capital (Directors)"
    ],
    "measured": [
      "Service calendar utilisation",
      "Membership numbers: sign-ups and retention",
      "Service gross profit",
      "Extra work found per service visit",
      "Customer retention and repeat rate"
    ],
    "requires": [
      "Understanding of the service and maintenance work we do",
      "Organised scheduler who keeps a calendar full",
      "Good with customers and retention",
      "Can run a small team and a reminder system",
      "Comfortable with the numbers behind memberships"
    ],
    "moveUp": "A destination seat. As the service and membership base grows, this becomes one of the most valuable books in the business."
  }
];

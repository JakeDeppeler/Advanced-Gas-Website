import type { Leading } from "./types";

/**
 * Where Leading starts: drawn from what each seat owns and doesn't on Roles
 * (the expectations document), sorted into the three bands. A draft for the
 * owner to change and publish; nobody else sees it before then. The spending
 * limits are left unset on purpose: what a seat can commit is the owner's to
 * say, and a number here would read as already agreed.
 */
export const SEED_LEADING: Leading = {
  published: false,
  intro: "The business grows when the calls that don't need an owner stop waiting for one. Each leadership seat below has calls that are already yours, calls you make and then log, and calls you bring to us. Every good call you log is how more of them become yours.",
  seats: [
    {
      roleId: "leading-hand",
      name: "Leading Hand",
      decide: [
        "Who on your crew does which part of the job",
        "Re-ordering the crew's day when a job runs long",
        "Stopping a job on safety or licensing grounds: always, straight away",
        "A part or consumable to finish today's job, inside your limit",
        "Sending the apprentice back to redo work that isn't to standard",
      ],
      tell: [
        "A job that's going to run over its allowed hours",
        "Rework or a callback on your crew's work, and what you did",
        "A customer unhappy with the work, and what you did",
      ],
      ask: [
        "Any variation or change to the price: the Field Manager prices it before it's built",
        "Changing the equipment or scope on an install",
        "Anything over your limit",
        "Pay, hiring, or a warning to someone",
      ],
      spend: null,
    },
    {
      roleId: "field-manager",
      name: "Field Manager",
      decide: [
        "The day's crew allocation, with the Office Manager",
        "Variations up to your limit, priced and agreed in writing before the work",
        "Re-booking a job that can't go ahead, and telling the customer",
        "Sending a crew back to fix rework",
        "A supplier or warranty claim for a field fault",
        "Stopping any job on safety or licensing grounds",
      ],
      tell: [
        "A job that's lost money or gone well over its hours, and why",
        "A safety incident or near miss, logged and closed",
        "Moving an install date",
        "A first word with someone about the standard",
        "A customer complaint, and how you settled it",
      ],
      ask: [
        "Pay, hiring and firing",
        "The pricebook and pricing",
        "Tools or equipment over your limit",
        "A refund or credit over your limit",
        "Anything that commits the business past this month",
      ],
      spend: null,
    },
    {
      roleId: "service-manager",
      name: "Service Manager",
      decide: [
        "The service calendar and who runs which job",
        "Membership sign-ups and renewals at the published price",
        "Warranty claims with the manufacturer",
        "Booking the follow-up work a service visit finds",
      ],
      tell: [
        "A member who's cancelled, and why",
        "A warranty claim that's been refused",
        "Gaps in the service calendar more than a week out",
      ],
      ask: [
        "Service or membership prices",
        "A refund or credit over your limit",
        "Hiring, or a new kind of service",
      ],
      spend: null,
    },
    {
      roleId: "office-manager",
      name: "Office Manager",
      decide: [
        "Bookings and the schedule, with the Field Manager",
        "Who in the office does what today",
        "The order money gets chased in",
        "Bills entered and scheduled to the supplier priorities",
      ],
      tell: [
        "A customer complaint, and how it was handled",
        "A debt past 30 days that's being escalated",
        "Anything that went out late: an invoice, the scorecard, payroll",
      ],
      ask: [
        "Refunds, write-offs, and anything outside our standard terms",
        "Pay changes and hiring",
        "Anything over your limit",
      ],
      spend: null,
    },
  ],
  method: [
    "What's happening: the facts, in two lines.",
    "The options: at least two, with what each costs and what could go wrong.",
    "What you'd do, and why.",
    "What you need from us: usually just a yes.",
  ],
  ladder: [
    { name: "Tell us", means: "You bring us what's happening. We decide together, and we say why, out loud." },
    { name: "Recommend", means: "You bring the options and the one you'd pick. We say yes, or why not." },
    { name: "Decide, then log it", means: "You make the call and log it here. We go over it at the weekly review." },
    { name: "Decide", means: "It's yours. We see it in the numbers, not before." },
  ],
  moveUp: "A kind of call moves up a rung when your logged calls at that rung keep coming back as good calls, with no surprises. The owner moves it, at the weekly review, and changes this page to say so. A call that goes wrong isn't a step back: own it, log what you'd do differently, and go again.",
};

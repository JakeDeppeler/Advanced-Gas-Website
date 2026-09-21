import type { JourneyBeat } from "@/components/ScrollJourney";

/**
 * The job from the other side of the front door.
 *
 * The commercial page runs the same shape for a builder — plans to open doors,
 * with the argument for us inside each stage rather than parked in a box. This
 * is the homeowner's version of it, built on the six steps that were already
 * on the page as a card grid. Same promises, told as a sequence, because
 * somebody deciding whether to let a trade into their house is following a
 * story rather than comparing features.
 *
 * `scene` keys a drawing in HomeJourney.tsx.
 */
export const HOME_JOURNEY: JourneyBeat[] = [
  {
    n: "01",
    kicker: "You get in touch",
    h: "It starts with a photo of the old one.",
    p: "Fill in the form or ring us. A picture of what’s there now, the room it has to do, and roughly what you want out of it is plenty to price from.",
    why: "The person who quotes it is the person who installs it.",
    scene: "enquiry",
  },
  {
    n: "02",
    kicker: "The quote",
    h: "A written price, inside 12 hours.",
    p: "Straight to your inbox and itemised, with the VEU rebate already taken off the number rather than promised somewhere near the end of the conversation.",
    why: "No doorstep pressure, and no figure invented on the spot.",
    scene: "quote",
  },
  {
    n: "03",
    kicker: "A look, if it needs one",
    h: "For the tricky ones we come and look first.",
    p: "Ducted retrofits, awkward roof spaces, anything where a guess turns into a variation later. We would rather find it now than on the morning of the install.",
    why: "The price only moves if the job does, and you approve it first.",
    scene: "visit",
  },
  {
    n: "04",
    kicker: "Install day",
    h: "Old one out, new one in, house left clean.",
    p: "Drop sheets down and the old unit taken away. Brackets, drain fall, pipe runs and insulation done properly — the part nobody photographs, and the part that decides whether it is still right in five years.",
    why: "Our own installers and apprentices. Not labour hire.",
    scene: "install",
  },
  {
    n: "05",
    kicker: "Signed off",
    h: "Commissioned, certified, and shown to you.",
    p: "Run up and checked on the day, a compliance certificate emailed inside 24 hours, and ten minutes showing you how to actually run it instead of handing you a manual.",
    why: "Keep the certificate. Your insurer will ask for it one day.",
    scene: "certified",
  },
  {
    n: "06",
    kicker: "The week after",
    h: "We ring you. Then you forget about it.",
    p: "A quick call to make sure it is doing what you paid for. After that it should be the least interesting thing in the house.",
    why: "Six years on our workmanship, and we are still here.",
    scene: "comfort",
  },
];

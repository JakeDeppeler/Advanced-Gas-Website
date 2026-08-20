import type { Suburb } from "@/lib/suburbs";

/**
 * Per-suburb, per-service copy for the /areas/<suburb>/<service> pages.
 *
 * Why this exists: those 256 pages measured 93% identical to each other,
 * which is exactly the profile Google reports as "Crawled, currently
 * not indexed". The cause was not the template being bad. It was that
 * the template only ever read `sub.name`, `sub.slug` and `sub.postcode`,
 * while suburbs.ts already carried a paragraph of genuinely different
 * detail for all 64 suburbs that nothing rendered.
 *
 * So this is not invented filler. Every sentence below is assembled
 * from facts already written per suburb, angled at the service being
 * looked at. A gas job in Officer and a heat pump job in Officer draw
 * on the same housing stock and reach different conclusions about it,
 * which is true on the tools and is what makes the pages different.
 *
 * The suburb hub page renders these fields too, so the framing here is
 * deliberately different: the hub answers "what is this suburb like",
 * these answer "what does this suburb mean for this job".
 */

/** Sentence case without touching acronyms or brand names. */
function lead(s: string): string {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Strips a trailing full stop so we can punctuate consistently. */
function bare(s: string): string {
  return s.trim().replace(/\.$/, "");
}

export type LocalAngle = {
  /** Section heading. */
  heading: string;
  /** Two or three paragraphs, all built from per-suburb facts. */
  paras: string[];
  /** Optional bullets, only where the suburb record has them. */
  bullets?: { label: string; items: string[] };
};

/**
 * What the local housing stock means for this particular trade.
 *
 * Each of these takes the same two facts, `housingStock` and
 * `commonInstall`, and reads them through the lens of one service,
 * because that is what an installer actually does when a job comes in
 * from a suburb they know.
 */
const BY_SERVICE: Record<
  string,
  (sub: Suburb) => { heading: string; opener: string; closer: string }
> = {
  "heat-pump-installation": (sub) => ({
    heading: `What a hot water job in ${sub.name} usually looks like`,
    opener: `Hot water in ${sub.name} is mostly decided by when the street was built, because whatever went in at handover is what reaches end of life together, one estate at a time.`,
    closer: `That matters for a heat pump more than for anything else we fit, because the deciding question is where the outdoor unit goes and how far it is from the tank position. On a ${bare(
      sub.housingStock,
    ).split(",")[0]} the answer is usually obvious on the site visit and occasionally it rules a split system out entirely, in which case an all-in-one goes where the old tank stood.`,
  }),

  "air-conditioning-installation": (sub) => ({
    heading: `What an aircon job in ${sub.name} usually looks like`,
    opener: `The house decides the system in ${sub.name}, not the other way round, and the two things that decide it are the roof space and the wall the outdoor unit has to live on.`,
    closer: `Where there is roof access and clearance, ducted is the comfortable answer and we zone it from day one. Where there isn't, and in ${sub.name} that is a real proportion of the housing, multi-head does the same job off one outdoor unit without anyone opening up the ceiling.`,
  }),

  "aircon-servicing-repairs": (sub) => ({
    heading: `What we get called out to in ${sub.name}`,
    opener: `Most ${sub.name} call-outs in January are not broken systems. They are filters, coils and condensate drains on units that have never been looked at, and they are an afternoon rather than a replacement.`,
    closer: `Knowing the local housing stock is what makes that call quickly. Systems that went into an estate at the same time reach the same faults at the same age, so a symptom we have seen four streets away usually tells us what is wrong before the cover comes off.`,
  }),

  "gas-plumbing": (sub) => ({
    heading: `What a gas job in ${sub.name} usually looks like`,
    opener: `Gas work in ${sub.name} splits neatly by build era: whether the ducted heater sits in an internal cupboard or outside on a slab, and whether the street is on natural gas or LPG.`,
    closer: `On a like-for-like ducted replacement, that means the existing cavity, ductwork and controller wiring usually all get reused and the house is warm again the same day. Anything over ten years old gets a carbon monoxide test whether or not it is being replaced, and that part is not optional.`,
  }),
};

export function localAngle(sub: Suburb, serviceSlug: string): LocalAngle | null {
  const build = BY_SERVICE[serviceSlug];
  if (!build) return null;
  const { heading, opener, closer } = build(sub);

  // Outer-ring suburbs get the same structure with honest verbs. We
  // don't work in Ringwood every week and the copy shouldn't imply we
  // do — see `outerRing` in lib/suburbs.ts.
  const installLine = sub.outerRing
    ? `What we get asked for out this way is mostly ${bare(sub.commonInstall)}.`
    : `What we end up installing here most is ${bare(sub.commonInstall)}.`;

  const paras: string[] = [
    opener,
    `${lead(bare(sub.housingStock))}. ${installLine}`,
    closer,
  ];


  // Only some suburbs carry these. Where they exist they are the most
  // specific thing on the page, so they go in ahead of anything generic.
  if (sub.knownEstates) {
    paras.splice(2, 0, `${lead(bare(sub.knownEstates))}.`);
  }

  // Goes in second, after the opener and ahead of the detail, so nobody
  // reads three paragraphs about their suburb before finding out how far
  // away we are. Spliced last so it doesn't shift the index above.
  if (sub.outerRing) {
    paras.splice(
      1,
      0,
      `${sub.name} sits at the outer edge of what we cover, ${driveTime(
        sub,
      )} from the Pakenham workshop. That makes it a booked-install suburb for us rather than a same-day one, and it is worth knowing which of those you actually need before you ring anybody.`,
    );
  }
  if (sub.whyLocal) {
    paras.push(bare(sub.whyLocal) + ".");
  }

  const bullets = sub.commonProblems?.length
    ? { label: `What we see go wrong in ${sub.name}`, items: sub.commonProblems }
    : undefined;

  return { heading, paras, bullets };
}

/** Drive time from the Pakenham workshop, in words. Falls back to a
 *  distance-based estimate where we haven't timed the run. */
export function driveTime(sub: Suburb): string {
  if (sub.driveMin) {
    const [fast, typical] = sub.driveMin;
    if (fast === typical) return `${typical} minutes`;
    return `${fast} to ${typical} minutes`;
  }
  if (sub.distanceKm === 0) return "on our doorstep";
  const mins = Math.max(5, Math.round(sub.distanceKm * 1.4));
  return `about ${mins} minutes`;
}

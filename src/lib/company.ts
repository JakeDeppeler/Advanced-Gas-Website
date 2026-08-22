/**
 * Who we are, in one place.
 *
 * Every service, brand and category page was answering "do you do this
 * thing" and stopping there. That's half the question. Somebody choosing
 * a tradesperson is deciding whether to let four strangers into the
 * house for a day and hand them several thousand dollars, and nothing on
 * a specification sheet helps them make that call.
 *
 * So this is the other half: who turns up, what standard the work is
 * held to, and what the licences and warranties actually are. It renders
 * as <CompanyTrust />, and it goes on every page where somebody might be
 * deciding whether to ring us.
 *
 * The team roster mirrors /about deliberately — one truth, two places.
 * If someone joins or leaves, this is the file.
 */

export const TEAM = [
  {
    name: "Dean Winbanks",
    role: "Director · Plumbing Lic. 46828",
    line: "Twenty-plus years across industrial, commercial and domestic. Sets the standard the work is measured against and signs off every job.",
    photo: "/dean.webp",
  },
  {
    name: "Jake",
    role: "Estimating & quotes",
    line: "Your first call. Writes the quote, works the rebate into the number, and explains where the price comes from rather than handing you a total.",
    photo: "/Photo of jake.webp",
  },
  {
    name: "Kellie",
    role: "Office & scheduling",
    line: "Books the job, chases the compliance certificates and keeps the paperwork moving, so you're never the one following it up.",
    photo: "/kellie.webp",
  },
  {
    name: "Jye",
    role: "Installer",
    line: "Directly employed, not a subcontractor. Same face on the job as the one you met, same standard every visit.",
    photo: "/jye.webp",
  },
] as const;

/** The hard credentials. Checkable, which is the point of listing them. */
export const CREDENTIALS = [
  { label: "Plumbing licence", value: "46828", note: "Victorian Building Authority, checkable online" },
  { label: "ABN", value: "35 607 575 280", note: "Registered since 2014" },
  { label: "Refrigerant handling", value: "ARCtick", note: "Every refrigerant job by a certified tech" },
  { label: "Workmanship warranty", value: "6 years", note: "On top of whatever the manufacturer covers" },
] as const;

/**
 * What "done properly" means, stated concretely enough to be checked
 * against on the day. Vague quality claims are worth nothing; these are
 * things a customer can hold us to.
 */
export const STANDARDS = [
  {
    t: "The person who quotes it installs it",
    d: "No sales rep, no subcontractor you've never met turning up on the day. Nothing gets lost between the quote and the job because it's the same people.",
  },
  {
    t: "Drop sheets down before anything else",
    d: "Floors covered, driveway swept, packaging goes with us. You shouldn't be able to tell where we walked.",
  },
  {
    t: "Conduit straight, brackets level",
    d: "The part everybody sees from the driveway for the next fifteen years, and the first thing a cheap install gives away.",
  },
  {
    t: "Compliance paperwork inside 24 hours",
    d: "Emailed the next business day, not chased three weeks later when you need it for a sale.",
  },
  {
    t: "We'd rather talk you out of it",
    d: "If the system you've got has five good years in it, we'll service it and say so. Selling somebody a job they didn't need is how you get one job instead of a family's worth.",
  },
  {
    t: "One accountable team",
    d: "Directly employed installers and apprentices rather than a revolving door of subbies. The same people, holding the same standard.",
  },
] as const;

/** Short version, for pages that only need a line rather than a section. */
export const COMPANY_LINE =
  "Family-run out of Pakenham since 2014. Directly employed installers, a 6-year workmanship warranty, and the same face on the quote as on the tools.";

/**
 * The people a customer actually deals with. The About page and the home
 * page's crew strip both read from here, so a new face or a changed role is
 * one edit, not two copies drifting apart.
 *
 * `short` is the home-page line: what this person does for you, in the few
 * words that fit under a photo. `bio` is the About page's longer version.
 */
export type TeamMember = {
  name: string;
  role: string;
  /** Role as it fits on a card. */
  roleShort: string;
  short: string;
  bio: string;
  photo: string;
};

export const TEAM: TeamMember[] = [
  {
    name: "Dean Winbanks",
    role: "Director · Plumbing Lic. 46828",
    roleShort: "Director",
    short: "Sets the standard and signs off the work.",
    bio: "20+ years across industrial, commercial and domestic work. Sets the standard every job is measured against, and signs off the works.",
    photo: "/dean.webp",
  },
  {
    name: "Jake",
    role: "Estimating & Quotes",
    roleShort: "Quotes",
    short: "Prices your job and explains every number.",
    bio: "Your first point of contact for pricing, detailed quotes with any rebates worked in, and the numbers explained.",
    photo: "/jake.webp",
  },
  {
    name: "Kellie",
    role: "Office & Scheduling",
    roleShort: "Office & bookings",
    short: "Books you in and sends the paperwork.",
    bio: "Keeps jobs booked, compliance certificates issued and the paperwork moving, so nothing slips and you're never left chasing.",
    photo: "/kellie.webp",
  },
  {
    name: "Jye",
    role: "Installer",
    roleShort: "Installer",
    short: "Same face on every job.",
    bio: "Directly employed installer, same face on every job, same standard on every visit.",
    photo: "/jye.webp",
  },
];

// Single source of truth for business info, services, suburbs.
// Replace placeholders marked with TODO before going live.

export const site = {
  name: "Advanced Gas & Aircon",
  shortName: "Advanced Gas",
  legalName: "Advanced Gas & Airconditioning Services Pty Ltd",
  acn: "607 575 280",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.advancedgas.com.au",
  phone: "(03) 5947 8000",
  phoneE164: "+61359478000",
  email: "admin@advancedgas.com.au",
  abn: "35 607 575 280",
  licences: {
    plumbing: "Plumbing Licence 46828",
    refrigeration: "ARC AU59557",
  },
  address: {
    street: "1 Sierra Circuit",
    suburb: "Pakenham",
    state: "VIC",
    postcode: "3810",
    country: "AU",
  },
  geo: { lat: -38.0703, lng: 145.4842 }, // Pakenham
  /**
   * On the tools 7:00 to 15:30, Monday to Friday.
   *
   * This said 08:00–16:00 and it was wrong in the place it matters most: it
   * feeds openingHours in the LocalBusiness schema, so it is the figure Google
   * shows beside the listing. Meanwhile the job calculator priced call-outs
   * from 7:00–15:30 and the portal's lead report counted "after hours" from
   * 16:00, so the same business kept three sets of hours and only one of them
   * was ever right.
   *
   * Anything outside these is a call-out. The after-hours line is separate and
   * always answered — see contact#emergency.
   */
  hours: [
    { day: "Mon-Fri", open: "07:00", close: "15:30" },
  ],
  social: {
    facebook: "",
    // Our install gallery lives here. Product shots on the site are
    // manufacturer photography — this is where the real, on-the-tools
    // install work is. Referenced by the "see the real thing" CTAs on
    // service pages, the tools hub and the brand pages.
    instagram: "https://www.instagram.com/advancedgasaircon/",
    // Google Business profile. This is Google's own share short-link — it
    // redirects to the full Maps listing. Swap in the canonical
    // google.com/maps/place/... URL if you ever want it to read nicer in
    // the status bar; the destination is identical either way.
    google: "https://share.google/Y5gbVEwoMu8dAr7vp",
  },
  primaryRegion: "South-East Victoria & Gippsland",
  primaryRegionShort: "South-East Vic",
  primaryState: "Victoria",
} as const;

export const services = [
  {
    slug: "air-conditioning-installation",
    name: "Air Conditioning Installation",
    short: "Aircon Installation",
    blurb:
      "Split system, multi-head and ducted aircon installed by ARCtick-licensed refrigeration technicians across South-East Vic and Gippsland.",
    icon: "snowflake",
  },
  {
    slug: "heat-pump-installation",
    name: "Heat Pump Hot Water Installation",
    short: "Heat Pump Installation",
    blurb:
      "Energy-efficient heat pump hot water installed with the VEU rebate applied at the quote. Cuts hot water energy use by up to 75%.",
    icon: "thermometer",
  },
  {
    slug: "aircon-servicing-repairs",
    name: "Air Conditioning Service & Repairs",
    short: "Aircon Service & Repairs",
    blurb:
      "Annual servicing, fault diagnosis and repairs for all major brands, keep your system efficient and under warranty.",
    icon: "wrench",
  },
  {
    slug: "gas-plumbing",
    name: "Gas & Plumbing Services",
    short: "Gas & Plumbing",
    blurb:
      "Licensed gas fitters and plumbers for hot water replacement, gas appliance installation, leak detection and emergency repairs.",
    icon: "flame",
  },
] as const;

export type ServiceSlug = (typeof services)[number]["slug"];

// Suburb data moved to src/lib/suburbs.ts (rich per-suburb hooks). Re-exported
// here so existing imports (`import { suburbs } from "@/lib/site"`) keep working.
// The old list included Korumburra, Leongatha, Wonthaggi, Phillip Island and
// Inverloch — all >75 km from Pakenham and outside our stated service radius,
// so they've been dropped in favour of the tighter, denser 75 km catchment.
/**
 * The opening hours as a person reads them, from the one record above.
 *
 * Every place that printed these by hand had drifted: the footer, the contact
 * page, the handbook (twice) and the preview page all said 8am–4pm, the job
 * calculator said 7–3:30, and the lead report counted after-hours from 4. Six
 * hand-written copies of one fact, and the only one Google read was wrong.
 */
const clock = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hr}:${String(m).padStart(2, "0")}${suffix}` : `${hr}${suffix}`;
};
/** "Mon–Fri 7am–3:30pm" */
export const openingHours = (): string => {
  const h = site.hours[0];
  return `${h.day.replace("-", "\u2013")} ${clock(h.open)}\u2013${clock(h.close)}`;
};
/** "7am – 3:30pm", without the days. */
export const openingHoursShort = (): string => {
  const h = site.hours[0];
  return `${clock(h.open)} \u2013 ${clock(h.close)}`;
};

export { suburbs, publishedSuburbs } from "./suburbs";
export type { Suburb, SuburbSlug } from "./suburbs";

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
  hours: [
    { day: "Mon-Fri", open: "08:00", close: "16:00" },
  ],
  social: {
    facebook: "",
    // Our install gallery lives here. Product shots on the site are
    // manufacturer photography — this is where the real, on-the-tools
    // install work is. Referenced by the "see the real thing" CTAs on
    // service pages, the tools hub and the brand pages.
    instagram: "https://www.instagram.com/advancedgasaircon/",
    google: "",
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
      "Energy-efficient heat pump hot water systems installed from as little as $33* with VEU rebates. Cut hot water energy use by up to 75%.",
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
export { suburbs, publishedSuburbs } from "./suburbs";
export type { Suburb, SuburbSlug } from "./suburbs";

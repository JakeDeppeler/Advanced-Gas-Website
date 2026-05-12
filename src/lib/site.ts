// Single source of truth for business info, services, suburbs.
// Replace placeholders marked with TODO before going live.

export const site = {
  name: "Advanced Gas & Aircon",
  shortName: "Advanced Gas",
  legalName: "Advanced Gas & Aircon Pty Ltd",
  // TODO: confirm domain
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.advancedgas.com.au",
  phone: "(03) 5947 8000",
  phoneE164: "+61359478000",
  email: "admin@advancedgas.com.au",
  abn: "35 607 575 280",
  licences: {
    plumbing: "VBA Plumbing Licence #46828",
    refrigeration: "ARCtick AU59557",
  },
  address: {
    street: "TODO Street",
    suburb: "Pakenham",
    state: "VIC",
    postcode: "3810",
    country: "AU",
  },
  geo: { lat: -38.0703, lng: 145.4842 }, // Pakenham
  hours: [
    { day: "Mon-Fri", open: "07:00", close: "18:00" },
    { day: "Sat", open: "08:00", close: "14:00" },
  ],
  social: {
    facebook: "",
    instagram: "",
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
      "Annual servicing, fault diagnosis and repairs for all major brands — keep your system efficient and under warranty.",
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

// South-East Victoria & Gippsland service area — each becomes a local landing page.
// Add/remove freely; sitemap + nav update automatically.
export const suburbs = [
  { slug: "pakenham", name: "Pakenham", postcode: "3810" },
  { slug: "berwick", name: "Berwick", postcode: "3806" },
  { slug: "officer", name: "Officer", postcode: "3809" },
  { slug: "cranbourne", name: "Cranbourne", postcode: "3977" },
  { slug: "warragul", name: "Warragul", postcode: "3820" },
  { slug: "drouin", name: "Drouin", postcode: "3818" },
  { slug: "garfield", name: "Garfield", postcode: "3814" },
  { slug: "bunyip", name: "Bunyip", postcode: "3815" },
  { slug: "korumburra", name: "Korumburra", postcode: "3950" },
  { slug: "leongatha", name: "Leongatha", postcode: "3953" },
  { slug: "wonthaggi", name: "Wonthaggi", postcode: "3995" },
  { slug: "phillip-island", name: "Phillip Island", postcode: "3922" },
  { slug: "inverloch", name: "Inverloch", postcode: "3996" },
] as const;

export type SuburbSlug = (typeof suburbs)[number]["slug"];

// Single source of truth for business info, services, suburbs.
// Replace placeholders marked with TODO before going live.

export const site = {
  name: "Advanced Gas",
  legalName: "Advanced Gas Pty Ltd",
  // TODO: replace with real domain
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.advancedgas.com.au",
  phone: "(03) 5947 8000",
  phoneE164: "+61359478000",
  email: "admin@advancedgas.com",
  abn: "35 607 575 280",
  licences: {
    plumbing: "VBA Plumbing Licence #46828",
    refrigeration: "ARCtick Refrigerant Handling Licence AU59557",
  },
  address: {
    street: "TODO Street",
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
    country: "AU",
  },
  geo: { lat: -37.8136, lng: 144.9631 },
  hours: [
    { day: "Mon-Fri", open: "07:00", close: "18:00" },
    { day: "Sat", open: "08:00", close: "14:00" },
  ],
  social: {
    facebook: "",
    instagram: "",
    google: "",
  },
  primaryRegion: "Melbourne",
  primaryState: "Victoria",
} as const;

export const services = [
  {
    slug: "air-conditioning-installation",
    name: "Air Conditioning Installation",
    short: "Aircon Installation",
    blurb:
      "Split system, multi-head and ducted aircon installed by licensed refrigeration technicians. Same-week installs across Melbourne.",
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

// Melbourne suburbs — each becomes a local landing page for SEO.
// Add/remove freely; sitemap + nav update automatically.
export const suburbs = [
  { slug: "melbourne-cbd", name: "Melbourne CBD", postcode: "3000" },
  { slug: "south-yarra", name: "South Yarra", postcode: "3141" },
  { slug: "richmond", name: "Richmond", postcode: "3121" },
  { slug: "brunswick", name: "Brunswick", postcode: "3056" },
  { slug: "footscray", name: "Footscray", postcode: "3011" },
  { slug: "st-kilda", name: "St Kilda", postcode: "3182" },
  { slug: "box-hill", name: "Box Hill", postcode: "3128" },
  { slug: "glen-waverley", name: "Glen Waverley", postcode: "3150" },
  { slug: "dandenong", name: "Dandenong", postcode: "3175" },
  { slug: "frankston", name: "Frankston", postcode: "3199" },
  { slug: "geelong", name: "Geelong", postcode: "3220" },
  { slug: "ballarat", name: "Ballarat", postcode: "3350" },
] as const;

export type SuburbSlug = (typeof suburbs)[number]["slug"];

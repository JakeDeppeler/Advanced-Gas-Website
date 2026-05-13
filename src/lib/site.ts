// Single source of truth for business info, services, suburbs.

export const site = {
  name: "Advanced Gas & Aircon",
  shortName: "Advanced Gas",
  legalName: "Advanced Gas & Aircon Pty Ltd",
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
    street: "1 Sierra Cct",
    suburb: "Pakenham",
    state: "VIC",
    postcode: "3810",
    country: "AU",
  },
  geo: { lat: -38.0703, lng: 145.4842 }, // Pakenham
  hours: [
    { day: "Mon-Fri", open: "07:00", close: "17:00" },
    { day: "Sat", open: "08:00", close: "14:00" },
  ],
  social: {
    facebook: "",
    instagram: "",
    google: "",
  },
  primaryRegion: "South-East Melbourne, Mornington Peninsula & West Gippsland",
  primaryRegionShort: "South-East Melbourne",
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
      "Energy-efficient heat pump hot water systems installed from around $1,780 after VEU rebates. Cut hot water energy use by up to 75%.",
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

// Based in Pakenham; servicing within ~75 km — covers SE Melbourne corridor
// (Cardinia, Casey, Dandenong, Greater Dandenong), bayside suburbs out to
// Brighton & Mornington Peninsula, east through Box Hill / Doncaster /
// Ringwood / Lilydale / Yarra Ranges, and east to Warragul & Moe.
// Each suburb becomes a local landing page; sitemap + nav update automatically.
export const suburbs = [
  // Pakenham + Cardinia
  { slug: "pakenham", name: "Pakenham", postcode: "3810" },
  { slug: "officer", name: "Officer", postcode: "3809" },
  { slug: "beaconsfield", name: "Beaconsfield", postcode: "3807" },
  { slug: "bunyip", name: "Bunyip", postcode: "3815" },
  { slug: "garfield", name: "Garfield", postcode: "3814" },
  { slug: "nar-nar-goon", name: "Nar Nar Goon", postcode: "3812" },
  { slug: "emerald", name: "Emerald", postcode: "3782" },
  { slug: "cockatoo", name: "Cockatoo", postcode: "3781" },
  { slug: "gembrook", name: "Gembrook", postcode: "3783" },
  // Casey
  { slug: "berwick", name: "Berwick", postcode: "3806" },
  { slug: "narre-warren", name: "Narre Warren", postcode: "3805" },
  { slug: "cranbourne", name: "Cranbourne", postcode: "3977" },
  { slug: "clyde-north", name: "Clyde North", postcode: "3978" },
  { slug: "hampton-park", name: "Hampton Park", postcode: "3976" },
  { slug: "hallam", name: "Hallam", postcode: "3803" },
  { slug: "endeavour-hills", name: "Endeavour Hills", postcode: "3802" },
  // Greater Dandenong / South-East
  { slug: "dandenong", name: "Dandenong", postcode: "3175" },
  { slug: "keysborough", name: "Keysborough", postcode: "3173" },
  { slug: "lyndhurst", name: "Lyndhurst", postcode: "3975" },
  // Bayside / Frankston / Mornington
  { slug: "frankston", name: "Frankston", postcode: "3199" },
  { slug: "carrum-downs", name: "Carrum Downs", postcode: "3201" },
  { slug: "seaford", name: "Seaford", postcode: "3198" },
  { slug: "mt-eliza", name: "Mt Eliza", postcode: "3930" },
  { slug: "mornington", name: "Mornington", postcode: "3931" },
  { slug: "mentone", name: "Mentone", postcode: "3194" },
  { slug: "mordialloc", name: "Mordialloc", postcode: "3195" },
  { slug: "cheltenham", name: "Cheltenham", postcode: "3192" },
  { slug: "sandringham", name: "Sandringham", postcode: "3191" },
  { slug: "brighton", name: "Brighton", postcode: "3186" },
  { slug: "bentleigh", name: "Bentleigh", postcode: "3204" },
  // Eastern suburbs
  { slug: "glen-waverley", name: "Glen Waverley", postcode: "3150" },
  { slug: "mt-waverley", name: "Mt Waverley", postcode: "3149" },
  { slug: "box-hill", name: "Box Hill", postcode: "3128" },
  { slug: "doncaster", name: "Doncaster", postcode: "3108" },
  { slug: "doncaster-east", name: "Doncaster East", postcode: "3109" },
  { slug: "ringwood", name: "Ringwood", postcode: "3134" },
  { slug: "croydon", name: "Croydon", postcode: "3136" },
  // Yarra Ranges
  { slug: "lilydale", name: "Lilydale", postcode: "3140" },
  { slug: "mt-evelyn", name: "Mt Evelyn", postcode: "3796" },
  { slug: "monbulk", name: "Monbulk", postcode: "3793" },
  { slug: "belgrave", name: "Belgrave", postcode: "3160" },
  // Gippsland corridor
  { slug: "drouin", name: "Drouin", postcode: "3818" },
  { slug: "warragul", name: "Warragul", postcode: "3820" },
  { slug: "trafalgar", name: "Trafalgar", postcode: "3824" },
  { slug: "moe", name: "Moe", postcode: "3825" },
] as const;

export type SuburbSlug = (typeof suburbs)[number]["slug"];

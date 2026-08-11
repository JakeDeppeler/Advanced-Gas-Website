/**
 * Every Reclaim system code, decoded.
 *
 * Why this exists: people shop Reclaim by part number. They get a quote
 * with "REHP-CO2-315SSQ-V2" on it, or they read a spec sheet listing
 * "HE-UM40CR-PHE-315ASR", and they search that string to find out what
 * it actually is and who fits it. Nothing on our site answered that,
 * so those searches went to manual-hosting sites and interstate
 * resellers.
 *
 * This is the data behind /brands/reclaim/models. Every code below is
 * the manufacturer's own, not ours, and `verified` marks the ones we
 * have confirmed against Reclaim or Panasonic documentation rather
 * than taken on trust.
 *
 * Reading a Reclaim code
 * ----------------------
 *   REHP - CO2 - 315 SSQ - V2
 *   │      │     │   │      └─ controller: V2 has Wi-Fi, V1.1 does not
 *   │      │     │   └──────── tank: GL glass-lined, SST stainless tall,
 *   │      │     │             SSQ stainless squat, DX duplex stainless
 *   │      │     └──────────── litres
 *   │      └────────────────── CO₂ (R744) refrigerant
 *   └───────────────────────── Reclaim Energy Heat Pump
 *
 * Reading a Panasonic code
 * ------------------------
 *   HE-UM40CR - PHE-315ASR
 *   │           └─ tank: PHE = Australian-made tank, 315 = litres,
 *   │              ASR = stainless, AGR = vitreous enamel (glass-lined)
 *   └───────────── heat pump: UM40 = 4 kW, UM60 = 6 kW
 *
 * SSQ is the one people get wrong, including us until we checked. The
 * Q is "squat", a short wide tank for a low cupboard or under an
 * eave. It is the same stainless steel as the SST, in a different
 * shape. It is not a 316 / marine grade.
 */

export type TankFinish =
  | "glass-lined"
  | "stainless-tall"
  | "stainless-squat"
  | "duplex"
  | "earthworker";

export type ReclaimSeries = "reclaim" | "panasonic";

export type ReclaimModel = {
  /** Manufacturer system code, exactly as it appears on the compliance
   *  plate and the quote. This is the string people search. */
  code: string;
  series: ReclaimSeries;
  litres: number;
  finish: TankFinish;
  /** Tall or squat body. Decides whether it fits the space, and it is
   *  the only difference between an SST and an SSQ. */
  shape?: "tall" | "squat";
  /** V2 controller. The only Wi-Fi difference in the range. */
  wifi: boolean;
  controller: string;
  compressor: string;
  compressorKw: number;
  /** Manufacturer tank warranty in years. Parts; labour is 5 years on
   *  every tank in the range. */
  tankWarrantyYears: number;
  /** Heat pump warranty in years, parts AND labour. Reclaim's own unit
   *  carries 10, the Reclaim/Panasonic carries 7. That three-year gap is
   *  a real difference between two systems that otherwise look alike on
   *  a spec sheet, so it belongs in the table rather than a footnote. */
  heatPumpWarrantyYears: number;
  /** Our catalogue page for this exact system, where we carry it. */
  productSlug?: string;
  /** True when the code is confirmed against manufacturer documentation. */
  verified: boolean;
  note?: string;
};

export const FINISH_LABEL: Record<TankFinish, string> = {
  "glass-lined": "Glass-lined (vitreous enamel)",
  "stainless-tall": "Stainless steel, tall",
  "stainless-squat": "Stainless steel, squat",
  duplex: "2205 duplex stainless",
  earthworker: "Earthworker stainless, made in Morwell",
};

/** Short label for the table, where the column is narrow. */
export const FINISH_SHORT: Record<TankFinish, string> = {
  "glass-lined": "Glass-lined",
  "stainless-tall": "Stainless, tall",
  "stainless-squat": "Stainless, squat",
  duplex: "Duplex stainless",
  earthworker: "Earthworker stainless",
};

const RECLAIM_CO2 = "Reclaim CO₂ (R744), 5 kW";

/** Builds the two controller variants of a Reclaim tank code. The V2
 *  suffix is the Wi-Fi controller; without it you have the V1.1, which
 *  is the same heat pump and the same tank with a manual controller. */
function pair(
  base: string,
  litres: number,
  finish: TankFinish,
  shape: "tall" | "squat" | undefined,
  tankWarrantyYears: number,
  productSlug?: string,
): ReclaimModel[] {
  const common = {
    series: "reclaim" as const,
    litres,
    finish,
    shape,
    compressor: RECLAIM_CO2,
    compressorKw: 5,
    tankWarrantyYears,
    heatPumpWarrantyYears: 10,
    verified: true,
  };
  return [
    { ...common, code: `${base}-V2`, wifi: true, controller: "V2, Wi-Fi and app", productSlug },
    { ...common, code: base, wifi: false, controller: "V1.1, no Wi-Fi" },
  ];
}

export const RECLAIM_MODELS: ReclaimModel[] = [
  // ---------- Reclaim CO₂ split · glass-lined ----------
  ...pair("REHP-CO2-160GL", 160, "glass-lined", "tall", 10, "co2-split-160-glass"),
  ...pair("REHP-CO2-250GL", 250, "glass-lined", "tall", 10, "co2-split-250-glass"),
  ...pair("REHP-CO2-315GL", 315, "glass-lined", "tall", 10, "co2-split-315-glass"),
  ...pair("REHP-CO2-400GL", 400, "glass-lined", "tall", 10, "co2-split-400-glass"),

  // ---------- Reclaim CO₂ split · stainless, tall ----------
  ...pair("REHP-CO2-160SST", 160, "stainless-tall", "tall", 15, "co2-split-160-stainless"),
  ...pair("REHP-CO2-250SST", 250, "stainless-tall", "tall", 15, "co2-split-250-stainless"),
  ...pair("REHP-CO2-315SST", 315, "stainless-tall", "tall", 15, "co2-split-315-stainless"),
  ...pair("REHP-CO2-400SST", 400, "stainless-tall", "tall", 15, "co2-split-400-stainless"),

  // ---------- Reclaim CO₂ split · stainless, squat ----------
  ...pair("REHP-CO2-160SSQ", 160, "stainless-squat", "squat", 15),
  ...pair("REHP-CO2-250SSQ", 250, "stainless-squat", "squat", 15),
  ...pair("REHP-CO2-315SSQ", 315, "stainless-squat", "squat", 15, "co2-split-315-stainless-squat"),
  ...pair("REHP-CO2-400SSQ", 400, "stainless-squat", "squat", 15),

  // ---------- Reclaim CO₂ split · duplex stainless ----------
  {
    code: "REHP-KY-CO2-315DX",
    series: "reclaim",
    litres: 315,
    finish: "duplex",
    shape: "tall",
    wifi: true,
    controller: "V2, Wi-Fi and app",
    compressor: RECLAIM_CO2,
    compressorKw: 5,
    tankWarrantyYears: 15,
    heatPumpWarrantyYears: 10,
    verified: true,
    note: "Tank ID RE-DXO-315. 2205 duplex stainless inner tank, 700 kPa working pressure.",
  },

  // ---------- Reclaim CO₂ split · Earthworker ----------
  {
    code: "REHP-CO2-250SSEW-V2",
    series: "reclaim",
    litres: 250,
    finish: "earthworker",
    shape: "tall",
    wifi: true,
    controller: "V2, Wi-Fi and app",
    compressor: RECLAIM_CO2,
    compressorKw: 5,
    tankWarrantyYears: 15,
    heatPumpWarrantyYears: 10,
    productSlug: "co2-split-250-earthworker",
    verified: false,
    note: "Reclaim heat pump on an Earthworker Energy Manufacturing Cooperative tank, built in Morwell. Confirm the exact code on the quote.",
  },
  {
    code: "REHP-CO2-315SSEW-V2",
    series: "reclaim",
    litres: 315,
    finish: "earthworker",
    shape: "tall",
    wifi: true,
    controller: "V2, Wi-Fi and app",
    compressor: RECLAIM_CO2,
    compressorKw: 5,
    tankWarrantyYears: 15,
    heatPumpWarrantyYears: 10,
    productSlug: "co2-split-315-earthworker",
    verified: false,
    note: "Reclaim heat pump on an Earthworker Energy Manufacturing Cooperative tank, built in Morwell. Confirm the exact code on the quote.",
  },
];

/** Panasonic Aquarea CO₂ on an Australian-made PHE tank. Reclaim and
 *  Panasonic sell this as one system, so the code is the heat pump and
 *  the tank joined: HE-UM40CR-PHE-315ASR. */
const PANASONIC_TANKS: {
  litres: number;
  suffix: "ASR" | "AGR";
  finish: TankFinish;
  warranty: number;
  slugStem: string;
}[] = [
  { litres: 250, suffix: "AGR", finish: "glass-lined", warranty: 10, slugStem: "glass-4kw-250" },
  { litres: 315, suffix: "AGR", finish: "glass-lined", warranty: 10, slugStem: "glass-4kw-315" },
  { litres: 400, suffix: "AGR", finish: "glass-lined", warranty: 10, slugStem: "" },
  { litres: 250, suffix: "ASR", finish: "stainless-tall", warranty: 15, slugStem: "stainless-4kw-250" },
  { litres: 315, suffix: "ASR", finish: "stainless-tall", warranty: 15, slugStem: "stainless-4kw-315" },
];

export const PANASONIC_MODELS: ReclaimModel[] = (
  [
    { hp: "HE-UM40CR", kw: 4, label: "Panasonic Aquarea 4 kW HE-UM40CR" },
    { hp: "HE-UM60CR", kw: 6, label: "Panasonic Aquarea 6 kW HE-UM60CR" },
    { hp: "HE-UM40AR", kw: 4, label: "Panasonic Aquarea 4 kW HE-UM40AR" },
    { hp: "HE-UM60AR", kw: 6, label: "Panasonic Aquarea 6 kW HE-UM60AR" },
  ] as const
).flatMap((c) =>
  PANASONIC_TANKS.map((t): ReclaimModel => {
    // Our catalogue carries the 4 kW and 6 kW in 250 and 315 only, in
    // both finishes. The 400 is glass-lined only and quote-only.
    const kwPart = c.kw === 4 ? "4kw" : "6kw";
    // Only the CR pairings link out, so the AR rows don't point four
    // different codes at the same canonical product URL.
    const slug =
      t.slugStem && c.hp.endsWith("CR")
        ? `panasonic-co2-${t.slugStem.replace("4kw", kwPart)}`
        : undefined;
    return {
      code: `${c.hp}-PHE-${t.litres}${t.suffix}`,
      series: "panasonic",
      litres: t.litres,
      finish: t.finish,
      shape: "tall",
      // The Panasonic pairing ships on the Reclaim V2 controller.
      wifi: true,
      controller: "V2, Wi-Fi and app",
      compressor: c.label,
      compressorKw: c.kw,
      tankWarrantyYears: t.warranty,
      // Reclaim/Panasonic is 7 years parts and labour, against 10 on
      // Reclaim's own heat pump.
      heatPumpWarrantyYears: 7,
      productSlug: slug,
      verified: true,
    };
  }),
);

export const ALL_RECLAIM_MODELS: ReclaimModel[] = [
  ...RECLAIM_MODELS,
  ...PANASONIC_MODELS,
];

/** Every distinct capacity in the range, ascending. Drives the size
 *  filter chips and the "160 L / 250 L / 315 L / 400 L" headings. */
export const RECLAIM_SIZES: number[] = Array.from(
  new Set(ALL_RECLAIM_MODELS.map((m) => m.litres)),
).sort((a, b) => a - b);

/** Free-text haystack for the search box. Deliberately includes the
 *  words people type rather than the words on the plate: someone
 *  searching "stainless steel heat pump 315" should hit the SST and
 *  the SSQ, and someone searching "wifi" should hit every V2. */
export function searchIndex(m: ReclaimModel): string {
  return [
    m.code,
    m.code.replace(/-/g, " "),
    m.code.replace(/-/g, ""),
    `${m.litres}L`,
    `${m.litres} litre`,
    FINISH_LABEL[m.finish],
    m.shape ?? "",
    m.wifi ? "wifi wi-fi v2 app smart" : "non-wifi no wifi v1 v1.1 manual",
    m.compressor,
    m.series === "panasonic" ? "panasonic aquarea" : "reclaim energy",
    `${m.heatPumpWarrantyYears} year heat pump warranty`,
    m.finish.includes("stainless") ? "stainless steel" : "",
    m.finish === "glass-lined" ? "vitreous enamel anode" : "",
  ]
    .join(" ")
    .toLowerCase();
}

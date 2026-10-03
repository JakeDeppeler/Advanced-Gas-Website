/**
 * The VEU rebate ballpark — the model, shared by the public estimator and the
 * portal's VEU tab. Moved here unchanged; see the estimator for the reasoning.
 */

type UpgradePath = {
  key: string;
  label: string;
  minRebate: number;
  maxRebate: number;
  typicalInstall: number;
  notes: string;
};

// Upgrade paths keyed by "currentSystem::plannedUpgrade".
// Rebate ranges reflect current VEEC market prices ($60-$75 per certificate,
// mid-2026) and the max heat-pump hot-water rebate of ~$2,700.
export const UPGRADES: UpgradePath[] = [
  // ---- Hot water upgrades ----
  // typicalInstall is the ballpark pre-rebate install for a standard
  // all-in-one heat pump. A Reclaim CO₂ split with Wi-Fi can reach
  // ~$9,700 pre-rebate → ~$7,000 net; entry iStore lands closer to
  // $4,800 → $2,200 net. Net install range shown to the user is
  // always $2,000-$7,000 across the whole hot-water heat-pump range.
  { key: "gas-storage::heat-pump", label: "Gas storage → Heat pump hot water",
    minRebate: 2400, maxRebate: 2700, typicalInstall: 4800,
    notes: "The biggest hot-water rebate on offer. A typical all-in-one runs about $4,800 pre-rebate; a Reclaim CO₂ split with a stainless tank and Wi-Fi reaches around $9,700. Your own figure lands on the quote." },
  { key: "gas-continuous::heat-pump", label: "Gas continuous → Heat pump hot water",
    minRebate: 2000, maxRebate: 2400, typicalInstall: 4800,
    notes: "Continuous flow gas is more efficient than storage, so the rebate is slightly smaller." },
  { key: "electric-storage::heat-pump", label: "Electric storage → Heat pump hot water",
    minRebate: 2200, maxRebate: 2600, typicalInstall: 4800,
    notes: "Strong rebate, displacing peak-rate electric with a heat pump saves 60-70% of the running cost." },
  { key: "off-peak-electric::heat-pump", label: "Off-peak electric → Heat pump hot water",
    minRebate: 1400, maxRebate: 1800, typicalInstall: 4800,
    notes: "Smaller rebate because off-peak electric is already comparatively cheap." },

  // ---- Space heating / cooling upgrades ----
  { key: "gas-ducted::rc-ducted", label: "Gas ducted heater → Reverse-cycle ducted",
    minRebate: 2800, maxRebate: 4200, typicalInstall: 12000,
    notes: "The single biggest VEU rebate available, retrofitting a whole home off gas ducted." },
  { key: "gas-ducted::rc-split", label: "Gas ducted heater → Multi-head reverse-cycle split",
    minRebate: 2000, maxRebate: 3200, typicalInstall: 8000,
    notes: "Popular retrofit path, cheaper install than full ducted, still eligible for a healthy rebate." },
  { key: "old-aircon::rc-split", label: "Old (pre-2010) split / window unit → New reverse-cycle split",
    minRebate: 300, maxRebate: 800, typicalInstall: 2200,
    notes: "Smaller rebate but pairs well with the sizing calculator for a right-sized upgrade." },
  { key: "old-aircon::rc-ducted", label: "Old ducted → New high-efficiency ducted",
    minRebate: 800, maxRebate: 1500, typicalInstall: 11000,
    notes: "Applies when replacing a 15+ yr old ducted system with a modern inverter." },
];

export const VEEC_PRICE_TREND = "$60-$75 / VEEC (2026 market)";

export type VeuForm = {
  postcode: string;
  upgradeKey: string;
  household: number; // used only for hot water upgrades to nudge the range
  hasSolar: boolean;
};

export const VEU_DEFAULTS: VeuForm = {
  postcode: "3810",
  upgradeKey: "gas-storage::heat-pump",
  household: 4,
  hasSolar: false,
};

export const VALID_VIC_POSTCODE = /^3\d{3}$/;


export function estimateVeu(form: VeuForm) {
    const upgrade = UPGRADES.find((u) => u.key === form.upgradeKey) ?? UPGRADES[0];
    const validPostcode = VALID_VIC_POSTCODE.test(form.postcode);

    // Household size scales hot-water rebates modestly (bigger tank ↔ more
    // displaced fuel = more VEECs). Not applied to space heating/cooling.
    const isHotWater = upgrade.key.endsWith("::heat-pump");
    const householdFactor = isHotWater
      ? 0.85 + Math.min(1, form.household / 4) * 0.30 // 0.85× at 1 person, 1.15× at 4+
      : 1;

    // Solar means slightly less rebate on hot water paths that are usually
    // scheduled to run midday off solar surplus — the scheme values the
    // absolute avoided-emission tonnes, which are marginally lower.
    const solarFactor = isHotWater && form.hasSolar ? 0.95 : 1;

    const minRebate = Math.round(upgrade.minRebate * householdFactor * solarFactor);
    const maxRebate = Math.round(upgrade.maxRebate * householdFactor * solarFactor);
    const midRebate = Math.round((minRebate + maxRebate) / 2);

    const netMin = Math.max(0, upgrade.typicalInstall - maxRebate);
    const netMax = Math.max(0, upgrade.typicalInstall - minRebate);
    const netMid = Math.max(0, upgrade.typicalInstall - midRebate);

    return {
      upgrade,
      validPostcode,
      minRebate,
      maxRebate,
      midRebate,
      netMin,
      netMax,
      netMid,
      isHotWater,
    };
}

/**
 * Hot water running cost, current system vs a heat pump — the model, shared by
 * the public savings calculator and the portal's running-cost tab. Moved here
 * unchanged; see the calculator for the reasoning.
 */

export const DELIVERED_KWH_PER_PERSON_PER_DAY = 2.4; // ~50 L @ 50 °C
const DAYS_PER_YEAR = 365;

// Efficiencies / COPs used to convert delivered heat → input energy.
export const EFFICIENCY: Record<string, number> = {
  "gas-storage":          0.75, // 75%, 5-star storage
  "gas-continuous":       0.85, // 85%, modern continuous flow
  "electric-storage":     1.00, // element is 100% efficient
  "electric-off-peak":    1.00, // same, but cheaper rate
  "solar-electric-boost": 1.00, // when boosting only
};

// Sensible install-cost + rebate defaults (mid-2026 VIC).
export const HEAT_PUMP_INSTALL_COST = 3500;
export const VEU_REBATE_TYPICAL = 2400; // Typical VIC heat-pump rebate at $60-$75 VEEC prices (max ~$2,700).

// Energy prices (mid-2026 Melbourne retail averages).
export const DEFAULT_GAS_C_PER_MJ = 4.5;       // c / MJ for natural gas usage
export const DEFAULT_ELEC_C_PER_KWH = 32;      // c / kWh peak
export const DEFAULT_OFFPEAK_C_PER_KWH = 18;   // c / kWh off-peak
const KWH_TO_MJ = 3.6;                   // 1 kWh = 3.6 MJ

export type CurrentSystem = keyof typeof EFFICIENCY;

export type SavingsForm = {
  currentSystem: CurrentSystem;
  household: number;
  gasCentsPerMJ: number;
  elecCentsPerKwh: number;
  offpeakCentsPerKwh: number;
  heatPumpCop: number;
  installCost: number;
  veuRebate: number;
};

export const SAVINGS_DEFAULTS: SavingsForm = {
  currentSystem: "gas-storage",
  household: 4,
  gasCentsPerMJ: DEFAULT_GAS_C_PER_MJ,
  elecCentsPerKwh: DEFAULT_ELEC_C_PER_KWH,
  offpeakCentsPerKwh: DEFAULT_OFFPEAK_C_PER_KWH,
  heatPumpCop: 4.0,
  installCost: HEAT_PUMP_INSTALL_COST,
  veuRebate: VEU_REBATE_TYPICAL,
};


export function hotWaterRunningCost(form: SavingsForm) {
    const eff = EFFICIENCY[form.currentSystem] ?? 1;
    const deliveredKwhPerYear = form.household * DELIVERED_KWH_PER_PERSON_PER_DAY * DAYS_PER_YEAR;

    let currentCostYr: number;
    let currentEnergyLabel: string;

    switch (form.currentSystem) {
      case "gas-storage":
      case "gas-continuous": {
        const inputKwh = deliveredKwhPerYear / eff;
        const inputMj = inputKwh * KWH_TO_MJ;
        currentCostYr = (inputMj * form.gasCentsPerMJ) / 100;
        currentEnergyLabel = `${Math.round(inputMj)} MJ/yr gas`;
        break;
      }
      case "electric-off-peak": {
        const inputKwh = deliveredKwhPerYear / eff;
        currentCostYr = (inputKwh * form.offpeakCentsPerKwh) / 100;
        currentEnergyLabel = `${Math.round(inputKwh)} kWh/yr off-peak`;
        break;
      }
      case "solar-electric-boost": {
        // Assume solar handles 65% of the load; the rest is off-peak boost.
        const inputKwh = (deliveredKwhPerYear / eff) * 0.35;
        currentCostYr = (inputKwh * form.offpeakCentsPerKwh) / 100;
        currentEnergyLabel = `${Math.round(inputKwh)} kWh/yr boost only`;
        break;
      }
      case "electric-storage":
      default: {
        const inputKwh = deliveredKwhPerYear / eff;
        currentCostYr = (inputKwh * form.elecCentsPerKwh) / 100;
        currentEnergyLabel = `${Math.round(inputKwh)} kWh/yr peak`;
        break;
      }
    }

    const heatPumpInputKwh = deliveredKwhPerYear / Math.max(1, form.heatPumpCop);
    // Heat pumps typically run overnight / midday on smart tariffs — blend
    // off-peak + peak rates 60/40 as a reasonable Melbourne average.
    const hpBlendedRate = (form.offpeakCentsPerKwh * 0.6 + form.elecCentsPerKwh * 0.4);
    const heatPumpCostYr = (heatPumpInputKwh * hpBlendedRate) / 100;

    const savingYr = Math.max(0, currentCostYr - heatPumpCostYr);
    const netInstall = Math.max(0, form.installCost - form.veuRebate);
    const paybackYears = savingYr > 0 ? netInstall / savingYr : Infinity;
    const tenYearNetSaving = savingYr * 10 - netInstall;

    return {
      currentCostYr,
      currentEnergyLabel,
      heatPumpCostYr,
      heatPumpInputKwh,
      savingYr,
      netInstall,
      paybackYears,
      tenYearNetSaving,
    };
}

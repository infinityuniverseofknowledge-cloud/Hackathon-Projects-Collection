/**
 * Levelized Cost of Energy (LCOE).
 * Reference: IEA / NREL methodology.
 *
 * LCOE = Σ (C_t / (1+r)^t) / Σ (E_t / (1+r)^t)
 */

export interface LCOEInputs {
  capitalCost: number;         // € total capex
  annualOpex: number;          // € / year
  fuelCost: number;            // € / MWh
  annualEnergyMWh: number;     // MWh / year
  lifetime: number;            // years
  discountRate: number;        // e.g. 0.07
  degradationRate?: number;    // annual, e.g. 0.005
  capacityFactor?: number;     // if energy derived from capacity
  ratedPowerMW?: number;
}

export interface LCOEResult {
  lcoe: number;                // € / MWh
  npvCost: number;             // €
  npvEnergy: number;           // MWh
  breakdown: {
    capex: number;
    opex: number;
    fuel: number;
  };
}

export function computeLCOE(inputs: LCOEInputs): LCOEResult {
  const r = inputs.discountRate;
  const T = inputs.lifetime;
  const deg = inputs.degradationRate ?? 0;

  let npvCost = 0;
  let npvEnergy = 0;
  let capexNPV = 0;
  let opexNPV = 0;
  let fuelNPV = 0;

  let annualEnergy = inputs.annualEnergyMWh;
  if (!annualEnergy && inputs.capacityFactor && inputs.ratedPowerMW) {
    annualEnergy = inputs.ratedPowerMW * 1000 * inputs.capacityFactor * 8760;
  }

  for (let t = 0; t < T; t++) {
    const df = Math.pow(1 + r, -t);
    const E = annualEnergy * Math.pow(1 - deg, t);
    const energyCost = E * inputs.fuelCost;
    const totalCost = (t === 0 ? inputs.capitalCost : 0) +
                      inputs.annualOpex +
                      energyCost;

    npvCost += totalCost * df;
    npvEnergy += E * df;

    if (t === 0) capexNPV += inputs.capitalCost;
    else capexNPV += 0;
    opexNPV += inputs.annualOpex * df;
    fuelNPV += energyCost * df;
  }

  return {
    lcoe: npvEnergy > 0 ? npvCost / npvEnergy : 0,
    npvCost,
    npvEnergy,
    breakdown: {
      capex: capexNPV,
      opex: opexNPV,
      fuel: fuelNPV,
    },
  };
}

/**
 * Internal Rate of Return.
 * Returns the discount rate that makes NPV = 0.
 */
export function computeIRR(
  cashflows: number[],
  guess = 0.1
): number {
  let r = guess;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + r, t);
      dnpv -= t * cashflows[t] / Math.pow(1 + r, t + 1);
    }
    if (Math.abs(npv) < 1e-6) break;
    const dr = -npv / dnpv;
    r += dr;
    if (Math.abs(dr) < 1e-9) break;
  }
  return r;
}

/**
 * Payback period (simple, undiscounted).
 */
export function paybackPeriod(capex: number, annualNetIncome: number): number {
  return annualNetIncome > 0 ? capex / annualNetIncome : Infinity;
}

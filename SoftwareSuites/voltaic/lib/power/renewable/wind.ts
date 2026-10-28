/**
 * Wind turbine power curve (IEC 61400).
 * Piecewise-linear power curve with cut-in, rated, and cut-out speeds.
 */

export interface WindTurbine {
  ratedPower_MW: number;
  cutInSpeed: number;    // m/s
  ratedSpeed: number;    // m/s
  cutOutSpeed: number;   // m/s
  rotorDiameter: number; // m
}

export interface WindOutput {
  windSpeed: number;
  power_MW: number;
  capacityFactor: number;
  availableEnergy_kWh: number;  // for 1 hour
}

export function windPower(
  turbine: WindTurbine,
  windSpeed: number
): WindOutput {
  let power = 0;
  if (windSpeed < turbine.cutInSpeed || windSpeed > turbine.cutOutSpeed) {
    power = 0;
  } else if (windSpeed < turbine.ratedSpeed) {
    // Cubic ramp between cut-in and rated
    const ratio = (windSpeed - turbine.cutInSpeed) / (turbine.ratedSpeed - turbine.cutInSpeed);
    power = turbine.ratedPower_MW * Math.pow(ratio, 3);
  } else {
    power = turbine.ratedPower_MW;
  }

  return {
    windSpeed,
    power_MW: power,
    capacityFactor: power / turbine.ratedPower_MW,
    availableEnergy_kWh: power * 1000,
  };
}

/**
 * Power law for wind speed at hub height.
 * v(h) = v_ref · (h / h_ref)^α
 */
export function hubHeightWind(v_ref: number, h: number, h_ref: number, alpha = 0.143): number {
  return v_ref * Math.pow(h / h_ref, alpha);
}

/**
 * Weibull distribution parameters for wind.
 * Fit from mean and standard deviation.
 */
export function weibullFit(mean: number, std: number): { k: number; lambda: number } {
  const cv = std / mean;
  const k = Math.pow(cv, -1.086);
  const lambda = mean / gammaFn(1 + 1 / k);
  return { k, lambda };
}

/** Lanczos approximation of gamma function */
function gammaFn(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** Expected annual energy from Weibull distribution */
export function expectedAnnualEnergy(
  turbine: WindTurbine,
  weibullK: number,
  weibullLambda: number,
  hoursPerYear = 8760
): number {
  let sum = 0;
  const nSteps = 200;
  const vMax = 30;
  const dv = vMax / nSteps;
  for (let i = 0; i < nSteps; i++) {
    const v = (i + 0.5) * dv;
    const pdf = (weibullK / weibullLambda) *
                Math.pow(v / weibullLambda, weibullK - 1) *
                Math.exp(-Math.pow(v / weibullLambda, weibullK));
    const p = windPower(turbine, v).power_MW;
    sum += p * pdf * dv;
  }
  return sum * hoursPerYear * 1000; // MWh
}

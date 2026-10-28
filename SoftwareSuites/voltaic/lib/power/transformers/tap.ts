/**
 * Transformer tap-changing model.
 * Tap ratio "a" = V_primary / V_secondary (in per-unit).
 */

export interface Transformer {
  from: number;
  to: number;
  z_pu: number;
  x_r_ratio: number;
  ratedMVA: number;
  tapRatio: number;      // 1.0 = nominal
  tapStep: number;       // e.g. 0.0125 (1.25%)
  tapMin: number;        // e.g. 0.9
  tapMax: number;        // e.g. 1.1
  phaseShift_deg?: number;
}

/** Impedance from nameplate percentage */
export function transformerImpedance(
  z_percent: number,
  x_r: number,
  baseMVA: number,
  ratedMVA: number
): { r: number; x: number } {
  const z_pu = (z_percent / 100) * (baseMVA / ratedMVA);
  const r = z_pu / Math.sqrt(1 + x_r * x_r);
  const x = r * x_r;
  return { r, x };
}

/** Discrete tap position from a continuous tap value */
export function quantizeTap(
  tapContinuous: number,
  tapStep: number,
  tapMin: number,
  tapMax: number
): number {
  const nSteps = Math.round((tapContinuous - 1) / tapStep);
  const clamped = Math.min(
    Math.round((tapMax - 1) / tapStep),
    Math.max(Math.round((tapMin - 1) / tapStep), nSteps)
  );
  return 1 + clamped * tapStep;
}

/**
 * Automatic voltage regulator logic.
 * Returns the new tap ratio based on measured voltage.
 */
export function avrStep(
  vMeasured: number,
  vTarget: number,
  currentTap: number,
  tapStep: number,
  tapMin: number,
  tapMax: number,
  deadband = 0.005
): number {
  const err = vTarget - vMeasured;
  if (Math.abs(err) < deadband) return currentTap;

  // If V too low, decrease tap (lower ratio → higher secondary V)
  // If V too high, increase tap
  const direction = err > 0 ? -1 : 1;
  let newTap = currentTap + direction * tapStep;
  newTap = Math.max(tapMin, Math.min(tapMax, newTap));
  return newTap;
}

/**
 * IEC 60909 short circuit calculation (simplified).
 * Reference: IEC 60909-0:2016 "Short-circuit currents in three-phase
 * a.c. systems - Part 0: Calculation of currents".
 *
 * Initial symmetrical short-circuit current:
 *     I_k'' = c · V_n / (√3 · Z_k)
 *
 * where:
 *     c = 1.10 (max) for HV
 *     c = 1.00 (min) for HV
 *     V_n = nominal line-to-line voltage
 *     Z_k = total short-circuit impedance
 */

export interface SCResult {
  Ik_ka: number;         // initial symmetrical current (kA)
  ip_ka: number;         // peak current (kA)
  Sk_mva: number;        // short-circuit power (MVA)
  Zk_ohm: number;        // total impedance (Ω)
  X_R_ratio: number;     // X/R ratio
}

export interface SCOptions {
  voltage_kv: number;
  z_source_ohm: number;
  x_r_ratio?: number;
  kappa?: number;        // 1.02 + 0.98 e^(-3R/X); default computed
  c?: number;            // voltage factor (1.0, 1.05, 1.10)
}

export function iec60909(opts: SCOptions): SCResult {
  const c = opts.c ?? 1.1;
  const V = opts.voltage_kv * 1000;  // line-to-line, volts
  const Z = opts.z_source_ohm;
  const X_R = opts.x_r_ratio ?? 10;

  // Initial symmetrical short-circuit current
  const Ik = (c * V) / (Math.sqrt(3) * Z);

  // Peak current ip = κ · √2 · Ik
  // κ = 1.02 + 0.98 · exp(-3·R/X)  where R/X = 1/(X/R)
  const kappa = opts.kappa ?? (1.02 + 0.98 * Math.exp(-3 / X_R));
  const ip = kappa * Math.SQRT2 * Ik;

  // Short-circuit power
  const Sk = Math.sqrt(3) * V * Ik;

  return {
    Ik_ka: Ik / 1000,
    ip_ka: ip / 1000,
    Sk_mva: Sk / 1e6,
    Zk_ohm: Z,
    X_R_ratio: X_R,
  };
}

/**
 * Series/parallel combination of impedances for SC calculation.
 */
export function combineSeries(zs: { r: number; x: number }[]): { r: number; x: number } {
  return zs.reduce((acc, z) => ({ r: acc.r + z.r, x: acc.x + z.x }), { r: 0, x: 0 });
}

export function combineParallel(zs: { r: number; x: number }[]): { r: number; x: number } {
  // For parallel Z1 || Z2 || ... : Y = Σ 1/Zi, Z = 1/Y
  let yRe = 0, yIm = 0;
  for (const z of zs) {
    const d = z.r * z.r + z.x * z.x;
    yRe += z.r / d;
    yIm -= z.x / d;
  }
  const yMag = yRe * yRe + yIm * yIm;
  return { r: yRe / yMag, x: -yIm / yMag };
}

/** Impedance of a transformer at its own base */
export function transformerZ(
  z_percent: number,
  baseMVA: number,
  ratedMVA: number,
  ratedKV: number
): { r: number; x: number } {
  const z_pu = (z_percent / 100) * (baseMVA / ratedMVA);
  // Assume X/R = 10 for distribution transformers
  const X_R = 10;
  const mag = z_pu;
  const r = mag / Math.sqrt(1 + X_R * X_R);
  const x = r * X_R;
  return { r, x };
}

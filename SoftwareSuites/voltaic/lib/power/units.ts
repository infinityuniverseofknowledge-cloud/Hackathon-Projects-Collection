/**
 * Physical units and per-unit system for power systems analysis.
 * Base power is usually 100 MVA.
 */

export const BASE_MVA_DEFAULT = 100;
export const FREQ_HZ_50 = 50;
export const FREQ_HZ_60 = 60;

export function deg2rad(deg: number): number { return (deg * Math.PI) / 180; }
export function rad2deg(rad: number): number { return (rad * 180) / Math.PI; }

export function mwToPu(mw: number, baseMva = BASE_MVA_DEFAULT): number {
  return mw / baseMva;
}
export function puToMw(pu: number, baseMva = BASE_MVA_DEFAULT): number {
  return pu * baseMva;
}
export function kvToPu(kv: number, baseKv: number): number {
  return kv / baseKv;
}
export function ohmsToPu(z_ohms: number, baseKv: number, baseMva = BASE_MVA_DEFAULT): number {
  const zBase = (baseKv * baseKv) / baseMva;
  return z_ohms / zBase;
}
export function puToOhms(z_pu: number, baseKv: number, baseMva = BASE_MVA_DEFAULT): number {
  const zBase = (baseKv * baseKv) / baseMva;
  return z_pu * zBase;
}

/** Per-unit transformer base change */
export function puBaseChange(
  z_pu_old: number,
  baseMvaOld: number,
  baseKvOld: number,
  baseMvaNew: number,
  baseKvNew: number
): number {
  return z_pu_old * (baseMvaNew / baseMvaOld) * (baseKvOld / baseKvNew) ** 2;
}

/** Line impedance (R, X) from length and per-km parameters */
export function lineImpedance(length_km: number, r_ohm_per_km: number, x_ohm_per_km: number) {
  return {
    r: length_km * r_ohm_per_km,
    x: length_km * x_ohm_per_km,
  };
}

/** Line shunt admittance (half at each end) for π model */
export function lineShunt(length_km: number, c_nf_per_km: number, freq_hz = FREQ_HZ_50) {
  const omega = 2 * Math.PI * freq_hz;
  const c_f = c_nf_per_km * 1e-9;
  const b_total = omega * c_f * length_km;
  return b_total / 2; // half at each end
}

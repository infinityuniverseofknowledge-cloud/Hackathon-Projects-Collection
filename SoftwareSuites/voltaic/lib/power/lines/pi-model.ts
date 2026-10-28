/**
 * Transmission line π (pi) model.
 * Series impedance Z + shunt admittance Y/2 at each end.
 */
import { Complex, cx, cadd, cmul, cdiv } from '../complex';

export interface PiModelResult {
  Z: Complex;          // series impedance (pu)
  Ysh: Complex;        // shunt admittance at each end (pu)
  Zc: Complex;         // characteristic impedance
  gamma: Complex;      // propagation constant
  SIL_MW: number;      // surge impedance loading (MW)
}

export function piModel(
  r_pu: number,
  x_pu: number,
  b_pu: number,
  v_base_kv: number
): PiModelResult {
  const Z = cx(r_pu, x_pu);
  const Ysh = cx(0, b_pu / 2);
  const Y_total = cx(0, b_pu);

  // Characteristic impedance Zc = sqrt(Z/Y)
  const Zc = cmul(Z, cdiv(cx(1, 0), Y_total));
  const Zc_sqrt: Complex = {
    re: Math.sqrt((Math.sqrt(Zc.re * Zc.re + Zc.im * Zc.im) + Zc.re) / 2),
    im: Math.sign(Zc.im) * Math.sqrt((Math.sqrt(Zc.re * Zc.re + Zc.im * Zc.im) - Zc.re) / 2),
  };

  // Propagation constant γ = sqrt(Z·Y)
  const ZY = cmul(Z, Y_total);
  const gamma: Complex = {
    re: Math.sqrt((Math.sqrt(ZY.re * ZY.re + ZY.im * ZY.im) + ZY.re) / 2),
    im: Math.sign(ZY.im) * Math.sqrt((Math.sqrt(ZY.re * ZY.re + ZY.im * ZY.im) - ZY.re) / 2),
  };

  // SIL = V² / Zc_ohm (V in kV line-to-line)
  const Zc_ohm = Zc_sqrt.re * (v_base_kv * v_base_kv) / 100;
  const SIL = Zc_ohm > 0 ? (v_base_kv * v_base_kv) / Zc_ohm : 0;

  return { Z, Ysh, Zc: Zc_sqrt, gamma, SIL_MW: SIL };
}

/** ABCD (or chain) parameters for π model */
export function piABCD(
  r_pu: number,
  x_pu: number,
  b_pu: number
): { A: Complex; B: Complex; C: Complex; D: Complex } {
  const Z = cx(r_pu, x_pu);
  const Y = cx(0, b_pu);
  const ZY = cmul(Z, Y);

  const A: Complex = cadd(cx(1, 0), cx(ZY.re / 2, ZY.im / 2));
  const B = Z;
  const C: Complex = cadd(Y, cdiv(cmul(ZY, Y), cx(4, 0)));
  const D = A;

  return { A, B, C, D };
}

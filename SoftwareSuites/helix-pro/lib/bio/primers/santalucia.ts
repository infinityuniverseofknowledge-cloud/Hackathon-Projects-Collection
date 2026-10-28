/**
 * Nearest-neighbor Tm — SantaLucia 1998.
 * Reference: SantaLucia J. PNAS 95, 1460-1465 (1998).
 */
const NN: Record<string, [number, number]> = {
  AA: [-7.9, -22.2], TT: [-7.9, -22.2],
  AT: [-7.2, -20.4], TA: [-7.2, -21.3],
  CA: [-8.5, -22.7], TG: [-8.5, -22.7],
  GT: [-8.4, -22.4], AC: [-8.4, -22.4],
  CT: [-7.8, -21.0], AG: [-7.8, -21.0],
  GA: [-8.2, -22.2], TC: [-8.2, -22.2],
  CG: [-10.6, -27.2], GC: [-9.8, -24.4],
  GG: [-8.0, -19.9], CC: [-8.0, -19.9],
};

export interface TmOptions {
  Ct?: number;
  Na?: number;
}

export function santaLuciaTm(seq: string, opts: TmOptions = {}): number {
  const Ct = opts.Ct ?? 0.25e-6;
  const Na = opts.Na ?? 0.05;
  const s = seq.toUpperCase();
  if (s.length < 2) return 0;

  let dH = 0, dS = 0;
  for (const c of s) {
    if (c === 'A' || c === 'T') { dH += 2.3; dS += 4.1; }
    else if (c === 'G' || c === 'C') { dH += 0.1; dS += -2.8; }
  }
  for (let i = 0; i < s.length - 1; i++) {
    const p = NN[s.substr(i, 2)];
    if (p) { dH += p[0]; dS += p[1]; }
  }
  const dS_corr = dS + 0.368 * (s.length - 1) * Math.log(Na);
  const Tm = (dH * 1000) / (dS_corr + 1.987 * Math.log(Ct / 4));
  return Tm - 273.15;
}

export function gcContent(seq: string): number {
  if (!seq.length) return 0;
  let gc = 0;
  for (const c of seq.toUpperCase()) if (c === 'G' || c === 'C') gc++;
  return gc / seq.length;
}

/**
 * Minimal complex number utilities (re/im representation).
 */
export interface Complex { re: number; im: number; }

export function cx(re: number, im = 0): Complex { return { re, im }; }
export function cadd(a: Complex, b: Complex): Complex { return { re: a.re + b.re, im: a.im + b.im }; }
export function csub(a: Complex, b: Complex): Complex { return { re: a.re - b.re, im: a.im - b.im }; }
export function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
export function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
export function cabs(a: Complex): number { return Math.sqrt(a.re * a.re + a.im * a.im); }
export function cabs2(a: Complex): number { return a.re * a.re + a.im * a.im; }
export function cconj(a: Complex): Complex { return { re: a.re, im: -a.im }; }
export function cscale(a: Complex, s: number): Complex { return { re: a.re * s, im: a.im * s }; }
export function cphase(a: Complex): number { return Math.atan2(a.im, a.re); }
export function cfromPolar(r: number, theta_rad: number): Complex {
  return { re: r * Math.cos(theta_rad), im: r * Math.sin(theta_rad) };
}

/** Solve linear system A x = b (Gauss elimination, complex). */
export function solveComplex(A: Complex[][], b: Complex[]): Complex[] {
  const n = A.length;
  const M: Complex[][] = A.map((row) => row.slice());
  const x: Complex[] = b.slice();

  for (let i = 0; i < n; i++) {
    // Pivot
    let pivot = i;
    let maxAbs = cabs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      const a = cabs(M[k][i]);
      if (a > maxAbs) { maxAbs = a; pivot = k; }
    }
    if (pivot !== i) {
      [M[i], M[pivot]] = [M[pivot], M[i]];
      [x[i], x[pivot]] = [x[pivot], x[i]];
    }
    const diag = M[i][i];
    for (let k = i + 1; k < n; k++) {
      const f = cdiv(M[k][i], diag);
      for (let j = i; j < n; j++) {
        M[k][j] = csub(M[k][j], cmul(f, M[i][j]));
      }
      x[k] = csub(x[k], cmul(f, x[i]));
    }
  }
  // Back substitute
  const out: Complex[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i];
    for (let j = i + 1; j < n; j++) {
      sum = csub(sum, cmul(M[i][j], out[j]));
    }
    out[i] = cdiv(sum, M[i][i]);
  }
  return out;
}

/** Solve real linear system A x = b (Gauss elimination). */
export function solveReal(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row) => row.slice());
  const x = b.slice();

  for (let i = 0; i < n; i++) {
    let pivot = i;
    let maxAbs = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxAbs) { maxAbs = Math.abs(M[k][i]); pivot = k; }
    }
    if (pivot !== i) {
      [M[i], M[pivot]] = [M[pivot], M[i]];
      [x[i], x[pivot]] = [x[pivot], x[i]];
    }
    const diag = M[i][i];
    if (Math.abs(diag) < 1e-15) continue;
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / diag;
      for (let j = i; j < n; j++) M[k][j] -= f * M[i][j];
      x[k] -= f * x[i];
    }
  }
  const out = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * out[j];
    out[i] = Math.abs(M[i][i]) > 1e-15 ? sum / M[i][i] : 0;
  }
  return out;
}

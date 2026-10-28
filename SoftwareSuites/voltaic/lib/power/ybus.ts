/**
 * Y-bus (nodal admittance matrix) construction.
 * Standard method: for each line (i, j) with admittance y_series,
 * add y to diagonal and subtract from off-diagonal.
 */
import { Complex, cx, cadd, csub } from './complex';

export interface Line {
  from: number;
  to: number;
  r: number;          // pu
  x: number;          // pu
  b_shunt?: number;   // pu total line charging susceptance
  tap?: number;       // transformer tap ratio (default 1.0)
}

export interface YbusResult {
  Y: Complex[][];
  n: number;
}

export function buildYbus(nBuses: number, lines: Line[]): YbusResult {
  const Y: Complex[][] = Array.from({ length: nBuses }, () =>
    Array.from({ length: nBuses }, () => cx(0, 0))
  );

  for (const line of lines) {
    const tap = line.tap ?? 1.0;
    const z: Complex = cx(line.r, line.x);
    // Series admittance
    const y: Complex = cx(line.r / (line.r * line.r + line.x * line.x),
                          -line.x / (line.r * line.r + line.x * line.x));
    const b_shunt = (line.b_shunt ?? 0) / 2;

    const i = line.from;
    const j = line.to;

    // Shunt at each end
    const ysh = cx(0, b_shunt);

    // Diagonal terms
    Y[i][i] = cadd(Y[i][i], cadd(ysh, cx(y.re / (tap * tap), y.im / (tap * tap))));
    Y[j][j] = cadd(Y[j][j], cadd(ysh, y));

    // Off-diagonal terms
    Y[i][j] = csub(Y[i][j], cx(y.re / tap, y.im / tap));
    Y[j][i] = csub(Y[j][i], cx(y.re / tap, y.im / tap));
  }

  return { Y, n: nBuses };
}

/** Get conductance matrix G = Re(Y) */
export function conductanceMatrix(Y: Complex[][]): number[][] {
  return Y.map((row) => row.map((z) => z.re));
}

/** Get susceptance matrix B = Im(Y) */
export function susceptanceMatrix(Y: Complex[][]): number[][] {
  return Y.map((row) => row.map((z) => z.im));
}

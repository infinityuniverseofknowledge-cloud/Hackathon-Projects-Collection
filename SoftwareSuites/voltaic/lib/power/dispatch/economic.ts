/**
 * Economic dispatch by λ-iteration.
 * Minimize total cost Σ (a_i + b_i P_i + c_i P_i²)
 * subject to Σ P_i = P_load, P_min ≤ P_i ≤ P_max.
 *
 * Reference: Wood & Wollenberg, "Power Generation, Operation, and Control"
 * (1996), Chapter 3.
 */

export interface GenUnit {
  name: string;
  Pmin: number;   // MW
  Pmax: number;   // MW
  a: number;      // € (constant)
  b: number;      // €/MWh
  c: number;      // €/MW²h
}

export interface DispatchResult {
  units: { name: string; P: number; cost: number }[];
  lambda: number;         // €/MWh (marginal cost)
  totalCost: number;      // €/h
  totalPower: number;     // MW
  iterations: number;
}

export function economicDispatch(
  units: GenUnit[],
  P_load_MW: number,
  opts: { tol?: number; maxIter?: number } = {}
): DispatchResult {
  const tol = opts.tol ?? 1e-4;
  const maxIter = opts.maxIter ?? 200;

  // Marginal cost: dC/dP = b + 2cP → P(λ) = (λ - b) / (2c)
  let lambda = 0;
  const totalMax = units.reduce((s, u) => s + u.Pmax, 0);
  const totalMin = units.reduce((s, u) => s + u.Pmin, 0);

  if (P_load_MW > totalMax + tol) {
    // Infeasible: dispatch all at max
    const P = units.map((u) => u.Pmax);
    return summarize(units, P, 0, 0);
  }
  if (P_load_MW < totalMin - tol) {
    const P = units.map((u) => u.Pmin);
    return summarize(units, P, 0, 0);
  }

  // Initial λ guess from average
  const bAvg = units.reduce((s, u) => s + u.b, 0) / units.length;
  const cAvg = units.reduce((s, u) => s + u.c, 0) / units.length;
  lambda = bAvg + 2 * cAvg * (P_load_MW / units.length);

  let iter = 0;
  for (; iter < maxIter; iter++) {
    let total = 0;
    for (const u of units) {
      const P_unclamped = (lambda - u.b) / (2 * u.c);
      const P = Math.min(u.Pmax, Math.max(u.Pmin, P_unclamped));
      total += P;
    }
    const err = total - P_load_MW;
    if (Math.abs(err) < tol) break;

    // Adjust λ by average slope
    const slope = units.reduce((s, u) => s + (lambda > u.b ? 1 / (2 * u.c) : 0), 0);
    if (slope < 1e-9) break;
    lambda -= err / slope;
  }

  // Final dispatch
  const P_final = units.map((u) => {
    const Pu = (lambda - u.b) / (2 * u.c);
    return Math.min(u.Pmax, Math.max(u.Pmin, Pu));
  });

  return summarize(units, P_final, lambda, iter);
}

function summarize(units: GenUnit[], P: number[], lambda: number, iter: number): DispatchResult {
  const rows = units.map((u, i) => ({
    name: u.name,
    P: P[i],
    cost: u.a + u.b * P[i] + u.c * P[i] * P[i],
  }));
  return {
    units: rows,
    lambda,
    totalCost: rows.reduce((s, r) => s + r.cost, 0),
    totalPower: rows.reduce((s, r) => s + r.P, 0),
    iterations: iter,
  };
}

/** Loss-aware dispatch with penalty factors (simplified B-coefficient method). */
export function dispatchWithLosses(
  units: GenUnit[],
  P_load_MW: number,
  B_coeffs: number[][]
): DispatchResult {
  // Simple iterative approach: modify λ by penalty factor
  let lambda = 30;
  const n = units.length;
  for (let iter = 0; iter < 50; iter++) {
    const P = units.map((u) => (lambda - u.b) / (2 * u.c));
    // Losses approximation: P_loss = Σ Σ P_i B_ij P_j
    let losses = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        losses += P[i] * B_coeffs[i][j] * P[j];
      }
    }
    const totalRequired = P_load_MW + losses;
    const totalDispatch = P.reduce((s, p) => s + p, 0);
    const err = totalDispatch - totalRequired;
    if (Math.abs(err) < 0.01) break;
    lambda -= err * 0.1;
  }
  const P = units.map((u) => (lambda - u.b) / (2 * u.c));
  return summarize(units, P, lambda, 50);
}

/**
 * Newton-Raphson power flow solver.
 * Reference: Tinney & Hart, "Power Flow Solution by Newton's Method"
 * IEEE Trans. Power Apparatus and Systems, Vol. PAS-86, No. 11, 1967.
 *
 * State: θ_i (angle) for non-slack buses, V_i (magnitude) for PQ buses.
 * Iterate until |ΔP|, |ΔQ| < tol.
 */
import { buildYbus } from '../ybus';
import { solveReal } from '../complex';
import type { Bus, LFLine, LoadFlowCase, LoadFlowResult } from './types';

export interface NROptions {
  tol?: number;
  maxIter?: number;
  verbose?: boolean;
}

export function newtonRaphson(
  cs: LoadFlowCase,
  opts: NROptions = {}
): LoadFlowResult {
  const tol = opts.tol ?? 1e-8;
  const maxIter = opts.maxIter ?? 30;
  const n = cs.buses.length;

  const yb = buildYbus(n, cs.lines);
  const Y = yb.Y;
  const G = Y.map((r) => r.map((z) => z.re));
  const B = Y.map((r) => r.map((z) => z.im));

  // Index maps: internal 0-based already
  const slackIdx = cs.buses.findIndex((b) => b.type === 'SLACK');
  const pvIdx: number[] = [];
  const pqIdx: number[] = [];
  cs.buses.forEach((b, i) => {
    if (b.type === 'PV') pvIdx.push(i);
    if (b.type === 'PQ') pqIdx.push(i);
  });

  // State vectors
  const V: number[] = cs.buses.map((b) => b.V);
  const theta: number[] = cs.buses.map((b) => b.theta);

  // Specified P/Q (net injection = gen - load)
  const Pspec: number[] = cs.buses.map((b) => b.Pgen - b.Pload);
  const Qspec: number[] = cs.buses.map((b) => b.Qgen - b.Qload);

  // Set PV bus voltages
  pvIdx.forEach((i) => { V[i] = cs.buses[i].Vset ?? V[i]; });
  V[slackIdx] = cs.buses[slackIdx].V;
  theta[slackIdx] = cs.buses[slackIdx].theta;

  let iter = 0;
  let maxMismatch = 0;
  let converged = false;

  while (iter < maxIter) {
    iter++;

    // Compute P and Q at each bus
    const P: number[] = new Array(n).fill(0);
    const Q: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const tij = theta[i] - theta[j];
        P[i] += V[i] * V[j] * (G[i][j] * Math.cos(tij) + B[i][j] * Math.sin(tij));
        Q[i] += V[i] * V[j] * (G[i][j] * Math.sin(tij) - B[i][j] * Math.cos(tij));
      }
    }

    // Mismatch
    const dP: number[] = new Array(n).fill(0);
    const dQ: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (i !== slackIdx) dP[i] = Pspec[i] - P[i];
      if (pqIdx.includes(i)) dQ[i] = Qspec[i] - Q[i];
    }

    maxMismatch = 0;
    for (let i = 0; i < n; i++) {
      if (i !== slackIdx) maxMismatch = Math.max(maxMismatch, Math.abs(dP[i]));
      if (pqIdx.includes(i)) maxMismatch = Math.max(maxMismatch, Math.abs(dQ[i]));
    }

    if (maxMismatch < tol) { converged = true; break; }

    // Build Jacobian
    // Order of unknowns: [θ for non-slack buses..., V for PQ buses...]
    const nonSlack: number[] = [];
    for (let i = 0; i < n; i++) if (i !== slackIdx) nonSlack.push(i);

    const m1 = nonSlack.length;
    const m2 = pqIdx.length;
    const nJac = m1 + m2;
    const J: number[][] = Array.from({ length: nJac }, () => new Array(nJac).fill(0));
    const rhs: number[] = new Array(nJac).fill(0);

    // H = ∂P/∂θ  (m1 × m1)
    for (let r = 0; r < m1; r++) {
      const i = nonSlack[r];
      for (let c = 0; c < m1; c++) {
        const j = nonSlack[c];
        if (i === j) {
          J[r][c] = -Q[i] - B[i][i] * V[i] * V[i];
        } else {
          const tij = theta[i] - theta[j];
          J[r][c] = V[i] * V[j] * (G[i][j] * Math.sin(tij) - B[i][j] * Math.cos(tij));
        }
      }
    }

    // N = ∂P/∂V  (m1 × m2)
    for (let r = 0; r < m1; r++) {
      const i = nonSlack[r];
      for (let c = 0; c < m2; c++) {
        const j = pqIdx[c];
        if (i === j) {
          J[r][m1 + c] = P[i] / V[i] + G[i][i] * V[i];
        } else {
          const tij = theta[i] - theta[j];
          J[r][m1 + c] = V[i] * (G[i][j] * Math.cos(tij) + B[i][j] * Math.sin(tij));
        }
      }
    }

    // M = ∂Q/∂θ  (m2 × m1)
    for (let r = 0; r < m2; r++) {
      const i = pqIdx[r];
      for (let c = 0; c < m1; c++) {
        const j = nonSlack[c];
        if (i === j) {
          J[m1 + r][c] = P[i] - G[i][i] * V[i] * V[i];
        } else {
          const tij = theta[i] - theta[j];
          J[m1 + r][c] = -V[i] * V[j] * (G[i][j] * Math.cos(tij) + B[i][j] * Math.sin(tij));
        }
      }
    }

    // L = ∂Q/∂V  (m2 × m2)
    for (let r = 0; r < m2; r++) {
      const i = pqIdx[r];
      for (let c = 0; c < m2; c++) {
        const j = pqIdx[c];
        if (i === j) {
          J[m1 + r][m1 + c] = Q[i] / V[i] - B[i][i] * V[i];
        } else {
          const tij = theta[i] - theta[j];
          J[m1 + r][m1 + c] = V[i] * (G[i][j] * Math.sin(tij) - B[i][j] * Math.cos(tij));
        }
      }
    }

    // RHS = [ΔP/V, ΔQ/V]
    for (let r = 0; r < m1; r++) rhs[r] = dP[nonSlack[r]] / V[nonSlack[r]];
    for (let r = 0; r < m2; r++) rhs[m1 + r] = dQ[pqIdx[r]] / V[pqIdx[r]];

    // Solve
    const dx = solveReal(J, rhs);

    // Update state
    for (let r = 0; r < m1; r++) theta[nonSlack[r]] += dx[r];
    for (let r = 0; r < m2; r++) V[pqIdx[r]] += dx[m1 + r];
  }

  // Compute final P, Q, and losses
  const P: number[] = new Array(n).fill(0);
  const Q: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const tij = theta[i] - theta[j];
      P[i] += V[i] * V[j] * (G[i][j] * Math.cos(tij) + B[i][j] * Math.sin(tij));
      Q[i] += V[i] * V[j] * (G[i][j] * Math.sin(tij) - B[i][j] * Math.cos(tij));
    }
  }

  // Slack bus absorbs losses
  const Pgen = cs.buses.map((b, i) => (i === slackIdx ? P[i] + b.Pload : b.Pgen));
  const Qgen = cs.buses.map((b, i) => {
    if (i === slackIdx) return Q[i] + b.Qload;
    if (cs.buses[i].type === 'PV') return Q[i] + b.Qload;
    return b.Qgen;
  });

  const totalLossP = P.reduce((s, x) => s + x, 0);
  const totalLossQ = Q.reduce((s, x) => s + x, 0);

  return {
    converged,
    iterations: iter,
    maxMismatch,
    buses: cs.buses.map((b, i) => ({
      id: b.id,
      name: b.name,
      V: V[i],
      theta_rad: theta[i],
      theta_deg: (theta[i] * 180) / Math.PI,
      Pcalc: P[i],
      Qcalc: Q[i],
      Pgen: Pgen[i],
      Qgen: Qgen[i],
      Pload: b.Pload,
      Qload: b.Qload,
    })),
    losses: { P: totalLossP, Q: totalLossQ },
    slackPower: { P: Pgen[slackIdx], Q: Qgen[slackIdx] },
  };
}

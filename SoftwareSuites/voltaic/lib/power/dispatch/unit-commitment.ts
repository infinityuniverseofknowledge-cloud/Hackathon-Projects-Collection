/**
 * Unit commitment by priority-list method.
 * Simplified: sort by average cost, commit in order until load is met.
 */

import type { GenUnit } from './economic';

export interface UCUnit extends GenUnit {
  startupCost: number;   // €
  minUpTime: number;     // hours
  minDownTime: number;   // hours
}

export interface UCDispatch {
  hour: number;
  loadMW: number;
  committed: string[];
  totalCost: number;
}

export function priorityListUC(
  units: UCUnit[],
  loadProfileMW: number[]
): UCDispatch[] {
  // Sort by average marginal cost
  const sorted = [...units].sort((a, b) => {
    const avgA = a.b + a.c * (a.Pmin + a.Pmax) / 2;
    const avgB = b.b + b.c * (b.Pmin + b.Pmax) / 2;
    return avgA - avgB;
  });

  const result: UCDispatch[] = [];
  for (let h = 0; h < loadProfileMW.length; h++) {
    const load = loadProfileMW[h];
    let committed: UCUnit[] = [];
    let totalCap = 0;
    for (const u of sorted) {
      committed.push(u);
      totalCap += u.Pmax;
      if (totalCap >= load) break;
    }
    // Cost = startup + generation cost
    const startupCost = committed.reduce((s, u) => s + u.startupCost, 0);
    const genCost = committed.reduce((s, u) => {
      const P = Math.min(u.Pmax, Math.max(u.Pmin, load / committed.length));
      return s + u.a + u.b * P + u.c * P * P;
    }, 0);
    result.push({
      hour: h,
      loadMW: load,
      committed: committed.map((u) => u.name),
      totalCost: startupCost + genCost,
    });
  }
  return result;
}

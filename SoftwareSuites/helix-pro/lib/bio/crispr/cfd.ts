/**
 * CFD — Cutting Frequency Determination (Doench 2016).
 * PAM-proximal mismatches have higher penalty weight.
 */
const CFD_W = [
  1.00, 1.00, 1.00, 1.00, 1.00,
  1.00, 0.80, 0.60, 0.60, 0.60,
  0.40, 0.40, 0.30, 0.30, 0.20,
  0.20, 0.15, 0.10, 0.05, 0.03,
];

export function cfdScore(guide: string, offtarget: string): number {
  if (guide.length !== offtarget.length) return 0;
  let mismatches = 0, penalty = 0;
  for (let i = 0; i < guide.length; i++) {
    if (guide[i] !== offtarget[i]) {
      mismatches++;
      const idx = guide.length - 1 - i;
      penalty += 1 - CFD_W[idx];
    }
  }
  if (mismatches === 0) return 1.0;
  return Math.max(0, 1 - penalty / Math.max(1, mismatches));
}

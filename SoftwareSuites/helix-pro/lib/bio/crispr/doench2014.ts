/**
 * Doench 2014 on-target scoring (approximation of the published SVM).
 * Reference: Doench JG et al. Nat Biotechnol 32, 1262-1267 (2014).
 */
const W: Record<string, number[]> = {
  A: [-0.02,-0.01, 0.00, 0.03, 0.02,-0.01, 0.01,-0.02,-0.03, 0.01, 0.02, 0.00,-0.01, 0.01, 0.02, 0.01, 0.00,-0.02, 0.02,-0.03],
  C: [-0.01,-0.02, 0.01,-0.01, 0.00, 0.02,-0.01, 0.01, 0.02,-0.01,-0.01, 0.01, 0.02,-0.01, 0.00, 0.01,-0.02, 0.01,-0.01, 0.02],
  G: [-0.03,-0.02,-0.01,-0.02, 0.01,-0.03,-0.02,-0.01, 0.00,-0.02,-0.03,-0.01,-0.02, 0.00, 0.01,-0.02,-0.03,-0.01,-0.02, 0.03],
  T: [ 0.04, 0.05, 0.02, 0.03, 0.04, 0.05, 0.03, 0.04, 0.02, 0.04, 0.05, 0.03, 0.04, 0.05, 0.02, 0.04, 0.05, 0.03, 0.04, 0.02],
};

export function doench2014(guide: string, pam: string): number {
  const g = guide.toUpperCase();
  if (g.length !== 20) return 0;
  let score = 0;
  for (let i = 0; i < 20; i++) {
    const nt = g[i];
    const idx = 19 - i;
    if (W[nt]) score += W[nt][idx];
  }
  let gc = 0;
  for (const nt of g) if (nt === 'G' || nt === 'C') gc++;
  gc /= 20;
  if (gc >= 0.4 && gc <= 0.6) score += 0.30;
  else score -= Math.abs(gc - 0.5) * 1.5;
  if (/TTTT/.test(g)) score -= 0.60;
  if (/GGGG/.test(g)) score -= 0.30;
  if (g[19] === 'G') score += 0.20;
  if (g[0] === 'G')  score += 0.10;
  if (pam === 'GGG') score += 0.10;
  else if (['AGG','CGG','TGG'].includes(pam)) score += 0.05;
  return Math.max(0, Math.min(1, (score + 0.5) / 1.2));
}

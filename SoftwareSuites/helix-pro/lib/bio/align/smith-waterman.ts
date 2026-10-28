/**
 * Smith-Waterman local alignment (1981). O(mn) time and space.
 */
import { BLOSUM62, scorePair } from '../blosum62';
import type { AlignOptions, AlignResult } from './gotoh';

export function smithWaterman(
  a: string, b: string, opts: AlignOptions = {}
): AlignResult & { startA: number; startB: number } {
  const go = opts.gapOpen ?? -10;
  const ge = opts.gapExtend ?? -1;
  const mat = opts.matrix ?? BLOSUM62;
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  const m = A.length, n = B.length;

  const H: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const E: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const F: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  let best = 0, bi = 0, bj = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      E[i][j] = Math.max(H[i][j - 1] + go, E[i][j - 1] + ge);
      F[i][j] = Math.max(H[i - 1][j] + go, F[i - 1][j] + ge);
      H[i][j] = Math.max(0, H[i - 1][j - 1] + scorePair(A[i - 1], B[j - 1], mat), E[i][j], F[i][j]);
      if (H[i][j] > best) { best = H[i][j]; bi = i; bj = j; }
    }
  }

  let i = bi, j = bj;
  const outA: string[] = [];
  const outB: string[] = [];
  while (i > 0 && j > 0 && H[i][j] > 0) {
    if (H[i][j] === H[i - 1][j - 1] + scorePair(A[i - 1], B[j - 1], mat)) {
      outA.push(A[i - 1]); outB.push(B[j - 1]); i--; j--;
    } else if (H[i][j] === F[i][j]) {
      outA.push(A[i - 1]); outB.push('-'); i--;
    } else {
      outA.push('-'); outB.push(B[j - 1]); j--;
    }
  }
  outA.reverse(); outB.reverse();
  const alignA = outA.join('');
  const alignB = outB.join('');

  let matches = 0, gaps = 0, sim = 0;
  let mid = '';
  for (let k = 0; k < alignA.length; k++) {
    const ca = alignA[k], cb = alignB[k];
    if (ca === '-' || cb === '-') { gaps++; mid += ' '; continue; }
    if (ca === cb) { matches++; sim++; mid += '|'; }
    else if (scorePair(ca, cb, mat) > 0) { sim++; mid += '+'; }
    else mid += '.';
  }

  return {
    score: best, alignA, alignB, midLine: mid,
    identity: matches / (alignA.length || 1),
    similarity: sim / (alignA.length || 1),
    gaps, matches, length: alignA.length,
    startA: i, startB: j,
  };
}

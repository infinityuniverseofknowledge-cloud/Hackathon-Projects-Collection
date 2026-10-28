/**
 * Gotoh global alignment with affine gap penalties.
 * Reference: Gotoh O. (1982) J. Mol. Biol. 162(3):705-708.
 */
import { BLOSUM62, scorePair } from '../blosum62';

export interface AlignOptions {
  gapOpen?: number;
  gapExtend?: number;
  matrix?: Record<string, Record<string, number>>;
}

export interface AlignResult {
  score: number;
  alignA: string;
  alignB: string;
  midLine: string;
  identity: number;
  similarity: number;
  gaps: number;
  matches: number;
  length: number;
}

export function gotoh(a: string, b: string, opts: AlignOptions = {}): AlignResult {
  const go = opts.gapOpen ?? -11;
  const ge = opts.gapExtend ?? -1;
  const mat = opts.matrix ?? BLOSUM62;
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  const m = A.length, n = B.length;

  const M: number[][]  = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(-1e9));
  const Ix: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(-1e9));
  const Iy: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(-1e9));

  M[0][0] = 0;
  for (let i = 1; i <= m; i++) Ix[i][0] = go + (i - 1) * ge;
  for (let j = 1; j <= n; j++) Iy[0][j] = go + (j - 1) * ge;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      Ix[i][j] = Math.max(M[i - 1][j] + go, Ix[i - 1][j] + ge);
      Iy[i][j] = Math.max(M[i][j - 1] + go, Iy[i][j - 1] + ge);
      M[i][j] = Math.max(M[i - 1][j - 1], Ix[i - 1][j - 1], Iy[i - 1][j - 1])
              + scorePair(A[i - 1], B[j - 1], mat);
    }
  }

  let i = m, j = n;
  let state: 'M' | 'Ix' | 'Iy' = 'M';
  const best = Math.max(M[m][n], Ix[m][n], Iy[m][n]);
  if (best === Ix[m][n]) state = 'Ix';
  else if (best === Iy[m][n]) state = 'Iy';

  const outA: string[] = [];
  const outB: string[] = [];

  while (i > 0 || j > 0) {
    if (state === 'M') {
      if (i > 0 && j > 0) {
        outA.push(A[i - 1]); outB.push(B[j - 1]);
        const prev = Math.max(M[i - 1][j - 1], Ix[i - 1][j - 1], Iy[i - 1][j - 1]);
        state = M[i - 1][j - 1] === prev ? 'M' : Ix[i - 1][j - 1] === prev ? 'Ix' : 'Iy';
        i--; j--;
      } else if (i > 0) state = 'Ix';
      else state = 'Iy';
    } else if (state === 'Ix') {
      if (i > 0) {
        outA.push(A[i - 1]); outB.push('-');
        state = Ix[i][j] === M[i - 1][j] + go ? 'M' : 'Ix';
        i--;
      } else state = 'Iy';
    } else {
      if (j > 0) {
        outA.push('-'); outB.push(B[j - 1]);
        state = Iy[i][j] === M[i][j - 1] + go ? 'M' : 'Iy';
        j--;
      } else state = 'Ix';
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
  const length = alignA.length || 1;

  return {
    score: best, alignA, alignB, midLine: mid,
    identity: matches / length,
    similarity: sim / length,
    gaps, matches, length,
  };
}

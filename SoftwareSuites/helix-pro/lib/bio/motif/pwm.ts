export interface PWMResult {
  pwm: Record<string, number[]>;
  counts: Record<string, number[]>;
  total: number[];
  length: number;
}

const ALPHABET = ['A', 'C', 'G', 'T'];

export function buildPWM(seqs: string[]): PWMResult {
  if (!seqs.length) return { pwm: {}, counts: {}, total: [], length: 0 };
  const L = seqs[0].length;
  const counts: Record<string, number[]> = {};
  ALPHABET.forEach((b) => { counts[b] = new Array(L).fill(0); });
  const total = new Array(L).fill(0);

  for (const s of seqs) {
    const u = s.toUpperCase();
    for (let i = 0; i < L; i++) {
      const b = u[i];
      if (counts[b]) { counts[b][i]++; total[i]++; }
    }
  }

  const pwm: Record<string, number[]> = {};
  ALPHABET.forEach((b) => { pwm[b] = new Array(L).fill(0); });
  for (let i = 0; i < L; i++) {
    const n = total[i] || 1;
    for (const b of ALPHABET) pwm[b][i] = counts[b][i] / n;
  }
  return { pwm, counts, total, length: L };
}

export function informationContent(w: PWMResult): number[] {
  const out: number[] = new Array(w.length).fill(0);
  for (let i = 0; i < w.length; i++) {
    for (const b of ALPHABET) {
      const p = w.pwm[b][i];
      if (p > 0) out[i] += p * Math.log2(p / 0.25);
    }
  }
  return out;
}

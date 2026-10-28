import { describe, it, expect } from 'vitest';
import { doench2014 } from '@/lib/bio/crispr/doench2014';
import { cfdScore } from '@/lib/bio/crispr/cfd';
import { findGuides } from '@/lib/bio/crispr/finder';

describe('Doench 2014', () => {
  it('returns 0 for wrong-length guide', () => {
    expect(doench2014('ACGT', 'AGG')).toBe(0);
  });
  it('scores a 20mer in [0,1]', () => {
    const s = doench2014('GACGTACGTACGTACGTAC', 'TGG');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
  it('penalizes poly-T', () => {
    const good = doench2014('GACGTACGTACGTACGTAC', 'TGG');
    const bad  = doench2014('GACGTTTTACGTACGTACA', 'TGG');
    expect(bad).toBeLessThan(good);
  });
});

describe('CFD off-target', () => {
  it('returns 1 for perfect match', () => {
    expect(cfdScore('ACGTACGTACGTACGTACGT', 'ACGTACGTACGTACGTACGT')).toBe(1);
  });
  it('penalizes any mismatch', () => {
    expect(cfdScore('ACGTACGTACGTACGTACGT', 'TCGTACGTACGTACGTACGT')).toBeLessThan(1);
  });
});

describe('findGuides', () => {
  it('finds NGG-PAM guides', () => {
    const seq = 'GACGTACGTACGTACGTACTGG';
    const guides = findGuides(seq, 'NGG');
    expect(guides.length).toBeGreaterThan(0);
    expect(guides[0].seq.length).toBe(20);
  });
});
